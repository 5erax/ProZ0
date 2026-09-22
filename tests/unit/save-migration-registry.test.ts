import { describe, expect, it } from 'vitest';
import {
  SaveMigrationRegistry,
  type SaveMigration,
} from '../../src/persistence';

describe('SaveMigrationRegistry', () => {
  it('SAVE-014 executes explicit sequential migrations in order', () => {
    const migrations: readonly SaveMigration[] = [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (input) => ({
          ...(input as Record<string, unknown>),
          schemaVersion: 2,
          steps: ['v1-v2'],
        }),
      },
      {
        fromVersion: 2,
        toVersion: 3,
        migrate: (input) => ({
          ...(input as Record<string, unknown>),
          schemaVersion: 3,
          steps: [
            ...((input as { steps: string[] }).steps),
            'v2-v3',
          ],
        }),
      },
    ];
    const registry = new SaveMigrationRegistry(3, migrations);

    const result = registry.migrateToCurrent({
      schemaVersion: 1,
      payload: 'preserved',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        schemaVersion: 3,
        payload: 'preserved',
        steps: ['v1-v2', 'v2-v3'],
      },
    });
  });

  it('SAVE-015 leaves source data unchanged when migration fails', () => {
    const source = Object.freeze({
      schemaVersion: 1,
      payload: Object.freeze({ value: 7 }),
    });
    const registry = new SaveMigrationRegistry(2, [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: () => {
          throw new Error('injected migration failure');
        },
      },
    ]);

    const result = registry.migrateToCurrent(source);

    expect(result).toMatchObject({
      ok: false,
      code: 'MIGRATION_FAILED',
    });
    expect(source).toEqual({
      schemaVersion: 1,
      payload: { value: 7 },
    });
  });

  it('rejects non-sequential migration registration', () => {
    expect(() => new SaveMigrationRegistry(3, [
      {
        fromVersion: 1,
        toVersion: 3,
        migrate: (input) => input,
      },
    ])).toThrow(/sequential/);
  });
});
