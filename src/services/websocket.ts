/**
 * Real-time WebSocket Client Service
 * 
 * Provides managed WebSocket connectivity with auto-reconnect,
 * event subscription, presence tracking, and status listeners.
 */

import { WS_BASE } from '../constants';

export type WSConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export type WSEventCallback = (data: any) => void;
export type WSStatusCallback = (status: WSConnectionStatus) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private statusListeners: Set<WSStatusCallback> = new Set();
  private status: WSConnectionStatus = 'disconnected';
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private activeConversationId: string | null = null;
  private isExplicitDisconnect = false;

  constructor() {
    // Read any pre-existing token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('nexzen_auth_token');
    }
  }

  public getStatus(): WSConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: WSConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => {
        try {
          cb(newStatus);
        } catch (e) {
          console.error('[WS] Error in status listener:', e);
        }
      });
    }
  }

  public onStatusChange(callback: WSStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public connect(authToken?: string) {
    if (authToken !== undefined) {
      this.token = authToken;
    } else if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('nexzen_auth_token');
    }

    this.isExplicitDisconnect = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (authToken && this.token) {
        this.send('auth', { token: this.token });
      }
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setStatus('connecting');

    try {
      const url = new URL(WS_BASE);
      if (this.token) {
        url.searchParams.set('token', this.token);
      }

      this.socket = new WebSocket(url.toString());

      this.socket.onopen = () => {
        console.log('[WS] Connected to real-time server');
        this.reconnectAttempts = 0;
        this.setStatus('connected');

        // Re-join active conversation presence if one was selected
        if (this.activeConversationId) {
          this.joinConversation(this.activeConversationId);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { event: eventName, data } = msg;

          if (eventName) {
            const handlers = this.listeners.get(eventName);
            if (handlers) {
              handlers.forEach((handler) => {
                try {
                  handler(data);
                } catch (err) {
                  console.error(`[WS] Error in listener for "${eventName}":`, err);
                }
              });
            }
          }
        } catch (err) {
          console.warn('[WS] Failed to parse incoming WebSocket message:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WS] WebSocket encountered an error:', err);
      };

      this.socket.onclose = () => {
        this.socket = null;
        this.setStatus('disconnected');

        if (!this.isExplicitDisconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[WS] Connection attempt failed:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  public send(event: string, data?: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  public on(event: string, callback: WSEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: WSEventCallback) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public joinConversation(conversationId: string) {
    this.activeConversationId = conversationId;
    this.send('presence:join', { conversationId });
  }

  public leaveConversation(conversationId: string) {
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }
    this.send('presence:leave', { conversationId });
  }
}

export const wsService = new WebSocketService();
