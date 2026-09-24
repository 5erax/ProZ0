import {
  durabilityCheckpointForManifest,
  type DurabilityCheckpointV1,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
} from '../../persistence';

export interface HostedPersistencePort {
  save(authorityTick: number): Promise<DurabilityCheckpointV1>;
}

export interface SaveV2HostedPersistenceOptions {
  readonly repository: SaveRepositoryV2;
  readonly snapshot: (
    authorityTick: number,
  ) => SaveCommitRequestV2 | Promise<SaveCommitRequestV2>;
}

export class SaveV2HostedPersistenceAdapter implements HostedPersistencePort {
  public constructor(
    private readonly options: SaveV2HostedPersistenceOptions,
  ) {}

  public async save(
    authorityTick: number,
  ): Promise<DurabilityCheckpointV1> {
    const request = await this.options.snapshot(authorityTick);
    if (request.world.authorityTick !== authorityTick) {
      throw new Error(
        'Hosted persistence snapshot authorityTick is incoherent.',
      );
    }
    const result = await this.options.repository.commit(request);
    if (!result.ok) {
      throw new Error(`Hosted Save V2 commit failed: ${result.code}`);
    }
    return durabilityCheckpointForManifest(result.value);
  }
}
