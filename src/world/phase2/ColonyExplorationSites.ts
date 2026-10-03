import { DeterministicRng, deriveSeedState, type WorldPosition } from '../../foundation';
import { EXPLORATION_TEMPLATES, type ExplorationTemplateId } from '../../content/phase2/ExplorationContent';
import { colonyBiomeAt, colonyLandscapeTerrainAt, colonyRegionPosition, colonySurveySites, type ColonySurveySite } from './ColonyRegions';
import { colonyRiverTerrainAt } from './ColonyHydrology';
export interface ColonyExplorationSite extends ColonySurveySite { readonly template?: ExplorationTemplateId | undefined }
const cache=new Map<string,readonly ColonyExplorationSite[]>();
/** Only new sites use this namespace. All five shipped landmark IDs/positions remain unchanged. */
export function colonyExplorationSites(seed:string,generationVersion=5):readonly ColonyExplorationSite[] {
  if(!seed || ![3,4,5].includes(generationVersion))throw Error('Unsupported exploration site world');
  const key=seed+':generation:'+generationVersion,known=cache.get(key);if(known)return known;
  const prototypes=[
    {id:'site:abandoned-lab',name:'Abandoned Field Laboratory',biomeId:'mist-marsh' as const,position:{x:-24,y:-144},observation:'A broken roof leaves the field terminal and medical locker exposed. The terminal can be repaired.',unresolved:'Who left the records here, and why was the terminal disconnected?'},
    {id:'site:mining-camp',name:'Abandoned Mining Camp',biomeId:'ochre-badlands' as const,position:{x:20,y:144},observation:'A loading frame stands beside a sealed mineral cache. Its brace has split.',unresolved:'What interrupted work before the last shipment left?'},
    {id:'site:abandoned-shelter',name:'Abandoned Trail Shelter',biomeId:'landing-grassland' as const,position:{x:24,y:48},observation:'A torn canopy hangs above a dry sleeping platform. A small provision box remains beneath it.',unresolved:'Who stopped here before reaching the landing site?'},
  ];
  const dry=(p:WorldPosition)=>{
    const cell={x:Math.floor(p.x/2)*2+1,y:Math.floor(p.y/2)*2+1};
    const base=Math.hypot(cell.x-34,cell.y+18)<=9 || (generationVersion===5 && colonyRiverTerrainAt(seed,cell)==='water')?'water':'ground';
    return colonyLandscapeTerrainAt(seed,cell,base,generationVersion)==='ground';
  };
  const sites:ColonyExplorationSite[]=colonySurveySites(seed).map(s=>({...s,template:EXPLORATION_TEMPLATES.find(t=>t.siteId===s.id)?.id}));
  for(const prototype of prototypes){
    const rng=new DeterministicRng(deriveSeedState({worldSeed:seed,namespace:'colony-exploration:sites:v1',stableIdentifiers:[prototype.id]}));
    const origin=prototype.biomeId==='landing-grassland'?prototype.position:colonyRegionPosition(seed,prototype.position);
    let selected:WorldPosition|undefined;
    // Bounded dry 3×3 m layout search, including space to approach its centre.
    for(let i=0;i<128;i++){
      const p={x:Math.floor((origin.x+(rng.nextUint32()%17)-8)/2)*2+1,y:Math.floor((origin.y+(rng.nextUint32()%17)-8)/2)*2+1};
      if(colonyBiomeAt(seed,p)!==prototype.biomeId || Math.hypot(p.x,p.y)<16 || sites.some(s=>Math.hypot(s.position.x-p.x,s.position.y-p.y)<8))continue;
      if([-1,0,1].every(dx=>[-1,0,1].every(dy=>dry({x:p.x+dx,y:p.y+dy})))){selected=p;break;}
    }
    if(!selected)throw Error('No safe exploration layout for '+prototype.id);
    sites.push({...prototype,position:Object.freeze(selected),template:EXPLORATION_TEMPLATES.find(t=>t.siteId===prototype.id)!.id});
  }
  const result=Object.freeze(sites.map(s=>Object.freeze(s)));if(cache.size>=16)cache.clear();cache.set(key,result);return result;
}
