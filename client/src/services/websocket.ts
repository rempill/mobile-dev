import { WsMessage } from '../types/item.types';
import { storageService } from './storage.service';

type MessageHandler = (msg: WsMessage<any>) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseDelay = 1000;
  private readonly maxDelay = 30000;

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const token = await storageService.getToken();
    if (!token) return; // do not connect without auth

    try {
      this.ws = new WebSocket(`ws://localhost:4000/ws?token=${token}`);

      this.ws.onopen = () => {
        console.log('[WebSocket Client] Authenticated connection established');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WsMessage = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(parsed));
        } catch (err) {
          console.error('[WebSocket Client] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket Client] Socket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[WebSocket Client] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Halting reconnect attempts.`);
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    this.reconnectAttempts++;

    console.warn(`[WebSocket Client] Connection lost. Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(listener: MessageHandler): () => void {
    this.listeners.add(listener);
    this.connect();

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const wsClient = new WebSocketClient();
