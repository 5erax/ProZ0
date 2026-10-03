/** Versioned, persisted lifecycle. Missing data retains the legacy renewal rule. */
export type ResourceLifecycleV1 =
  | { readonly version: 1; readonly kind: 'mineral' }
  | { readonly version: 1|2; readonly kind: 'plant'; readonly stage: 'early' | 'growing' | 'mature'; readonly cutTick: number; readonly matureTick: number; readonly work?:import('./DynamicResourceGrowth').ResourceGrowthWork };

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
  if (v.version !== 1 && v.version !== 2) throw Error('Unsupported resource lifecycle version');
  if (v.kind === 'mineral') {
    if (v.version!==1 || Object.keys(v).some(key => !['version','kind'].includes(key)) || (definitionId !== undefined && !minerals.has(definitionId))) throw Error('Invalid mineral lifecycle');
    return Object.freeze({version:1,kind:'mineral'});
  }
  if (v.kind !== 'plant' || !['early','growing','mature'].includes(String(v.stage))
    || !Number.isSafeInteger(v.cutTick) || (v.cutTick as number) < 0
    || !Number.isSafeInteger(v.matureTick) || (v.matureTick as number) < (v.cutTick as number)
    || (v.stage !== 'mature' && v.matureTick === v.cutTick)
    || Object.keys(v).some(key => !['version','kind','stage','cutTick','matureTick',...(v.version===2?['work']:[])].includes(key))
    || (definitionId !== undefined && !plants.has(definitionId))) throw Error('Invalid plant lifecycle');
  const work=v.work as import('./DynamicResourceGrowth').ResourceGrowthWork|undefined;
  if(v.version===2&&(!work||Object.keys(work).some(k=>!['completedWork','progressMilli','lastGrowthTick','durationTicks','wateredTick','rateMilli'].includes(k))||!Number.isSafeInteger(work.completedWork)||work.completedWork<0||work.completedWork>1000000*work.durationTicks||work.progressMilli!==work.completedWork/work.durationTicks||!Number.isFinite(work.progressMilli)||work.progressMilli<0||work.progressMilli>1000000||!Number.isSafeInteger(work.lastGrowthTick)||work.lastGrowthTick<(v.cutTick as number)||!Number.isSafeInteger(work.durationTicks)||work.durationTicks<2||work.durationTicks>10000000||!Number.isSafeInteger(work.rateMilli)||work.rateMilli<0||work.rateMilli>10000||(work.wateredTick!==null&&(!Number.isSafeInteger(work.wateredTick)||work.wateredTick<0||work.wateredTick>work.lastGrowthTick))||v.stage!==(work.progressMilli>=1000000?'mature':work.progressMilli>=500000?'growing':'early')))throw Error('Invalid resource growth work');
  return Object.freeze({version:v.version,kind:'plant',stage:v.stage as 'early'|'growing'|'mature',cutTick:v.cutTick as number,matureTick:v.matureTick as number,...(work?{work:Object.freeze({...work})}:{})});
}

export function resourceGrowthCheckpoint(lifecycle: Extract<ResourceLifecycleV1, {kind:'plant'}>): number {
  if(lifecycle.work)return lifecycle.work.lastGrowthTick+Math.max(1,Math.ceil((500000-lifecycle.work.progressMilli)*lifecycle.work.durationTicks/Math.max(1,lifecycle.work.rateMilli)/1000));
  return lifecycle.cutTick + Math.ceil((lifecycle.matureTick - lifecycle.cutTick) / 2);
}

/** View reads the canonical stage; elapsed time supplies ETA, never changes state. */
export function resourceLifecycleFacts(lifecycle: ResourceLifecycleV1 | undefined, tick: number, remaining: number | null): readonly string[] {
  if (!lifecycle) return [];
  if (lifecycle.kind === 'mineral') return ['Finite deposit: '+String(remaining ?? 0)+' extraction actions remaining', 'Does not regrow'];
  if (lifecycle.stage === 'mature') return ['Maximum growth reached · best yield'];
  if(lifecycle.work){const w=lifecycle.work,target=lifecycle.stage==='early'?500000:1000000;return [lifecycle.stage==='early'?'Early growth · roots present':'Growing · roots present','Progress: '+(w.progressMilli/10000).toFixed(1)+'% · rate '+(w.rateMilli/10).toFixed(0)+'%',w.rateMilli===0?'Growth paused · water needed':'Next stage ≈ '+Math.ceil((target-w.progressMilli)*w.durationTicks/w.rateMilli/60000)+'s at current moisture/season'];}
  const next = lifecycle.stage === 'early' ? resourceGrowthCheckpoint(lifecycle) : lifecycle.matureTick;
  return [lifecycle.stage === 'early' ? 'Early growth · not ready to harvest' : 'Growing · reduced yield', 'Next growth stage: '+Math.max(0,Math.ceil((next-tick)/60))+'s active world time'];
}
