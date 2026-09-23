import type { HostedClientTransport } from './HostedClientConnection';

export interface WebSocketClientTransportOptions {
  readonly url: string;
  readonly onText: (text: string) => void;
  readonly onClose?: () => void;
  readonly webSocketFactory?: (url: string) => WebSocket;
}

export class WebSocketClientTransport implements HostedClientTransport {
  private readonly socket: WebSocket;

  public constructor(options: WebSocketClientTransportOptions) {
    const factory = options.webSocketFactory ?? ((url: string) => new WebSocket(url));
    this.socket = factory(options.url);
    this.socket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        options.onText(event.data);
      } else {
        this.socket.close(1003, 'UTF-8 JSON text messages required');
      }
    });
    this.socket.addEventListener('close', () => {
      options.onClose?.();
    });
  }

  public sendText(text: string): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not OPEN.');
    }
    this.socket.send(text);
  }

  public close(): void {
    if (
      this.socket.readyState === WebSocket.OPEN
      || this.socket.readyState === WebSocket.CONNECTING
    ) {
      this.socket.close(1000, 'client leave');
    }
  }
}
