export interface PersistenceStore<TRecord> {
  load(): Promise<TRecord | null>;
  save(record: TRecord): Promise<void>;
}

export const PERSISTENCE_MODULE_BOUNDARY = 'persistence' as const;
