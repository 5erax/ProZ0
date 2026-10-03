import { seasonAt, soilAt } from '../../content/livingworld/LivingWorldContent';
import { naturalSoilMoisture } from '../phase2/NaturalSoilMoisture';
import type { WorldPosition } from '../../foundation';
export interface ResourceGrowthWork {
  readonly completedWork:number;
  readonly progressMilli:number;
  readonly lastGrowthTick:number;
  readonly durationTicks:number;
  readonly wateredTick:number|null;
  readonly rateMilli:number;
}
/** Active-world clock only. One-second cells make unloaded/reloaded integration identical. */
export function canonicalPlantRate(seed:string,p:WorldPosition,tick:number,wateredTick:number|null):number {
  const season=seasonAt(tick),soil=soilAt(seed,p);
  const evaporation=25*season.evaporationMilli/soil.retentionMilli;
  const natural=naturalSoilMoisture(seed,p,tick);
  const irrigation=wateredTick===null||tick<wateredTick?0:10000-evaporation*(tick-wateredTick)/60;
  const moisture=Math.max(0,Math.min(10000,Math.max(natural,irrigation)));
  const moistureMilli=moisture===0?0:moisture<2500?500:moisture>=7000?1250:1000;
  return Math.round(season.growthMilli*soil.growthMilli*moistureMilli/1000000);
}
export function advancePlantWork(work:ResourceGrowthWork,seed:string,p:WorldPosition,tick:number):ResourceGrowthWork {
  if(tick<work.lastGrowthTick)throw Error('Resource growth clock moved backwards');
  // Accumulate fractional work without rounding each rendered frame. The denominator
  // stays stable for the lifecycle; UI/reload/stream order cannot change the result.
  let weighted=work.completedWork,at=work.lastGrowthTick;
  while(at<tick&&weighted<1000000*work.durationTicks){const end=Math.min(tick,(Math.floor(at/60)+1)*60);weighted+=(end-at)*canonicalPlantRate(seed,p,Math.floor(at/60)*60,work.wateredTick)*1000;at=end;}
  weighted=Math.min(1000000*work.durationTicks,weighted);
  return {...work,completedWork:weighted,progressMilli:weighted/work.durationTicks,lastGrowthTick:tick,rateMilli:canonicalPlantRate(seed,p,tick,work.wateredTick)};
}
