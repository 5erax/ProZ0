import {
  serializeServerEnvelopeV1,
  type JsonValue,
} from '../../protocol';
import {
  ServerAuthorityHost,
  type HostedOutboundMessage,
} from '../runtime/ServerAuthorityHost';

export const BACKPRESSURE_SOFT_BYTES = 256 * 1024;
export const BACKPRESSURE_SOFT_MESSAGES = 64;
export const BACKPRESSURE_SOFT_DURATION_MS = 1000;
export const BACKPRESSURE_HARD_BYTES = 1024 * 1024;
export const BACKPRESSURE_HARD_MESSAGES = 256;
export const BACKPRESSURE_HARD_AGE_MS = 5000;

export interface ServerWebSocketLike {
  readonly bufferedAmount?: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?(
    type: 'message' | 'close' | 'error',
    listener: (event: { readonly data?: unknown }) => void,
  ): void;
  on?(
    type: 'message' | 'close' | 'error',
    listener: (data?: unknown) => void,
  ): void;
}

export interface WebSocketServerTransportOptions {
  readonly nowMs?: () => number;
}

interface BackpressureState {
  queuedMessages: number;
  oldestQueuedAtMs: number | null;
  softExceededAtMs: number | null;
  resyncRequested: boolean;
}

function textFromMessage(value: unknown): string | null {
  const raw = (
    typeof value === 'object'
    && value !== null
    && 'data' in value
  )
    ? (value as { readonly data?: unknown }).data
    : value;

  if (typeof raw === 'string') return raw;
  if (raw instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(raw));
  }
  if (ArrayBuffer.isView(raw)) {
    return new TextDecoder().decode(
      new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength),
    );
  }
  return null;
}

function isCoalescibleUpdate(message: HostedOutboundMessage): boolean {
  return [
    'PLAYER_MOTION',
    'AGGREGATE_UPDATE',
    'AUTHORITY_CHECKPOINT',
  ].includes(message.envelope.messageType);
}

export class WebSocketServerTransport {
  private readonly sockets = new Map<string, ServerWebSocketLike>();
  private readonly backpressure = new Map<string, BackpressureState>();
  private readonly nowMs: () => number;

  public constructor(
    private readonly host: ServerAuthorityHost,
    options: WebSocketServerTransportOptions = {},
  ) {
    this.nowMs = options.nowMs ?? (() => globalThis.performance.now());
  }

  public attach(
    transportId: string,
    socket: ServerWebSocketLike,
  ): void {
    if (this.sockets.has(transportId)) {
      throw new Error('Duplicate transport connection identity.');
    }
    this.sockets.set(transportId, socket);
    this.backpressure.set(transportId, {
      queuedMessages: 0,
      oldestQueuedAtMs: null,
      softExceededAtMs: null,
      resyncRequested: false,
    });

    const onMessage = (value: unknown) => {
      const text = textFromMessage(value);
      if (text === null) {
        socket.close(1003, 'UTF-8 JSON text messages required');
        this.detach(transportId);
        return;
      }
      this.flush(this.host.receiveText(transportId, text));
    };
    const onClose = () => this.detach(transportId);

    if (socket.addEventListener !== undefined) {
      socket.addEventListener('message', onMessage);
      socket.addEventListener('close', onClose);
      socket.addEventListener('error', onClose);
    } else if (socket.on !== undefined) {
      socket.on('message', onMessage);
      socket.on('close', onClose);
      socket.on('error', onClose);
    } else {
      throw new Error('WebSocket adapter requires event subscription support.');
    }
  }

  public detach(transportId: string): void {
    if (!this.sockets.delete(transportId)) return;
    this.backpressure.delete(transportId);
    this.host.disconnect(transportId);
  }

  public step(): void {
    this.flush(this.host.step());
  }

  public publishAggregate(
    view: Parameters<ServerAuthorityHost['publishAggregate']>[0],
  ): void {
    this.flush(this.host.publishAggregate(view));
  }

  public publishAuthorityCheckpoint(): void {
    this.flush(this.host.authorityCheckpoint());
  }

  public async drainSaveAndClose(): Promise<void> {
    const final = await this.host.drainSaveAndClose();
    this.flush(final);
    for (const socket of this.sockets.values()) {
      socket.close(1000, 'session closed');
    }
    this.sockets.clear();
    this.backpressure.clear();
  }

  public flush(messages: readonly HostedOutboundMessage[]): void {
    for (const message of messages) {
      const socket = this.sockets.get(message.transportId);
      const state = this.backpressure.get(message.transportId);
      if (socket === undefined || state === undefined) continue;

      const now = this.nowMs();
      const bufferedBytes = socket.bufferedAmount ?? 0;

      if (bufferedBytes <= 0) {
        state.queuedMessages = 0;
        state.oldestQueuedAtMs = null;
        state.softExceededAtMs = null;
        state.resyncRequested = false;
      } else {
        state.queuedMessages += 1;
        state.oldestQueuedAtMs ??= now;
      }

      const oldestAgeMs = state.oldestQueuedAtMs === null
        ? 0
        : Math.max(0, now - state.oldestQueuedAtMs);
      const hardExceeded =
        bufferedBytes > BACKPRESSURE_HARD_BYTES
        || state.queuedMessages > BACKPRESSURE_HARD_MESSAGES
        || oldestAgeMs > BACKPRESSURE_HARD_AGE_MS;

      if (hardExceeded) {
        this.sendResyncOnce(message.transportId, socket, state);
        socket.close(4008, 'slow client');
        this.detach(message.transportId);
        continue;
      }

      const softExceeded =
        bufferedBytes > BACKPRESSURE_SOFT_BYTES
        || state.queuedMessages > BACKPRESSURE_SOFT_MESSAGES;
      if (softExceeded) {
        state.softExceededAtMs ??= now;
        if (
          now - state.softExceededAtMs
            >= BACKPRESSURE_SOFT_DURATION_MS
        ) {
          this.sendResyncOnce(message.transportId, socket, state);
          if (isCoalescibleUpdate(message)) {
            continue;
          }
        }
      } else {
        state.softExceededAtMs = null;
      }

      socket.send(serializeServerEnvelopeV1(message.envelope));
    }
  }

  public diagnostics(): JsonValue {
    const now = this.nowMs();
    return {
      connectedSockets: this.sockets.size,
      thresholds: {
        softBytes: BACKPRESSURE_SOFT_BYTES,
        softMessages: BACKPRESSURE_SOFT_MESSAGES,
        softDurationMs: BACKPRESSURE_SOFT_DURATION_MS,
        hardBytes: BACKPRESSURE_HARD_BYTES,
        hardMessages: BACKPRESSURE_HARD_MESSAGES,
        hardAgeMs: BACKPRESSURE_HARD_AGE_MS,
      },
      connections: [...this.sockets.entries()].map(
        ([transportId, socket]) => {
          const state = this.backpressure.get(transportId);
          const oldestAgeMs = state?.oldestQueuedAtMs === null
            || state?.oldestQueuedAtMs === undefined
            ? 0
            : Math.max(0, now - state.oldestQueuedAtMs);
          return {
            transportId,
            bufferedBytes: socket.bufferedAmount ?? 0,
            queuedMessages: state?.queuedMessages ?? 0,
            oldestQueuedAgeMs: oldestAgeMs,
            resyncRequested: state?.resyncRequested ?? false,
          };
        },
      ),
    };
  }

  private sendResyncOnce(
    transportId: string,
    socket: ServerWebSocketLike,
    state: BackpressureState,
  ): void {
    if (state.resyncRequested) return;
    state.resyncRequested = true;
    const warning = this.host.requireResync(
      transportId,
      'SLOW_CLIENT',
    );
    for (const entry of warning) {
      socket.send(serializeServerEnvelopeV1(entry.envelope));
    }
  }
}
