/** Native 32×48 poses. Same frame contract, feet and equipment anchors as gameplay. */
const rect=(x:number,y:number,w:number,h:number,c:string)=>`<path fill="${c}" d="M${x} ${y}h${w}v${h}h-${w}Z"/>`;
function pose(row:number,column:number,cloak=false):string {
  const walking=column>=2&&column<8,attack=column>=12&&column<21,gather=column>=8&&column<12,drink=column>=21&&column<25,hurt=column>=25&&column<27,dead=column>=27;
  const step=walking?[-1,0,1,1,0,-1][column-2]!:0,bob=walking&&column%3===0?1:0,back=row>=3,side=row===2,shift=row>0&&row<4?1:0;
  if(dead){if(cloak)return rect(8,39,14,5,'#7f9484');return rect(5,43,23,3,'#142b30')+rect(6,39,19,5,'#526c68')+rect(7,37,7,4,'#b9b89b')+rect(17,40,10,3,'#334d50');}
  if(cloak)return rect(9+shift,17+bob,14,14,'#667b68')+rect(9+shift,17+bob,3,14,'#a3af8b')+rect(20+shift,18+bob,3,14,'#374f48')+rect(11+shift,17+bob,10,2,'#c0c5a3');
  const suit=hurt?'#b58273':'#76918a',light=hurt?'#d0a393':'#b6c5aa',dark='#334f55';
  let art=rect(8,45,18,2,'#142b30')+rect(10,31+bob,6,10+step,'#496568')+rect(17,31+bob,6,10-step,'#334f55')+rect(9,41+step,7,5-step,'#233b44')+rect(17,41-step,8,5+step,'#233b44')+rect(10,42+step,5,1,light)+rect(18,42-step,5,1,'#76918a');
  art+=rect(9+shift,17+bob,14,17,suit)+rect(9+shift,18+bob,3,13,light)+rect(20+shift,19+bob,3,15,dark)+rect(10+shift,30+bob,12,3,'#293f44')+rect(16+shift,30+bob,3,2,'#a1bdb0');
  art+=rect(10+shift,6+bob,12,11,'#334d50')+rect(11+shift,5+bob,9,3,'#b6c5aa')+rect(9+shift,9+bob,14,5,'#617e78')+rect(10+shift,9+bob,2,4,'#d2d6b7');
  if(!back)art+=rect(13+shift+(side?3:0),9+bob,side?6:8,4,'#163943')+rect(14+shift+(side?3:0),9+bob,side?4:6,1,'#89bfb5');
  else art+=rect(12+shift,12+bob,7,3,'#263e46')+rect(13+shift,13+bob,5,1,'#8bab9e');
  art+=rect(13+shift,19+bob,6,7,back?'#334f55':'#4c6868')+rect(14+shift,20+bob,4,1,light)+rect(17+shift,24+bob,2,2,'#a8d6bc');
  const raised=attack||gather||drink,armY=raised?14+column%3:20+bob;
  art+=rect(6+shift,armY,4,raised?9:12,suit)+rect(6+shift,armY,1,8,light)+rect(6+shift,armY+(raised?7:10),4,3,'#c7b18e')+rect(23,20+bob,3,11,dark)+rect(23,29+bob,3,3,'#b7a17e');
  if(column>=16&&column<21)art+=rect(3,9+column%3,2,28,'#a08a62')+rect(2,5+column%3,4,6,'#aebeb5')+rect(3,5+column%3,1,4,'#e0dfbb');
  if(gather)art+=rect(4,10+column%2,2,14,'#a08a62')+rect(1,9+column%2,8,3,'#93a99c');
  if(drink)art+=rect(7,12,4,7,'#81aba9')+rect(8,11,2,2,'#c4cfba');
  return art;
}
function sheet(cloak:boolean):string {
  const frames:string[]=[];
  for(let row=0;row<5;row++)for(let column=0;column<33;column++)frames.push(`<g transform="translate(${column*32} ${row*48})">${pose(row,column,cloak)}</g>`);
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1056" height="240" shape-rendering="crispEdges">'+frames.join('')+'</svg>');
}
export const PIONEER_ART_URL=sheet(false);
export const PIONEER_CLOAK_URL=sheet(true);
