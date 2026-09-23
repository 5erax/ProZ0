import type { ContentCatalogV1 } from '../../content';
import type { PlayerId, WorldPosition } from '../../foundation';
import type { SurvivalWorldPort } from '../../world/api/SurvivalWorld';
import type { Phase1ItemAuthority } from '../items';
import { PLAYER_COLLISION_FOOTPRINT } from '../player/PlayerCollisionFootprint';
import type { Phase1SurvivalAuthority } from '../survival';

export interface AttackCommand {
  readonly attackId: string;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: string;
  readonly expectedInventoryRevision: number;
  readonly facingX: number;
  readonly facingY: number;
}

export interface AttackResult {
  readonly status: 'hit' | 'miss' | 'rejected' | 'duplicate';
  readonly attackId: string;
  readonly targetEntityId: string | null;
  readonly damage: number;
  readonly reason?: 'DEAD' | 'EXHAUSTED' | 'COOLDOWN' | 'BROKEN_WEAPON';
}

function squaredDistance(a: WorldPosition, b: WorldPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export class Phase1CombatAuthority {
  private readonly equippedWeapon = new Map<PlayerId, string | null>();
  private readonly cooldownUntil = new Map<PlayerId, number>();
  private readonly attacks = new Map<string, AttackResult>();

  public constructor(
    private readonly catalog: ContentCatalogV1,
    private readonly survival: Phase1SurvivalAuthority,
    private readonly items: Phase1ItemAuthority,
    private readonly world: SurvivalWorldPort,
  ) {}

  public setEquippedWeapon(playerId: PlayerId, stackId: string | null): void {
    this.equippedWeapon.set(playerId, stackId);
  }

  public submitAttack(
    command: AttackCommand,
    predatorEntityId: string,
  ): AttackResult {
    const cached = this.attacks.get(command.attackId);
    if (cached !== undefined) {
      return Object.freeze({ ...cached, status: 'duplicate' });
    }
    const state = this.survival.getPlayerState(command.playerId);
    if (state.lifeState.type !== 'alive') {
      return this.cache(command.attackId, { status:'rejected', attackId:command.attackId, targetEntityId:null, damage:0, reason:'DEAD' });
    }
    const tick = state.tick;
    if ((this.cooldownUntil.get(command.playerId) ?? 0) > tick) {
      return this.cache(command.attackId, { status:'rejected', attackId:command.attackId, targetEntityId:null, damage:0, reason:'COOLDOWN' });
    }

    const weaponStackId = this.equippedWeapon.get(command.playerId) ?? null;
    let staminaCost = 10;
    let damage = 5;
    let range = 0.8 * PLAYER_COLLISION_FOOTPRINT.width;
    let cooldown = 48;
    let spear = false;
    if (weaponStackId !== null) {
      const inv = this.items.getContainerView(command.inventoryContainerId);
      const stack = inv.stacks.find((entry) => entry.stackId === weaponStackId);
      if (
        inv.revision !== command.expectedInventoryRevision
        || stack === undefined
        || stack.itemDefinitionId !== 'item:basic-spear'
        || stack.condition === null
        || stack.condition <= 0
      ) {
        return this.cache(command.attackId, { status:'rejected', attackId:command.attackId, targetEntityId:null, damage:0, reason:'BROKEN_WEAPON' });
      }
      this.catalog.getAs('item:basic-spear', 'item');
      staminaCost = 15;
      damage = 25;
      range = 1.5 * PLAYER_COLLISION_FOOTPRINT.width;
      cooldown = 39;
      spear = true;
    }
    if (!this.survival.canSpendStamina(command.playerId, staminaCost)) {
      return this.cache(command.attackId, { status:'rejected', attackId:command.attackId, targetEntityId:null, damage:0, reason:'EXHAUSTED' });
    }
    this.survival.commitStaminaSpend(command.playerId, staminaCost, tick);
    this.cooldownUntil.set(command.playerId, tick + cooldown);

    const predator = this.world.getPredator(predatorEntityId);
    if (predator === null || predator.state === 'dead') {
      return this.cache(command.attackId, { status:'miss', attackId:command.attackId, targetEntityId:null, damage:0 });
    }
    const playerPos = this.world.getPlayerPosition(command.playerId);
    const dx = predator.position.x - playerPos.x;
    const dy = predator.position.y - playerPos.y;
    const distanceSquared = dx * dx + dy * dy;
    const facingLength = Math.hypot(command.facingX, command.facingY);
    const targetLength = Math.sqrt(distanceSquared);
    const inArc =
      facingLength > 0
      && targetLength > 0
      && (
        (command.facingX * dx + command.facingY * dy)
        / (facingLength * targetLength)
      ) >= Math.SQRT1_2;
    if (distanceSquared > range * range || !inArc) {
      return this.cache(command.attackId, { status:'miss', attackId:command.attackId, targetEntityId:null, damage:0 });
    }
    const nextHealth = Math.max(0, predator.health - damage);
    const updated = this.world.commitPredatorRuntime({
      entityId: predator.entityId,
      expectedRevision: predator.revision,
      health: nextHealth,
      state: nextHealth === 0 ? 'dead' : 'chase',
      targetPlayerId: nextHealth === 0 ? null : command.playerId,
      stateUntilTick: null,
      outsideLeashTicks: 0,
    });
    if (updated === null) {
      return this.cache(command.attackId, { status:'miss', attackId:command.attackId, targetEntityId:null, damage:0 });
    }
    if (spear && weaponStackId !== null) {
      const wear = this.items.execute({
        type: 'wear',
        operationId: `attack-wear:${command.attackId}`,
        playerId: command.playerId,
        inventoryContainerId: command.inventoryContainerId,
        expectedInventoryRevision: command.expectedInventoryRevision,
        targetStackId: weaponStackId,
        conditionLoss: 1,
      });
      if (wear.status !== 'committed') {
        throw new Error('Validated spear hit condition mutation failed.');
      }
    }
    return this.cache(command.attackId, { status:'hit', attackId:command.attackId, targetEntityId:predator.entityId, damage });
  }

  public tickPredator(predatorEntityId: string, playerIds: readonly PlayerId[]): void {
    const predator = this.world.getPredator(predatorEntityId);
    if (predator === null || predator.state === 'dead' || playerIds.length === 0) return;
    const tick = Math.max(...playerIds.map((id) => this.survival.getPlayerState(id).tick));
    const alive = playerIds
      .filter((id) => this.survival.getPlayerState(id).lifeState.type === 'alive')
      .map((id) => ({
        id,
        dPredator: squaredDistance(this.world.getPlayerPosition(id), predator.position),
        dAnchor: squaredDistance(this.world.getPlayerPosition(id), predator.encounterAnchor),
      }))
      .sort((a,b) => a.dPredator - b.dPredator || a.id.localeCompare(b.id));
    if (alive.length === 0) return;

    const attackRange = 1.1 * PLAYER_COLLISION_FOOTPRINT.width;
    const aggression = 5 * PLAYER_COLLISION_FOOTPRINT.width;
    const leash = 12 * PLAYER_COLLISION_FOOTPRINT.width;

    if (predator.state === 'recovery') {
      if (predator.stateUntilTick !== null && tick < predator.stateUntilTick) return;
      const target = alive[0];
      if (target === undefined) return;
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'chase',targetPlayerId:target.id,
        stateUntilTick:null,outsideLeashTicks:0,
      });
      return;
    }

    if (predator.state === 'alert') {
      if (predator.stateUntilTick !== null && tick < predator.stateUntilTick) return;
      const target = alive[0];
      if (target === undefined) return;
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'chase',targetPlayerId:target.id,
        stateUntilTick:null,outsideLeashTicks:0,
      });
      return;
    }

    if (predator.state === 'attack-windup') {
      const locked = predator.targetPlayerId === null
        ? undefined
        : alive.find((candidate) => candidate.id === predator.targetPlayerId);
      if (predator.stateUntilTick !== null && tick < predator.stateUntilTick) return;
      if (locked !== undefined && locked.dPredator <= attackRange * attackRange) {
        this.survival.applyAuthorityDamage({
          damageId: `predator:${predator.entityId}:attack:${predator.revision}`,
          sourceType:'hostile-attack',
          sourceEntityId:predator.entityId,
          targetPlayerId: locked.id,
          amount:20,
          tick,
        });
      }
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'recovery',
        targetPlayerId:locked?.id ?? null,
        stateUntilTick:tick+72,outsideLeashTicks:0,
      });
      return;
    }

    if (predator.state === 'return') {
      if (squaredDistance(predator.position, predator.encounterAnchor) <= 0.000001) {
        this.world.commitPredatorRuntime({
          entityId:predator.entityId,expectedRevision:predator.revision,
          health:predator.health,state:'idle',targetPlayerId:null,
          stateUntilTick:null,outsideLeashTicks:0,
        });
      }
      return;
    }

    const currentTarget = predator.targetPlayerId === null
      ? undefined
      : alive.find((candidate) => candidate.id === predator.targetPlayerId);
    const target = currentTarget ?? alive[0];
    if (target === undefined) return;

    if (predator.state === 'idle') {
      if (target.dPredator <= aggression * aggression) {
        this.world.commitPredatorRuntime({
          entityId:predator.entityId,expectedRevision:predator.revision,
          health:predator.health,state:'alert',targetPlayerId:target.id,
          stateUntilTick:tick+24,outsideLeashTicks:0,
        });
      }
      return;
    }

    const outsideLeash = target.dAnchor > leash * leash;
    const outsideTicks = outsideLeash ? predator.outsideLeashTicks + 1 : 0;
    if (outsideTicks >= 120) {
      this.world.commitPredatorRuntime({
        entityId:predator.entityId,expectedRevision:predator.revision,
        health:predator.health,state:'return',targetPlayerId:null,
        stateUntilTick:null,outsideLeashTicks:outsideTicks,
      });
      return;
    }

    if (target.dPredator <= attackRange * attackRange) {
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'attack-windup',targetPlayerId:target.id,
        stateUntilTick:tick+33,outsideLeashTicks:outsideTicks,
      });
    } else {
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'chase',targetPlayerId:target.id,
        stateUntilTick:null,outsideLeashTicks:outsideTicks,
      });
    }
  }

  private cache(id:string, result:AttackResult):AttackResult {
    const frozen=Object.freeze(result); this.attacks.set(id,frozen); return frozen;
  }
}
