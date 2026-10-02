import type {Phase1ItemAuthority} from '../items';
import type {Phase1BuildingWorld} from '../../world/building/Phase1BuildingWorld';
import {expeditionFacility} from '../../content/singleplayer/ExpeditionContent';
import {emptyExpeditionState,validateExpeditionState,type ExpeditionState,type ExpeditionPlan} from './ExpeditionState';
export interface ExpeditionActor {readonly x:number;readonly y:number;readonly alive:boolean;}
export interface ExpeditionCommand {
 readonly id:string;readonly playerId:string;readonly expectedRevision:number;readonly expectedInventoryRevision:number;
 readonly action:'plan'|'move'|'deposit'|'complete'|'cancel';readonly target:string;readonly x?:number;readonly y?:number;readonly orientation?:0|1|2|3;
}
export interface ExpeditionResult {readonly status:'committed'|'rejected';readonly message:string;}
export class ExpeditionAuthority {
 private state:ExpeditionState;
 public constructor(private readonly items:Phase1ItemAuthority,private readonly buildings:Phase1BuildingWorld,private readonly actor:(player:string)=>ExpeditionActor,initial?:ExpeditionState){this.state=initial?validateExpeditionState(initial):emptyExpeditionState();}
 public read():ExpeditionState{return structuredClone(this.state);}
 public reconcile():void{
  const facilities=this.state.facilities.filter(f=>f.canonicalStructureId===null||this.buildings.getStructure(f.canonicalStructureId)!==null);
  if(facilities.length!==this.state.facilities.length)this.state=validateExpeditionState({...this.state,facilities,revision:this.state.revision+1});
 }
 private spatial(definition:string,x:number,y:number,orientation:0|1|2|3,ignoreId=''):string|null{
  const def=expeditionFacility(definition);if(!def||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e7||Math.abs(y)>1e7||![0,1,2,3].includes(orientation))return 'INVALID_POSITION';
  const assessment=this.buildings.assessPlacement(def.shape,{mode:'free',anchor:{x,y},orientationQuarterTurns:orientation},def.canonical===null);if(typeof assessment==='string')return assessment;
  if([...this.state.plans,...this.state.facilities.filter(f=>f.canonicalStructureId===null)].some(p=>p.id!==ignoreId&&Math.abs(p.x-x)<1.5&&Math.abs(p.y-y)<1.5))return 'PLAN_OVERLAP';return null;
 }
 public execute(command:ExpeditionCommand):ExpeditionResult{
  const reject=(message:string):ExpeditionResult=>({status:'rejected',message});
  if(typeof command.id!=='string'||!command.id||command.id.length>120||typeof command.playerId!=='string'||!command.playerId||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0||!Number.isSafeInteger(command.expectedInventoryRevision)||command.expectedInventoryRevision<0)return reject('INVALID_COMMAND');
  const signature=JSON.stringify(command);const receipt=this.state.receipts.find(r=>r.id===command.id);if(receipt)return receipt.signature===signature?{status:'committed',message:receipt.result}:reject('OPERATION_ID_CONFLICT');
  if(command.expectedRevision!==this.state.revision)return reject('STALE_REVISION');
  let actor:ExpeditionActor;try{actor=this.actor(command.playerId);if(this.items.getContainerView('inventory:'+command.playerId).revision!==command.expectedInventoryRevision)return reject('STALE_INVENTORY_REVISION');}catch{return reject('UNKNOWN_PLAYER');}if(!actor.alive)return reject('PLAYER_DEAD');
  let next=this.state;let message:string;
  if(command.action==='plan'){
   if(this.state.facilities.some(f=>f.id==='facility:plan:'+command.id))return reject('OPERATION_ID_CONFLICT');
   const def=expeditionFacility(command.target);if(!def)return reject('UNKNOWN_FACILITY');if(this.state.plans.length>=32||this.state.facilities.length>=64)return reject('PLAN_LIMIT');
   const x=command.x??NaN,y=command.y??NaN,orientation=command.orientation??0;if(Math.hypot(actor.x-x,actor.y-y)>4)return reject('OUT_OF_RANGE');const reason=this.spatial(def.id,x,y,orientation);if(reason)return reject(reason);
   const plan:ExpeditionPlan={id:'plan:'+command.id,owner:command.playerId,definitionId:def.id,x,y,orientation,paid:{}};next={...next,plans:[...next.plans,plan]};message=plan.id;
  }else{
   const plan=this.state.plans.find(p=>p.id===command.target);if(!plan||plan.owner!==command.playerId)return reject('PLAN_MISSING');if(Math.hypot(actor.x-plan.x,actor.y-plan.y)>4)return reject('OUT_OF_RANGE');const def=expeditionFacility(plan.definitionId)!;
   if(command.action==='move'){
    const x=command.x??plan.x,y=command.y??plan.y,orientation=command.orientation??plan.orientation;if(Math.hypot(actor.x-x,actor.y-y)>4)return reject('OUT_OF_RANGE');const reason=this.spatial(def.id,x,y,orientation,plan.id);if(reason)return reject(reason);next={...next,plans:next.plans.map(p=>p.id===plan.id?{...p,x,y,orientation}:p)};message='PLAN_MOVED';
   }else if(command.action==='deposit'){
    const inventory=this.items.getContainerView('inventory:'+command.playerId);const inputs=def.costs.map(([itemDefinitionId,required])=>({itemDefinitionId,quantity:Math.min(required-(plan.paid[itemDefinitionId]??0),inventory.stacks.filter(s=>s.itemDefinitionId===itemDefinitionId).reduce((n,s)=>n+s.quantity,0))})).filter(c=>c.quantity>0);
    if(!inputs.length)return reject('NO_OUTSTANDING_MATERIALS_AVAILABLE');const result=this.items.commitColonyExchange({operationId:command.id,playerId:command.playerId,expectedInventoryRevision:command.expectedInventoryRevision,inputs,outputs:[]});if(result.status==='rejected')return reject(result.reason);
    const paid={...plan.paid};for(const input of inputs)paid[input.itemDefinitionId]=(paid[input.itemDefinitionId]??0)+input.quantity;next={...next,plans:next.plans.map(p=>p.id===plan.id?{...p,paid}:p)};message='MATERIALS_DEPOSITED';
   }else if(command.action==='cancel'){
    const result=this.items.commitColonyExchange({operationId:command.id,playerId:command.playerId,expectedInventoryRevision:command.expectedInventoryRevision,inputs:[],outputs:Object.entries(plan.paid).filter(([,quantity])=>quantity>0).map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity}))});if(result.status==='rejected')return reject(result.reason);next={...next,plans:next.plans.filter(p=>p.id!==plan.id)};message='PLAN_REFUNDED';
   }else if(command.action==='complete'){
    if(this.state.facilities.length>=64)return reject('FACILITY_LIMIT');if(def.costs.some(([id,q])=>(plan.paid[id]??0)<q))return reject('MATERIALS_MISSING');const reason=this.spatial(def.id,plan.x,plan.y,plan.orientation,plan.id);if(reason)return reject(reason);
    let canonicalStructureId:string|null=null;
    if(def.canonical!==null){const operationId='expedition-build:'+plan.id;const reservation=this.buildings.reservePlacement({operationId,commandFingerprint:JSON.stringify(plan),actorPlayerId:command.playerId,definitionId:def.canonical,expectedBuildRevision:this.buildings.getBuildRevision(),placement:{mode:'free',anchor:{x:plan.x,y:plan.y},orientationQuarterTurns:plan.orientation}});if(typeof reservation==='string')return reject(reservation);
     const error=this.items.commitPrepaidConstruction({playerId:command.playerId,expectedInventoryRevision:command.expectedInventoryRevision,container:reservation.containerId?{containerId:reservation.containerId,kind:'storage-crate'}:null});if(error){this.buildings.releasePlacementReservation(reservation);return reject(error);}canonicalStructureId=this.buildings.commitReservedPlacement(reservation).structureId;
    }
    next={...next,plans:next.plans.filter(p=>p.id!==plan.id),facilities:[...next.facilities,{id:'facility:'+plan.id,owner:plan.owner,definitionId:plan.definitionId,x:plan.x,y:plan.y,orientation:plan.orientation,canonicalStructureId,water:0,progress:0}]};message='FACILITY_COMPLETED';
   }else return reject('INVALID_ACTION');
  }
  this.state=validateExpeditionState({...next,revision:this.state.revision+1,receipts:[...next.receipts,{id:command.id,signature,result:message}].slice(-96)});return {status:'committed',message};
 }
}
