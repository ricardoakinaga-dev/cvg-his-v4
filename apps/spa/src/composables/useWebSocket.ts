import { ref, onUnmounted, readonly } from 'vue';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface UseWebSocketOptions {
  /** WebSocket URL (ws:// or wss://) */
  url: string;
  /** Event types to subscribe to */
  eventTypes?: string[];
  /** Called when connection opens */
  onOpen?: () => void;
  /** Called when a message of interest is received */
  onMessage?: (msg: WebSocketMessage) => void;
  /** Called on error */
  onError?: (err: Event) => void;
  /** Reconnect base interval in ms (default: 1000) */
  reconnectInterval?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseWebSocketReturn {
  /** Whether the WebSocket is currently connected */
  isConnected: Readonly<Readonly<import('vue').Ref<boolean>>>;
  /** Number of reconnection attempts */
  reconnectAttempts: Readonly<import('vue').Ref<number>>;
  /** Last error if any */
  lastError: Readonly<import('vue').Ref<string | null>>;
  /** Manually send a message */
  send: (data: unknown) => void;
  /** Disconnect and stop reconnecting */
  disconnect: () => void;
  /** Connect (or reconnect) */
  connect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onOpen,
    onMessage,
    onError,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10,
    debug = false
  } = options;

  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const lastError = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function log(...args: unknown[]) {
    if (debug) console.debug('[useWebSocket]', ...args);
  }

  function scheduleReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      log('Max reconnect attempts reached, giving up');
      lastError.value = 'Max reconnect attempts reached';
      return;
    }

    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttempts.value),
      30000 // cap at 30s
    );

    log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.value + 1})`);

    reconnectTimer = setTimeout(() => {
      reconnectAttempts.value++;
      connect();
    }, delay);
  }

  function connect() {
    if (ws) {
      ws.close();
      ws = null;
    }

    lastError.value = null;
    log(`Connecting to ${url}...`);

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        log('WebSocket connected');
        isConnected.value = true;
        reconnectAttempts.value = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          log('Received message:', message);
          onMessage?.(message);
        } catch {
          // Not JSON — treat as raw string
          log('Received raw message:', event.data);
        }
      };

      ws.onerror = (err) => {
        log('WebSocket error:', err);
        lastError.value = 'WebSocket connection error';
        onError?.(err);
      };

      ws.onclose = (event) => {
        log(`WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
        isConnected.value = false;

        if (!event.wasClean && reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err);
      log('Failed to create WebSocket:', err);
      scheduleReconnect();
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (ws) {
      ws.close(1000, 'Client disconnect');
      ws = null;
    }

    isConnected.value = false;
    reconnectAttempts.value = 0;
  }

  function send(data: unknown) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      log('Sent message:', data);
    } else {
      log('WebSocket not open, cannot send');
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected: readonly(isConnected),
    reconnectAttempts: readonly(reconnectAttempts),
    lastError: readonly(lastError),
    send,
    disconnect,
    connect
  } as UseWebSocketReturn;
}
