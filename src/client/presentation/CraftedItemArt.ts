const box=(x:number,y:number,w:number,h:number,fill:string)=>`<path fill="${fill}" d="M${x} ${y}h${w}v${h}h-${w}Z"/>`;
/** Eighteen authored native icons, matching the field modules' material/light palette. */
function icon(i:number):string {
  const light='#bdc8ad',metal='#76918a',dark='#334f55',wood='#a38b65',paper='#d1c9a3';
  switch(i){
    case 0:return box(5,6,2,12,'#79956c')+box(9,4,2,16,'#a1b483')+box(13,7,2,13,'#5f7d62')+box(17,3,2,17,'#8b9f76')+box(5,13,14,3,wood);
    case 1:return '<path fill="'+wood+'" d="m3 15 12-8 7 4-12 9z"/><path fill="#675845" d="m3 15 7 5v3l-7-5zm7 5 12-9v3l-12 9z"/>'+box(7,14,2,2,paper);
    case 2:case 3:return '<path fill="'+(i===2?'#84958b':metal)+'" d="m3 15 3-7 8-4 6 5 2 8-9 5z"/><path fill="'+dark+'" d="m3 15 10 4 9-2-9 5z"/><path fill="'+light+'" d="m6 8 8-4-3 5-5 2z"/>'+(i===3?box(13,10,4,3,'#bcab7a')+box(7,14,3,2,'#b4a475'):'');
    case 4:return box(6,10,12,8,'#8c9c6a')+box(7,9,7,2,light)+box(11,5,2,6,'#52715b')+box(13,5,5,3,'#6e8e65')+box(9,17,6,3,'#b4a47a');
    case 5:return box(8,3,8,3,dark)+box(6,6,12,15,metal)+box(8,8,8,10,'#81aaa9')+box(8,8,2,9,light)+box(8,19,8,2,dark);
    case 6:return '<path fill="none" stroke="'+wood+'" stroke-width="3" d="M6 6h12v12H6zm3 3h6v6H9"/>'+box(5,19,15,2,dark)+box(6,5,9,1,paper);
    case 7:case 8:return '<path fill="'+wood+'" d="m5 22-2-2 14-17 2 2z"/>'+(i===7?'<path fill="'+metal+'" d="m7 5 3-3 12 8-2 3z"/><path fill="'+light+'" d="m10 2 12 8-1 1-12-8z"/>':'<path fill="'+metal+'" d="m16 6 3-5 3 1-2 6-5 3z"/><path fill="'+light+'" d="m19 1 3 1-3 4-1 1z"/>');
    case 9:return '<path fill="#7c927e" d="M6 3h12l3 17-9 3-10-3z"/>'+box(8,4,7,2,light)+box(10,7,4,12,'#4b675c')+box(7,19,11,2,paper);
    case 10:case 11:return box(3,7,18,12,metal)+box(4,6,15,2,light)+box(5,10,13,7,paper)+box(10,10,3,7,i===10?'#94ab91':dark)+box(8,12,7,3,i===10?'#94ab91':dark);
    case 17:return '<path fill="'+metal+'" d="m3 12 9-9 10 7-7 12-10-3z"/><path fill="'+light+'" d="m3 12 9-9-3 10z"/>'+box(13,9,4,3,paper)+box(9,15,3,3,'#839b88');
    default:{const accent=[wood,light,'#a5bc9a','#b7cb9f','#81aaa9'][i-12]!;return '<path fill="'+metal+'" d="m3 7 10-4 9 5-9 5z"/><path fill="'+dark+'" d="m3 7 10 6v9L3 16z"/><path fill="#526e70" d="m13 13 9-5v9l-9 5z"/>'+box(6,10,4,2,light)+box(15,13,4,4,accent)+box(15,14,2,1,paper);}
  }
}
export const CRAFTED_ITEM_ATLAS_URL='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="72" shape-rendering="crispEdges">'+Array.from({length:18},(_,i)=>`<g transform="translate(${i%6*24} ${Math.floor(i/6)*24})">${icon(i)}</g>`).join('')+'</svg>');
