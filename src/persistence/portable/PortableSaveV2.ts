import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalConnection(
  edge: { readonly aConnectorId: string; readonly bConnectorId: string },
): { readonly aConnectorId: string; readonly bConnectorId: string } {
  const [aConnectorId, bConnectorId] = [edge.aConnectorId, edge.bConnectorId].sort(compareStrings);
  return Object.freeze({ aConnectorId: aConnectorId!, bConnectorId: bConnectorId! });
}

export function canonicalizePortableSaveBundleV2(
  bundle: PortableSaveBundleV2,
): PortableSaveBundleV2 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: Object.freeze({
      ...bundle.world,
      environment: Object.freeze({
        ...bundle.world.environment,
        weatherEvents: Object.freeze([...bundle.world.environment.weatherEvents]
          .sort((a, b) => compareStrings(a.weatherEventId, b.weatherEventId))
          .map((entry) => Object.freeze({ ...entry }))),
      }),
    }),
    players: Object.freeze([...bundle.players]
      .sort((a, b) => compareStrings(a.playerId, b.playerId))
      .map((player) => Object.freeze({
        ...player,
        position: Object.freeze({ ...player.position }),
        equipment: Object.freeze({ ...player.equipment }),
        survival: Object.freeze({ ...player.survival }),
        lifeState: Object.freeze({ ...player.lifeState }),
        progression: Object.freeze({
          ...player.progression,
          completedMilestoneRuleIds: Object.freeze([...player.progression.completedMilestoneRuleIds].sort(compareStrings)),
          repeatRuleCounts: Object.freeze([...player.progression.repeatRuleCounts]
            .sort((a, b) => compareStrings(a.ruleId, b.ruleId))
            .map((entry) => Object.freeze({ ...entry }))),
          unlockedSkillIds: Object.freeze([...player.progression.unlockedSkillIds].sort(compareStrings)),
          professionQuests: Object.freeze([...player.progression.professionQuests]
            .sort((a, b) => compareStrings(a.questDefinitionId, b.questDefinitionId))
            .map((quest) => Object.freeze({
              ...quest,
              completedObjectiveOrdinals: Object.freeze([...quest.completedObjectiveOrdinals].sort((a, b) => a - b)),
            }))),
          unlockedProfessionIds: Object.freeze([...player.progression.unlockedProfessionIds].sort(compareStrings)),
        }),
      }))),
    containers: Object.freeze([...bundle.containers]
      .sort((a, b) => compareStrings(a.containerId, b.containerId))
      .map((container) => Object.freeze({
        ...container,
        owner: Object.freeze({ ...container.owner }),
        stacks: Object.freeze([...container.stacks]
          .sort((a, b) => compareStrings(a.stackId, b.stackId))
          .map((stack) => Object.freeze({ ...stack }))),
      }))),
    chunks: Object.freeze([...bundle.chunks]
      .sort((a, b) => a.coord.x - b.coord.x || a.coord.y - b.coord.y)
      .map((chunk) => Object.freeze({
        ...chunk,
        coord: Object.freeze({ ...chunk.coord }),
        resourceStates: Object.freeze([...chunk.resourceStates].sort((a, b) => compareStrings(a.resourceEntityId, b.resourceEntityId)).map((entry) => Object.freeze({ ...entry }))),
        predatorStates: Object.freeze([...chunk.predatorStates].sort((a, b) => compareStrings(a.entityId, b.entityId)).map((entry) => Object.freeze({ ...entry, encounterAnchor: Object.freeze({ ...entry.encounterAnchor }) }))),
        landmarkStates: Object.freeze([...chunk.landmarkStates].sort((a, b) => compareStrings(a.ruinEntityId, b.ruinEntityId)).map((entry) => Object.freeze({ ...entry }))),
        exploration: Object.freeze({ ...chunk.exploration }),
        createdEntities: Object.freeze([...chunk.createdEntities].sort((a, b) => compareStrings(a.entityId, b.entityId)).map((entry) => Object.freeze({ ...entry, position: Object.freeze({ ...entry.position }) }))),
        structureIds: Object.freeze([...chunk.structureIds].sort(compareStrings)),
        removedGeneratedEntityIds: Object.freeze([...chunk.removedGeneratedEntityIds].sort(compareStrings)),
      }))),
    footholds: Object.freeze([...bundle.footholds]
      .sort((a, b) => compareStrings(a.footholdId, b.footholdId))
      .map((foothold) => Object.freeze({
        ...foothold,
        structureIds: Object.freeze([...foothold.structureIds].sort(compareStrings)),
        connectionEdges: Object.freeze([...foothold.connectionEdges]
          .map(canonicalConnection)
          .sort((a, b) => compareStrings(`${a.aConnectorId}|${a.bConnectorId}`, `${b.aConnectorId}|${b.bConnectorId}`))),
        powerNetwork: Object.freeze({
          ...foothold.powerNetwork,
          grantedConsumerIds: Object.freeze([...foothold.powerNetwork.grantedConsumerIds].sort(compareStrings)),
        }),
      }))),
    structures: Object.freeze([...bundle.structures]
      .sort((a, b) => compareStrings(a.structureId, b.structureId))
      .map((structure) => Object.freeze({
        ...structure,
        position: Object.freeze({ ...structure.position }),
        machine: structure.machine === null ? null : Object.freeze({ ...structure.machine }),
      }))),
  });
}

export function serializePortableSaveBundleV2(bundle: PortableSaveBundleV2): string {
  return JSON.stringify(canonicalizePortableSaveBundleV2(bundle));
}
