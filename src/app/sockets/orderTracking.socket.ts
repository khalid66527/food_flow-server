import { Server as SocketIOServer, Socket } from 'socket.io';
import { OrderService } from '../modules/order/order.service';

export const ORDER_ROOM_PREFIX = 'order_';

/** Canonical room id for an order: `order_<orderId>`. */
export const orderRoom = (orderId: string): string => `${ORDER_ROOM_PREFIX}${orderId}`;

/**
 * Register real-time order tracking socket handlers.
 *
 * Client events:
 *  - `join_order_room`        { orderId } -> joins socket to `order_<orderId>` room
 *  - `update_rider_location`  { orderId, lat, lng } -> persists rider location,
 *                             then emits `location_updated` to `order_<orderId>`
 *
 * Server-emitted events:
 *  - `order_status_updated`   { orderId, status }   (fired on PATCH /orders/:id/status)
 *  - `location_updated`       { orderId, lat, lng, updatedAt }
 */
export function registerOrderTrackingHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    // Join a client to an order's tracking room
    socket.on('join_order_room', (payload: any, ack?: (res: any) => void) => {
      const orderId: string = payload?.orderId ?? payload;

      if (!orderId) {
        ack?.({ success: false, message: 'orderId is required.' });
        return;
      }

      const room = orderRoom(String(orderId));
      socket.join(room);
      ack?.({ success: true, room });
    });

    // Receive rider's live location, persist it, and broadcast to the order room
    socket.on('update_rider_location', async (payload: any, ack?: (res: any) => void) => {
      const orderId: string = payload?.orderId;
      const lat: number = payload?.lat;
      const lng: number = payload?.lng;

      if (!orderId || lat === undefined || lng === undefined) {
        ack?.({ success: false, message: 'orderId, lat and lng are required.' });
        return;
      }

      try {
        const order = await OrderService.updateRiderLocation(String(orderId), lat, lng);
        const location = order?.riderLocation;

        emitLocationUpdated(
          io,
          String(orderId),
          Number(location?.lat ?? lat),
          Number(location?.lng ?? lng),
          location?.updatedAt ?? null
        );

        ack?.({ success: true });
      } catch (error: any) {
        ack?.({ success: false, message: error?.message || 'Failed to update rider location.' });
      }
    });
  });
}

/**
 * Broadcast an order status change to the order's tracking room.
 * Call this after `PATCH /api/orders/:id/status` succeeds.
 */
export function emitOrderStatusUpdated(
  io: SocketIOServer | null,
  orderId: string,
  status: string
): boolean {
  if (!io) return false;
  const room = orderRoom(orderId);
  io.to(room).emit('order_status_updated', { orderId, status });
  return true;
}

/**
 * Broadcast a rider location update to the order's tracking room.
 * Accepts an optional pre-persisted location object.
 */
export function emitLocationUpdated(
  io: SocketIOServer | null,
  orderId: string,
  lat: number,
  lng: number,
  updatedAt?: Date | null
): boolean {
  if (!io) return false;
  const room = orderRoom(orderId);
  io.to(room).emit('location_updated', {
    orderId,
    lat: Number(lat),
    lng: Number(lng),
    updatedAt: updatedAt ?? new Date(),
  });
  return true;
}