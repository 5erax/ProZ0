import {
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import {
  saveFailure,
  saveSuccess,
  type SaveResult,
} from '../repository/SaveRepository';

export interface SaveMigration<TFrom = unknown, TTo = unknown> {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: TFrom): TTo;
}

function readSchemaVersion(input: unknown): SaveResult<number> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Save record must be a JSON-compatible object.',
    );
  }

  const version = (input as Record<string, unknown>).schemaVersion;
  if (
    typeof version !== 'number'
    || !Number.isSafeInteger(version)
    || version < 1
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Save record schemaVersion must be a positive safe integer.',
    );
  }

  return saveSuccess(version);
}

export class SaveMigrationRegistry {
  private readonly migrations = new Map<number, SaveMigration>();

  public constructor(
    private readonly currentVersion: number = SAVE_SCHEMA_VERSION,
    migrations: readonly SaveMigration[] = [],
  ) {
    if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) {
      throw new RangeError('Current save schema version must be a positive safe integer.');
    }

    for (const migration of migrations) {
      this.register(migration);
    }
  }

  public register(migration: SaveMigration): void {
    if (
      !Number.isSafeInteger(migration.fromVersion)
      || !Number.isSafeInteger(migration.toVersion)
      || migration.fromVersion < 1
      || migration.toVersion !== migration.fromVersion + 1
    ) {
      throw new RangeError(
        'Save migrations must be sequential positive integer Vn -> Vn+1 transformations.',
      );
    }

    if (this.migrations.has(migration.fromVersion)) {
      throw new Error(
        `A migration from schema version ${migration.fromVersion} is already registered.`,
      );
    }

    this.migrations.set(migration.fromVersion, migration);
  }

  public migrateToCurrent(input: unknown): SaveResult<unknown> {
    return this.migrateToVersion(input, this.currentVersion);
  }

  public migrateToVersion(
    input: unknown,
    targetVersion: number,
  ): SaveResult<unknown> {
    if (!Number.isSafeInteger(targetVersion) || targetVersion < 1) {
      throw new RangeError('Target save schema version must be a positive safe integer.');
    }

    const initialVersion = readSchemaVersion(input);
    if (!initialVersion.ok) {
      return initialVersion;
    }

    if (initialVersion.value > targetVersion) {
      return saveFailure(
        'UNSUPPORTED_NEWER_SCHEMA',
        `Save schema version ${initialVersion.value} is newer than supported version ${targetVersion}.`,
      );
    }

    let current: unknown = input;
    let version = initialVersion.value;

    while (version < targetVersion) {
      const migration = this.migrations.get(version);
      if (migration === undefined) {
        return saveFailure(
          'MIGRATION_FAILED',
          `No sequential migration is registered for schema version ${version} -> ${version + 1}.`,
        );
      }

      try {
        current = migration.migrate(current);
      } catch (error) {
        return saveFailure(
          'MIGRATION_FAILED',
          `Save migration ${version} -> ${version + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const migratedVersion = readSchemaVersion(current);
      if (!migratedVersion.ok) {
        return saveFailure(
          'MIGRATION_FAILED',
          `Save migration ${version} -> ${version + 1} produced an invalid record: ${migratedVersion.message}`,
        );
      }

      if (migratedVersion.value !== version + 1) {
        return saveFailure(
          'MIGRATION_FAILED',
          `Save migration ${version} -> ${version + 1} produced schema version ${migratedVersion.value}.`,
        );
      }

      version = migratedVersion.value;
    }

    return saveSuccess(current);
  }
}
