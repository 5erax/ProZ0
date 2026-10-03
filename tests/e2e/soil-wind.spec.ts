import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {colonyBiomeAt} from '../../src/world/phase2/ColonyRegions';
import {soilAt} from '../../src/content/livingworld/LivingWorldContent';
import {soilCellKey,soilCellPosition} from '../../src/simulation/livingworld/SoilMoisture';
import {installSaveFixture} from './support/save-fixture';

test('saved badlands fixture: moving wind, grounded dust, local watering and wet terrain survive reopening',async({page})=>{
  test.setTimeout(180000);
  const b=await Phase1AuthorityBundle.create({worldId:'world:soil-wind-ui',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,worldGenerationVersion:5,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>,key:string;
  try{
    // Controlled save setup: find real walkable dry ground in the seeded badlands.
    let point:{x:number;y:number}|undefined;
    for(let y=-180;y<=180&&!point;y+=12)for(let x=-260;x<=260&&!point;x+=12){
      const candidate=soilCellPosition(soilCellKey({x,y}));if(colonyBiomeAt(b.config.worldSeed,candidate)!=='ochre-badlands'||!['sand','rocky'].includes(soilAt(b.config.worldSeed,candidate).id))continue;
      b.getRuntime('solo').relocatePlayer(candidate);await b.stepSolo();
      if(typeof b.buildings.assessPlacement('structure:storage-crate',{mode:'free',anchor:candidate,orientationQuarterTurns:0},true)==='object')point=candidate;
    }
    expect(point).toBeDefined();
    while(b.authorityTick<12000)await b.stepSolo();
    expect(b.survival.getPlayerState('solo').lifeState.type).toBe('alive');
    expect(b.items.commitColonyExchange({operationId:'fixture:watering',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:watering-can',quantity:1},{itemDefinitionId:'item:clean-water',quantity:3}]}).status).toBe('committed');
    save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});key=soilCellKey(point!);
    const plot=soilCellPosition(key);
    save.world.livingWorld!.plots.push({id:'plot:soil-ui',owner:'solo',...plot,crop:'grain',progress:0,moisture:2000,dryTicks:0,dead:false,fertility:0});
  }finally{await b.destroy();}
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await installSaveFixture(page,'soil-wind-ui',save);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:soil-wind-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=soil-wind-ui');
  await expect(page.locator('[data-runtime-status=ready]')).toBeVisible();
  const wind=page.locator('[data-weather-effect="dry-wind"]');
  await expect(wind).toHaveAttribute('data-weather-phase','peak');
  await expect(wind).toHaveAttribute('data-ground-dust-count',/^[1-9]\d?$/);
  const frame=await wind.getAttribute('data-rain-motion-phase');await expect(wind).not.toHaveAttribute('data-rain-motion-phase',frame!);
  const plot=page.locator('[data-living-id="plot:soil-ui"]');await plot.click();
  await page.locator('.lw-panel').getByRole('button',{name:'Water · 1 clean water',exact:true}).click();
  await expect(page.locator('.lw-panel').getByRole('status')).toContainText('watered');await page.keyboard.press('Escape');
  const tile=page.locator('[data-world-role="terrain"][data-soil-cell="'+key+'"]').first();
  await expect(tile).toHaveAttribute('data-moisture','wet');
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
  mkdirSync('test-results/soil-wind',{recursive:true});await page.screenshot({path:'test-results/soil-wind/wet-ground-wind.png'});
  await page.reload();await expect(tile).toHaveAttribute('data-moisture','wet');
  await expect(wind).toHaveAttribute('data-weather-phase','peak');
  expect(errors).toEqual([]);
});
