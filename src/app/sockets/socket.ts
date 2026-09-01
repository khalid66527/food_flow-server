import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as createSocketClient } from 'socket.io-client';
import config from '../config';
import { registerOrderTrackingHandlers } from './orderTracking.socket';

let io: SocketIOServer | null = null;

/** Access the shared Socket.io server instance (null before initialization). */
export const getIO = (): SocketIOServer | null => io;

/** Socket.io CORS origin option (string or resolver callback). */
type CorsOrigin =
  | string
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);

/**
 * Build the Socket.io CORS origin configuration.
 * Accepts a comma-separated CLIENT_URL list. Defaults to '*' (matches app.ts).
 */
const buildCorsOrigin = (): CorsOrigin => {
  const configured = config.client_url;
  if (!configured || configured === '*') return '*';

  const allowed = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  };
};

/**
 * Attach and initialize the Socket.io server to the given HTTP server.
 * Configures CORS for the client origin and registers order-tracking handlers.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: buildCorsOrigin(),
      credentials: true,
    },
  });

  registerOrderTrackingHandlers(io);

  console.log('🔌 Socket.io server initialized and attached to HTTP server.');
  return io;
}

/**
 * Startup self-test: opens a real socket.io-client connection to the running
 * server and confirms a round trip works. Resolves true on success, false on
 * failure/timeout. Never throws.
 */
export function testSocketStartup(host: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const server = getIO();
    if (!server) {
      console.error('❌ Socket.io startup test failed: server not initialized.');
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.close();
      } catch {
        /* ignore */
      }
      console.log(
        ok
          ? '✅ Socket.io startup test passed: client connected successfully.'
          : '❌ Socket.io startup test failed.'
      );
      resolve(ok);
    };

    const client = createSocketClient(host, {
      reconnection: false,
      transports: ['websocket'],
      timeout: timeoutMs,
    });

    const timer = setTimeout(() => finish(false), timeoutMs);

    client.on('connect', () => {
      // Round trip: join room, then verify the server has the room registered.
      client.emit('join_order_room', { orderId: '__startup_test__' }, (ack: any) => {
        const roomRegistered = Boolean(server.sockets.adapter.rooms.has('order___startup_test__'));
        finish(Boolean(ack?.success) && roomRegistered);
      });
    });

    client.on('connect_error', () => finish(false));
  });
}