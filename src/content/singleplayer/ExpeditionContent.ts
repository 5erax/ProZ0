export const EXPEDITION_FACILITIES = [
 {id:'supply-cache',name:'Supply Cache',canonical:'structure:storage-crate',shape:'structure:storage-crate',costs:[['item:timber',2],['item:plant-fiber',2]],purpose:'Store real inventory stacks near an expedition.'},
 {id:'field-workbench',name:'Field Workbench',canonical:'structure:workbench',shape:'structure:workbench',costs:[['item:timber',3],['item:stone',2]],purpose:'Craft station recipes away from the landing site.'},
 {id:'camp-bed',name:'Camp Bed',canonical:null,shape:'structure:workbench',costs:[['item:timber',2],['item:plant-fiber',4]],purpose:'Safe, interruptible short sleep and recovery.'},
 {id:'campfire',name:'Campfire',canonical:null,shape:'structure:storage-crate',costs:[['item:stone',3],['item:timber',1]],purpose:'Cook edible plants and water into a nourishing meal.'},
 {id:'rain-collector',name:'Rain Collector',canonical:null,shape:'structure:storage-crate',costs:[['item:timber',2],['item:plant-fiber',3]],purpose:'Collect a bounded clean-water supply during local rain.'},
 {id:'field-lab',name:'Field Laboratory',canonical:null,shape:'structure:workbench',costs:[['item:timber',3],['item:stone',2],['item:cordage',1]],purpose:'Research without returning to the original base.'},
 {id:'trail-beacon',name:'Trail Beacon',canonical:null,shape:'structure:storage-crate',costs:[['item:timber',1],['item:plant-fiber',2]],purpose:'Visible marker for a discovered outpost.'},
] as const;
export type ExpeditionFacilityId = typeof EXPEDITION_FACILITIES[number]['id'];
export const expeditionFacility = (id:string) => EXPEDITION_FACILITIES.find(d=>d.id===id);
export function expeditionStructureCap(id:string):number {return id==='structure:storage-crate'?24:id==='structure:workbench'?12:1;}
export const EXPEDITION_RECIPES = [
 {id:'field-cordage',name:'Field Cordage',costs:[['item:plant-fiber',3]],output:'item:cordage',quantity:1,station:null},
 {id:'field-dressing',name:'Field Dressing',costs:[['item:plant-fiber',4]],output:'item:field-dressing',quantity:1,station:null},
 {id:'field-wrap',name:'Thermal Wrap',costs:[['item:plant-fiber',6],['item:cordage',1]],output:'item:thermal-wrap',quantity:1,station:'field-workbench'},
 {id:'field-tool',name:'Stone Field Tool',costs:[['item:stone',2],['item:timber',1],['item:cordage',1]],output:'item:stone-field-tool',quantity:1,station:'field-workbench'},
 {id:'field-spear',name:'Basic Spear',costs:[['item:stone',1],['item:timber',2],['item:cordage',1]],output:'item:basic-spear',quantity:1,station:null},
 {id:'field-patch',name:'Field Repair Patch',costs:[['item:plant-fiber',2],['item:timber',1]],output:'item:repair-patch',quantity:1,station:'field-workbench'},
] as const;
