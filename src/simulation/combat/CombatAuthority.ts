import { isKnownMeleeEquipment } from '../../content/livingworld/EquipmentContent';
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

export interface PreparedLivingHunt {
  readonly damage: number;
  readonly cooldownTicks: number;
  readonly toolWear: {readonly stackId:string;readonly conditionCost:number};
  /** Called synchronously only after the item ledger and living candidate validate. */
  readonly commit: () => string | null;
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
    initialCooldowns:Readonly<Record<string,number>> = {},
  ) {
    for(const [id,tick] of Object.entries(initialCooldowns)){
      if(!id||!Number.isSafeInteger(tick)||tick<0)throw Error('Invalid restored combat cooldown');
      this.cooldownUntil.set(id,tick);
    }
  }

  public setEquippedWeapon(playerId: PlayerId, stackId: string | null): void {
    this.equippedWeapon.set(playerId, stackId);
  }

  public prepareLivingHunt(playerId:PlayerId,expectedInventoryRevision:number,target:WorldPosition):PreparedLivingHunt|string {
    const state=this.survival.getPlayerState(playerId),tick=state.tick;
    if(state.lifeState.type!=='alive')return 'PLAYER_DEAD';
    if((this.cooldownUntil.get(playerId)??0)>tick)return 'COOLDOWN';
    const inventory=this.items.getContainerView('inventory:'+playerId);
    if(inventory.revision!==expectedInventoryRevision)return 'STALE_INVENTORY_REVISION';
    const stack=inventory.stacks.find(s=>s.stackId===this.equippedWeapon.get(playerId));
    if(!stack || !isKnownMeleeEquipment(stack.itemDefinitionId))return 'EQUIP_WEAPON_FIRST';
    if(stack.condition===null||stack.condition<=0)return 'BROKEN_WEAPON';
    const profile=this.catalog.getAs(stack.itemDefinitionId,'item').useProfile;
    if(profile?.type!=='melee-weapon')return 'EQUIP_WEAPON_FIRST';
    // Click/Hunt aims at the selected animal. Include its small physical body radius.
    const reach=profile.rangeFootprints*PLAYER_COLLISION_FOOTPRINT.width+.35;
    if(squaredDistance(this.world.getPlayerPosition(playerId),target)>reach*reach)return 'OUT_OF_WEAPON_RANGE';
    if(!this.survival.canSpendStamina(playerId,profile.staminaCost))return 'EXHAUSTED';
    const cooldownTicks=Math.ceil(profile.cooldownSeconds*60);
    return {
      // Existing living wildlife uses a smaller health scale; preserve basic spear's 4 damage.
      damage:Math.max(1,Math.round(profile.damage/6)),cooldownTicks,
      toolWear:{stackId:stack.stackId,conditionCost:profile.conditionCostOnSuccessfulHit},
      commit:()=>{
        if((this.cooldownUntil.get(playerId)??0)>tick)return 'COOLDOWN';
        if(!this.survival.canSpendStamina(playerId,profile.staminaCost))return 'EXHAUSTED';
        this.survival.commitStaminaSpend(playerId,profile.staminaCost,tick);
        this.cooldownUntil.set(playerId,tick+cooldownTicks);return null;
      },
    };
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
    let arcThreshold = Math.SQRT1_2;
    let conditionCost = 1;
    if (weaponStackId !== null) {
      const inv = this.items.getContainerView(command.inventoryContainerId);
      const stack = inv.stacks.find((entry) => entry.stackId === weaponStackId);
      if (
        inv.kind !== 'player-inventory'
        || inv.ownerPlayerId !== command.playerId
        || inv.revision !== command.expectedInventoryRevision
        || stack === undefined
        || !isKnownMeleeEquipment(stack.itemDefinitionId)
        || stack.condition === null
        || stack.condition <= 0
      ) {
        return this.cache(command.attackId, { status:'rejected', attackId:command.attackId, targetEntityId:null, damage:0, reason:'BROKEN_WEAPON' });
      }
      const profile = this.catalog.getAs(stack.itemDefinitionId, 'item').useProfile;
      if (profile?.type !== 'melee-weapon') throw new Error('Equipped weapon has no melee profile.');
      staminaCost = profile.staminaCost;
      damage = profile.damage;
      range = profile.rangeFootprints * PLAYER_COLLISION_FOOTPRINT.width;
      cooldown = Math.ceil(profile.cooldownSeconds * 60);
      arcThreshold = Math.cos(profile.frontalArcDegrees * Math.PI / 360);
      conditionCost = profile.conditionCostOnSuccessfulHit;
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
      ) >= arcThreshold;
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
        conditionLoss: conditionCost,
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

    if (predator.state === 'idle' || predator.state === 'patrol') {
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
