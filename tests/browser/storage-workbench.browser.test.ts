import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Phase1AuthorityBundle } from '../../src/integration/Phase1AuthorityBundle';
import { composePhase1SaveV2 } from '../../src/integration/Phase1SaveV2Composer';
import { expeditionFacility } from '../../src/content/singleplayer/ExpeditionContent';
import { createPhase1ProductReviewRuntime } from '../../src/client/runtime/Phase1ProductReviewRuntime';
import { createPhase1ProductReviewPersistence } from '../../src/client/runtime/Phase1ProductReviewPersistence';
import { deleteIndexedDbSaveDatabase } from '../../src/persistence/browser/IndexedDbSaveRepository';
import { setLocale } from '../../src/client/localization/Locale';

it('focused item Enter transfers both ways and persists; a new workbench opens crafting with damaged gear',async()=>{
  setLocale('en');
  const config={worldId:'world:storage-keyboard',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0};
  const bundle=await Phase1AuthorityBundle.create(config),databaseName='proz0-storage-keyboard-'+crypto.randomUUID();
  const persistence=createPhase1ProductReviewPersistence({databaseName,catalog:bundle.catalog});
  const root=document.createElement('section');root.style.cssText='position:relative;width:1280px;height:720px;';document.body.append(root);
  let runtime:Awaited<ReturnType<typeof createPhase1ProductReviewRuntime>>|undefined;
  try {
    await bundle.stepSolo();
    // Canonical subsystem fixture: construction is seeded, input and IndexedDB are real.
    for(const [id,x] of [['supply-cache',3],['field-workbench',-3]] as const){
      const authority=bundle.expedition!,command=(op:string,action:'plan'|'deposit'|'complete',target:string)=>authority.execute({id:op,action,target,x,y:0,playerId:'solo',expectedRevision:authority.read().revision,expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision});
      expect(command('plan:'+id,'plan',id).status).toBe('committed');
      expect(bundle.items.commitColonyExchange({operationId:'fixture:materials:'+id,playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:expeditionFacility(id)!.costs.map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity}))}).status).toBe('committed');
      expect(command('pay:'+id,'deposit','plan:plan:'+id).status).toBe('committed');
      expect(command('finish:'+id,'complete','plan:plan:'+id).status).toBe('committed');
    }
    const tool=bundle.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId==='item:stone-field-tool')!;
    expect(bundle.items.commitColonyExchange({operationId:'fixture:cargo-and-wear',playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:timber',quantity:3}],toolWear:{stackId:tool.stackId,conditionCost:1}}).status).toBe('committed');
    const request=composePhase1SaveV2(bundle,{nowUtc:'2026-10-04T00:00:00.000Z'});
    expect((await persistence.repository.commit(request)).ok).toBe(true);
    const reopen=(await persistence.loadReopenState(config.worldId))!;
    runtime=await createPhase1ProductReviewRuntime(root,{...config,reopen});
    const crate=reopen.bundle.structures.find(s=>s.structureDefinitionId==='structure:storage-crate')!,bench=reopen.bundle.structures.find(s=>s.structureDefinitionId==='structure:workbench')!;
    root.querySelector<HTMLElement>('[data-world-id="'+crate.structureId+'"]')!.click();
    const quantity=(pane:string)=>{const row=Array.from(root.querySelectorAll<HTMLElement>('[data-inventory-pane="'+pane+'"] [data-review-item]')).find(e=>e.getAttribute('aria-label')==='Timber');return Number(row?.textContent?.match(/×(\d+)/)?.[1]??0);};
    const selectTimber=(pane:string)=>{const row=Array.from(root.querySelectorAll<HTMLElement>('[data-inventory-pane="'+pane+'"] [data-review-item]')).find(e=>e.getAttribute('aria-label')==='Timber')!;row.click();root.querySelector<HTMLElement>('[data-review-item="'+row.dataset.reviewItem+'"]')!.focus();};
    expect(quantity('player')).toBe(3);selectTimber('player');await userEvent.keyboard('{Enter}');
    expect(quantity('player')).toBe(2);expect(quantity('storage')).toBe(1);
    selectTimber('storage');await userEvent.keyboard('{Enter}');expect(quantity('player')).toBe(3);expect(quantity('storage')).toBe(0);
    selectTimber('player');await userEvent.keyboard('{Enter}');
    expect((await runtime.save(persistence.repository,'2026-10-04T00:00:01.000Z')).ok).toBe(true);
    const saved=(await persistence.loadReopenState(config.worldId))!;
    expect(saved.bundle.containers.find(c=>c.owner.type==='structure'&&c.owner.structureId===crate.structureId)?.stacks.find(s=>s.itemDefinitionId==='item:timber')?.quantity).toBe(1);
    expect(saved.bundle.containers.find(c=>c.containerId==='inventory:solo')?.stacks.find(s=>s.itemDefinitionId==='item:timber')?.quantity).toBe(2);
    await userEvent.keyboard('{Escape}');
    root.querySelector<HTMLElement>('[data-world-id="'+bench.structureId+'"]')!.click();
    expect(root.querySelector('[data-panel-kind="craft"]')).not.toBeNull();
    expect(root.querySelector('[data-panel-kind="inventory"]')).toBeNull();
  } finally {runtime?.destroy();root.remove();persistence.close();await bundle.destroy();await deleteIndexedDbSaveDatabase(databaseName);}
},15_000);
