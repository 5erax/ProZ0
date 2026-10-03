import { naturalSoilMoisture } from '../../world/phase2/NaturalSoilMoisture';
export { naturalSoilMoisture } from '../../world/phase2/NaturalSoilMoisture';
import {seasonAt,soilAt} from '../../content/livingworld/LivingWorldContent';
import {colonyWeatherAt} from '../../world/phase2/ColonyRegions';
export const MAX_SOIL_PATCHES=512;
export interface SoilPatch { readonly key:string; moisture:number; }
export interface SoilStateV1 { readonly version:1; patches:SoilPatch[]; }
export const soilCellKey=(point:{x:number;y:number})=>Math.floor(point.x/4)+':'+Math.floor(point.y/4);
export function soilCellPosition(key:string) { const [x,y]=key.split(':').map(Number);return{x:x!*4+2,y:y!*4+2}; }
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
