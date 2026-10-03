import { createContentCatalogV1 } from '../ContentCatalogV1';
import type { ContentCatalogV1 } from '../SchemaV1';
import { PHASE1_CONTENT_PACK } from './Phase1ContentPack';
import { LIVING_ITEMS } from '../livingworld/LivingWorldContent';
import { LIVING_ROOT_ITEMS } from '../livingworld/LivingRootContent';
import { FISHING_ITEMS } from '../livingworld/FishingContent';
let legacy: ContentCatalogV1 | undefined, livingV1: ContentCatalogV1 | undefined, rootsV1: ContentCatalogV1 | undefined, active: ContentCatalogV1 | undefined;
export function createLegacyPhase1ContentCatalog(): ContentCatalogV1 {
  return (legacy ??= createContentCatalogV1(PHASE1_CONTENT_PACK));
}
export function createPhase1ContentCatalog(): ContentCatalogV1 {
  return (active ??= createContentCatalogV1({
    ...PHASE1_CONTENT_PACK,
    definitions: [...PHASE1_CONTENT_PACK.definitions, ...LIVING_ITEMS, ...LIVING_ROOT_ITEMS, ...FISHING_ITEMS],
  }));
}
/** Exact 29-item living catalog shipped before the root addition. */
export function createLivingV1ContentCatalog(): ContentCatalogV1 {
  return livingV1 ??= createContentCatalogV1({ ...PHASE1_CONTENT_PACK, definitions: [...PHASE1_CONTENT_PACK.definitions, ...LIVING_ITEMS] });
}
export function acceptsPreviousLivingCatalog(catalog: ContentCatalogV1, fingerprint: unknown): boolean {
  return catalog.compatibility.canonicalFingerprint === createPhase1ContentCatalog().compatibility.canonicalFingerprint && fingerprint === createLivingV1ContentCatalog().compatibility.canonicalFingerprint;
}
/** Exact catalog before the additive fishing items; never accept arbitrary fingerprints. */
export function createRootV1ContentCatalog(): ContentCatalogV1 {
  return rootsV1 ??= createContentCatalogV1({ ...PHASE1_CONTENT_PACK, definitions: [...PHASE1_CONTENT_PACK.definitions, ...LIVING_ITEMS, ...LIVING_ROOT_ITEMS] });
}
export function acceptsRootV1Catalog(catalog: ContentCatalogV1, fingerprint: unknown): boolean {
  return catalog.compatibility.canonicalFingerprint === createPhase1ContentCatalog().compatibility.canonicalFingerprint && fingerprint === createRootV1ContentCatalog().compatibility.canonicalFingerprint;
}
/** Generation V3/V4 retains its exact original content seed contract. */
export function generationCatalog(catalog: ContentCatalogV1): ContentCatalogV1 {
  return (catalog.compatibility.canonicalFingerprint ===
    createPhase1ContentCatalog().compatibility.canonicalFingerprint || catalog.compatibility.canonicalFingerprint === createLivingV1ContentCatalog().compatibility.canonicalFingerprint || catalog.compatibility.canonicalFingerprint === createRootV1ContentCatalog().compatibility.canonicalFingerprint)
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
