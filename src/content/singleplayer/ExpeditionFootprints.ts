/** Authoritative ground dimensions for new field structures. Old saves retain shape dimensions. */
export const EXPEDITION_FIELD_FOOTPRINTS = Object.freeze({
  "camp-bed": Object.freeze({ width: 1.25, depth: 0.75 }),
  campfire: Object.freeze({ width: 0.75, depth: 0.75 }),
  "rain-collector": Object.freeze({ width: 0.75, depth: 0.75 }),
  "field-lab": Object.freeze({ width: 1.5, depth: 1.25 }),
  "trail-beacon": Object.freeze({ width: 0.5, depth: 0.5 }),
  "livestock-pen": Object.freeze({ width: 3, depth: 2.5 }),
  "poultry-coop": Object.freeze({ width: 2, depth: 1.5 }),
  greenhouse: Object.freeze({ width: 2.5, depth: 2 }),
  "irrigation-tank": Object.freeze({ width: 1.25, depth: 1 }),
  "compost-bin": Object.freeze({ width: 1, depth: 1 }),
  "clay-kiln": Object.freeze({ width: 1.5, depth: 1.25 }),
  "smoking-rack": Object.freeze({ width: 2, depth: 0.75 }),
  "grain-mill": Object.freeze({ width: 1, depth: 1 }),
  tannery: Object.freeze({ width: 1.75, depth: 1.25 }),
  "field-cabin": Object.freeze({ width: 2.5, depth: 2 }),
});
export function expeditionFieldFootprint(
  id: string,
): { readonly width: number; readonly depth: number } | null {
  return Object.prototype.hasOwnProperty.call(EXPEDITION_FIELD_FOOTPRINTS, id)
    ? EXPEDITION_FIELD_FOOTPRINTS[
        id as keyof typeof EXPEDITION_FIELD_FOOTPRINTS
      ]
    : null;
}
