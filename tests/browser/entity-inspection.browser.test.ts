import {expect,it} from 'vitest';
import {bindEntityInspection,createEntityInspection} from '../../src/client/presentation/EntityInspection';
import {installGameContextMenu} from '../../src/client/input/GameContextMenu';

it('inspects only explicit targets, toggles one compact card, preserves text and cleans lifecycle', () => {
  const root=document.createElement('section'),a=document.createElement('button'),b=document.createElement('button'),input=document.createElement('input');
  root.append(a,b,input);document.body.append(root);
  let reads=0,blocked=false;
  bindEntityInspection(a,()=>{reads++;return {id:'plant:a',name:'<img src=x onerror=bad()>',kind:'Plant',facts:['Mature','Yield: 3 fiber']};});
  bindEntityInspection(b,()=>({id:'animal:b',name:'Goat',kind:'Animal',facts:['Health: 8/8']}));
  const inspection=createEntityInspection(root,()=>blocked),remove=installGameContextMenu(root,inspection.inspect);
  const right=(e:HTMLElement)=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
  const card=root.querySelector<HTMLElement>('[data-entity-inspection]')!;
  expect(card.hidden).toBe(true);inspection.render();expect(reads).toBe(0);
  right(a);expect(card.hidden).toBe(false);expect(card.dataset.entityId).toBe('plant:a');expect(card.querySelector('img')).toBeNull();
  inspection.render();expect(reads).toBe(1);
  right(b);expect(card.dataset.entityId).toBe('animal:b');expect(card.textContent).not.toContain('fiber');
  right(b);expect(card.hidden).toBe(true);
  a.focus();a.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,code:'F10',shiftKey:true}));expect(card.hidden).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyD'}));expect(card.hidden).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyM'}));expect(card.hidden).toBe(true);
  right(a);blocked=true;inspection.render();expect(card.hidden).toBe(true);
  blocked=false;right(a);a.remove();inspection.render();expect(card.hidden).toBe(true);
  const editor=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});input.dispatchEvent(editor);expect(editor.defaultPrevented).toBe(false);
  remove();inspection.destroy();expect(root.querySelector('[data-entity-inspection]')).toBeNull();root.remove();
});

it('secondary placement cancellation consumes the gesture before inspection',()=>{
 const root=document.createElement('section'),entity=document.createElement('button');root.append(entity);document.body.append(root);
 let pending=true,cancels=0,reads=0;
 bindEntityInspection(entity,()=>{reads++;return {id:'e',name:'Plant',kind:'Plant',facts:[]};});
 const card=createEntityInspection(root,()=>false),remove=installGameContextMenu(root,event=>{if(pending){pending=false;cancels++;card.close();return;}card.inspect(event);});
 entity.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));expect(cancels).toBe(1);expect(reads).toBe(0);
 entity.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));expect(reads).toBe(1);expect(cancels).toBe(1);
 remove();card.destroy();root.remove();
});


it('keeps inspection on the same authoritative identity after a presentation marker is replaced',()=>{
 const root=document.createElement('section'),first=document.createElement('button');root.append(first);document.body.append(root);
 const view={id:'plan:same',name:'Camp Bed',kind:'Blueprint',facts:['Timber: 1/2']};
 bindEntityInspection(first,()=>view);const inspection=createEntityInspection(root,()=>false);
 inspection.inspect({target:first} as unknown as MouseEvent);const card=root.querySelector<HTMLElement>('[data-entity-inspection]')!;expect(card.hidden).toBe(false);
 const replacement=document.createElement('button');bindEntityInspection(replacement,()=>view);first.replaceWith(replacement);inspection.render();expect(card.hidden).toBe(false);expect(card.dataset.entityId).toBe('plan:same');
 replacement.remove();inspection.render();expect(card.hidden).toBe(true);inspection.destroy();root.remove();
});
