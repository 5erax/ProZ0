/** Preserve player-owned viewport state across read-only authority refreshes. */
export function capturePanelUi(root: HTMLElement): () => void {
  const path = (element: Element): number[] => {
    const result:number[]=[];let current=element;
    while(current!==root&&current.parentElement){result.unshift(Array.prototype.indexOf.call(current.parentElement.children,current));current=current.parentElement;}
    return result;
  };
  const at=(indices:readonly number[]):HTMLElement|null=>{let node:Element=root;for(const index of indices){const next=node.children[index];if(!next)return null;node=next;}return node instanceof HTMLElement?node:null;};
  const positions=[root,...root.querySelectorAll<HTMLElement>('*')].filter(e=>e===root||e.scrollHeight>e.clientHeight||e.scrollWidth>e.clientWidth).map(e=>({path:path(e),top:e.scrollTop,left:e.scrollLeft}));
  const active=root.ownerDocument.activeElement;
  const focus=active instanceof HTMLElement&&root.contains(active)?{path:path(active),action:active.dataset.reviewAction,item:active.dataset.reviewItem,key:active.dataset.uiFocus,label:active.getAttribute('aria-label'),tag:active.tagName}:null;
  const expanded=[...root.querySelectorAll<HTMLDetailsElement>('details')].map(e=>({path:path(e),open:e.open}));
  return ()=>{
    for(const entry of expanded){const node=at(entry.path);if(node instanceof HTMLDetailsElement)node.open=entry.open;}
    if(focus){const candidates=[...root.querySelectorAll<HTMLElement>('button,input,select,summary,[tabindex]')];const target=focus.action||focus.item||focus.key?candidates.find(e=>e.tagName===focus.tag&&e.dataset.reviewAction===focus.action&&e.dataset.reviewItem===focus.item&&e.dataset.uiFocus===focus.key):focus.label?candidates.find(e=>e.tagName===focus.tag&&e.getAttribute('aria-label')===focus.label):at(focus.path);target?.focus({preventScroll:true});}
    // Restore after focus/details, including nested bag/catalog scroll containers.
    for(const entry of positions){const node=at(entry.path);if(node){node.scrollTop=entry.top;node.scrollLeft=entry.left;}}
  };
}
