import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const cache=new Map<string,Phase1ProductionSprite>();
/** Native ground footprint, not a screen-space item thumbnail. Four orientations share authority dimensions. */
export function fieldFacilitySprite(id:string,width:number,depth:number,orientation:number):Phase1ProductionSprite {
  const key=[id,width,depth,orientation].join(':');const existing=cache.get(key);if(existing)return existing;
  const swapped=orientation%2===1,w=(swapped?depth:width)*8,d=(swapped?width:depth)*8;
  const nativeWidth=Math.max(36,Math.ceil(2*(w+d)+8)),floorHeight=w+d,nativeHeight=Math.ceil(floorHeight+40),cx=nativeWidth/2,cy=nativeHeight-floorHeight/2;
  // Project the four authority corners at 16×8 px per metre. Body art may
  // overhang, while the floor and foot anchor keep the actual placement size.
  const corners=[[cx-w-d,cy-(w-d)/2],[cx-w+d,cy-(w+d)/2],[cx+w+d,cy+(w-d)/2],[cx+w-d,cy+(w+d)/2]];
  const points=(values:number[][])=>values.map(p=>p.join(',')).join(' ');
  const floor=points(corners);
  let body='<polygon fill="#263c41" points="'+floor+'"/><polygon fill="none" stroke="#79918a" points="'+floor+'"/>';
  const wall=(x:number,y:number,ww:number,hh:number,color:string)=>'<path fill="'+color+'" d="M'+x+' '+y+'h'+ww+'v'+hh+'h-'+ww+'Z"/>';
  if(id==='livestock-pen'||id==='poultry-coop'){
    body+='<polygon fill="none" stroke="#ac9871" stroke-width="3" points="'+floor+'"/>';
    for(const [x,y] of corners)body+=wall(x!,y!-12,3,14,'#c3b18a');
    if(id==='poultry-coop')body+=wall(cx-12,cy-22,24,18,'#715843')+'<path fill="#a59269" d="M'+(cx-16)+' '+(cy-22)+'l16-9 16 9Z"/>';
  }else if(id==='campfire'){
    body+='<ellipse fill="#657a78" cx="'+cx+'" cy="'+cy+'" rx="14" ry="7"/>'+wall(cx-10,cy-4,20,3,'#9e805a')+wall(cx-3,cy-13,7,12,'#b59a62');
  }else if(id==='camp-bed'){
    body+='<polygon fill="#665742" points="'+floor+'"/><polygon fill="#8fa99a" points="'+points(corners.map(([x,y])=>[x!,y!-5]))+'"/>';
    const pillow=corners[orientation%4]!;body+=wall(pillow[0]!-4,pillow[1]!-7,9,4,'#d1ceb0');
  }else if(['rain-collector','irrigation-tank','compost-bin','clay-kiln','grain-mill','smoking-rack','tannery','trail-beacon'].includes(id)){
    const colors:Record<string,string>={'rain-collector':'#689593','irrigation-tank':'#526c81','compost-bin':'#857449','clay-kiln':'#a87758','grain-mill':'#a69772','smoking-rack':'#675949','tannery':'#977b5f','trail-beacon':'#567876'};
    const height=id==='trail-beacon'?35:id==='irrigation-tank'?26:18;
    const bodyWidth=id==='trail-beacon'?8:26;
    body+=wall(cx-bodyWidth/2,cy-height,bodyWidth,height,colors[id]!)+wall(cx-bodyWidth/2,cy-height+3,bodyWidth,3,'#b3b99a')+wall(cx+bodyWidth/2-4,cy-height+6,4,height-8,'#304b53');
    if(id==='grain-mill')body+='<path fill="none" stroke="#d4c59b" stroke-width="3" d="M'+(cx-20)+' '+(cy-26)+'l24 24m0-24-24 24"/>';
    if(id==='smoking-rack'||id==='tannery')body+=wall(cx-9,cy-height+8,6,8,'#c39f82')+wall(cx+2,cy-height+6,7,10,'#b78862');
    if(id==='clay-kiln')body+=wall(cx-6,cy-10,12,10,'#172c30');
  }else{
    const greenhouse=id==='greenhouse',cabin=id==='field-cabin';
    const roofColor=greenhouse?'#85a9a288':cabin?'#a59470':'#718d8c';
    const roof=corners.map(([x,y])=>[x!,y!-26]);
    for(const [a,b,colour] of [[0,3,greenhouse?'#456c6877':'#435d61'],[3,2,greenhouse?'#36595577':'#334a53']] as const)body+='<polygon fill="'+colour+'" points="'+points([corners[a]!,corners[b]!,roof[b]!,roof[a]!])+'"/>';
    body+='<polygon fill="'+roofColor+'" stroke="#9ba995" points="'+points(roof)+'"/>';
    const face=orientation%2===0?0:2,doorX=(corners[face]![0]!+corners[3]![0]!)/2,doorY=(corners[face]![1]!+corners[3]![1]!)/2;
    body+=wall(doorX-5,doorY-15,10,orientation<2?15:7,orientation<2?'#142b36':'#92b8ac');
    if(greenhouse)body+='<path fill="none" stroke="#b7c7b0" d="M'+cx+' '+(cy-40)+'V'+cy+'m-12-32v26m24-26v26"/>';
  }
  const marker=corners[orientation%4]!;body+=wall(marker[0]!-2,marker[1]!-4,4,3,'#d3c59a');
  const value:Phase1ProductionSprite={assetPath:'procedural:field-facility:'+key,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+nativeWidth+'" height="'+nativeHeight+'" shape-rendering="crispEdges">'+body+'</svg>'),cellWidth:nativeWidth,cellHeight:nativeHeight,sourceWidth:nativeWidth,sourceHeight:nativeHeight,columns:1,index:0,footOffsetY:floorHeight/2};
  if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(key,value);return value;
}
