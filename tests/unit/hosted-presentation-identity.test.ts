import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../src/foundation';
import {
  HOSTED_PROTOCOL_VERSION,
} from '../../src/protocol';
import { HostedSession } from '../../src/server/session/HostedSession';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

function hello(resumeCredential?: string) {
  const catalog = createPhase1ContentCatalog();
  return {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: catalog.compatibility,
    worldCompatibility: {
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    },
    ...(resumeCredential === undefined ? {} : { resumeCredential }),
  } as const;
}

describe('Hosted runtime presentation identity slots', () => {
  it('keeps runtime-assigned teammate identity stable across churn and rejoin', () => {
    let idOrdinal = 0;
    let resumeOrdinal = 0;
    const catalog = createPhase1ContentCatalog();
    const session = new HostedSession({
      worldId: 'world-alpha',
      maxPlayers: 4,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
      sessionId: 'session:test',
      sessionEpoch: 'epoch:test',
      idFactory: () => `id:${++idOrdinal}`,
      resumeCredentialFactory: () => `resume:${++resumeOrdinal}`,
    });
    session.open();

    const p1 = session.join('transport:1', 0, hello(), 0);
    const p2 = session.join('transport:2', 0, hello(), 0);
    const p3 = session.join('transport:3', 0, hello(), 0);
    if (!p1.accepted || !p2.accepted || !p3.accepted) {
      throw new Error('Expected initial hosted joins to succeed.');
    }

    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p1.connection.playerId,
      ),
    ).toBe('LOCAL');
    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p2.connection.playerId,
      ),
    ).toBe('TEAM_A');
    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p3.connection.playerId,
      ),
    ).toBe('TEAM_B');

    session.disconnect('transport:3');
    const p4 = session.join('transport:4', 0, hello(), 1);
    if (!p4.accepted) {
      throw new Error('Expected replacement hosted join to succeed.');
    }

    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p2.connection.playerId,
      ),
    ).toBe('TEAM_A');
    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p4.connection.playerId,
      ),
    ).toBe('TEAM_C');

    session.disconnect('transport:2');
    const p2Rejoin = session.join(
      'transport:2-rejoin',
      0,
      hello(p2.resumeCredential),
      2,
    );
    if (!p2Rejoin.accepted) {
      throw new Error('Expected hosted rejoin to succeed.');
    }
    expect(p2Rejoin.connection.playerId).toBe(p2.connection.playerId);
    expect(
      session.getPresentationIdentitySlot(
        p1.connection.playerId,
        p2Rejoin.connection.playerId,
      ),
    ).toBe('TEAM_A');
  });
});
