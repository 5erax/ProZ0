import { expect,it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { EXPLORATION_TEMPLATES,validateExplorationProgress } from '../../src/content/phase2/ExplorationContent';
import { colonyExplorationSites } from '../../src/world/phase2/ColonyExplorationSites';
import { colonySurveySites,colonyBiomeAt,colonyLandscapeTerrainAt } from '../../src/world/phase2/ColonyRegions';
import { Phase1ChunkGenerator } from '../../src/world/phase1/Phase1ChunkGenerator';
import { fromWorldPosition,toChunkLocalPosition } from '../../src/world/chunks/ChunkCoord';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { ColonyDepthAuthority,emptyColonyDepthState } from '../../src/simulation/colony/ColonyDepthAuthority';
import { explorationSiteSprite } from '../../src/client/presentation/ExplorationArt';
const catalog=createPhase1ContentCatalog(),generator=new Phase1ChunkGenerator(catalog),seed='p1-world-golden';
it('20 seeds preserve all five shipped anchors, place two distinct POIs per biome, and keep new layouts dry across supported generations',()=>{
  for(let i=0;i<20;i++)for(const version of [3,4,5]){
    const worldSeed='exploration-seed:'+i,sites=colonyExplorationSites(worldSeed,version),old=colonySurveySites(worldSeed);
    expect(sites.slice(0,5).map(s=>[s.id,s.position])).toEqual(old.map(s=>[s.id,s.position]));
    const pois=sites.filter(s=>s.template);expect(pois).toHaveLength(6);
    for(const biome of ['landing-grassland','mist-marsh','ochre-badlands'])expect(pois.filter(s=>colonyBiomeAt(worldSeed,s.position)===biome)).toHaveLength(2);
    const chunks=new Map<string,ReturnType<Phase1ChunkGenerator['generate']>>();
    for(const site of sites.slice(5))for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
      const p={x:Math.floor((site.position.x+dx)/2)*2+1,y:Math.floor((site.position.y+dy)/2)*2+1};
      const coord=fromWorldPosition(p),key=coord.x+':'+coord.y;let chunk=chunks.get(key);if(!chunk){chunk=generator.generate({worldSeed,coord,generationVersion:version});chunks.set(key,chunk);}
      const local=toChunkLocalPosition(p,coord),size=32/chunk.terrain.cellsPerAxis;
      const base=chunk.terrain.cells[Math.floor(local.y/size)*chunk.terrain.cellsPerAxis+Math.floor(local.x/size)]!;
      expect(colonyLandscapeTerrainAt(worldSeed,p,base,version)).toBe('ground');
    }
    expect(colonyExplorationSites(worldSeed,version)).toEqual(sites);
  }
});
function fixture(siteId:string){
  const template=EXPLORATION_TEMPLATES.find(t=>t.siteId===siteId)!,site=colonyExplorationSites(seed).find(s=>s.id===siteId)!;
  const actor={position:{...site.position},alive:true};let available=true,cancelled=0;
  const costs=[...template.costs,...(template.tool?[[template.tool,1] as const]:[])];
  const items=new Phase1ItemAuthority({catalog,world:new Phase1ItemTestWorld(),initialLedger:{containers:[{containerId:'inventory:p',kind:'player-inventory',ownerPlayerId:'p',revision:0,stacks:costs.map(([id,quantity],i)=>({stackId:'fixture:'+i,itemDefinitionId:id,quantity,condition:catalog.getAs(id,'item').conditionMax}))}]}});
  const authority=new ColonyDepthAuthority(seed,items,()=>actor,emptyColonyDepthState(),undefined,{generationVersion:5,available:()=>available,cancelRest:()=>cancelled++});
  const command=(action:'inspect-site'|'restore-site'|'recover-site',id=crypto.randomUUID())=>({operationId:id,playerId:'p',expectedRevision:authority.read().revision,expectedInventoryRevision:items.getContainerView('inventory:p').revision,action,targetId:siteId});
  return {template,site,actor,items,authority,command,block:()=>available=false,cancelled:()=>cancelled};
}
it.each(EXPLORATION_TEMPLATES)('$id requires inspection, pays once, rewards once, conserves ledger on stale/range/replay and retains its effect after recovery',template=>{
  const f=fixture(template.siteId),before=f.items.exportLedgerSnapshot();
  expect(f.authority.execute(f.command('restore-site'))).toMatchObject({status:'rejected',reason:'INSPECT_SITE_FIRST'});expect(f.items.exportLedgerSnapshot()).toEqual(before);
  expect(f.authority.execute(f.command('inspect-site')).status).toBe('committed');
  const restore=f.command('restore-site');f.actor.position.x+=8;expect(f.authority.execute(restore).status).toBe('rejected');expect(f.items.exportLedgerSnapshot()).toEqual(before);f.actor.position.x-=8;
  expect(f.authority.execute({...restore,expectedInventoryRevision:100})).toMatchObject({status:'rejected',reason:'STALE_INVENTORY_REVISION'});
  expect(f.authority.execute(restore).status).toBe('committed');const paid=f.items.exportLedgerSnapshot();expect(f.authority.execute(restore).status).toBe('committed');expect(f.items.exportLedgerSnapshot()).toEqual(paid);
  const recover=f.command('recover-site');expect(f.authority.execute(recover).status).toBe('committed');const after=f.items.exportLedgerSnapshot();expect(f.authority.execute(recover).status).toBe('committed');expect(f.items.exportLedgerSnapshot()).toEqual(after);expect(f.authority.execute(f.command('recover-site'))).toMatchObject({status:'rejected',reason:'SUPPLIES_ALREADY_RECOVERED'});
  for(const [id,quantity] of template.reward)expect(f.items.getContainerView('inventory:p').stacks.filter(s=>s.itemDefinitionId===id).reduce((sum,s)=>sum+s.quantity,0)).toBe(quantity);
  expect(f.authority.restoredSite(template.id)?.id).toBe(template.siteId);expect(f.cancelled()).toBe(2);
});
it('full mining reward cannot partially pay or mark a cache recovered; freeing real bag space allows one retry',()=>{
  const f=fixture('site:mining-camp');f.authority.execute(f.command('inspect-site'));expect(f.authority.execute(f.command('restore-site')).status).toBe('committed');
  for(let i=0;i<64;i++){const result=f.items.commitColonyExchange({operationId:'fixture:fill:'+i,playerId:'p',expectedInventoryRevision:f.items.getContainerView('inventory:p').revision,inputs:[],outputs:[{itemDefinitionId:'item:stone',quantity:1}]});if(result.status==='rejected')break;}
  const before=f.items.exportLedgerSnapshot(),state=f.authority.read();expect(f.authority.execute(f.command('recover-site')).status).toBe('rejected');expect(f.items.exportLedgerSnapshot()).toEqual(before);expect(f.authority.read()).toEqual(state);
  const quantity=f.items.getContainerView('inventory:p').stacks.filter(s=>s.itemDefinitionId==='item:stone').reduce((sum,s)=>sum+s.quantity,0);expect(quantity).toBeGreaterThan(0);
  expect(f.items.commitColonyExchange({operationId:'fixture:free',playerId:'p',expectedInventoryRevision:f.items.getContainerView('inventory:p').revision,inputs:[{itemDefinitionId:'item:stone',quantity}],outputs:[]}).status).toBe('committed');
  expect(f.authority.execute(f.command('recover-site')).status).toBe('committed');
});
it('blocked or dead actors cannot pay, and invalid/missing progress references fail before use',()=>{
  const f=fixture('site:abandoned-shelter');f.authority.execute(f.command('inspect-site'));const before=f.items.exportLedgerSnapshot();f.block();expect(f.authority.execute(f.command('restore-site')).status).toBe('rejected');f.actor.alive=false;expect(f.authority.execute(f.command('restore-site'))).toMatchObject({status:'rejected',reason:'PLAYER_DEAD'});expect(f.items.exportLedgerSnapshot()).toEqual(before);
  for(const progress of [{version:2,entries:[]},{version:1,entries:[{siteId:'fake',stage:'restored'}]},{version:1,entries:[{siteId:'site:abandoned-shelter',stage:'claimed'}]},{version:1,entries:[{siteId:'site:abandoned-shelter',stage:'restored'}]}])expect(()=>validateExplorationProgress(progress,[])).toThrow();
  const art=EXPLORATION_TEMPLATES.map(t=>explorationSiteSprite(t.id,'unrestored').url);expect(new Set(art).size).toBe(6);expect(explorationSiteSprite('laboratory','recovered').url).not.toBe(explorationSiteSprite('laboratory','unrestored').url);
});
it('missing materials and a broken mining tool reject without charging any other inputs',()=>{
  const garden=fixture('site:windfall-grove');garden.authority.execute(garden.command('inspect-site'));
  expect(garden.items.commitColonyExchange({operationId:'fixture:remove-water',playerId:'p',expectedInventoryRevision:garden.items.getContainerView('inventory:p').revision,inputs:[{itemDefinitionId:'item:clean-water',quantity:1}],outputs:[]}).status).toBe('committed');
  const before=garden.items.exportLedgerSnapshot();expect(garden.authority.execute(garden.command('restore-site')).status).toBe('rejected');expect(garden.items.exportLedgerSnapshot()).toEqual(before);expect(garden.authority.siteStage(garden.site.id)).toBe('unrestored');
  const mine=fixture('site:mining-camp');mine.authority.execute(mine.command('inspect-site'));const tool=mine.items.getContainerView('inventory:p').stacks.find(s=>s.itemDefinitionId===mine.template.tool)!;
  expect(mine.items.execute({type:'wear',operationId:'fixture:break-tool',playerId:'p',inventoryContainerId:'inventory:p',expectedInventoryRevision:mine.items.getContainerView('inventory:p').revision,targetStackId:tool.stackId,conditionLoss:tool.condition!}).status).toBe('committed');
  const broken=mine.items.exportLedgerSnapshot();expect(mine.authority.execute(mine.command('restore-site'))).toMatchObject({status:'rejected',reason:'FIELD_TOOL_REQUIRED'});expect(mine.items.exportLedgerSnapshot()).toEqual(broken);
});
