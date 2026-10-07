import type { ContentCatalogV1 } from '../../content';
import { FORAGE,LIVING_RECIPES } from '../../content/livingworld/LivingWorldContent';
import { EXPEDITION_FACILITIES } from '../../content/singleplayer/ExpeditionContent';
import { contentDisplayName } from '../localization/ContentText';
import { uiPhrase } from '../localization/UiMessages';
import { gameUiText } from '../localization/GameUiMessages';
import { applyProductionSprite,itemIconSprite } from './Phase1ProductionAssets';
import { costRequirements, missingCostText, costLabel } from './CostRequirements';
import { formatNumber } from '../localization/Locale';
/** Source hints come from shipped recipes/resource definitions, not invented grant paths. */
export function materialSource(catalog:ContentCatalogV1,id:string):string {
  const name=(id:string)=>contentDisplayName(catalog.get(id));
  const living=LIVING_RECIPES.find(r=>r.output===id);
  if(living)return gameUiText('craftSource',{quantity:living.quantity,station:living.station?uiPhrase(EXPEDITION_FACILITIES.find(f=>f.id===living.station)?.name??living.station):gameUiText('byHand'),inputs:living.costs.map(([id,q])=>q+' × '+name(id)).join(' + ')});
  const recipe=catalog.list('recipe').find(r=>r.outputs.some(o=>o.itemId===id));
  if(recipe)return gameUiText('craftSource',{quantity:recipe.outputs.find(o=>o.itemId===id)!.quantity,station:recipe.requiredStationStructureId?name(recipe.requiredStationStructureId):gameUiText('byHand'),inputs:recipe.inputs.map(i=>i.quantity+' × '+name(i.itemId)).join(' + ')});
  const sources=[...catalog.list('resource').filter(r=>r.output.itemId===id).map(r=>name(r.id)),...FORAGE.filter(f=>f.output===id).map(f=>uiPhrase(f.name))];
  return sources.length?gameUiText('gatherSource',{sources:sources.join(', ')}):gameUiText('unknownSource');
}
export function materialHint(document:Document,name:string,help:string,have:number,need:number,id=''):HTMLDetailsElement {
 const node=document.createElement('details'),summary=document.createElement('summary'),icon=document.createElement('span'),text=document.createElement('span'),source=document.createElement('p');
 const requirement=costRequirements([{itemId:id,quantity:need}],()=>have,()=>name)[0]!;
 const status=missingCostText([requirement])||costLabel('sufficient');
 node.className='p2-material';node.dataset.material=id;node.dataset.sufficient=String(requirement.status==='sufficient');node.dataset.deficit=String(requirement.deficit);
 summary.setAttribute('aria-label',name+' '+formatNumber(have)+'/'+formatNumber(need)+' · '+status);summary.title=summary.getAttribute('aria-label')!;
 const sprite=itemIconSprite(id||name);if(sprite)applyProductionSprite(icon,sprite,1);icon.setAttribute('aria-hidden','true');text.textContent=formatNumber(have)+'/'+formatNumber(need);summary.append(icon,text);
 const label=document.createElement('span');label.className='p2-material-name';label.textContent=name+' · '+(requirement.status==='missing'?status:'✓');summary.append(label);
 source.textContent=help;node.append(summary,source);return node;
}
