import { createContentCatalogV1 } from '../ContentCatalogV1';
import type { ContentCatalogV1 } from '../SchemaV1';
import { PHASE1_CONTENT_PACK } from './Phase1ContentPack';
import { LIVING_ITEMS } from '../livingworld/LivingWorldContent';
let legacy: ContentCatalogV1 | undefined, active: ContentCatalogV1 | undefined;
export function createLegacyPhase1ContentCatalog(): ContentCatalogV1 {
  return (legacy ??= createContentCatalogV1(PHASE1_CONTENT_PACK));
}
export function createPhase1ContentCatalog(): ContentCatalogV1 {
  return (active ??= createContentCatalogV1({
    ...PHASE1_CONTENT_PACK,
    definitions: [...PHASE1_CONTENT_PACK.definitions, ...LIVING_ITEMS],
  }));
}
/** Generation V3/V4 retains its exact original content seed contract. */
export function generationCatalog(catalog: ContentCatalogV1): ContentCatalogV1 {
  return catalog.compatibility.canonicalFingerprint ===
    createPhase1ContentCatalog().compatibility.canonicalFingerprint
    ? createLegacyPhase1ContentCatalog()
    : catalog;
}
export function acceptsLegacyCatalog(
  catalog: ContentCatalogV1,
  fingerprint: unknown,
): boolean {
  return (
    catalog.compatibility.canonicalFingerprint ===
      createPhase1ContentCatalog().compatibility.canonicalFingerprint &&
    fingerprint ===
      createLegacyPhase1ContentCatalog().compatibility.canonicalFingerprint
  );
}
