import type { PlayerId, WorldPosition } from "../../foundation";
import {
  COLONY_BIOMES,
  COLONY_RESOURCE_RENEWAL,
  COLONY_PROFESSIONS,
  COLONY_RESEARCH,
  COLONY_DEPTH_CONTENT_VERSION,
  validateColonyDepthContent,
  type ColonyBiomeId,
  type ColonyProfessionId,
  type ColonyResearchId,
} from "../../content/phase2/ColonyDepthContent";
import {
  colonyBiomeAt,
  colonySurveySites,
  COLONY_SURVEY_SITE_IDS,
} from "../../world/phase2/ColonyRegions";
import type { Phase1ItemAuthority } from "../items";

export interface ColonyDepthState {
  readonly contentVersion: typeof COLONY_DEPTH_CONTENT_VERSION;
  readonly revision: number;
  readonly discoveredBiomes: readonly ColonyBiomeId[];
  readonly inspectedSites: readonly string[];
  readonly researchIds: readonly ColonyResearchId[];
  readonly professions: Readonly<Record<PlayerId, ColonyProfessionId>>;
  readonly pressure: readonly {
    readonly regionKey: string;
    readonly harvests: number;
    readonly lastRecoveryTick: number;
  }[];
  readonly receipts: readonly {
    readonly operationId: string;
    readonly signature: string;
    readonly revision: number;
  }[];
}
export function emptyColonyDepthState(): ColonyDepthState {
  return Object.freeze({
    contentVersion: COLONY_DEPTH_CONTENT_VERSION,
    revision: 0,
    discoveredBiomes: Object.freeze([]),
    inspectedSites: Object.freeze([]),
    researchIds: Object.freeze([]),
    professions: Object.freeze({}),
    pressure: Object.freeze([]),
    receipts: Object.freeze([]),
  });
}
export function colonyStorageMultiplier(state?: ColonyDepthState): number {
  if (state === undefined || !state.researchIds.includes("expanded-storage"))
    return 1;
  return Object.values(state.professions).includes("engineer") ? 2 : 1.5;
}
export function validateColonyDepthState(value: unknown): ColonyDepthState {
  if (typeof value !== "object" || value === null)
    throw new Error("Missing colony-depth state.");
  const state = value as ColonyDepthState;
  const natural = (n: unknown): n is number =>
    Number.isSafeInteger(n) && (n as number) >= 0;
  const unique = (list: unknown): list is string[] =>
    Array.isArray(list) &&
    list.every((id) => typeof id === "string") &&
    new Set(list).size === list.length;
  if (
    ![1,COLONY_DEPTH_CONTENT_VERSION].includes(state.contentVersion) ||
    !natural(state.revision) ||
    !unique(state.discoveredBiomes) ||
    state.discoveredBiomes.some((id) => !Object.hasOwn(COLONY_BIOMES, id)) ||
    !unique(state.researchIds) ||
    state.researchIds.some(
      (id) => !COLONY_RESEARCH.some((def) => def.id === id),
    ) ||
    !unique(state.inspectedSites) ||
    state.inspectedSites.some(
      (id) => !(COLONY_SURVEY_SITE_IDS as readonly string[]).includes(id),
    ) ||
    typeof state.professions !== "object" ||
    state.professions === null ||
    Array.isArray(state.professions) ||
    !Array.isArray(state.pressure) ||
    state.pressure.length > 2048 ||
    !Array.isArray(state.receipts) ||
    state.receipts.length > 96
  )
    throw new Error("Invalid colony-depth state.");
  for (const id of state.researchIds)
    if (
      COLONY_RESEARCH.find((def) => def.id === id)!.prerequisites.some(
        (parent) => !state.researchIds.includes(parent),
      )
    )
      throw new Error("Missing saved research prerequisite.");
  for (const [player, profession] of Object.entries(state.professions)) {
    if (
      player.trim().length === 0 ||
      !Object.hasOwn(COLONY_PROFESSIONS, profession)
    )
      throw new Error("Invalid saved profession.");
    const def = COLONY_PROFESSIONS[profession];
    if (
      !state.researchIds.includes(def.requiredResearch) ||
      state.discoveredBiomes.length < def.requiredRegions
    )
      throw new Error("Missing saved profession prerequisite.");
  }
  if (
    new Set(state.pressure.map((p) => p.regionKey)).size !==
      state.pressure.length ||
    state.pressure.some(
      (p) =>
        typeof p.regionKey !== "string" ||
        !/^-?\d+:-?\d+$/.test(p.regionKey) ||
        !natural(p.harvests) ||
        p.harvests > 8 ||
        !natural(p.lastRecoveryTick),
    )
  )
    throw new Error("Invalid saved ecology pressure.");
  if (
    new Set(state.receipts.map((r) => r.operationId)).size !==
      state.receipts.length ||
    state.receipts.some(
      (r) =>
        typeof r.operationId !== "string" ||
        !r.operationId ||
        typeof r.signature !== "string" ||
        !r.signature ||
        !natural(r.revision) ||
        r.revision > state.revision,
    )
  )
    throw new Error("Invalid colony receipt.");
  return Object.freeze({
    ...state,
    contentVersion: COLONY_DEPTH_CONTENT_VERSION,
    discoveredBiomes: Object.freeze([...state.discoveredBiomes]),
    inspectedSites: Object.freeze([...state.inspectedSites]),
    researchIds: Object.freeze([...state.researchIds]),
    professions: Object.freeze({ ...state.professions }),
    pressure: Object.freeze(state.pressure.map((p) => Object.freeze({ ...p }))),
    receipts: Object.freeze(state.receipts.map((r) => Object.freeze({ ...r }))),
  });
}
export interface ColonyDepthCommand {
  readonly operationId: string;
  readonly playerId: PlayerId;
  readonly expectedRevision: number;
  readonly expectedInventoryRevision: number;
  readonly action: "research" | "specialize" | "inspect-site";
  readonly targetId: string;
}
export type ColonyDepthResult =
  | {
      readonly status: "committed";
      readonly operationId: string;
      readonly revision: number;
    }
  | {
      readonly status: "rejected";
      readonly operationId: string;
      readonly reason: string;
    };

export class ColonyDepthAuthority {
  private state: ColonyDepthState;
  public constructor(
    private readonly seed: string,
    private readonly items: Phase1ItemAuthority,
    private readonly actor: (playerId: PlayerId) => {
      readonly position: WorldPosition;
      readonly alive: boolean;
    },
    initial?: ColonyDepthState,
    private readonly remoteLabAccess?: (playerId:PlayerId)=>boolean,
  ) {
    validateColonyDepthContent();
    this.state =
      initial === undefined
        ? emptyColonyDepthState()
        : validateColonyDepthState(initial);
  }
  public read(): ColonyDepthState {
    return this.state;
  }
  public discover(playerId: PlayerId): void {
    const actor = this.actor(playerId);
    if (!actor.alive) return;
    const biome = colonyBiomeAt(this.seed, actor.position);
    if (!this.state.discoveredBiomes.includes(biome))
      this.state = validateColonyDepthState({
        ...this.state,
        revision: this.state.revision + 1,
        discoveredBiomes: [...this.state.discoveredBiomes, biome].sort(),
      });
  }
  public recordHarvest(position: WorldPosition, tick: number): void {
    if (!Number.isSafeInteger(tick) || tick < 0)
      throw new Error("Invalid ecology tick.");
    const regionKey =
      String(Math.floor(position.x / 64)) +
      ":" +
      String(Math.floor(position.y / 64));
    const pressure = this.state.pressure.map((p) => ({ ...p }));
    let entry = pressure.find((p) => p.regionKey === regionKey);
    if (entry === undefined) {
      if (pressure.length >= 2048) pressure.shift();
      entry = { regionKey, harvests: 0, lastRecoveryTick: tick };
      pressure.push(entry);
    }
    entry.harvests = Math.min(8, entry.harvests + 1);
    this.state = validateColonyDepthState({
      ...this.state,
      revision: this.state.revision + 1,
      pressure,
    });
  }
  public recover(tick: number): void {
    if (!Number.isSafeInteger(tick) || tick < 0)
      throw new Error("Invalid ecology tick.");
    let changed = false;
    const pressure = this.state.pressure
      .map((p) => {
        const cycles = Math.floor((tick - p.lastRecoveryTick) / 3600);
        if (cycles <= 0 || p.harvests === 0) return p;
        changed = true;
        return {
          ...p,
          harvests: Math.max(0, p.harvests - cycles),
          lastRecoveryTick: p.lastRecoveryTick + cycles * 3600,
        };
      })
      .filter((p) => p.harvests > 0);
    if (changed)
      this.state = validateColonyDepthState({
        ...this.state,
        revision: this.state.revision + 1,
        pressure,
      });
  }
  public recoveryMultiplier(position: WorldPosition, resourceDefinitionId?: string): number {
    const key =
      String(Math.floor(position.x / 64)) +
      ":" +
      String(Math.floor(position.y / 64));
    const harvests =
      this.state.pressure.find((p) => p.regionKey === key)?.harvests ?? 0;
    return (
      COLONY_BIOMES[colonyBiomeAt(this.seed, position)].recoveryMultiplier *
      (resourceDefinitionId === undefined ? 1 : COLONY_RESOURCE_RENEWAL[colonyBiomeAt(this.seed, position)][resourceDefinitionId] ?? 1) *
      (1 + harvests / 8) *
      (this.state.researchIds.includes("water-stewardship") ? 0.8 : 1)
    );
  }
  public hasResearch(id: ColonyResearchId): boolean {
    return this.state.researchIds.includes(id);
  }
  public profession(playerId: PlayerId): ColonyProfessionId | null {
    return this.state.professions[playerId] ?? null;
  }
  public execute(command: ColonyDepthCommand): ColonyDepthResult {
    const reject = (reason: string): ColonyDepthResult =>
      Object.freeze({
        status: "rejected",
        operationId: command.operationId,
        reason,
      });
    if (
      typeof command.operationId !== "string" ||
      !command.operationId ||
      typeof command.playerId !== "string" ||
      !command.playerId ||
      !Number.isSafeInteger(command.expectedRevision) ||
      command.expectedRevision < 0 ||
      !Number.isSafeInteger(command.expectedInventoryRevision) ||
      command.expectedInventoryRevision < 0 ||
      typeof command.targetId !== "string"
    )
      return reject("INVALID_COMMAND");
    const signature = JSON.stringify([
      command.playerId,
      command.action,
      command.targetId,
      command.expectedRevision,
      command.expectedInventoryRevision,
    ]);
    const receipt = this.state.receipts.find(
      (r) => r.operationId === command.operationId,
    );
    if (receipt !== undefined)
      return receipt.signature === signature
        ? {
            status: "committed",
            operationId: command.operationId,
            revision: receipt.revision,
          }
        : reject("OPERATION_ID_CONFLICT");
    if (command.expectedRevision !== this.state.revision)
      return reject("STALE_REVISION");
    if (this.state.revision >= Number.MAX_SAFE_INTEGER)
      return reject("REVISION_EXHAUSTED");
    let actor: ReturnType<ColonyDepthAuthority["actor"]>;
    try {
      actor = this.actor(command.playerId);
    } catch {
      return reject("UNKNOWN_PLAYER");
    }
    if (!actor.alive) return reject("PLAYER_DEAD");
    let next = { ...this.state };
    if (command.action === "research") {
      const def = COLONY_RESEARCH.find((d) => d.id === command.targetId);
      if (def === undefined) return reject("UNKNOWN_RESEARCH");
      if (this.hasResearch(def.id)) return reject("ALREADY_RESEARCHED");
      if (Math.hypot(actor.position.x, actor.position.y) > 7.5 && !this.remoteLabAccess?.(command.playerId))
        return reject("RETURN_TO_BASE");
      if (def.prerequisites.some((id) => !this.hasResearch(id)))
        return reject("RESEARCH_PREREQUISITE");
      const result = this.items.commitColonyExchange({
        operationId: command.operationId,
        playerId: command.playerId,
        expectedInventoryRevision: command.expectedInventoryRevision,
        inputs: def.costs,
        outputs: [],
      });
      if (result.status === "rejected") return reject(result.reason);
      next = { ...next, researchIds: [...next.researchIds, def.id].sort() };
    } else if (command.action === "specialize") {
      const id = command.targetId as ColonyProfessionId;
      if (!Object.hasOwn(COLONY_PROFESSIONS, id))
        return reject("UNKNOWN_PROFESSION");
      const def = COLONY_PROFESSIONS[id];
      if (
        !this.hasResearch(def.requiredResearch) ||
        this.state.discoveredBiomes.length < def.requiredRegions
      )
        return reject("PROFESSION_PREREQUISITE");
      if (Math.hypot(actor.position.x, actor.position.y) > 7.5)
        return reject("RETURN_TO_BASE");
      if (next.professions[command.playerId] === id)
        return reject("ALREADY_SPECIALIZED");
      if (next.professions[command.playerId] !== undefined)
        return reject("SPECIALIZATION_LOCKED");
      next = {
        ...next,
        professions: { ...next.professions, [command.playerId]: id },
      };
    } else if (command.action === "inspect-site") {
      const site = colonySurveySites(this.seed).find(
        (s) => s.id === command.targetId,
      );
      if (site === undefined) return reject("UNKNOWN_SITE");
      if (
        Math.hypot(
          actor.position.x - site.position.x,
          actor.position.y - site.position.y,
        ) > 1.25
      )
        return reject("OUT_OF_RANGE");
      if (next.inspectedSites.includes(site.id))
        return reject("ALREADY_INSPECTED");
      next = {
        ...next,
        inspectedSites: [...next.inspectedSites, site.id].sort(),
      };
    } else return reject("INVALID_ACTION");
    const revision = this.state.revision + 1;
    this.state = validateColonyDepthState({
      ...next,
      revision,
      receipts: [
        ...next.receipts,
        { operationId: command.operationId, signature, revision },
      ].slice(-96),
    });
    return Object.freeze({
      status: "committed",
      operationId: command.operationId,
      revision,
    });
  }
}
