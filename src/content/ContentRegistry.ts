export type ContentId = string;

export interface ContentDefinition {
  readonly id: ContentId;
}

export class ContentRegistry<TDefinition extends ContentDefinition> {
  private readonly definitions: ReadonlyMap<ContentId, TDefinition>;

  public constructor(definitions: readonly TDefinition[]) {
    const entries = new Map<ContentId, TDefinition>();

    for (const definition of definitions) {
      if (definition.id.length === 0) {
        throw new Error('Content definition id cannot be empty.');
      }
      if (entries.has(definition.id)) {
        throw new Error(`Duplicate content definition id: ${definition.id}`);
      }
      entries.set(definition.id, definition);
    }

    this.definitions = entries;
  }

  public get size(): number {
    return this.definitions.size;
  }

  public has(id: ContentId): boolean {
    return this.definitions.has(id);
  }

  public get(id: ContentId): TDefinition {
    const definition = this.definitions.get(id);
    if (definition === undefined) {
      throw new Error(`Unknown content definition id: ${id}`);
    }
    return definition;
  }
}
