export function createColonySettings(root: HTMLElement): {destroy(): void} {
  const document=root.ownerDocument, target=document.defaultView!;
  root.dataset.colonyUi='true';
  const host=document.createElement('section');host.className='p2-settings';
  const style=document.createElement('style');
  style.textContent=[
    '.p2-settings{position:absolute;right:12px;top:12px;z-index:1000002;color:#eef4e6;font:12px monospace}',
    '.p2-settings button,.p2-settings select{color:inherit;background:#14232d;border:1px solid #809799;padding:8px;font:inherit;cursor:pointer}',
    '.p2-settings-panel{position:absolute;right:0;top:42px;width:260px;max-height:75vh;overflow:auto;background:#0b1721fa;border:1px solid #809799;padding:14px;box-sizing:border-box}',
    '.p2-settings-panel[hidden]{display:none}.p2-settings-panel>h2{margin:0 0 12px;font-size:16px}.p2-settings-panel label{display:block;margin:12px 0}',
    '.p2-settings-panel .p1-fullscreen{position:static!important;display:block!important;margin:12px 0}',
    '.p2-settings-panel .p1-product-save-box{position:static!important;transform:none!important;width:auto!important;margin:8px 0;font-size:11px}',
    '.p2-settings-panel .p2-audio-controls{margin:12px 0}.p2-settings-panel input{max-width:100%}',
    '[data-colony-ui="true"] .p1-product-controls-hint,[data-colony-ui="true"] .p1-first-action{display:none!important}',
    '[data-colony-ui="true"] .p1-world{right:36px}[data-colony-ui="true"] .p1-toasts{top:65px;max-width:200px;font-size:8px}',
    '[data-colony-ui="true"] .p1-interaction[data-reason="COOLDOWN"]{display:none}',
    '[data-colony-ui="true"] .p1-interaction{bottom:34px;min-height:20px}',
    '[data-colony-ui="true"] .p1-toast[data-routine-cooldown="true"],[data-colony-ui="true"] .p1-equipment[data-empty="true"]{display:none}',
    '[data-colony-ui="true"] .p2-colony-controls{top:auto;bottom:12px;max-width:52vw}[data-colony-ui="true"] .p2-region{display:none}',
    '[data-colony-ui="true"] .p2-colony-panel{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);max-height:65vh;max-width:85vw}',
    '[data-colony-ui="true"] .p2-colony-controls nav button{font-size:0;padding:7px 12px}[data-colony-ui="true"] .p2-colony-controls nav button::before{font-size:13px}',
    '[data-colony-ui="true"] [data-colony-panel="research"]::before{content:"⚗"}[data-colony-ui="true"] [data-colony-panel="journal"]::before{content:"◇"}[data-colony-ui="true"] [data-colony-panel="professions"]::before{content:"⌁"}',
  ].join('');
  const gear=document.createElement('button');gear.textContent='⚙';gear.setAttribute('aria-label','Settings');gear.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='p2-settings-panel';panel.dataset.colonySettings='true';panel.hidden=true;panel.setAttribute('aria-label','Settings');panel.setAttribute('role','dialog');
  const title=document.createElement('h2');title.textContent='Settings';panel.append(title);
  const setOpen=(open:boolean):void=>{panel.hidden=!open;gear.setAttribute('aria-expanded',String(open));root.dataset.colonySettingsOpen=String(open);};
  gear.addEventListener('click',()=>{if(panel.hidden===true){document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));setOpen(true);}else setOpen(false);});
  const label=document.createElement('label');label.textContent='Display size ';
  const resolution=document.createElement('select');resolution.setAttribute('aria-label','Display resolution');
  for(const [value,text] of [['auto','Fit window'],['1','640 × 360'],['2','1280 × 720'],['3','1920 × 1080']]){const option=document.createElement('option');option.value=value!;option.textContent=text!;resolution.append(option);}
  resolution.addEventListener('change',()=>{root.dataset.displayLimit=resolution.value;target.dispatchEvent(new Event('resize'));});label.append(resolution);panel.append(label);
  const help=document.createElement('button');help.textContent='Controls [H]';help.addEventListener('click',()=>{setOpen(false);document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyH',bubbles:true}));});panel.append(help);
  const close=document.createElement('button');close.textContent='Close';close.addEventListener('click',()=>setOpen(false));panel.append(close);
  const key=(event:KeyboardEvent):void=>{if(event.code==='Escape')setOpen(false);};document.addEventListener('keydown',key);
  host.append(style,gear,panel);root.append(host);
  return {destroy(){document.removeEventListener('keydown',key);host.remove();delete root.dataset.colonyUi;delete root.dataset.displayLimit;delete root.dataset.colonySettingsOpen;}};
}
