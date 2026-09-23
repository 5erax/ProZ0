import {
  serializeServerEnvelopeV1,
  type JsonValue,
} from '../../protocol';
import {
  ServerAuthorityHost,
  type HostedOutboundMessage,
} from '../runtime/ServerAuthorityHost';

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
  readonly maxBufferedBytes?: number;
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

export class WebSocketServerTransport {
  private readonly sockets = new Map<string, ServerWebSocketLike>();
  private readonly maxBufferedBytes: number;

  public constructor(
    private readonly host: ServerAuthorityHost,
    options: WebSocketServerTransportOptions = {},
  ) {
    this.maxBufferedBytes = options.maxBufferedBytes ?? 256 * 1024;
  }

  public attach(
    transportId: string,
    socket: ServerWebSocketLike,
  ): void {
    if (this.sockets.has(transportId)) {
      throw new Error('Duplicate transport connection identity.');
    }
    this.sockets.set(transportId, socket);

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
    this.host.disconnect(transportId);
  }

  public step(): void {
    this.flush(this.host.step());
  }

  public publishAggregate(view: Parameters<ServerAuthorityHost['publishAggregate']>[0]): void {
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
  }

  public flush(messages: readonly HostedOutboundMessage[]): void {
    for (const message of messages) {
      const socket = this.sockets.get(message.transportId);
      if (socket === undefined) continue;

      if ((socket.bufferedAmount ?? 0) > this.maxBufferedBytes) {
        const warning = this.host.requireResync(
          message.transportId,
          'SLOW_CLIENT',
        );
        for (const entry of warning) {
          const target = this.sockets.get(entry.transportId);
          target?.send(serializeServerEnvelopeV1(entry.envelope));
        }
        socket.close(4008, 'slow client');
        this.detach(message.transportId);
        continue;
      }

      socket.send(serializeServerEnvelopeV1(message.envelope));
    }
  }

  public diagnostics(): JsonValue {
    return {
      connectedSockets: this.sockets.size,
      maxBufferedBytes: this.maxBufferedBytes,
    };
  }
}
