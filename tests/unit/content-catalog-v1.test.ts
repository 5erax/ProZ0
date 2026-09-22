import { describe, expect, it } from 'vitest';
import {
  ContentLookupError,
  ContentValidationException,
  createContentCatalogV1,
  createPhase1ContentCatalog,
  type ContentDefinitionV1,
  type ContentPackV1,
  type ProfessionQuestDefinitionV1,
} from '../../src/content';
import { sha256HexUtf8 } from '../../src/content/CanonicalJson';
import { PHASE1_CONTENT_PACK } from '../../src/content/phase1/Phase1ContentPack';

function expectValidationCode(
  callback: () => unknown,
  code: string,
): void {
  try {
    callback();
    throw new Error('Expected content validation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(ContentValidationException);
    const validation = error as ContentValidationException;
    expect(validation.errors.some((entry) => entry.code === code)).toBe(true);
  }
}

function reorderUnorderedCollections(
  definition: ContentDefinitionV1,
): ContentDefinitionV1 {
  switch (definition.kind) {
    case 'item':
      return {
        ...definition,
        capabilities: [...definition.capabilities].reverse(),
      };
    case 'recipe':
      return {
        ...definition,
        inputs: [...definition.inputs].reverse(),
        outputs: [...definition.outputs].reverse(),
      };
    case 'structure':
      return {
        ...definition,
        roles: [...definition.roles].reverse(),
      };
    case 'machine':
      return {
        ...definition,
        inputItems: [...definition.inputItems].reverse(),
      };
    case 'hazard':
      return {
        ...definition,
        mitigationItemIds: [...definition.mitigationItemIds].reverse(),
      };
    case 'weather':
      return {
        ...definition,
        hazardIds: [...definition.hazardIds].reverse(),
      };
    case 'progression':
      return {
        ...definition,
        levelThresholds: [...definition.levelThresholds].reverse(),
        milestoneRules: [...definition.milestoneRules].reverse(),
        repeatRules: [...definition.repeatRules].reverse(),
      };
    case 'skill':
      return {
        ...definition,
        requirements: [...definition.requirements].reverse(),
      };
    case 'profession-quest':
      return {
        ...definition,
        objectives: definition.objectives.map((objective) => {
          switch (objective.type) {
            case 'return-alive-to-any-structure':
            case 'structures-present':
              return {
                ...objective,
                structureIds: [...objective.structureIds].reverse(),
              };
            default:
              return objective;
          }
        }),
      };
    case 'resource':
    case 'entity':
    case 'hostile':
    case 'ruin':
    case 'profession':
      return definition;
  }
}

describe('ContentCatalogV1', () => {
  it('validates, canonicalizes, fingerprints, and exposes typed lookup', () => {
    const catalog = createPhase1ContentCatalog();

    expect(catalog.size).toBe(54);
    expect(catalog.compatibility).toMatchObject({
      formatId: 'proz0-content-pack',
      schemaVersion: 1,
      packId: 'proz0-phase1-vertical-slice',
      packVersion: 1,
    });
    expect(catalog.compatibility.canonicalFingerprint).toMatch(/^[0-9a-f]{64}$/);

    const water = catalog.getAs('item:clean-water', 'item');
    expect(water.displayName).toBe('Clean Water');
    expect(water.category).toBe('water');

    const recipes = catalog.list('recipe');
    expect(recipes).toHaveLength(11);
    expect(recipes.map((definition) => definition.id)).toEqual(
      [...recipes.map((definition) => definition.id)].sort(),
    );
  });

  it('uses the approved SHA-256 algorithm identity', () => {
    expect(sha256HexUtf8('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is load-order independent for semantically unordered collections', () => {
    const baseline = createContentCatalogV1(PHASE1_CONTENT_PACK);
    const reordered: ContentPackV1 = {
      ...PHASE1_CONTENT_PACK,
      definitions: [...PHASE1_CONTENT_PACK.definitions]
        .reverse()
        .map(reorderUnorderedCollections),
    };

    const candidate = createContentCatalogV1(reordered);

    expect(candidate.compatibility.canonicalFingerprint).toBe(
      baseline.compatibility.canonicalFingerprint,
    );
    expect(candidate.list('item').map((definition) => definition.id)).toEqual(
      baseline.list('item').map((definition) => definition.id),
    );
  });

  it('preserves profession quest objective order as fingerprint semantics', () => {
    const baseline = createContentCatalogV1(PHASE1_CONTENT_PACK);
    const definitions = PHASE1_CONTENT_PACK.definitions.map((definition) => {
      if (definition.id !== 'profession-quest:chart-the-unknown') {
        return definition;
      }

      const quest = definition as ProfessionQuestDefinitionV1;
      return {
        ...quest,
        objectives: [
          quest.objectives[1]!,
          quest.objectives[0]!,
          quest.objectives[2]!,
        ],
      };
    });

    const reorderedQuest = createContentCatalogV1({
      ...PHASE1_CONTENT_PACK,
      definitions,
    });

    expect(reorderedQuest.compatibility.canonicalFingerprint).not.toBe(
      baseline.compatibility.canonicalFingerprint,
    );
  });

  it('deep-freezes validated definitions and returned arrays', () => {
    const catalog = createPhase1ContentCatalog();
    const spear = catalog.getAs('item:basic-spear', 'item');
    const recipes = catalog.list('recipe');

    expect(Object.isFrozen(spear)).toBe(true);
    expect(Object.isFrozen(spear.capabilities)).toBe(true);
    expect(Object.isFrozen(spear.useProfile)).toBe(true);
    expect(Object.isFrozen(recipes)).toBe(true);
    expect(Object.isFrozen(recipes[0])).toBe(true);
  });

  it('rejects duplicate ids explicitly', () => {
    const duplicate: ContentPackV1 = {
      ...PHASE1_CONTENT_PACK,
      definitions: [
        ...PHASE1_CONTENT_PACK.definitions,
        PHASE1_CONTENT_PACK.definitions[0]!,
      ],
    };

    expectValidationCode(
      () => createContentCatalogV1(duplicate),
      'DUPLICATE_ID',
    );
  });

  it('rejects missing references explicitly', () => {
    const definitions = PHASE1_CONTENT_PACK.definitions.map((definition) => {
      if (definition.id !== 'recipe:cordage' || definition.kind !== 'recipe') {
        return definition;
      }

      return {
        ...definition,
        inputs: [{ itemId: 'item:missing-fiber', quantity: 3 }],
      };
    });

    expectValidationCode(
      () => createContentCatalogV1({
        ...PHASE1_CONTENT_PACK,
        definitions,
      }),
      'MISSING_REFERENCE',
    );
  });

  it('rejects wrong-kind references explicitly', () => {
    const definitions = PHASE1_CONTENT_PACK.definitions.map((definition) => {
      if (definition.id !== 'recipe:cordage' || definition.kind !== 'recipe') {
        return definition;
      }

      return {
        ...definition,
        inputs: [{ itemId: 'recipe:basic-spear', quantity: 3 }],
      };
    });

    expectValidationCode(
      () => createContentCatalogV1({
        ...PHASE1_CONTENT_PACK,
        definitions,
      }),
      'WRONG_REFERENCE_KIND',
    );
  });

  it('rejects content outside the bounded Phase 1 catalog', () => {
    const extra: ContentDefinitionV1 = {
      id: 'entity:invented-species',
      kind: 'entity',
      displayName: 'Invented Species',
      role: 'passive-wildlife',
    };

    expectValidationCode(
      () => createContentCatalogV1({
        ...PHASE1_CONTENT_PACK,
        definitions: [...PHASE1_CONTENT_PACK.definitions, extra],
      }),
      'INVALID_CROSS_REFERENCE',
    );
  });

  it('rejects non-JSON runtime authority in content input', () => {
    const invalid = {
      ...PHASE1_CONTENT_PACK,
      runtimeCallback: () => 'mutable authority',
    };

    expectValidationCode(
      () => createContentCatalogV1(invalid),
      'INVALID_FORMAT',
    );
  });

  it('fails typed lookup for missing and wrong-kind content', () => {
    const catalog = createPhase1ContentCatalog();

    expect(() => catalog.get('item:not-present')).toThrow(ContentLookupError);

    try {
      catalog.getAs('item:clean-water', 'recipe');
      throw new Error('Expected wrong-kind lookup to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(ContentLookupError);
      expect((error as ContentLookupError).code).toBe('WRONG_REFERENCE_KIND');
    }
  });
});
