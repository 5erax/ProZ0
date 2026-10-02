import {expect,it} from 'vitest';
import {createPhase1ContentCatalog} from '../../src/content';
import {Phase1ItemAuthority} from '../../src/simulation/items';
import {EXPEDITION_PLAYER_CARRY} from '../../src/simulation/items/ItemCapacity';
import {ExpeditionAuthority,type ExpeditionCommand} from '../../src/simulation/expedition/ExpeditionAuthority';
import {Phase1BuildingWorld} from '../../src/world/building/Phase1BuildingWorld';
import {Phase1BuildingTestSpatial} from '../support/Phase1BuildingTestSpatial';
import {Phase1ItemTestWorld} from '../support/Phase1ItemTestWorld';
function fixture(){
 const spatial=new Phase1BuildingTestSpatial();const buildings=new Phase1BuildingWorld(spatial,undefined,true);
 const items=new Phase1ItemAuthority({catalog:createPhase1ContentCatalog(),world:new Phase1ItemTestWorld(),playerCarryPolicy:EXPEDITION_PLAYER_CARRY,initialLedger:{containers:[{containerId:'inventory:solo',ownerPlayerId:'solo',kind:'player-inventory',revision:0,stacks:[{stackId:'timber',itemDefinitionId:'item:timber',quantity:2,condition:null},{stackId:'fiber',itemDefinitionId:'item:plant-fiber',quantity:2,condition:null}]}]}});
 const actor={x:100,y:100,alive:true};const authority=new ExpeditionAuthority(items,buildings,()=>actor);
 const command=(id:string,action:ExpeditionCommand['action'],target:string,extra:Partial<ExpeditionCommand>={})=>authority.execute({id,action,target,playerId:'solo',expectedRevision:authority.read().revision,expectedInventoryRevision:items.getContainerView('inventory:solo').revision,...extra});
 return {spatial,buildings,items,actor,authority,command};
}
it('remote blueprint consumes escrow once, survives reconstruction, and becomes a real crate without needing a kit',()=>{
 const f=fixture();expect(f.command('cache','plan','supply-cache',{x:102,y:100})).toEqual({status:'committed',message:'plan:cache'});
 expect(f.items.getContainerView('inventory:solo').stacks).toHaveLength(2);
 expect(f.command('early','complete','plan:cache').status).toBe('rejected');
 const deposit:ExpeditionCommand={id:'deposit',action:'deposit',target:'plan:cache',playerId:'solo',expectedRevision:f.authority.read().revision,expectedInventoryRevision:0};
 expect(f.authority.execute(deposit).status).toBe('committed');const ledger=f.items.exportLedgerSnapshot();expect(f.authority.execute(deposit).status).toBe('committed');expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
 const saved=f.authority.read();const restored=new ExpeditionAuthority(f.items,f.buildings,()=>f.actor,saved);expect(restored.read()).toEqual(saved);
 expect(f.command('move','move','plan:cache',{x:103,y:100,orientation:1}).status).toBe('committed');
 expect(f.command('finish','complete','plan:cache').status).toBe('committed');const facility=f.authority.read().facilities[0]!;
 expect(f.buildings.getStructure(facility.canonicalStructureId!)?.position).toEqual({x:103,y:100});
 const crate=f.buildings.getStructure(facility.canonicalStructureId!)!;expect(f.items.getContainerView(crate.containerId!).kind).toBe('storage-crate');expect(f.items.getContainerView('inventory:solo').stacks).toHaveLength(0);
 const rebuilt=new Phase1BuildingWorld(f.spatial,f.buildings.exportSnapshot(),true);expect(rebuilt.getStructure(crate.structureId)).toEqual(crate);
});
it('cancel refunds once; a full bag or obstructed terrain leaves escrow intact',()=>{
 const f=fixture();expect(f.command('cache','plan','supply-cache',{x:102,y:100}).status).toBe('committed');expect(f.command('deposit','deposit','plan:cache').status).toBe('committed');
 f.spatial.blocking=true;expect(f.command('finish','complete','plan:cache').status).toBe('rejected');expect(f.authority.read().plans[0]!.paid).toEqual({'item:timber':2,'item:plant-fiber':2});
 expect(f.items.commitColonyExchange({operationId:'fixture-fill',playerId:'solo',expectedInventoryRevision:1,inputs:[],outputs:[10,10,4].map(quantity=>({itemDefinitionId:'item:timber',quantity}))}).status).toBe('committed');
 const before=f.authority.read();expect(f.command('cancel-full','cancel','plan:cache').status).toBe('rejected');expect(f.authority.read()).toEqual(before);
 expect(f.items.commitColonyExchange({operationId:'fixture-empty',playerId:'solo',expectedInventoryRevision:2,inputs:[{itemDefinitionId:'item:timber',quantity:24}],outputs:[]}).status).toBe('committed');
 const cancel:ExpeditionCommand={id:'refund',action:'cancel',target:'plan:cache',playerId:'solo',expectedRevision:f.authority.read().revision,expectedInventoryRevision:3};expect(f.authority.execute(cancel).status).toBe('committed');const ledger=f.items.exportLedgerSnapshot();expect(f.authority.execute(cancel).status).toBe('committed');expect(f.items.exportLedgerSnapshot()).toEqual(ledger);expect(f.authority.read().plans).toHaveLength(0);
});
it('legacy build radius remains constrained; expedition still rejects unexplored ground and stale commands',()=>{
 const f=fixture();const placement={mode:'free' as const,anchor:{x:102,y:100},orientationQuarterTurns:0 as const};expect(new Phase1BuildingWorld(f.spatial).assessPlacement('structure:storage-crate',placement)).toBe('OUTSIDE_BASE_BUILD_ZONE');
 f.spatial.explored=false;expect(f.command('unknown','plan','supply-cache',{x:102,y:100}).status).toBe('rejected');f.spatial.explored=true;expect(f.command('stale','plan','supply-cache',{x:102,y:100,expectedInventoryRevision:42}).message).toBe('STALE_INVENTORY_REVISION');
});
