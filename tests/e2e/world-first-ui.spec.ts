import {expect,test} from '@playwright/test';

test('world-first UI: contextual click and selected-item split preserve the real inventory quantity',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:world-first-split&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=world-first-split');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await page.locator('.sp-context-action').click();
  const expedition=page.locator('.sp-expedition-panel');
  await expedition.getByRole('button',{name:'Emergency supplies · once',exact:true}).click();
  await expedition.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Inventory [I]',exact:true}).click();
  const inventory=page.locator('[data-panel-kind=inventory]');
  await inventory.getByRole('button',{name:'Clean Water',exact:true}).click();
  await inventory.getByRole('button',{name:'Split selected quantity',exact:true}).click();
  const water=inventory.getByRole('button',{name:'Clean Water',exact:true});
  await expect(water).toHaveCount(2);
  const quantities=await water.allTextContents();
  expect(quantities.reduce((sum,text)=>sum+Number(/×(\d+)/.exec(text)?.[1]),0)).toBe(3);
  await inventory.getByRole('button',{name:'Close',exact:true}).click();
  await expect(inventory).toHaveCount(0);
  await expect(page.locator('.sp-context-action')).toBeVisible();
});
