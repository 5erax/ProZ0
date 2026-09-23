import type { ContentCatalogV1 } from '../../content';
import type { PlayerId, WorldPosition } from '../../foundation';
import type { PlayerProgressionSnapshot } from '../../simulation/progression';
import type { PlayerSurvivalState } from '../../simulation/survival';
import type { PlayerFacingV1 } from '../schema/v1/PlayerRecordV1';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import { reconstructPlayerLevelV2 } from '../validation/SaveValidatorV2';

export interface PlayerPersistenceSourceV2 {
  readonly worldId: string;
  readonly playerId: PlayerId;
  readonly playerRevision: number;
  readonly authorityTick: number;
  readonly position: WorldPosition;
  readonly facing: PlayerFacingV1;
  readonly inventoryContainerId: string;
  readonly equippedWeaponStackId: string | null;
  readonly equippedThermalWrapStackId: string | null;
  readonly survival: PlayerSurvivalState;
  readonly progression: PlayerProgressionSnapshot;
}

export function playerStateToRecordV2(
  source: PlayerPersistenceSourceV2,
  catalog: ContentCatalogV1,
): PlayerRecordV2 {
  if (source.survival.playerId !== source.playerId
    || source.progression.playerId !== source.playerId
    || source.survival.tick !== source.authorityTick) {
    throw new Error('Player persistence source is not a coherent authority-tick snapshot.');
  }
  const reconstructedLevel = reconstructPlayerLevelV2(source.progression.totalXp, catalog);
  if (reconstructedLevel !== source.progression.level) {
    throw new Error('Runtime progression level disagrees with canonical totalXp thresholds.');
  }
  const progressionDefinition = catalog.getAs('progression:phase1-early-progression', 'progression');
  const repeatRuleCounts = progressionDefinition.repeatRules.map((rule) => Object.freeze({
    ruleId: rule.id,
    count: source.progression.repeatCounts[rule.triggerType],
  }));
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'player',
    worldId: source.worldId,
    playerId: source.playerId,
    playerRevision: source.playerRevision,
    position: Object.freeze({ ...source.position }),
    facing: source.facing,
    inventoryContainerId: source.inventoryContainerId,
    equipment: Object.freeze({
      equippedWeaponStackId: source.equippedWeaponStackId,
      equippedThermalWrapStackId: source.equippedThermalWrapStackId,
    }),
    survival: Object.freeze({
      revision: source.survival.revision,
      healthMilli: source.survival.healthMilli,
      foodMilli: source.survival.foodMilli,
      waterMilli: source.survival.waterMilli,
      staminaMilli: source.survival.staminaMilli,
      temperatureMilli: source.survival.temperatureMilli,
      waterDrainRemainder: source.survival.waterDrainRemainder,
      foodDrainRemainder: source.survival.foodDrainRemainder,
      thermalRemainder: source.survival.thermalRemainder,
      staminaRegenRemainder: source.survival.staminaRegenRemainder,
      lastStaminaSpendTick: source.survival.lastStaminaSpendTick,
      nextCriticalDehydrationDamageTick: source.survival.nextCriticalDehydrationDamageTick,
      nextCriticalStarvationDamageTick: source.survival.nextCriticalStarvationDamageTick,
      nextTemperatureDamageTick: source.survival.nextTemperatureDamageTick,
    }),
    lifeState: Object.freeze({ ...source.survival.lifeState }),
    progression: Object.freeze({
      revision: source.progression.revision,
      totalXp: source.progression.totalXp,
      completedMilestoneRuleIds: Object.freeze([...source.progression.milestoneRuleIds]),
      repeatRuleCounts: Object.freeze(repeatRuleCounts),
      unlockedSkillIds: Object.freeze([...source.progression.skillIds]),
      professionQuests: Object.freeze(source.progression.questStates.map((quest) => Object.freeze({
        questDefinitionId: quest.questId,
        completedObjectiveOrdinals: Object.freeze(
          Array.from({ length: quest.completedObjectives }, (_, ordinal) => ordinal),
        ),
        completed: quest.completed,
      }))),
      unlockedProfessionIds: Object.freeze([...source.progression.professionIds]),
    }),
  });
}

export function playerRecordV2ToSurvivalState(
  record: PlayerRecordV2,
  authorityTick: number,
): PlayerSurvivalState {
  return Object.freeze({
    playerId: record.playerId,
    tick: authorityTick,
    ...record.survival,
    lifeState: Object.freeze({ ...record.lifeState }),
  });
}

export function playerRecordV2ToProgressionSnapshot(
  record: PlayerRecordV2,
  catalog: ContentCatalogV1,
): PlayerProgressionSnapshot {
  const progressionDefinition = catalog.getAs('progression:phase1-early-progression', 'progression');
  const repeatCounts = { gather: 0, craft: 0, repair: 0 };
  for (const entry of record.progression.repeatRuleCounts) {
    const rule = progressionDefinition.repeatRules.find((candidate) => candidate.id === entry.ruleId);
    if (rule === undefined) throw new Error(`Unknown progression repeat rule ${entry.ruleId}.`);
    repeatCounts[rule.triggerType] = entry.count;
  }
  return Object.freeze({
    playerId: record.playerId,
    revision: record.progression.revision,
    totalXp: record.progression.totalXp,
    level: reconstructPlayerLevelV2(record.progression.totalXp, catalog),
    milestoneRuleIds: Object.freeze([...record.progression.completedMilestoneRuleIds]),
    repeatCounts: Object.freeze(repeatCounts),
    skillIds: Object.freeze([...record.progression.unlockedSkillIds] as PlayerProgressionSnapshot['skillIds']),
    questStates: Object.freeze(record.progression.professionQuests.map((quest) => Object.freeze({
      questId: quest.questDefinitionId as PlayerProgressionSnapshot['questStates'][number]['questId'],
      completedObjectives: quest.completedObjectiveOrdinals.length,
      completed: quest.completed,
    }))),
    professionIds: Object.freeze([...record.progression.unlockedProfessionIds] as PlayerProgressionSnapshot['professionIds']),
    eventReceipts: Object.freeze([]),
  });
}
