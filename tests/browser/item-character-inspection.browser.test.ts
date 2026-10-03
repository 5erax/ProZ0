import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { resolvePhase1PresentationQaFixture } from '../../src/client/qa/Phase1PresentationFixture';
import { createPhase1HudOverlay } from '../../src/client/presentation/Phase1HudOverlay';
import { inspectItem } from '../../src/client/presentation/ItemInspection';
import { inspectCharacter } from '../../src/client/presentation/CharacterInspection';
import type { PlayerSurvivalView } from '../../src/simulation';

it('inspection sections retain expansion, scroll and keyboard focus when authoritative stats update', () => {
  const fixture = resolvePhase1PresentationQaFixture('?qaPhase1=inventory')!.state;
  if (fixture.panel?.kind !== 'inventory') throw Error('Missing inventory fixture');
  const s: PlayerSurvivalView = { playerId: 'solo', revision: 0, tick: 0, health: 100, food: 70, water: 40, stamina: 100, temperature: 50, lifeState: { type: 'alive' }, staminaRegenPenaltyPercent: 10 };
  const panel = { ...fixture.panel, selectedItemId: 'tool', character: inspectCharacter(s, 'NORMAL'), items: fixture.panel.items.map(i => i.id === 'tool' ? { ...i, inspection: inspectItem(createPhase1ContentCatalog(), 'item:stone-field-tool'), stackWeightKg: .5, stackBulk: .5 } : i) };
  const root = document.createElement('section'), canvas = document.createElement('canvas'); root.dataset.phase1QaMode = 'none'; root.append(canvas); document.body.append(root);
  const hud = createPhase1HudOverlay(root, canvas, { ...fixture, panel });
  try {
    const status = root.querySelector<HTMLDetailsElement>('.p1-character-inspection')!, properties = root.querySelector<HTMLDetailsElement>('.p1-inspection-more')!;
    status.open = true; properties.open = true; status.querySelector<HTMLElement>('summary')!.focus();
    expect(root.querySelector('.p1-item-inspection')!.textContent).toContain('not a weapon');
    expect(root.querySelector('[data-effect="thirst"]')!.textContent).toContain('Treatment:');
    expect(root.querySelector('.p1-item-inspection')!.textContent).not.toContain('Equip selected');
    hud.update({ ...fixture, panel: { ...panel, character: inspectCharacter({ ...s, water: 39, revision: 1, tick: 60 }, 'NORMAL') } });
    expect(root.querySelector<HTMLDetailsElement>('.p1-character-inspection')!.open).toBe(true);
    expect(root.querySelector<HTMLDetailsElement>('.p1-inspection-more')!.open).toBe(true);
    expect(document.activeElement?.textContent).toContain('Character status');
    expect(root.querySelector('.p1-character-values')!.textContent).toContain('Water: 39/100');
  } finally { hud.destroy(); root.remove(); }
});


it('keeps action dock identity and keyboard focus while survival meters and the clock change',()=>{
 const fixture=resolvePhase1PresentationQaFixture('?qaPhase1=inventory')!.state;
 const root=document.createElement('section'),canvas=document.createElement('canvas');root.dataset.phase1QaMode='none';root.append(canvas);document.body.append(root);
 const hud=createPhase1HudOverlay(root,canvas,{...fixture,panel:null});
 try{
  const button=root.querySelector<HTMLButtonElement>('[data-review-action="open-build"]')!;button.focus();
  for(let i=0;i<30;i++)hud.update({...fixture,panel:null,health:{...fixture.health,value:99-i},world:{...fixture.world,timeLabel:'09:'+String(i).padStart(2,'0')}});
  expect(root.querySelector('[data-review-action="open-build"]')).toBe(button);expect(document.activeElement).toBe(button);expect(root.querySelectorAll('.p1-action-dock')).toHaveLength(1);
 }finally{hud.destroy();root.remove();}
});
