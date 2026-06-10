import { tokenStorage } from "@/lib/token";

type MessageHandler = (data: unknown) => void;
type StatusChangeHandler = (connected: boolean) => void;

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1000;

export class EmotionWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onMessageHandler: MessageHandler | null = null;
  private onStatusChangeHandler: StatusChangeHandler | null = null;
  private shouldReconnect = true;

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(
    onMessage: MessageHandler,
    onStatusChange: StatusChangeHandler
  ): void {
    this.onMessageHandler = onMessage;
    this.onStatusChangeHandler = onStatusChange;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  private openSocket(): void {
    const token = tokenStorage.getAccessToken();
    const url = token
      ? `${WS_BASE_URL}?token=${encodeURIComponent(token)}`
      : WS_BASE_URL;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChangeHandler?.(true);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(event.data as string);
        this.onMessageHandler?.(data);
      } catch {
        this.onMessageHandler?.(event.data);
      }
    };

    this.socket.onerror = () => {
      // Error handling is done in onclose
    };

    this.socket.onclose = () => {
      this.onStatusChangeHandler?.(false);
      this.socket = null;

      if (
        this.shouldReconnect &&
        this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        const delay =
          BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
          this.openSocket();
        }, delay);
      }
    };
  }

  sendFrame(base64: string): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    const payload = JSON.stringify({
      event: "emotion.frame",
      data: base64,
    });

    this.socket.send(payload);
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.onMessageHandler = null;
    this.onStatusChangeHandler = null;
  }
}
