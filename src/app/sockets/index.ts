import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🟢 User connected: ${socket.user?.userId} (${socket.user?.role})`);

    // Join personal room
    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }

    // Join role-based room
    if (socket.user?.role === 'Delivery Partner') {
      socket.join('riders');
    }

    // === ORDER EVENTS ===

    // Customer places order → notify restaurant
    socket.on('order:place', (data: { orderId: string; restaurantId: string }) => {
      socket.to(`restaurant:${data.restaurantId}`).emit('order:new', {
        orderId: data.orderId,
        message: 'New order received!',
      });
    });

    // Restaurant accepts → notify customer
    socket.on('order:accept', (data: { orderId: string; customerId: string }) => {
      socket.to(`user:${data.customerId}`).emit('order:accepted', {
        orderId: data.orderId,
        message: 'Your order has been accepted!',
      });
    });

    // Restaurant preparing → notify customer
    socket.on('order:preparing', (data: { orderId: string; customerId: string }) => {
      socket.to(`user:${data.customerId}`).emit('order:preparing', {
        orderId: data.orderId,
        message: 'Your order is being prepared!',
      });
    });

    // Restaurant marks ready → notify available riders
    socket.on('order:ready', (data: { orderId: string; city?: string }) => {
      const room = data.city ? `city:${data.city}` : 'riders';
      socket.to(room).emit('order:ready', {
        orderId: data.orderId,
        message: 'New delivery available!',
      });
    });

    // Rider assigned → notify customer + restaurant
    socket.on('order:rider_assigned', (data: { orderId: string; customerId: string; restaurantId: string }) => {
      socket.to(`user:${data.customerId}`).emit('order:rider_assigned', {
        orderId: data.orderId,
        message: 'A rider has been assigned!',
      });
      socket.to(`restaurant:${data.restaurantId}`).emit('order:rider_assigned', {
        orderId: data.orderId,
        message: 'Rider assigned to order!',
      });
    });

    // Order delivered → notify customer + restaurant
    socket.on('order:delivered', (data: { orderId: string; customerId: string; restaurantId: string }) => {
      socket.to(`user:${data.customerId}`).emit('order:delivered', {
        orderId: data.orderId,
        message: 'Your order has been delivered!',
      });
      socket.to(`restaurant:${data.restaurantId}`).emit('order:delivered', {
        orderId: data.orderId,
        message: 'Order delivered successfully!',
      });
    });

    // === RIDER LOCATION EVENTS ===

    // Rider shares location → broadcast to order room for live tracking
    socket.on('rider:location_update', (data: { orderId: string; lat: number; lng: number }) => {
      socket.to(`order:${data.orderId}`).emit('rider:location', {
        orderId: data.orderId,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date(),
      });
    });

    // === ROOM MANAGEMENT ===

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.user?.userId} joined order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('join:restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
    });

    socket.on('join:city', (city: string) => {
      socket.join(`city:${city}`);
    });

    socket.on('join:rider', (riderId: string) => {
      socket.join(`rider:${riderId}`);
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔴 User disconnected: ${socket.user?.userId} (${reason})`);
    });
  });

  return io;
};

// Export io instance for use in other modules
let ioInstance: Server | null = null;

export const setIoInstance = (io: Server) => {
  ioInstance = io;
};

export const getIoInstance = (): Server | null => {
  return ioInstance;
};
