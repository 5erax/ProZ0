import type { ContentCatalogV1 } from '../../content';
import type {
  BuildingWorldSnapshot,
  ConnectorState,
  StructureConnection,
} from '../../world/building';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type { ContainerRecordV2 } from '../schema/v2/ContainerRecordV2';
import type { FootholdRecordV2 } from '../schema/v2/FootholdRecordV2';
import type { StructureRecordV2 } from '../schema/v2/StructureRecordV2';

export interface BuildingPersistenceRecordsV2 {
  readonly foothold: FootholdRecordV2;
  readonly structures: readonly StructureRecordV2[];
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function buildingSnapshotToRecordsV2(
  worldId: string,
  snapshot: BuildingWorldSnapshot,
): BuildingPersistenceRecordsV2 {
  const condenserByStructure = new Map(
    snapshot.foothold.condensers.map((entry) => [entry.structureId, entry]),
  );
  const structures = snapshot.foothold.structures.map((structure): StructureRecordV2 => {
    const condenser = condenserByStructure.get(structure.structureId) ?? null;
    return Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'structure',
      worldId,
      footholdId: snapshot.foothold.footholdId,
      structureId: structure.structureId,
      structureDefinitionId: structure.definitionId,
      revision: structure.revision,
      position: Object.freeze({ ...structure.position }),
      orientationQuarterTurns: structure.orientationQuarterTurns,
      placedByPlayerId: structure.placedByPlayerId,
      outputContainerId: condenser?.outputContainerId ?? null,
      machine: condenser === null ? null : Object.freeze({
        enabled: condenser.enabled,
        productionProgressTicks: condenser.productionProgressTicks,
        completedCycleOrdinal: condenser.completedCycleOrdinal,
      }),
    });
  });
  const foothold: FootholdRecordV2 = Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'foothold',
    worldId,
    footholdId: snapshot.foothold.footholdId,
    buildRevision: snapshot.foothold.buildRevision,
    structureIds: Object.freeze(snapshot.foothold.structures.map((entry) => entry.structureId).sort(compareStrings)),
    connectionEdges: Object.freeze(snapshot.foothold.connections.map((connection) => {
      const [aConnectorId, bConnectorId] = [connection.a, connection.b].sort(compareStrings);
      return Object.freeze({ aConnectorId: aConnectorId!, bConnectorId: bConnectorId! });
    })),
    powerNetwork: Object.freeze({
      revision: snapshot.foothold.power.revision,
      producerStructureId: snapshot.foothold.power.producerStructureId,
      grantedConsumerIds: Object.freeze([...snapshot.foothold.power.grantedConsumerIds].sort(compareStrings)),
    }),
  });
  return Object.freeze({ foothold, structures: Object.freeze(structures) });
}

function persistedConnectionId(a: string, b: string): string {
  return `connection:persisted:${encodeURIComponent(a)}:${encodeURIComponent(b)}`;
}

export function recordsV2ToBuildingSnapshot(
  foothold: FootholdRecordV2,
  structures: readonly StructureRecordV2[],
  containers: readonly ContainerRecordV2[],
  catalog: ContentCatalogV1,
): BuildingWorldSnapshot {
  const linkedContainers = new Map<string, string>();
  for (const container of containers) {
    if (container.owner.type === 'structure') {
      linkedContainers.set(container.owner.structureId, container.containerId);
    }
  }
  const runtimeStructures = structures.map((record) => Object.freeze({
    structureId: record.structureId,
    definitionId: record.structureDefinitionId as BuildingWorldSnapshot['foothold']['structures'][number]['definitionId'],
    revision: record.revision,
    position: Object.freeze({ ...record.position }),
    orientationQuarterTurns: record.orientationQuarterTurns,
    placedByPlayerId: record.placedByPlayerId,
    containerId: record.structureDefinitionId === 'structure:atmospheric-water-condenser'
      ? record.outputContainerId
      : record.structureDefinitionId === 'structure:storage-crate'
        ? linkedContainers.get(record.structureId) ?? null
        : null,
    placementOperationFingerprint: null,
  }));

  const connectorMap = new Map<string, ConnectorState>();
  for (const key of ['east','south','west','north'] as const) {
    const connectorId = `connector:landing:${key}`;
    connectorMap.set(connectorId, Object.freeze({
      connectorId,
      structureId: 'structure-instance:landing-module',
      localConnectorKey: key,
      occupiedByConnectionId: null,
    }));
  }
  for (const structure of runtimeStructures) {
    if (structure.definitionId === 'structure:habitat-room') {
      const connectorId = `connector:${structure.structureId}:habitat`;
      connectorMap.set(connectorId, Object.freeze({
        connectorId,
        structureId: structure.structureId,
        localConnectorKey: 'habitat',
        occupiedByConnectionId: null,
      }));
    }
  }
  const connections: StructureConnection[] = [];
  for (const edge of foothold.connectionEdges) {
    const a = connectorMap.get(edge.aConnectorId);
    const b = connectorMap.get(edge.bConnectorId);
    if (a === undefined || b === undefined) throw new Error('Persisted connector edge cannot be reconstructed.');
    const connectionId = persistedConnectionId(edge.aConnectorId, edge.bConnectorId);
    connectorMap.set(a.connectorId, Object.freeze({ ...a, occupiedByConnectionId: connectionId }));
    connectorMap.set(b.connectorId, Object.freeze({ ...b, occupiedByConnectionId: connectionId }));
    connections.push(Object.freeze({ connectionId, a: edge.aConnectorId, b: edge.bConnectorId }));
  }

  const condenserStates = structures.flatMap((record) => record.machine === null ? [] : [Object.freeze({
    structureId: record.structureId,
    revision: record.revision,
    enabled: record.machine.enabled,
    productionProgressTicks: record.machine.productionProgressTicks,
    completedCycleOrdinal: record.machine.completedCycleOrdinal,
    outputContainerId: record.outputContainerId!,
  })]);
  let capacityPu = 0;
  if (foothold.powerNetwork.producerStructureId !== null) {
    const producer = structures.find((entry) => entry.structureId === foothold.powerNetwork.producerStructureId);
    if (producer === undefined) throw new Error('Persisted power producer is missing.');
    const definition = catalog.getAs(producer.structureDefinitionId, 'structure');
    if (definition.powerSource === undefined) throw new Error('Persisted power producer has incompatible content definition.');
    capacityPu = definition.powerSource.capacityPu;
  }
  return Object.freeze({
    foothold: Object.freeze({
      footholdId: foothold.footholdId,
      buildRevision: foothold.buildRevision,
      structures: Object.freeze(runtimeStructures),
      connectors: Object.freeze([...connectorMap.values()].sort((a, b) => compareStrings(a.connectorId, b.connectorId))),
      connections: Object.freeze(connections.sort((a, b) => compareStrings(a.connectionId, b.connectionId))),
      power: Object.freeze({
        revision: foothold.powerNetwork.revision,
        producerStructureId: foothold.powerNetwork.producerStructureId,
        capacityPu,
        grantedConsumerIds: Object.freeze([...foothold.powerNetwork.grantedConsumerIds]),
      }),
      condensers: Object.freeze(condenserStates),
      recentDismantles: Object.freeze([]),
    }),
  });
}
