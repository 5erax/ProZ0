import { deriveSeedState } from '../../foundation';
import type { ResourceNodeDefinitionV1 } from '../SchemaV1';

export type ResourceSize = 'small' | 'medium' | 'large';
export const RESOURCE_SIZE_PROFILES = Object.freeze({
  small: Object.freeze({ label: 'Small', yieldMultiplier: 1, workMultiplier: 1, wearMultiplier: 1 }),
  medium: Object.freeze({ label: 'Medium', yieldMultiplier: 2, workMultiplier: 1.5, wearMultiplier: 2 }),
  large: Object.freeze({ label: 'Large', yieldMultiplier: 3, workMultiplier: 2, wearMultiplier: 3 }),
});
const sizedResources = new Set(['resource:timber-source', 'resource:stone-outcrop', 'resource:metal-ore-node', 'resource:fiber-plant', 'resource:food-plant']);

/** Versioned identity depends only on world seed and canonical entity, never load order or UI. */
export function resourceSizeAt(worldSeed: string, entityId: string, definitionId: string, version?: 1): ResourceSize | undefined {
  if (version !== 1 || !sizedResources.has(definitionId)) return undefined;
  const [value] = deriveSeedState({ worldSeed, namespace: 'resource-size:v1', stableIdentifiers: [entityId, definitionId] });
  const percentile = value! % 100;
  return percentile < 30 ? 'small' : percentile < 75 ? 'medium' : 'large';
}

export function resourceHarvestDefinition(definition: Readonly<ResourceNodeDefinitionV1>, size?: ResourceSize, stage?: 'early' | 'growing' | 'mature'): Readonly<ResourceNodeDefinitionV1> {
  if (size === undefined && stage !== 'growing') return definition;
  const profile = size === undefined ? RESOURCE_SIZE_PROFILES.small : RESOURCE_SIZE_PROFILES[size];
  return Object.freeze({ ...definition, gatherChannelSeconds: definition.gatherChannelSeconds * profile.workMultiplier, toolConditionCostPerSuccessfulGather: definition.toolConditionCostPerSuccessfulGather * profile.wearMultiplier, output: Object.freeze({ ...definition.output, quantity: stage === 'growing' ? Math.max(1, Math.floor(definition.output.quantity * profile.yieldMultiplier / 2)) : definition.output.quantity * profile.yieldMultiplier }) });
}
