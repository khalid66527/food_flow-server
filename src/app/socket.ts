import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
  });

  io.on('connection', (socket: Socket) => {
    // Join room for specific order
    socket.on('join_order_room', (data: any) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.join(orderId);
      }
    });

    // Generic join room (e.g. for restaurant / rider / customer dashboard)
    socket.on('join_room', (data: any) => {
      const room = typeof data === 'string' ? data : data?.room;
      if (room) {
        socket.join(room);
      }
    });

    // Handle order status updates from clients (e.g. Rider / Restaurant)
    socket.on('order_status_updated', (data: any) => {
      const orderId = data?.orderId;
      console.log(`📢 Order status updated event for ${orderId}:`, data?.orderStatus);

      if (orderId) {
        io?.to(orderId).emit('order_status_updated', data);
      }
      // Also broadcast globally so restaurant and rider dashboards update immediately
      io?.emit('order_status_updated', data);
    });

    // Handle rider live location broadcast
    socket.on('update_rider_location', (data: any) => {
      const orderId = data?.orderId;
      if (orderId) {
        io?.to(orderId).emit('location_updated', data);
        io?.to(orderId).emit('update_rider_location', data);
      }
      io?.emit('update_rider_location', data);
    });

    socket.on('disconnect', () => {
      // Disconnected silently
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitOrderStatusUpdate(orderId: string, payload: any) {
  if (!io) return;
  const eventPayload = {
    orderId,
    orderStatus: payload.orderStatus,
    deliveryStatus: payload.deliveryStatus,
    updatedAt: new Date().toISOString(),
    order: payload,
    ...payload,
  };

  io.to(orderId).emit('order_status_updated', eventPayload);
  io.emit('order_status_updated', eventPayload);
  console.log(`📡 Broadcasted order_status_updated for order ${orderId} -> ${payload.orderStatus || payload.deliveryStatus}`);
}

export function emitNewOrder(order: any) {
  if (!io) return;
  io.emit('new_order_placed', order);
  if (order.restaurantId) {
    io.to(`restaurant_${order.restaurantId}`).emit('new_order_placed', order);
  }
  console.log(`📡 Broadcasted new_order_placed for order ${order.orderId}`);
}
