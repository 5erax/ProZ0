import {seasonAt,soilAt} from '../../content/livingworld/LivingWorldContent';
import {colonyWeatherAt} from '../../world/phase2/ColonyRegions';
export const MAX_SOIL_PATCHES=512;
export interface SoilPatch { readonly key:string; moisture:number; }
export interface SoilStateV1 { readonly version:1; patches:SoilPatch[]; }
export const soilCellKey=(point:{x:number;y:number})=>Math.floor(point.x/4)+':'+Math.floor(point.y/4);
export function soilCellPosition(key:string) { const [x,y]=key.split(':').map(Number);return{x:x!*4+2,y:y!*4+2}; }
/** Undisturbed soil is an analytic active-time field. Rain leaves a draining tail. */
export function naturalSoilMoisture(seed:string,point:{x:number;y:number},tick:number):number {
  const soil=soilAt(seed,point),season=seasonAt(tick),weather=colonyWeatherAt(seed,point,tick),phase=tick%18000;
  const end=weather.biomeId==='landing-grassland'?12000:15000;
  const evaporation=Math.max(20,20*season.evaporationMilli/soil.retentionMilli);
  const rain=weather.biomeId==='ochre-badlands'?0:Math.max(0,Math.min(phase,end)-9000)/60;
  const drained=Math.max(0,phase-end)/60*evaporation;
  const wetTail=weather.biomeId==='ochre-badlands'?0:phase<9000?Math.max(0,(end-9000)/60*40-(phase+18000-end)/60*evaporation):Math.max(0,rain*40-drained);
  const ambient=4000*soil.retentionMilli/season.evaporationMilli*(weather.biomeId==='ochre-badlands'?.7:1);
  return Math.round(Math.max(0,Math.min(10000,ambient+wetTail)));
}
export function validateSoilState(value:unknown):SoilStateV1 {
  const state=value as SoilStateV1;
  if(!state||state.version!==1||!Array.isArray(state.patches)||state.patches.length>MAX_SOIL_PATCHES||new Set(state.patches.map(p=>p?.key)).size!==state.patches.length)throw Error('Invalid soil state');
  for(const p of state.patches)if(!p||typeof p.key!=='string'||!(/^-?\d+:-?\d+$/.test(p.key))||soilCellKey(soilCellPosition(p.key))!==p.key||Object.keys(p).some(k=>!['key','moisture'].includes(k))||!Number.isSafeInteger(p.moisture)||p.moisture<0||p.moisture>10000||Math.abs(soilCellPosition(p.key).x)>1e7||Math.abs(soilCellPosition(p.key).y)>1e7)throw Error('Invalid soil patch');
  return structuredClone(state);
}
export function wetSoilCell(state:SoilStateV1,point:{x:number;y:number},moisture:number):boolean {
  const key=soilCellKey(point),existing=state.patches.find(p=>p.key===key);
  if(existing)existing.moisture=Math.max(existing.moisture,moisture);
  else{if(state.patches.length>=MAX_SOIL_PATCHES)return false;state.patches.push({key,moisture});}
  return true;
}
export function advanceSoilPatches(state:SoilStateV1,seed:string,tick:number,weather?:(point:{x:number;y:number})=>string) {
  const season=seasonAt(tick);
  for(const patch of state.patches){const point=soilCellPosition(patch.key),soil=soilAt(seed,point),rain=(weather?.(point)??colonyWeatherAt(seed,point,tick).weather)==='mist-rain';patch.moisture=Math.max(naturalSoilMoisture(seed,point,tick),Math.min(10000,patch.moisture+(rain?55:0)-Math.round(25*season.evaporationMilli/soil.retentionMilli)));}
  // Natural equilibrium is the only eviction condition; a remote wet patch is kept.
  state.patches=state.patches.filter(p=>Math.abs(p.moisture-naturalSoilMoisture(seed,soilCellPosition(p.key),tick))>75);
}
