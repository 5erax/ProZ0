import type { ColonyWeatherVisual } from '../../world/phase2/ColonyRegions';
export type AtmosphericKind = 'rain' | 'dry-wind';
const wrap = (n: number, size: number) => ((n % size) + size) % size;
const defaultVisual: ColonyWeatherVisual = {phase:'peak',intensity:1,direction:1};
/** Shared gust direction; particles only differ in depth, position and turbulence. */
export function atmosphericParticleAt(kind: AtmosphericKind, index: number, seconds: number, camera: { x: number; y: number }, reduced = false, visual = defaultVisual) {
  const hash = Math.imul(index + 11, 2654435761) >>> 0, near = index % 3 === 0, depth = near ? .85 : .35;
  const t = seconds * (reduced ? .2 : 1), speed = kind === 'rain' ? (near ? 115 : 72) : (near ? 48 : 28);
  // Integrating the common sinusoid keeps horizontal motion continuous between gusts.
  const windTravel = visual.direction * (t * speed - Math.cos(t * .8) * speed * .35 / .8);
  const gust = kind === 'dry-wind' ? Math.sin(t * .8 + index * .3) * 3 : 0;
  return { x: Math.floor(wrap(hash % 680 + (kind === 'rain' ? t * speed * .22 : windTravel) - camera.x * depth, 680) - 20), y: Math.floor(wrap((hash >>> 9) % 400 + (kind === 'rain' ? t * speed : gust) - camera.y * depth, 400) - 20), length: kind === 'rain' ? (near ? 12 : 7) : (near ? 3 : 1), alpha: (kind === 'rain' ? near ? .3 : .14 : near ? .3 : .12) * visual.intensity, near };
}
export interface GroundDustAnchor { readonly x:number;readonly y:number;readonly salt:number; }
export function createAtmosphericParticles(document: Document) {
  const makeCanvas=()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.style.cssText='position:absolute;inset:0;width:640px;height:360px;pointer-events:none;image-rendering:pixelated';return canvas;};
  const canvas=makeCanvas(), groundCanvas=makeCanvas(), context=canvas.getContext('2d'),ground=groundCanvas.getContext('2d');
  let previousFrame=-1,previousKind='',previousEnvelope='';
  return { canvas, groundCanvas, render(kind: AtmosphericKind, seconds: number, camera: { x: number; y: number }, reduced: boolean, visual=defaultVisual, anchors:readonly GroundDustAnchor[]=[]) {
    // Two bounded rasters at 30 Hz; no DOM churn or self-owned RAF.
    const frame=Math.floor(seconds*30), envelope=[visual.phase,Math.round(visual.intensity*100),visual.direction,reduced].join(':');
    if(!context || (frame===previousFrame && previousKind===kind && envelope===previousEnvelope))return;
    previousFrame=frame;previousKind=kind;previousEnvelope=envelope;context.clearRect(0,0,640,360);ground?.clearRect(0,0,640,360);
    const count=reduced?24:kind==='rain'?96:32;
    for(let i=0;i<count;i++) {
      const p=atmosphericParticleAt(kind,i,seconds,camera,reduced,visual);
      context.globalAlpha=reduced?p.alpha*.45:p.alpha;
      context.fillStyle=kind==='rain'?p.near?'#a9d3d5':'#6f9ca6':p.near?'#c6b18b':'#9e9876';
      if(kind==='rain')for(let y=0;y<p.length;y++)context.fillRect(p.x+Math.round(y*.22),p.y+y,p.near?2:1,1);
      else{context.fillRect(p.x,p.y,p.length,1);if(p.near)context.fillRect(p.x-2,p.y+2,1,1);}
    }
    if(ground && kind==='dry-wind') {
      const t=seconds*(reduced ? .2 : 1),gust=.55+.45*Math.sin(t*.8);
      ground.fillStyle='#c0a77c';ground.globalAlpha=visual.intensity*(reduced ? .06 : .15)*gust;
      for(const anchor of anchors.slice(0,reduced?4:12)) {
        const phase=wrap(t*.35+(anchor.salt%17)/17,1), travel=(phase-.5)*26*visual.direction;
        const x=Math.round(anchor.x+travel),y=Math.round(anchor.y-Math.sin(phase*Math.PI)*3);
        ground.fillRect(x,y,6,1);ground.fillRect(x+visual.direction*4,y-2,3,1);ground.fillRect(x-visual.direction*3,y+1,2,1);
      }
      ground.globalAlpha=1;
    }
    context.globalAlpha=1;
    canvas.dataset.particlePhase=String(frame);canvas.dataset.particleCount=String(count);canvas.dataset.weatherPhase=visual.phase;canvas.dataset.windDirection=String(visual.direction);
    groundCanvas.dataset.groundDustCount=String(kind==='dry-wind'?Math.min(anchors.length,reduced?4:12):0);
  } };
}
