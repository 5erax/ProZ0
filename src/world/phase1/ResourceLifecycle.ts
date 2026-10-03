/** Versioned, persisted lifecycle. Missing data retains the legacy renewal rule. */
export type ResourceLifecycleV1 =
  | { readonly version: 1; readonly kind: 'mineral' }
  | { readonly version: 1; readonly kind: 'plant'; readonly stage: 'early' | 'growing' | 'mature'; readonly cutTick: number; readonly matureTick: number };

const plants = new Set(['resource:fiber-plant', 'resource:food-plant', 'resource:timber-source']);
const minerals = new Set(['resource:stone-outcrop', 'resource:metal-ore-node']);

export function initialResourceLifecycle(definitionId: string): ResourceLifecycleV1 | undefined {
  if (minerals.has(definitionId)) return Object.freeze({version:1,kind:'mineral'});
  if (plants.has(definitionId)) return Object.freeze({version:1,kind:'plant',stage:'mature',cutTick:0,matureTick:0});
  return undefined;
}

/** Validate at both portable-save and materialized-base boundaries. */
export function validateResourceLifecycle(value: unknown, definitionId?: string): ResourceLifecycleV1 {
  if (typeof value !== 'object' || value === null) throw Error('Invalid resource lifecycle');
  const v = value as Record<string, unknown>;
  if (v.version !== 1) throw Error('Unsupported resource lifecycle version');
  if (v.kind === 'mineral') {
    if (Object.keys(v).some(key => !['version','kind'].includes(key)) || (definitionId !== undefined && !minerals.has(definitionId))) throw Error('Invalid mineral lifecycle');
    return Object.freeze({version:1,kind:'mineral'});
  }
  if (v.kind !== 'plant' || !['early','growing','mature'].includes(String(v.stage))
    || !Number.isSafeInteger(v.cutTick) || (v.cutTick as number) < 0
    || !Number.isSafeInteger(v.matureTick) || (v.matureTick as number) < (v.cutTick as number)
    || (v.stage !== 'mature' && v.matureTick === v.cutTick)
    || Object.keys(v).some(key => !['version','kind','stage','cutTick','matureTick'].includes(key))
    || (definitionId !== undefined && !plants.has(definitionId))) throw Error('Invalid plant lifecycle');
  return Object.freeze({version:1,kind:'plant',stage:v.stage as 'early'|'growing'|'mature',cutTick:v.cutTick as number,matureTick:v.matureTick as number});
}

export function resourceGrowthCheckpoint(lifecycle: Extract<ResourceLifecycleV1, {kind:'plant'}>): number {
  return lifecycle.cutTick + Math.ceil((lifecycle.matureTick - lifecycle.cutTick) / 2);
}

/** View reads the canonical stage; elapsed time supplies ETA, never changes state. */
export function resourceLifecycleFacts(lifecycle: ResourceLifecycleV1 | undefined, tick: number, remaining: number | null): readonly string[] {
  if (!lifecycle) return [];
  if (lifecycle.kind === 'mineral') return ['Finite deposit: '+String(remaining ?? 0)+' extraction actions remaining', 'Does not regrow'];
  if (lifecycle.stage === 'mature') return ['Maximum growth reached · best yield'];
  const next = lifecycle.stage === 'early' ? resourceGrowthCheckpoint(lifecycle) : lifecycle.matureTick;
  return [lifecycle.stage === 'early' ? 'Early growth · not ready to harvest' : 'Growing · reduced yield', 'Next growth stage: '+Math.max(0,Math.ceil((next-tick)/60))+'s active world time'];
}
