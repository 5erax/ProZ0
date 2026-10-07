import { bindLocalized } from '../localization/Locale';
import { presentationText } from '../localization/PresentationMessages';
export interface MapViewportState {zoom:number;x:number;y:number;}
/** Presentation-only pan/zoom. Exploration, positions and marker identity are untouched. */
export function mountMapViewport(field:HTMLElement,state:MapViewportState):HTMLElement {
  const document=field.ownerDocument,host=document.createElement('div'),viewport=document.createElement('div'),controls=document.createElement('nav');
  host.className='p1-map-view';viewport.className='p1-map-viewport';controls.className='p1-map-zoom-controls';
  viewport.tabIndex=0;viewport.style.cssText='position:relative;overflow:hidden;touch-action:none;width:100%;height:190px;border:1px solid #789a96;background:#090d14;';
  bindLocalized(viewport,'aria-label',()=>presentationText('mapHelp'));
  field.style.margin='0';field.style.transformOrigin='0 0';field.style.position='absolute';field.style.border='0';
  viewport.append(field);host.append(controls,viewport);
  const apply=()=>{
    state.zoom=Math.max(1,Math.min(4,state.zoom));
    const width=viewport.clientWidth,height=viewport.clientHeight,baseWidth=parseFloat(field.style.width),baseHeight=parseFloat(field.style.height);
    const fit=width>0&&height>0?Math.min(width/baseWidth,height/baseHeight):1,scale=fit*state.zoom;
    const contentWidth=baseWidth*scale,contentHeight=baseHeight*scale;
    field.style.setProperty('--map-inverse-scale',String(1/scale));
    state.x=contentWidth<=width?0:Math.max(width-contentWidth,Math.min(0,state.x));
    state.y=contentHeight<=height?0:Math.max(height-contentHeight,Math.min(0,state.y));
    field.style.transform=`translate(${contentWidth<width?(width-contentWidth)/2:state.x}px,${contentHeight<height?(height-contentHeight)/2:state.y}px) scale(${scale})`;viewport.dataset.mapZoom=String(state.zoom);viewport.dataset.mapFitScale=String(fit);
  };
  const zoom=(factor:number)=>{
    const width=viewport.clientWidth,height=viewport.clientHeight,baseWidth=parseFloat(field.style.width),baseHeight=parseFloat(field.style.height);
    const fit=width>0&&height>0?Math.min(width/baseWidth,height/baseHeight):1,old=state.zoom;
    const x=baseWidth*fit*old<width?(width-baseWidth*fit*old)/2:state.x,y=baseHeight*fit*old<height?(height-baseHeight*fit*old)/2:state.y;
    state.zoom=Math.max(1,Math.min(4,old*factor));const ratio=state.zoom/old;
    state.x=width/2-(width/2-x)*ratio;state.y=height/2-(height/2-y)*ratio;apply();
  };
  for(const [glyph,key,action] of [['−','zoomOut',()=>zoom(1/1.25)],['+','zoomIn',()=>zoom(1.25)],['⌂','resetMap',()=>{state.zoom=1;state.x=0;state.y=0;apply();}]] as const){
    const button=document.createElement('button');button.type='button';button.textContent=glyph;button.dataset.mapZoomAction=key;bindLocalized(button,'aria-label',()=>presentationText(key));bindLocalized(button,'title',()=>presentationText(key));button.onclick=action;controls.append(button);
  }
  const help=document.createElement('small');bindLocalized(help,'textContent',()=>presentationText('mapHelp'));controls.append(help);
  const orientation=document.createElement('span');orientation.className='p1-map-orientation';
  bindLocalized(orientation,'textContent',()=>presentationText('mapOrientation',{meters:field.dataset.mapWorldUnitsPerCell??''}));controls.append(orientation);
  host.addEventListener('keydown',event=>{
    let handled=true;
    switch(event.key){case '+':case '=':zoom(1.25);break;case '-':zoom(1/1.25);break;case 'Home':state.zoom=1;state.x=0;state.y=0;apply();break;case 'ArrowLeft':state.x+=24;apply();break;case 'ArrowRight':state.x-=24;apply();break;case 'ArrowUp':state.y+=24;apply();break;case 'ArrowDown':state.y-=24;apply();break;default:handled=false;}
    if(handled){event.preventDefault();event.stopPropagation();}
  });
  viewport.addEventListener('wheel',event=>{event.preventDefault();event.stopPropagation();zoom(event.deltaY<0?1.25:1/1.25);},{passive:false});
  let drag:{id:number;x:number;y:number}|null=null;
  viewport.onpointerdown=event=>{if(event.button!==0||event.target instanceof Element&&event.target.closest('[data-review-action]'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);viewport.focus({preventScroll:true});};
  viewport.onpointermove=event=>{if(!drag||drag.id!==event.pointerId)return;const rect=viewport.getBoundingClientRect(),scaleX=rect.width/Math.max(1,viewport.offsetWidth),scaleY=rect.height/Math.max(1,viewport.offsetHeight);state.x+=(event.clientX-drag.x)/scaleX;state.y+=(event.clientY-drag.y)/scaleY;drag.x=event.clientX;drag.y=event.clientY;apply();};
  viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};
  queueMicrotask(()=>{if(host.isConnected)apply();});
  return host;
}
