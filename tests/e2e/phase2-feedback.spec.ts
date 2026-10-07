import {expect,test} from '@playwright/test';
import {walk} from './support/solo-actions';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const evidence=resolve('test-results/phase2-colony-depth/feedback');
test('settings consolidate display, sound and real save; quiet HUD keeps contextual actions',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:'world:settings',proz0WorldSeed:'p1-world-golden',proz0Players:'colonist',proz0Player:'colonist',proz0SaveDb:'settings'}));
 await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
 await expect(page.locator('.p1-first-action')).toBeHidden();
 await expect(page.getByRole('button',{name:'Toggle fullscreen',exact:true})).toBeHidden();
 await expect(page.getByRole('button',{name:'Enable sound',exact:true})).toBeHidden();
 await expect(page.locator('.p1-product-save-box')).toBeHidden();
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,'quiet-hud.png')});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Settings',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Enable sound',exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Toggle fullscreen',exact:true})).toBeVisible();
 const position=Number(await page.locator('canvas').getAttribute('data-player-y'));
 await page.keyboard.down('s');await page.waitForTimeout(300);await page.keyboard.up('s');
 expect(Number(await page.locator('canvas').getAttribute('data-player-y'))).toBe(position);
 await page.getByLabel('Display resolution',{exact:true}).selectOption('1');
 await expect(page.locator('canvas')).toHaveAttribute('data-display-scale','1');
 await page.getByLabel('Display resolution',{exact:true}).selectOption('auto');
 await expect(page.locator('canvas')).toHaveAttribute('data-display-scale','2');
 await dialog.getByRole('button',{name:'Save world [L]',exact:true}).click();
 await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
 await page.screenshot({path:resolve(evidence,'settings.png')});
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await page.reload();
 await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened','true');
 await page.getByRole('button',{name:'Inventory [I]',exact:true}).click();
 await expect(page.locator('.p1-inventory-utilities')).toBeVisible();
 await page.getByRole('button',{name:'Build storage crate',exact:true}).click();
 await expect(page.locator('[data-construction-definition="structure:storage-crate"]')).toBeVisible();
 await expect(page.locator('[data-construction-definition="structure:storage-crate"] button').first()).toBeFocused();
});

test('fresh ecosystem: natural gathering builds accessible storage and a real stack transfers into it',async({page})=>{
 const runtimeErrors:string[]=[];page.on('pageerror',error=>runtimeErrors.push(error.stack??error.message));page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(message.text());});
 test.setTimeout(300000);await page.setViewportSize({width:1280,height:720});
 await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:'world:eco-storage',proz0WorldSeed:'p1-world-golden',proz0Players:'builder',proz0Player:'builder',proz0SaveDb:'eco-storage'}));
 await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
 const interaction=page.locator('[data-region="interaction"]');
 const gather=async(count:number)=>{for(let n=0;n<count;n++){await page.keyboard.press('e');await expect(interaction).toHaveAttribute('data-state','CHANNELING');await expect(interaction).toHaveAttribute('data-state','AVAILABLE',{timeout:3000});}};
 await walk(page,18,10);
 await page.locator('[data-world-role="resource"][data-focused-target="true"]').click();
 await expect(interaction).toHaveAttribute('data-state','CHANNELING');
 await expect(interaction).toHaveAttribute('data-state','AVAILABLE',{timeout:3000});await gather(2);
 await page.getByRole('button',{name:'Craft [C]',exact:true}).click();
 for(let n=0;n<2;n++)await page.locator('[data-review-action="craft-recipe:recipe:cordage"]').click();await page.keyboard.press('Escape');
 // Follow explicit legs between resource pockets instead of a greedy diagonal at terrain seams.
 await walk(page,18,-12);
 try {await walk(page,-36,-12);} catch(error) {
  mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,'storage-walk-blocked.png')});
  console.info('Storage walk blocked state',await page.evaluate(()=>({canvas:{...document.querySelector<HTMLCanvasElement>('canvas')?.dataset},root:{...document.querySelector<HTMLElement>('#app')?.dataset},visibility:document.visibilityState,focus:document.activeElement?.outerHTML,meters:Array.from(document.querySelectorAll('[role=meter]')).map(element=>({label:element.getAttribute('aria-label'),value:element.getAttribute('aria-valuenow')})),panels:Array.from(document.querySelectorAll('.p1-panel,.lw-panel,.sp-expedition-panel')).map(element=>({class:element.className,hidden:(element as HTMLElement).hidden,text:element.textContent?.slice(0,300)}))})));
  console.info('Storage walk runtime errors',runtimeErrors);
  throw error;
 }
 await gather(4);await walk(page,-4,0);
 await page.getByRole('button',{name:'Inventory [I]',exact:true}).click();
 await expect(page.locator('.lw-object').first()).toHaveCSS('pointer-events','none');
 await page.keyboard.press('e');
 await expect(page.locator('.lw-panel')).toBeHidden();
 await expect(page.locator('.p1-inventory-utilities')).toBeVisible();
 await page.getByRole('button',{name:'Build storage crate',exact:true}).click();
 await page.locator('[data-construction-definition="structure:storage-crate"]').getByRole('button',{name:'Prepare kit',exact:true}).click();await page.locator('[data-review-action="craft-recipe:recipe:storage-crate-kit"]').click();
 await page.getByRole('button',{name:'Build base [B]',exact:true}).click();
 // Place at a known reachable distance from the actual standing position.
 // This exercises free placement, instead of asking an axis-only walker to enter/go around a new obstacle.
 const point=await page.locator('canvas').evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.left+(320+1.1*16)*r.width/640,y:r.top+(180+1.1*8)*r.height/360};});
 await page.locator('[data-construction-definition="structure:storage-crate"]').getByRole('button',{name:'Place owned kit',exact:true}).click();
 await page.mouse.move(point.x,point.y);
 await expect(page.locator('.sp-ghost')).toHaveAttribute('data-valid','true');await page.keyboard.press('Enter');
 await expect(page.locator('[data-structure-id="structure:storage-crate"]')).toHaveAttribute('data-built-count','1');await page.keyboard.press('Escape');
 await page.keyboard.press('i');await expect(page.locator('[data-panel-kind="container"]')).toBeVisible();
 await page.locator('[data-inventory-pane="player"]').getByRole('button',{name:'Stone Field Tool',exact:true}).click();
 await page.getByRole('button',{name:'Move one',exact:true}).click();
 const storage=page.locator('[data-inventory-pane="storage"]');
 await expect(storage.getByRole('button',{name:'Stone Field Tool',exact:true})).toContainText('×1');
 await expect(page.locator('[data-inventory-pane="player"]').getByRole('button',{name:'Stone Field Tool',exact:true})).toHaveCount(0);
 await page.keyboard.press('Escape');await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');await page.reload();
 await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened','true');
 await page.keyboard.press('i');await expect(page.locator('[data-panel-kind="container"]')).toBeVisible();
 await expect(storage.getByRole('button',{name:'Stone Field Tool',exact:true})).toContainText('×1');
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,'storage-reopened.png')});
});
