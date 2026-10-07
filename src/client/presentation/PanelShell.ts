import './PanelShell.css';
import { bindLocalized } from '../localization/Locale';
import { coreText } from '../localization/CoreMessages';

/** Existing content and command handlers stay owned by the caller. */
export function panelShell(panel: HTMLElement, title: HTMLElement, close: HTMLButtonElement, tabs?: HTMLElement): HTMLElement {
  const document=panel.ownerDocument;
  const header=document.createElement('header');header.className='ui-panel-header';
  close.dataset.panelClose='true';close.type='button';bindLocalized(close,'textContent',()=> '×');
  bindLocalized(close,'aria-label',()=>coreText('close'));
  bindLocalized(close,'title',()=>coreText('close')+' [Esc]');
  header.append(title,close);
  if(tabs){tabs.classList.add('ui-panel-tabs');header.append(tabs);}
  const body=document.createElement('div');body.className='ui-panel-body';
  body.append(...Array.from(panel.childNodes));panel.append(header,body);
  panel.dataset.panelShell='true';panel.setAttribute('role','dialog');
  return body;
}
