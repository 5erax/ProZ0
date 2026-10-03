export type ExplorationTemplateId = 'relay' | 'laboratory' | 'garden' | 'mine' | 'array' | 'shelter';
export interface ExplorationTemplate {
  readonly id: ExplorationTemplateId;
  readonly siteId: string;
  readonly restoreLabel: string;
  readonly objective: string;
  readonly effect: string;
  readonly costs: readonly (readonly [string, number])[];
  readonly reward: readonly (readonly [string, number])[];
  readonly tool?: string;
}
/** Finite, authored rewards; no second ancient artifact or loot roll on UI/reload. */
export const EXPLORATION_TEMPLATES: readonly ExplorationTemplate[] = [
  { id:'relay', siteId:'site:marsh-relay', restoreLabel:'Reconnect relay', objective:'Reconnect the broken signal lead to recover a field-laboratory coordinate.', effect:'The restored relay provides a bearing and distance to an abandoned laboratory.', costs:[['item:cordage',1],['item:metal-ore',1]],reward:[['item:repair-patch',1],['item:cordage',2]] },
  { id:'laboratory', siteId:'site:abandoned-lab', restoreLabel:'Restore field terminal', objective:'Repair the terminal and recover its remaining medical supplies.', effect:'Research and specialization are available within 7.5 m of the restored terminal.', costs:[['item:cordage',1],['item:metal-ore',2]],reward:[['item:field-dressing',2],['item:repair-patch',1]] },
  { id:'garden', siteId:'site:windfall-grove', restoreLabel:'Tend overgrown garden', objective:'Water and bind the abandoned growing beds to restore the native resource pocket.', effect:'Native timber, fiber and food resource nodes within 16 m recover 20% sooner. Ecology, seasons and other recovery factors still apply.', costs:[['item:clean-water',1],['item:plant-fiber',2]],reward:[['item:root-seed',2],['item:grain-seed',2],['item:compost',1]] },
  { id:'mine', siteId:'site:mining-camp', restoreLabel:'Brace mining cache', objective:'Use a field tool and brace the abandoned loading frame before recovering the finite ore supply.', effect:'A one-time supply of ore and stone can be recovered; this cache never refills.', costs:[['item:timber',1],['item:cordage',1]],reward:[['item:metal-ore',5],['item:stone',3]],tool:'item:stone-field-tool' },
  { id:'array', siteId:'site:badlands-array', restoreLabel:'Align windbreak plates', objective:'Bind the surviving plates into a windbreak before recovering the dormant power module.', effect:'Within 3 m, the restored plates shelter you from dry-wind thermal exposure. They do not shelter other weather.', costs:[['item:metal-ore',2],['item:cordage',1]],reward:[['item:power-unit-kit',1]] },
  { id:'shelter', siteId:'site:abandoned-shelter', restoreLabel:'Patch shelter canopy', objective:'Patch the canopy to establish an expedition rest stop, then recover its remaining provisions.', effect:'Shelter within 3 m and interruptible eight-second rest within 4 m. Moving, damage, danger and survival costs follow the existing rest rules.', costs:[['item:timber',1],['item:plant-fiber',3]],reward:[['item:clean-water',2],['item:edible-plant',2]] },
];
export const NEW_EXPLORATION_SITE_IDS = ['site:abandoned-lab','site:mining-camp','site:abandoned-shelter'] as const;
export interface ExplorationProgress {
  readonly version: 1;
  readonly entries: readonly { readonly siteId: string; readonly stage: 'restored' | 'recovered' }[];
}
export function validateExplorationProgress(value: unknown, inspectedSites: readonly string[]): ExplorationProgress {
  const progress=value as ExplorationProgress;
  if (!progress || progress.version!==1 || !Array.isArray(progress.entries) || progress.entries.length>6 || new Set(progress.entries.map(e=>e?.siteId)).size!==progress.entries.length || progress.entries.some(e=>!e || !EXPLORATION_TEMPLATES.some(t=>t.siteId===e.siteId) || !inspectedSites.includes(e.siteId) || !['restored','recovered'].includes(e.stage))) throw Error('Invalid exploration progress');
  return Object.freeze({version:1,entries:Object.freeze(progress.entries.map(e=>Object.freeze({...e})))});
}
