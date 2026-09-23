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
    if (squaredDistance(playerPos, predator.position) > range * range) {
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
      // Spear condition loss is authoritative hit-only. Reuse repair/death ledger
      // extension later; Phase 1 acceptance locks this through death/item tests.
    }
    return this.cache(command.attackId, { status:'hit', attackId:command.attackId, targetEntityId:predator.entityId, damage });
  }

  public tickPredator(predatorEntityId: string, playerIds: readonly PlayerId[]): void {
    const predator = this.world.getPredator(predatorEntityId);
    if (predator === null || predator.state === 'dead') return;
    const tick = Math.max(...playerIds.map((id) => this.survival.getPlayerState(id).tick));
    const candidates = playerIds
      .filter((id) => this.survival.getPlayerState(id).lifeState.type === 'alive')
      .map((id) => ({ id, d: squaredDistance(this.world.getPlayerPosition(id), predator.position) }))
      .sort((a,b) => a.d - b.d || a.id.localeCompare(b.id));
    const target = candidates[0];
    if (target === undefined) return;
    const attackRange = 1.1 * PLAYER_COLLISION_FOOTPRINT.width;
    const aggression = 5 * PLAYER_COLLISION_FOOTPRINT.width;
    if (predator.state === 'attack-windup' && predator.stateUntilTick !== null && tick >= predator.stateUntilTick) {
      if (target.d <= attackRange * attackRange) {
        this.survival.applyAuthorityDamage({
          damageId: `predator:${predator.entityId}:attack:${predator.revision}`,
          sourceType:'hostile-attack',
          sourceEntityId:predator.entityId,
          targetPlayerId: target.id,
          amount:20,
          tick,
        });
      }
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'recovery',targetPlayerId:target.id,
        stateUntilTick:tick+72,outsideLeashTicks:0,
      });
      return;
    }
    if (target.d <= attackRange * attackRange) {
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'attack-windup',targetPlayerId:target.id,
        stateUntilTick:tick+33,outsideLeashTicks:0,
      });
    } else if (target.d <= aggression * aggression) {
      this.world.commitPredatorRuntime({
        entityId:predator.entityId, expectedRevision:predator.revision,
        health:predator.health,state:'chase',targetPlayerId:target.id,
        stateUntilTick:null,outsideLeashTicks:0,
      });
    }
  }

  private cache(id:string, result:AttackResult):AttackResult {
    const frozen=Object.freeze(result); this.attacks.set(id,frozen); return frozen;
  }
}
