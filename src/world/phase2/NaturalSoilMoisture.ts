import { seasonAt, soilAt } from '../../content/livingworld/LivingWorldContent';
import { colonyWeatherAt } from './ColonyRegions';
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
