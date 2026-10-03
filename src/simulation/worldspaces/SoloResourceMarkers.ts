import type { WorldPosition } from '../../foundation';
export interface ResourceMarker {readonly resourceId:string;readonly definitionId:string;readonly spaceId:string;readonly position:WorldPosition;}
export interface SoloResourceMarkersState {readonly version:1;readonly ownerPlayerId:string;readonly revision:number;readonly markers:readonly ResourceMarker[];}
export function validateSoloResourceMarkers(input:unknown):asserts input is SoloResourceMarkersState {
  if(!input||typeof input!=='object')throw Error('Invalid resource markers');
  const s=input as SoloResourceMarkersState;
  if(s.version!==1||typeof s.ownerPlayerId!=='string'||!s.ownerPlayerId||s.ownerPlayerId.length>256||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.markers)||s.markers.length>64)throw Error('Invalid resource marker header');
  const ids=new Set<string>();
  for(const m of s.markers){
    if(!m||typeof m.resourceId!=='string'||!m.resourceId||m.resourceId.length>256||typeof m.definitionId!=='string'||!m.definitionId.startsWith('resource:')||m.definitionId.length>128||typeof m.spaceId!=='string'||!m.spaceId||m.spaceId.length>128||!m.position||!Number.isFinite(m.position.x)||!Number.isFinite(m.position.y)||Math.abs(m.position.x)>1e7||Math.abs(m.position.y)>1e7||ids.has(m.spaceId+':'+m.resourceId))throw Error('Invalid resource marker');
    ids.add(m.spaceId+':'+m.resourceId);
  }
}
/** Solo-private annotations. IDs/positions come exclusively from observed canonical nodes. */
export class SoloResourceMarkers {
  private state:SoloResourceMarkersState;
  constructor(ownerPlayerId:string,private readonly observed:(id:string)=>ResourceMarker|null,initial?:SoloResourceMarkersState){
    const state=initial??{version:1,ownerPlayerId,revision:0,markers:[]};validateSoloResourceMarkers(state);if(state.ownerPlayerId!==ownerPlayerId)throw Error('Wrong marker owner');
    this.state=this.copy(state);
  }
  private copy(s:SoloResourceMarkersState):SoloResourceMarkersState{return Object.freeze({...s,markers:Object.freeze(s.markers.map(m=>Object.freeze({...m,position:Object.freeze({...m.position})})))});}
  read():SoloResourceMarkersState{return this.state;}
  set(playerId:string,expectedRevision:number,resourceId:string,spaceId:string,marked:boolean):string {
    if(playerId!==this.state.ownerPlayerId)return 'WRONG_OWNER';
    if(expectedRevision!==this.state.revision)return 'STALE_REVISION';
    const exists=this.state.markers.some(m=>m.resourceId===resourceId&&m.spaceId===spaceId);
    if(exists===marked)return 'COMPLETE';
    const observed=marked?this.observed(resourceId):null;
    if(marked&&(!observed||observed.spaceId!==spaceId))return 'UNEXPLORED_AREA';
    if(marked&&this.state.markers.length>=64)return 'MARKER_LIMIT';
    const markers=marked?[...this.state.markers,observed!]:this.state.markers.filter(m=>m.resourceId!==resourceId||m.spaceId!==spaceId);
    this.state=this.copy({...this.state,revision:this.state.revision+1,markers});return 'COMPLETE';
  }
}
