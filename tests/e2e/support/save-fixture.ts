import type {Page} from '@playwright/test';
import type {composePhase1SaveV2} from '../../../src/integration';

/** Explicit controlled saved-world fixture; never described as a novice journey. */
export async function installSaveFixture(page: Page, name: string, save: ReturnType<typeof composePhase1SaveV2>) {
  await page.goto('/');
  await page.evaluate(async ({name,save:request}) => {
    const db = await new Promise<IDBDatabase>((resolve,reject) => {
      const open = indexedDB.open(name,2);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('worlds',{keyPath:'worldId'});
        for (const [table,key] of [['players','playerId'],['containers','containerId'],['chunks','coord'],['footholds','footholdId'],['structures','structureId']]) open.result.createObjectStore(table!,{keyPath:key === 'coord' ? ['worldId','coord.x','coord.y'] : ['worldId',key!]}).createIndex('worldId','worldId');
      };
      open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
    });
    await new Promise<void>((resolve,reject) => {
      const tx=db.transaction(['worlds','players','containers','chunks','footholds','structures'],'readwrite');
      tx.objectStore('worlds').put(request.world);
      for (const key of ['players','containers','chunks','footholds','structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
    });db.close();
  },{name,save});
}
