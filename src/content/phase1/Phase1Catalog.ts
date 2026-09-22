import {
  createContentCatalogV1,
} from '../ContentCatalogV1';
import type { ContentCatalogV1 } from '../SchemaV1';
import { PHASE1_CONTENT_PACK } from './Phase1ContentPack';

export function createPhase1ContentCatalog(): ContentCatalogV1 {
  return createContentCatalogV1(PHASE1_CONTENT_PACK);
}
