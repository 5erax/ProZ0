import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../src/foundation';
import {
  HOSTED_PROTOCOL_VERSION,
  parseClientEnvelopeV1,
  validateBaselineSnapshotV1,
  validateClientHelloV1,
  validateGameplayCommandEnvelopeV1,
  validateMovementInputV1,
} from '../../src/protocol';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

function validHello() {
  const catalog = createPhase1ContentCatalog();
  return {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: catalog.compatibility,
    worldCompatibility: {
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    },
  };
}

describe('Hosted protocol compatibility fail-closed validation', () => {
  it('uses protocol version 2 for the required presentation identity wire shape', () => {
    expect(HOSTED_PROTOCOL_VERSION).toBe(2);
  });

  it('rejects invalid JSON, protocol drift, and unknown envelope fields', () => {
    expect(parseClientEnvelopeV1('{')).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });

    expect(parseClientEnvelopeV1(JSON.stringify({
      protocolVersion: 99,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: validHello(),
    }))).toMatchObject({
      ok: false,
      reason: 'PROTOCOL_MISMATCH',
    });

    expect(parseClientEnvelopeV1(JSON.stringify({
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: validHello(),
      injectedAuthority: true,
    }))).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });
  });

  it('rejects movement payloads that try to submit position or unknown authority fields', () => {
    expect(validateMovementInputV1({
      inputSeq: 1,
      up: false,
      down: false,
      left: false,
      right: true,
      x: 999,
      y: 999,
    })).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });

    expect(validateMovementInputV1({
      inputSeq: 1,
      up: false,
      down: false,
      left: false,
      right: true,
    })).toMatchObject({ ok: true });
  });

  it('rejects unknown compatibility fields and malformed command revision references', () => {
    expect(validateClientHelloV1({
      ...validHello(),
      contentCompatibility: {
        ...validHello().contentCompatibility,
        untrustedModHash: 'inject',
      },
    })).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });

    expect(validateGameplayCommandEnvelopeV1({
      operationId: 'operation:1',
      commandType: 'item.transfer',
      expectedRevisions: [{
        aggregateType: 'container',
        aggregateId: 'inventory:1',
        revision: -1,
      }],
      payload: {},
    })).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });
  });

  it('rejects baselines whose player motion identity token is missing or invalid', () => {
    const validBaseline = {
      snapshotId: 'snapshot:test',
      sessionEpoch: 'epoch:test',
      authorityTick: 1,
      worldId: 'world-alpha',
      playerId: 'player:1',
      contentCompatibility: validHello().contentCompatibility,
      durableSaveRevision: null,
      players: [{
        playerId: 'player:1',
        presentationIdentitySlot: 'LOCAL',
        authorityTick: 1,
        lastProcessedInputSeq: -1,
        position: { x: 0, y: 0 },
        facing: null,
        locomotionState: 'IDLE',
      }],
      aggregates: [],
    };

    expect(validateBaselineSnapshotV1(validBaseline)).toMatchObject({
      ok: true,
    });
    expect(validateBaselineSnapshotV1({
      ...validBaseline,
      players: [{
        ...validBaseline.players[0],
        presentationIdentitySlot: undefined,
      }],
    })).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });
    expect(validateBaselineSnapshotV1({
      ...validBaseline,
      players: [{
        ...validBaseline.players[0],
        presentationIdentitySlot: 'TEAM_Z',
      }],
    })).toMatchObject({
      ok: false,
      reason: 'INVALID_MESSAGE',
    });
  });

});
