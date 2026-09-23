import {
  canonicalJsonStringify,
  compareCanonicalStrings,
  sha256HexUtf8,
  type JsonValue,
} from './CanonicalJson';
import { deepFreeze } from './Immutable';
import {
  CONTENT_FORMAT_ID,
  CONTENT_SCHEMA_VERSION,
  type ContentCatalogV1,
  type ContentDefinitionV1,
  type ContentId,
  type ContentKindV1,
  type ContentPackV1,
  type DefinitionForKind,
  type ItemQuantitySpecV1,
  type ProfessionQuestObjectiveV1,
  type SkillRequirementV1,
} from './SchemaV1';
import { validateAndCloneContentPackV1 } from './ValidationV1';

function compareId(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  return compareCanonicalStrings(left.id, right.id);
}

function compareItemQuantity(
  left: ItemQuantitySpecV1,
  right: ItemQuantitySpecV1,
): number {
  return compareCanonicalStrings(left.itemId, right.itemId);
}

function canonicalizeSkillRequirements(
  requirements: readonly SkillRequirementV1[],
): readonly SkillRequirementV1[] {
  return [...requirements].sort((left, right) =>
    compareCanonicalStrings(left.type, right.type)
    || compareCanonicalStrings(
      canonicalJsonStringify(left as unknown as JsonValue),
      canonicalJsonStringify(right as unknown as JsonValue),
    ),
  );
}

function canonicalizeProfessionObjective(
  objective: ProfessionQuestObjectiveV1,
): ProfessionQuestObjectiveV1 {
  switch (objective.type) {
    case 'return-alive-to-any-structure':
    case 'structures-present':
      return {
        ...objective,
        structureIds: [...objective.structureIds].sort((left, right) =>
          compareCanonicalStrings(left, right),
        ),
      };
    default:
      return { ...objective };
  }
}

function canonicalizeDefinition(
  definition: ContentDefinitionV1,
): ContentDefinitionV1 {
  switch (definition.kind) {
    case 'item':
      return {
        ...definition,
        capabilities: [...definition.capabilities].sort((left, right) =>
          compareCanonicalStrings(left, right),
        ),
        ...(
          definition.useProfile === undefined
            ? {}
            : { useProfile: { ...definition.useProfile } }
        ),
      };

    case 'recipe':
      return {
        ...definition,
        inputs: [...definition.inputs].sort(compareItemQuantity),
        outputs: [...definition.outputs].sort(compareItemQuantity),
      };

    case 'resource':
      return {
        ...definition,
        output: { ...definition.output },
      };

    case 'entity':
      return { ...definition };

    case 'structure':
      return {
        ...definition,
        roles: [...definition.roles].sort((left, right) =>
          compareCanonicalStrings(left, right),
        ),
        ...(definition.container === undefined
          ? {}
          : { container: { ...definition.container } }),
        ...(definition.shelter === undefined
          ? {}
          : { shelter: { ...definition.shelter } }),
        ...(definition.powerSource === undefined
          ? {}
          : { powerSource: { ...definition.powerSource } }),
      };

    case 'machine':
      return {
        ...definition,
        inputItems: [...definition.inputItems].sort(compareItemQuantity),
      };

    case 'hazard':
      return {
        ...definition,
        mitigationItemIds: [...definition.mitigationItemIds].sort(
          (left, right) => compareCanonicalStrings(left, right),
        ),
      };

    case 'weather':
      return {
        ...definition,
        hazardIds: [...definition.hazardIds].sort((left, right) =>
          compareCanonicalStrings(left, right),
        ),
        firstSessionStartWindowActiveMinutes: [
          definition.firstSessionStartWindowActiveMinutes[0],
          definition.firstSessionStartWindowActiveMinutes[1],
        ],
      };

    case 'hostile':
      return {
        ...definition,
        attack: { ...definition.attack },
      };

    case 'ruin':
      return {
        ...definition,
        oneTimePhysicalReward: { ...definition.oneTimePhysicalReward },
      };

    case 'progression':
      return {
        ...definition,
        levelThresholds: [...definition.levelThresholds].sort(
          (left, right) => left.level - right.level,
        ),
        milestoneRules: [...definition.milestoneRules]
          .sort(compareId)
          .map((rule) => ({
            ...rule,
            trigger: { ...rule.trigger },
          })),
        repeatRules: [...definition.repeatRules]
          .sort(compareId)
          .map((rule) => ({ ...rule })),
        deathXpLoss: { ...definition.deathXpLoss },
      };

    case 'skill':
      return {
        ...definition,
        requirements: canonicalizeSkillRequirements(definition.requirements),
      };

    case 'profession':
      return { ...definition };

    case 'profession-quest':
      return {
        ...definition,
        objectives: definition.objectives.map(canonicalizeProfessionObjective),
      };
  }
}

export function canonicalizeContentPackV1(
  pack: ContentPackV1,
): ContentPackV1 {
  return {
    formatId: pack.formatId,
    schemaVersion: pack.schemaVersion,
    packId: pack.packId,
    packVersion: pack.packVersion,
    definitions: [...pack.definitions]
      .map(canonicalizeDefinition)
      .sort(compareId),
  };
}

export function computeContentFingerprintV1(
  canonicalPack: ContentPackV1,
): string {
  const canonicalJson = canonicalJsonStringify(
    canonicalPack as unknown as JsonValue,
  );
  return sha256HexUtf8(canonicalJson);
}

export class ContentLookupError extends Error {
  public constructor(
    public readonly code: 'MISSING_REFERENCE' | 'WRONG_REFERENCE_KIND',
    message: string,
  ) {
    super(message);
    this.name = 'ContentLookupError';
  }
}

class FinalizedContentCatalogV1 implements ContentCatalogV1 {
  public readonly compatibility;
  public readonly size: number;

  private readonly byId: ReadonlyMap<ContentId, ContentDefinitionV1>;
  private readonly byKind: ReadonlyMap<
    ContentKindV1,
    readonly ContentDefinitionV1[]
  >;

  public constructor(canonicalPack: ContentPackV1) {
    const definitions = canonicalPack.definitions.map((definition) =>
      deepFreeze(definition),
    );
    const byId = new Map<ContentId, ContentDefinitionV1>();
    const mutableByKind = new Map<ContentKindV1, ContentDefinitionV1[]>();

    for (const definition of definitions) {
      byId.set(definition.id, definition);

      const kindDefinitions = mutableByKind.get(definition.kind) ?? [];
      kindDefinitions.push(definition);
      mutableByKind.set(definition.kind, kindDefinitions);
    }

    const byKind = new Map<ContentKindV1, readonly ContentDefinitionV1[]>();
    for (const [kind, kindDefinitions] of mutableByKind) {
      byKind.set(kind, Object.freeze([...kindDefinitions]));
    }

    this.byId = byId;
    this.byKind = byKind;
    this.size = definitions.length;
    this.compatibility = deepFreeze({
      formatId: CONTENT_FORMAT_ID,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      packId: canonicalPack.packId,
      packVersion: canonicalPack.packVersion,
      canonicalFingerprint: computeContentFingerprintV1(canonicalPack),
    });
  }

  public has(id: ContentId): boolean {
    return this.byId.has(id);
  }

  public get(id: ContentId): Readonly<ContentDefinitionV1> {
    const definition = this.byId.get(id);
    if (definition === undefined) {
      throw new ContentLookupError(
        'MISSING_REFERENCE',
        `Unknown content definition id: ${id}`,
      );
    }
    return definition;
  }

  public getAs<K extends ContentKindV1>(
    id: ContentId,
    kind: K,
  ): Readonly<DefinitionForKind<K>> {
    const definition = this.get(id);

    if (definition.kind !== kind) {
      throw new ContentLookupError(
        'WRONG_REFERENCE_KIND',
        `Content ${id} is kind ${definition.kind}, expected ${kind}.`,
      );
    }

    return definition as Readonly<DefinitionForKind<K>>;
  }

  public list<K extends ContentKindV1>(
    kind: K,
  ): readonly Readonly<DefinitionForKind<K>>[] {
    const definitions = this.byKind.get(kind) ?? [];
    return definitions as readonly Readonly<DefinitionForKind<K>>[];
  }
}

export function createContentCatalogV1(input: unknown): ContentCatalogV1 {
  const validated = validateAndCloneContentPackV1(input);
  const canonical = deepFreeze(canonicalizeContentPackV1(validated));

  return new FinalizedContentCatalogV1(canonical);
}
