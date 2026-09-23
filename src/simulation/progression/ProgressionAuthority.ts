import type {
  ContentCatalogV1,
  MilestoneXpRuleV1,
  ProfessionQuestDefinitionV1,
  ProgressionDefinitionV1,
  RepeatXpRuleV1,
} from '../../content';
import type { PlayerId } from '../../foundation';
import type {
  DeathXpPenaltyPort,
  DeathXpPenaltyReservation,
} from '../death';
import type {
  PlayerProgressionSnapshot,
  PlayerProgressionView,
  ProgressionApplyResult,
  ProgressionAuthoritySnapshot,
  ProgressionEventReceipt,
  ProgressionGameplayEvent,
  ProgressionProfessionId,
  ProgressionQuestId,
  ProgressionQuestSnapshot,
  ProgressionQuestView,
  ProgressionRepeatKind,
  ProgressionSkillId,
} from './ProgressionTypes';

const PROGRESSION_ID = 'progression:phase1-early-progression' as const;
const FIELDCRAFT_SKILL = 'skill:fieldcraft-basics' as const;
const MAINTENANCE_SKILL = 'skill:maintenance-basics' as const;
const EXPLORER_QUEST = 'profession-quest:chart-the-unknown' as const;
const ENGINEER_QUEST = 'profession-quest:bring-water-online' as const;
const EXPLORER_PROFESSION = 'profession:explorer-prototype' as const;
const ENGINEER_PROFESSION = 'profession:engineer-prototype' as const;
const MAX_EVENT_RECEIPTS = 96;

const QUEST_IDS: readonly ProgressionQuestId[] = Object.freeze([
  EXPLORER_QUEST,
  ENGINEER_QUEST,
]);
const SKILL_IDS: readonly ProgressionSkillId[] = Object.freeze([
  FIELDCRAFT_SKILL,
  MAINTENANCE_SKILL,
]);
const PROFESSION_IDS: readonly ProgressionProfessionId[] = Object.freeze([
  EXPLORER_PROFESSION,
  ENGINEER_PROFESSION,
]);

interface MutableQuestState {
  questId: ProgressionQuestId;
  completedObjectives: number;
  completed: boolean;
}

interface MutablePlayerProgression {
  playerId: PlayerId;
  revision: number;
  totalXp: number;
  level: number;
  milestoneRuleIds: Set<string>;
  repeatCounts: Record<ProgressionRepeatKind, number>;
  skillIds: Set<ProgressionSkillId>;
  questStates: Map<ProgressionQuestId, MutableQuestState>;
  professionIds: Set<ProgressionProfessionId>;
  eventReceipts: Map<string, string>;
}

interface PendingDeathPenalty {
  readonly reservation: Readonly<DeathXpPenaltyReservation>;
}

export interface Phase1ProgressionAuthorityOptions {
  readonly catalog: ContentCatalogV1;
  readonly snapshot?: ProgressionAuthoritySnapshot;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedStrings<T extends string>(values: Iterable<T>): readonly T[] {
  return Object.freeze([...values].sort(compareStrings));
}

function eventSignature(event: ProgressionGameplayEvent): string {
  switch (event.type) {
    case 'gather-completed':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.resourceId,
      ]);
    case 'craft-completed':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.recipeId,
      ]);
    case 'repair-completed':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.conditionBefore,
        event.conditionAfter,
      ]);
    case 'structure-placed':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.structureId,
      ]);
    case 'machine-output-collected':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.machineId,
        event.itemId,
        event.quantity,
      ]);
    case 'expedition-band-entered':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
      ]);
    case 'ruin-located':
    case 'ruin-inspected':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.ruinId,
      ]);
    case 'returned-to-base-alive':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.structureId,
        event.alive,
      ]);
    case 'structures-present':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        [...event.structureIds].sort(compareStrings),
      ]);
    case 'powered-machine-interacted':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.machineId,
        event.powered,
      ]);
    case 'hostile-resolved':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.hostileId,
        event.resolution,
        event.eligibleParticipant,
      ]);
    case 'own-death-cache-recovered':
      return JSON.stringify([
        event.type,
        event.eventId,
        event.playerId,
        event.quantity,
      ]);
  }
}

export class Phase1ProgressionAuthority implements DeathXpPenaltyPort {
  private readonly progression: Readonly<ProgressionDefinitionV1>;
  private readonly quests = new Map<
    ProgressionQuestId,
    Readonly<ProfessionQuestDefinitionV1>
  >();
  private readonly players = new Map<PlayerId, MutablePlayerProgression>();
  private readonly pendingDeathPenalties =
    new Map<string, PendingDeathPenalty>();
  private readonly committedDeathReservations = new Set<string>();
  private readonly releasedDeathReservations = new Set<string>();

  public constructor(private readonly options: Phase1ProgressionAuthorityOptions) {
    this.progression = options.catalog.getAs(PROGRESSION_ID, 'progression');
    this.quests.set(
      EXPLORER_QUEST,
      options.catalog.getAs(EXPLORER_QUEST, 'profession-quest'),
    );
    this.quests.set(
      ENGINEER_QUEST,
      options.catalog.getAs(ENGINEER_QUEST, 'profession-quest'),
    );
    for (const skillId of SKILL_IDS) {
      options.catalog.getAs(skillId, 'skill');
    }
    for (const professionId of PROFESSION_IDS) {
      options.catalog.getAs(professionId, 'profession');
    }

    for (const snapshot of options.snapshot?.players ?? []) {
      if (this.players.has(snapshot.playerId)) {
        throw new Error('Duplicate player progression snapshot identity.');
      }
      const state = this.mutableFromSnapshot(snapshot);
      this.validatePlayerState(state);
      this.players.set(state.playerId, state);
    }
  }

  public getPlayerView(playerId: PlayerId): Readonly<PlayerProgressionView> {
    return this.toView(this.getOrCreatePlayer(playerId));
  }

  public exportSnapshot(): ProgressionAuthoritySnapshot {
    return Object.freeze({
      players: Object.freeze(
        [...this.players.values()]
          .sort((left, right) => compareStrings(left.playerId, right.playerId))
          .map((state) => this.toSnapshot(state)),
      ),
    });
  }

  public applyEvent(event: ProgressionGameplayEvent): ProgressionApplyResult {
    if (!this.isValidEvent(event)) {
      return Object.freeze({
        status: 'rejected',
        eventId: event.eventId,
        reason: 'INVALID_EVENT',
      });
    }

    const state = this.getOrCreatePlayer(event.playerId);
    const signature = eventSignature(event);
    const previousSignature = state.eventReceipts.get(event.eventId);
    if (previousSignature !== undefined) {
      if (previousSignature !== signature) {
        return Object.freeze({
          status: 'rejected',
          eventId: event.eventId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }
      return Object.freeze({
        status: 'duplicate',
        eventId: event.eventId,
        xpAwarded: 0,
        view: this.toView(state),
        unlockedSkillIds: Object.freeze([]),
        unlockedProfessionIds: Object.freeze([]),
      });
    }

    const skillsBefore = new Set(state.skillIds);
    const professionsBefore = new Set(state.professionIds);
    const revisionBefore = state.revision;
    const xpBefore = state.totalXp;
    const mutationBefore = this.progressionMutationFingerprint(state);

    this.applyPrimaryEvent(state, event);
    this.refreshDerivedUnlocks(state);
    this.advanceQuestObjectives(state, event);
    this.refreshDerivedUnlocks(state);

    const mutationAfter = this.progressionMutationFingerprint(state);
    const changed = mutationAfter !== mutationBefore;
    if (changed) {
      if (state.eventReceipts.size >= MAX_EVENT_RECEIPTS) {
        throw new Error('Phase 1 progression event receipt bound exceeded.');
      }
      state.eventReceipts.set(event.eventId, signature);
      state.revision = revisionBefore + 1;
    }

    const unlockedSkillIds = sortedStrings(
      [...state.skillIds].filter((id) => !skillsBefore.has(id)),
    ) as readonly ProgressionSkillId[];
    const unlockedProfessionIds = sortedStrings(
      [...state.professionIds].filter((id) => !professionsBefore.has(id)),
    ) as readonly ProgressionProfessionId[];

    return Object.freeze({
      status: changed ? 'applied' : 'ignored',
      eventId: event.eventId,
      xpAwarded: state.totalXp - xpBefore,
      view: this.toView(state),
      unlockedSkillIds,
      unlockedProfessionIds,
    });
  }

  public reserveDeathXpPenalty(request: {
    readonly deathId: string;
    readonly playerId: PlayerId;
  }): Readonly<DeathXpPenaltyReservation> {
    if (request.deathId.length === 0 || request.playerId.length === 0) {
      throw new Error('Death XP penalty identity is invalid.');
    }

    const existing = this.pendingDeathPenalties.get(request.deathId);
    if (existing !== undefined) {
      if (existing.reservation.playerId !== request.playerId) {
        throw new Error('DeathId is already bound to another player.');
      }
      return existing.reservation;
    }

    const state = this.getOrCreatePlayer(request.playerId);
    const floor = this.levelFloorXp(state.level);
    const progress = state.totalXp - floor;
    const configured = this.progression.deathXpLoss;
    const xpLoss = progress <= 0
      ? 0
      : Math.max(
          configured.minimumLossWhenProgressPositive,
          Math.floor(
            progress
            * configured.percentCurrentLevelProgress
            / 100,
          ),
        );
    const reservation = Object.freeze({
      reservationId: 'progression-death:' + request.deathId,
      deathId: request.deathId,
      playerId: request.playerId,
      xpLoss,
    });
    this.releasedDeathReservations.delete(reservation.reservationId);
    this.pendingDeathPenalties.set(request.deathId, { reservation });
    return reservation;
  }

  public commitReservedDeathXpPenalty(
    reservation: Readonly<DeathXpPenaltyReservation>,
  ): void {
    if (
      this.committedDeathReservations.has(reservation.reservationId)
      || this.releasedDeathReservations.has(reservation.reservationId)
    ) {
      return;
    }
    const pending = this.pendingDeathPenalties.get(reservation.deathId);
    if (
      pending === undefined
      || pending.reservation.reservationId !== reservation.reservationId
      || pending.reservation.playerId !== reservation.playerId
      || pending.reservation.xpLoss !== reservation.xpLoss
    ) {
      return;
    }

    const state = this.getOrCreatePlayer(reservation.playerId);
    const floor = this.levelFloorXp(state.level);
    const nextXp = Math.max(floor, state.totalXp - reservation.xpLoss);
    if (nextXp !== state.totalXp) {
      state.totalXp = nextXp;
      state.level = this.levelForXp(state.totalXp);
      state.revision += 1;
    }
    this.pendingDeathPenalties.delete(reservation.deathId);
    this.committedDeathReservations.add(reservation.reservationId);
  }

  public releaseDeathXpPenalty(
    reservation: Readonly<DeathXpPenaltyReservation>,
  ): void {
    if (
      this.committedDeathReservations.has(reservation.reservationId)
      || this.releasedDeathReservations.has(reservation.reservationId)
    ) {
      return;
    }
    const pending = this.pendingDeathPenalties.get(reservation.deathId);
    if (
      pending !== undefined
      && pending.reservation.reservationId === reservation.reservationId
    ) {
      this.pendingDeathPenalties.delete(reservation.deathId);
    }
    this.releasedDeathReservations.add(reservation.reservationId);
  }

  private applyPrimaryEvent(
    state: MutablePlayerProgression,
    event: ProgressionGameplayEvent,
  ): void {
    switch (event.type) {
      case 'gather-completed': {
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-gather'
          && candidate.trigger.resourceId === event.resourceId,
        );
        if (rule === null) return;
        if (state.milestoneRuleIds.has(rule.id)) {
          this.awardRepeat(state, 'gather');
        } else {
          this.awardMilestone(state, rule);
        }
        return;
      }
      case 'craft-completed': {
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-craft'
          && candidate.trigger.recipeId === event.recipeId,
        );
        if (rule === null) return;
        if (state.milestoneRuleIds.has(rule.id)) {
          this.awardRepeat(state, 'craft');
        } else {
          this.awardMilestone(state, rule);
        }
        return;
      }
      case 'repair-completed': {
        if (event.conditionAfter <= event.conditionBefore) return;
        const rule = this.requireMilestone('first-condition-repair');
        if (state.milestoneRuleIds.has(rule.id)) {
          this.awardRepeat(state, 'repair');
        } else {
          this.awardMilestone(state, rule);
        }
        return;
      }
      case 'structure-placed': {
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-structure-placement'
          && candidate.trigger.structureId === event.structureId,
        );
        if (rule !== null) this.awardMilestone(state, rule);
        return;
      }
      case 'machine-output-collected': {
        if (event.quantity <= 0) return;
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-machine-output-collect'
          && candidate.trigger.machineId === event.machineId
          && candidate.trigger.itemId === event.itemId,
        );
        if (rule !== null) this.awardMilestone(state, rule);
        return;
      }
      case 'expedition-band-entered':
        this.awardMilestone(
          state,
          this.requireMilestone('first-expedition-band-entry'),
        );
        return;
      case 'ruin-located': {
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-ruin-locate'
          && candidate.trigger.ruinId === event.ruinId,
        );
        if (rule !== null) this.awardMilestone(state, rule);
        return;
      }
      case 'ruin-inspected': {
        const rule = this.findMilestone((candidate) =>
          candidate.trigger.type === 'first-ruin-inspect'
          && candidate.trigger.ruinId === event.ruinId,
        );
        if (rule !== null) this.awardMilestone(state, rule);
        return;
      }
      case 'hostile-resolved': {
        if (!event.eligibleParticipant) return;
        const base = this.requireMilestone(
          'hostile-resolution:territorial-predator-base',
        );
        const topUp = this.requireMilestone(
          'hostile-resolution:territorial-predator-kill-top-up',
        );
        if (event.resolution === 'retreat') {
          this.awardMilestone(state, base);
          return;
        }
        this.awardMilestone(state, base);
        this.awardMilestone(state, topUp);
        return;
      }
      case 'own-death-cache-recovered':
        if (event.quantity > 0) {
          this.awardMilestone(
            state,
            this.requireMilestone('first-own-death-cache-recovery'),
          );
        }
        return;
      case 'returned-to-base-alive':
      case 'structures-present':
      case 'powered-machine-interacted':
        return;
    }
  }

  private advanceQuestObjectives(
    state: MutablePlayerProgression,
    event: ProgressionGameplayEvent,
  ): void {
    for (const questId of QUEST_IDS) {
      const quest = this.requireQuest(questId);
      const progress = state.questStates.get(questId);
      if (
        progress === undefined
        || progress.completed
        || !this.isQuestEligible(state, quest)
      ) {
        continue;
      }
      const objective = quest.objectives[progress.completedObjectives];
      if (
        objective === undefined
        || !this.eventMatchesObjective(event, objective)
      ) {
        continue;
      }

      progress.completedObjectives += 1;
      if (progress.completedObjectives !== quest.objectives.length) {
        continue;
      }

      progress.completed = true;
      const professionId = quest.rewardProfessionId as ProgressionProfessionId;
      state.professionIds.add(professionId);
      this.awardXp(state, quest.rewardXp);
    }
  }

  private eventMatchesObjective(
    event: ProgressionGameplayEvent,
    objective: Readonly<ProfessionQuestDefinitionV1['objectives'][number]>,
  ): boolean {
    switch (objective.type) {
      case 'locate-ruin':
        return event.type === 'ruin-located'
          && event.ruinId === objective.ruinId;
      case 'inspect-ruin':
        return event.type === 'ruin-inspected'
          && event.ruinId === objective.ruinId;
      case 'return-alive-to-any-structure':
        return event.type === 'returned-to-base-alive'
          && event.alive
          && objective.structureIds.includes(event.structureId);
      case 'structures-present':
        return event.type === 'structures-present'
          && objective.structureIds.every(
            (id) => event.structureIds.includes(id),
          );
      case 'interact-powered-machine':
        return event.type === 'powered-machine-interacted'
          && event.powered
          && event.machineId === objective.machineId;
      case 'collect-machine-output':
        return event.type === 'machine-output-collected'
          && event.machineId === objective.machineId
          && event.itemId === objective.itemId
          && event.quantity >= objective.quantity;
    }
  }

  private refreshDerivedUnlocks(state: MutablePlayerProgression): void {
    if (
      state.level >= 2
      && state.milestoneRuleIds.has('first-expedition-band-entry')
    ) {
      state.skillIds.add(FIELDCRAFT_SKILL);
    }
    if (
      state.level >= 2
      && state.milestoneRuleIds.has('first-condition-repair')
    ) {
      state.skillIds.add(MAINTENANCE_SKILL);
    }

    const explorer = state.questStates.get(EXPLORER_QUEST);
    const explorerDefinition = this.requireQuest(EXPLORER_QUEST);
    if (
      explorer !== undefined
      && !explorer.completed
      && this.isQuestEligible(state, explorerDefinition)
    ) {
      let completed = explorer.completedObjectives;
      if (
        completed === 0
        && state.milestoneRuleIds.has(
          'first-ruin-locate:previous-civilization-ruin',
        )
      ) {
        completed = 1;
      }
      if (
        completed === 1
        && state.milestoneRuleIds.has(
          'first-ruin-inspect:previous-civilization-ruin',
        )
      ) {
        completed = 2;
      }
      explorer.completedObjectives = completed;
    }
  }

  private awardMilestone(
    state: MutablePlayerProgression,
    rule: Readonly<MilestoneXpRuleV1>,
  ): void {
    if (state.milestoneRuleIds.has(rule.id)) return;
    state.milestoneRuleIds.add(rule.id);
    this.awardXp(state, rule.xp);
  }

  private awardRepeat(
    state: MutablePlayerProgression,
    kind: ProgressionRepeatKind,
  ): void {
    const rule = this.requireRepeatRule(kind);
    if (state.repeatCounts[kind] >= rule.maxRewardedActions) return;
    state.repeatCounts[kind] += 1;
    this.awardXp(state, rule.xpPerRewardedAction);
  }

  private awardXp(state: MutablePlayerProgression, amount: number): void {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error('Progression XP award is invalid.');
    }
    if (amount === 0) return;
    const next = state.totalXp + amount;
    if (!Number.isSafeInteger(next)) {
      throw new Error('Progression XP exceeded safe integer range.');
    }
    state.totalXp = next;
    state.level = this.levelForXp(next);
  }

  private levelForXp(totalXp: number): number {
    let level = 1;
    for (const threshold of this.progression.levelThresholds) {
      if (totalXp >= threshold.totalXpRequired) {
        level = threshold.level;
      }
    }
    return level;
  }

  private levelFloorXp(level: number): number {
    const threshold = this.progression.levelThresholds.find(
      (candidate) => candidate.level === level,
    );
    if (threshold === undefined) {
      throw new Error('Current progression level has no configured floor.');
    }
    return threshold.totalXpRequired;
  }

  private findMilestone(
    predicate: (rule: Readonly<MilestoneXpRuleV1>) => boolean,
  ): Readonly<MilestoneXpRuleV1> | null {
    return this.progression.milestoneRules.find(predicate) ?? null;
  }

  private requireMilestone(id: string): Readonly<MilestoneXpRuleV1> {
    const rule = this.progression.milestoneRules.find(
      (candidate) => candidate.id === id,
    );
    if (rule === undefined) {
      throw new Error('Missing required progression milestone rule: ' + id);
    }
    return rule;
  }

  private requireRepeatRule(
    kind: ProgressionRepeatKind,
  ): Readonly<RepeatXpRuleV1> {
    const rule = this.progression.repeatRules.find(
      (candidate) => candidate.triggerType === kind,
    );
    if (rule === undefined) {
      throw new Error('Missing required progression repeat rule: ' + kind);
    }
    return rule;
  }

  private requireQuest(
    id: ProgressionQuestId,
  ): Readonly<ProfessionQuestDefinitionV1> {
    const quest = this.quests.get(id);
    if (quest === undefined) {
      throw new Error('Missing required progression quest: ' + id);
    }
    return quest;
  }

  private isQuestEligible(
    state: MutablePlayerProgression,
    quest: Readonly<ProfessionQuestDefinitionV1>,
  ): boolean {
    return state.level >= quest.minimumLevel
      && state.skillIds.has(quest.requiredSkillId as ProgressionSkillId);
  }

  private getOrCreatePlayer(playerId: PlayerId): MutablePlayerProgression {
    const existing = this.players.get(playerId);
    if (existing !== undefined) return existing;
    if (playerId.length === 0) {
      throw new Error('Progression player identity is empty.');
    }
    const created: MutablePlayerProgression = {
      playerId,
      revision: 0,
      totalXp: 0,
      level: 1,
      milestoneRuleIds: new Set(),
      repeatCounts: { gather: 0, craft: 0, repair: 0 },
      skillIds: new Set(),
      questStates: new Map(
        QUEST_IDS.map((questId) => [
          questId,
          {
            questId,
            completedObjectives: 0,
            completed: false,
          },
        ]),
      ),
      professionIds: new Set(),
      eventReceipts: new Map(),
    };
    this.players.set(playerId, created);
    return created;
  }

  private progressionMutationFingerprint(
    state: MutablePlayerProgression,
  ): string {
    return JSON.stringify([
      state.totalXp,
      state.level,
      sortedStrings(state.milestoneRuleIds),
      [
        state.repeatCounts.gather,
        state.repeatCounts.craft,
        state.repeatCounts.repair,
      ],
      sortedStrings(state.skillIds),
      QUEST_IDS.map((questId) => {
        const quest = state.questStates.get(questId);
        return quest === undefined
          ? null
          : [
              quest.questId,
              quest.completedObjectives,
              quest.completed,
            ];
      }),
      sortedStrings(state.professionIds),
    ]);
  }

  private toView(
    state: MutablePlayerProgression,
  ): Readonly<PlayerProgressionView> {
    const quests: ProgressionQuestView[] = QUEST_IDS.map((questId) => {
      const definition = this.requireQuest(questId);
      const progress = state.questStates.get(questId);
      if (progress === undefined) {
        throw new Error('Progression quest state is missing.');
      }
      const status = progress.completed
        ? 'completed'
        : !this.isQuestEligible(state, definition)
          ? 'locked'
          : progress.completedObjectives === 0
            ? 'available'
            : 'in-progress';
      return Object.freeze({
        questId,
        status,
        completedObjectives: progress.completedObjectives,
        totalObjectives: definition.objectives.length,
      });
    });

    return Object.freeze({
      playerId: state.playerId,
      revision: state.revision,
      totalXp: state.totalXp,
      level: state.level,
      milestoneRuleIds: sortedStrings(state.milestoneRuleIds),
      repeatCounts: Object.freeze({ ...state.repeatCounts }),
      skillIds: sortedStrings(state.skillIds) as readonly ProgressionSkillId[],
      quests: Object.freeze(quests),
      professionIds:
        sortedStrings(state.professionIds) as readonly ProgressionProfessionId[],
    });
  }

  private toSnapshot(
    state: MutablePlayerProgression,
  ): PlayerProgressionSnapshot {
    const questStates: ProgressionQuestSnapshot[] = QUEST_IDS.map((questId) => {
      const value = state.questStates.get(questId);
      if (value === undefined) {
        throw new Error('Progression quest state is missing.');
      }
      return Object.freeze({ ...value });
    });
    const eventReceipts: ProgressionEventReceipt[] = [
      ...state.eventReceipts.entries(),
    ]
      .sort((left, right) => compareStrings(left[0], right[0]))
      .map(([eventId, signature]) => Object.freeze({ eventId, signature }));

    return Object.freeze({
      playerId: state.playerId,
      revision: state.revision,
      totalXp: state.totalXp,
      level: state.level,
      milestoneRuleIds: sortedStrings(state.milestoneRuleIds),
      repeatCounts: Object.freeze({ ...state.repeatCounts }),
      skillIds: sortedStrings(state.skillIds) as readonly ProgressionSkillId[],
      questStates: Object.freeze(questStates),
      professionIds:
        sortedStrings(state.professionIds) as readonly ProgressionProfessionId[],
      eventReceipts: Object.freeze(eventReceipts),
    });
  }

  private mutableFromSnapshot(
    snapshot: Readonly<PlayerProgressionSnapshot>,
  ): MutablePlayerProgression {
    const questStates = new Map<ProgressionQuestId, MutableQuestState>();
    for (const quest of snapshot.questStates) {
      if (questStates.has(quest.questId)) {
        throw new Error('Duplicate progression quest snapshot identity.');
      }
      questStates.set(quest.questId, { ...quest });
    }
    const eventReceipts = new Map<string, string>();
    for (const receipt of snapshot.eventReceipts) {
      if (eventReceipts.has(receipt.eventId)) {
        throw new Error('Duplicate progression event receipt.');
      }
      eventReceipts.set(receipt.eventId, receipt.signature);
    }
    return {
      playerId: snapshot.playerId,
      revision: snapshot.revision,
      totalXp: snapshot.totalXp,
      level: snapshot.level,
      milestoneRuleIds: new Set(snapshot.milestoneRuleIds),
      repeatCounts: { ...snapshot.repeatCounts },
      skillIds: new Set(snapshot.skillIds),
      questStates,
      professionIds: new Set(snapshot.professionIds),
      eventReceipts,
    };
  }

  private validatePlayerState(state: MutablePlayerProgression): void {
    if (
      state.playerId.length === 0
      || !Number.isSafeInteger(state.revision)
      || state.revision < 0
      || !Number.isSafeInteger(state.totalXp)
      || state.totalXp < 0
      || state.level !== this.levelForXp(state.totalXp)
    ) {
      throw new Error('Progression player scalar state is corrupt.');
    }

    const knownMilestones = new Set(
      this.progression.milestoneRules.map((rule) => rule.id),
    );
    if (
      state.milestoneRuleIds.size
        !== [...state.milestoneRuleIds].length
      || [...state.milestoneRuleIds].some(
        (id) => !knownMilestones.has(id),
      )
    ) {
      throw new Error('Progression milestone state is corrupt.');
    }

    for (const kind of ['gather', 'craft', 'repair'] as const) {
      const value = state.repeatCounts[kind];
      const rule = this.requireRepeatRule(kind);
      if (
        !Number.isSafeInteger(value)
        || value < 0
        || value > rule.maxRewardedActions
      ) {
        throw new Error('Progression repeat counter is corrupt.');
      }
    }

    if (
      state.eventReceipts.size > MAX_EVENT_RECEIPTS
      || [...state.eventReceipts].some(
        ([eventId, signature]) =>
          eventId.length === 0 || signature.length === 0,
      )
    ) {
      throw new Error('Progression event receipt state is corrupt.');
    }

    if (
      [...state.skillIds].some((id) => !SKILL_IDS.includes(id))
      || [...state.professionIds].some(
        (id) => !PROFESSION_IDS.includes(id),
      )
    ) {
      throw new Error('Progression unlock state contains unknown IDs.');
    }

    if (state.questStates.size !== QUEST_IDS.length) {
      throw new Error('Progression quest state set is incomplete.');
    }
    for (const questId of QUEST_IDS) {
      const progress = state.questStates.get(questId);
      const definition = this.requireQuest(questId);
      if (
        progress === undefined
        || !Number.isSafeInteger(progress.completedObjectives)
        || progress.completedObjectives < 0
        || progress.completedObjectives > definition.objectives.length
        || progress.completed
          !== (progress.completedObjectives === definition.objectives.length)
      ) {
        throw new Error('Progression quest state is corrupt.');
      }
    }

    const expectedFieldcraft = state.level >= 2
      && state.milestoneRuleIds.has('first-expedition-band-entry');
    const expectedMaintenance = state.level >= 2
      && state.milestoneRuleIds.has('first-condition-repair');
    if (
      state.skillIds.has(FIELDCRAFT_SKILL) !== expectedFieldcraft
      || state.skillIds.has(MAINTENANCE_SKILL) !== expectedMaintenance
    ) {
      throw new Error('Progression prerequisite skill state is corrupt.');
    }

    const explorer = state.questStates.get(EXPLORER_QUEST);
    const engineer = state.questStates.get(ENGINEER_QUEST);
    if (
      explorer === undefined
      || engineer === undefined
      || state.professionIds.has(EXPLORER_PROFESSION) !== explorer.completed
      || state.professionIds.has(ENGINEER_PROFESSION) !== engineer.completed
    ) {
      throw new Error('Progression profession state is corrupt.');
    }
  }

  private isValidEvent(event: ProgressionGameplayEvent): boolean {
    if (event.eventId.length === 0 || event.playerId.length === 0) {
      return false;
    }
    try {
      switch (event.type) {
        case 'gather-completed':
          this.options.catalog.getAs(event.resourceId, 'resource');
          return this.findMilestone((rule) =>
            rule.trigger.type === 'first-gather'
            && rule.trigger.resourceId === event.resourceId,
          ) !== null;
        case 'craft-completed':
          this.options.catalog.getAs(event.recipeId, 'recipe');
          return this.findMilestone((rule) =>
            rule.trigger.type === 'first-craft'
            && rule.trigger.recipeId === event.recipeId,
          ) !== null;
        case 'repair-completed':
          return Number.isFinite(event.conditionBefore)
            && Number.isFinite(event.conditionAfter)
            && event.conditionAfter > event.conditionBefore;
        case 'structure-placed':
          this.options.catalog.getAs(event.structureId, 'structure');
          return this.findMilestone((rule) =>
            rule.trigger.type === 'first-structure-placement'
            && rule.trigger.structureId === event.structureId,
          ) !== null;
        case 'machine-output-collected':
          this.options.catalog.getAs(event.machineId, 'machine');
          this.options.catalog.getAs(event.itemId, 'item');
          return Number.isSafeInteger(event.quantity)
            && event.quantity > 0;
        case 'expedition-band-entered':
          return true;
        case 'ruin-located':
        case 'ruin-inspected':
          this.options.catalog.getAs(event.ruinId, 'ruin');
          return true;
        case 'returned-to-base-alive':
          this.options.catalog.getAs(event.structureId, 'structure');
          return true;
        case 'structures-present':
          if (event.structureIds.length === 0) return false;
          for (const id of event.structureIds) {
            this.options.catalog.getAs(id, 'structure');
          }
          return true;
        case 'powered-machine-interacted':
          this.options.catalog.getAs(event.machineId, 'machine');
          return true;
        case 'hostile-resolved':
          this.options.catalog.getAs(event.hostileId, 'hostile');
          return event.hostileId === 'hostile:territorial-predator';
        case 'own-death-cache-recovered':
          return Number.isSafeInteger(event.quantity)
            && event.quantity > 0;
      }
    } catch {
      return false;
    }
  }
}
