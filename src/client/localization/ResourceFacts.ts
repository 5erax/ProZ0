import type { ResourceLifecycleV1 } from '../../world/phase1/ResourceLifecycle';
import { resourceGrowthCheckpoint } from '../../world/phase1/ResourceLifecycle';
import { formatNumber, formatSeconds, message, type MessageDictionary } from './Locale';
export const resourceMessages:MessageDictionary={
  en:{finite:'Finite deposit: {count} extraction actions remaining',noRegrowth:'Does not regrow',mature:'Maximum growth reached · best yield',earlyRoots:'Early growth · roots present',growingRoots:'Growing · roots present',progress:'Progress: {progress}% · rate {rate}%',paused:'Growth paused · water needed',estimate:'Next stage ≈ {time} at current moisture/season',early:'Early growth · not ready to harvest',growing:'Growing · reduced yield',next:'Next growth stage: {time} active world time',echo:'Echo Gallery',iron:'Iron Vault',drip:'Drip Grotto'},
  vi:{finite:'Mỏ hữu hạn: còn {count} lượt khai thác',noRegrowth:'Không tái sinh',mature:'Đã trưởng thành · sản lượng tốt nhất',earlyRoots:'Sinh trưởng sớm · còn gốc',growingRoots:'Đang sinh trưởng · còn gốc',progress:'Tiến độ: {progress}% · tốc độ {rate}%',paused:'Tạm ngừng sinh trưởng · cần nước',estimate:'Mốc tiếp theo ≈ {time} với độ ẩm/mùa hiện tại',early:'Sinh trưởng sớm · chưa thể thu hoạch',growing:'Đang sinh trưởng · sản lượng thấp hơn',next:'Mốc sinh trưởng tiếp theo: {time} thời gian thế giới hoạt động',echo:'Phòng Vang',iron:'Hầm Sắt',drip:'Hang Nước Rỉ'},
};
export const caveName=(id:string)=>message(resourceMessages,({'echo-gallery':'echo','iron-vault':'iron','drip-grotto':'drip'} as Record<string,string>)[id]??'',{},'Cave');
/** Read-only formatters; the authority alone advances stages and moisture. */
export function localizedResourceFacts(lifecycle:ResourceLifecycleV1|undefined,tick:number,remaining:number|null):readonly string[]{
  if(!lifecycle)return [];
  if(lifecycle.kind==='mineral')return [message(resourceMessages,'finite',{count:formatNumber(remaining??0)}),message(resourceMessages,'noRegrowth')];
  if(lifecycle.stage==='mature')return [message(resourceMessages,'mature')];
  const work=lifecycle.work;
  if(work){const target=lifecycle.stage==='early'?500000:1000000;return [message(resourceMessages,lifecycle.stage==='early'?'earlyRoots':'growingRoots'),message(resourceMessages,'progress',{progress:formatNumber(work.progressMilli/10000,{maximumFractionDigits:1}),rate:formatNumber(work.rateMilli/10,{maximumFractionDigits:0})}),message(resourceMessages,work.rateMilli===0?'paused':'estimate',{time:formatSeconds(Math.ceil((target-work.progressMilli)*work.durationTicks/Math.max(1,work.rateMilli)/60000))})];}
  const next=lifecycle.stage==='early'?resourceGrowthCheckpoint(lifecycle):lifecycle.matureTick;
  return [message(resourceMessages,lifecycle.stage==='early'?'early':'growing'),message(resourceMessages,'next',{time:formatSeconds(Math.max(0,Math.ceil((next-tick)/60)))})];
}
