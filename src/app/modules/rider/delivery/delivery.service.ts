import { ObjectId } from 'mongodb';
import { deliveryCollection, orderCollection, riderCollection } from '../../../config/db';
import { TDeliveryAssignment } from './delivery.interface';
import { getIoInstance } from '../../../sockets';

const getAvailableDeliveries = async (city?: string): Promise<TDeliveryAssignment[]> => {
  const query: Record<string, any> = { status: 'available' };
  if (city) query['pickupRestaurant.address'] = { $regex: city, $options: 'i' };

  const deliveries = await deliveryCollection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return deliveries as TDeliveryAssignment[];
};

const acceptDelivery = async (
  orderId: string,
  riderId: string,
  riderName: string,
  riderPhone: string,
  riderEmail?: string
): Promise<TDeliveryAssignment> => {
  const delivery = await deliveryCollection.findOne({
    orderId,
    status: 'available',
  } as any);

  if (!delivery) {
    throw new Error('Delivery not found or already assigned.');
  }

  const now = new Date();
  await deliveryCollection.updateOne(
    { _id: delivery._id } as any,
    {
      $set: {
        status: 'accepted',
        riderId,
        riderName,
        riderPhone,
        riderEmail: riderEmail || '',
        acceptedAt: now,
        updatedAt: now,
      },
    }
  );

  // Update order status
  await orderCollection.updateOne(
    { orderId } as any,
    {
      $set: {
        status: 'rider_assigned',
        riderId,
        riderName,
        riderPhone,
        updatedAt: now,
      },
      $push: {
        statusHistory: { status: 'rider_assigned', timestamp: now, updatedBy: riderId },
      },
    } as any
  );

  // Emit Socket.io events — notify customer & restaurant
  const io = getIoInstance();
  if (io) {
    const order = await orderCollection.findOne({ orderId } as any);
    io.to(`order:${orderId}`).emit('order:status_update', {
      orderId,
      status: 'rider_assigned',
      riderName,
      timestamp: now,
    });
    if (order?.customerId) {
      io.to(`user:${order.customerId}`).emit('order:rider_assigned', {
        orderId,
        riderName,
        message: `${riderName} has been assigned to your order!`,
      });
    }
    if (order?.restaurantId) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:rider_assigned', {
        orderId,
        riderName,
        message: `Rider ${riderName} has been assigned to order ${orderId}`,
      });
    }
  }

  const updated = await deliveryCollection.findOne({ _id: delivery._id });
  return updated as TDeliveryAssignment;
};

const pickupOrder = async (
  orderId: string,
  riderId: string
): Promise<TDeliveryAssignment> => {
  const delivery = await deliveryCollection.findOne({
    orderId,
    riderId,
    status: 'accepted',
  } as any);

  if (!delivery) {
    throw new Error('Delivery not found or not in accepted status.');
  }

  const now = new Date();
  await deliveryCollection.updateOne(
    { _id: delivery._id } as any,
    {
      $set: {
        status: 'picked_up',
        pickedUpAt: now,
        updatedAt: now,
      },
    }
  );

  // Update order
  await orderCollection.updateOne(
    { orderId } as any,
    {
      $set: { status: 'picked_up', updatedAt: now },
      $push: {
        statusHistory: { status: 'picked_up', timestamp: now, updatedBy: riderId },
      },
    } as any
  );

  // Emit Socket.io events
  const io = getIoInstance();
  if (io) {
    io.to(`order:${orderId}`).emit('order:status_update', {
      orderId,
      status: 'picked_up',
      timestamp: now,
    });
  }

  const updated = await deliveryCollection.findOne({ _id: delivery._id });
  return updated as TDeliveryAssignment;
};

const updateRiderLocation = async (
  orderId: string,
  riderId: string,
  lat: number,
  lng: number
): Promise<void> => {
  await deliveryCollection.updateOne(
    { orderId, riderId } as any,
    {
      $set: {
        riderLocation: { lat, lng, updatedAt: new Date() },
        updatedAt: new Date(),
      },
    }
  );
};

const markOnTheWay = async (
  orderId: string,
  riderId: string
): Promise<TDeliveryAssignment> => {
  const delivery = await deliveryCollection.findOne({
    orderId,
    riderId,
    status: 'picked_up',
  } as any);

  if (!delivery) {
    throw new Error('Delivery not found or not in picked_up status.');
  }

  const now = new Date();
  await deliveryCollection.updateOne(
    { _id: delivery._id } as any,
    {
      $set: {
        status: 'on_the_way',
        onTheWayAt: now,
        updatedAt: now,
      },
    }
  );

  // Update order
  await orderCollection.updateOne(
    { orderId } as any,
    {
      $set: { status: 'on_the_way', updatedAt: now },
      $push: {
        statusHistory: { status: 'on_the_way', timestamp: now, updatedBy: riderId },
      },
    } as any
  );

  // Emit Socket.io events
  const io = getIoInstance();
  if (io) {
    io.to(`order:${orderId}`).emit('order:status_update', {
      orderId,
      status: 'on_the_way',
      timestamp: now,
    });
  }

  const updated = await deliveryCollection.findOne({ _id: delivery._id });
  return updated as TDeliveryAssignment;
};

const markDelivered = async (
  orderId: string,
  riderId: string
): Promise<TDeliveryAssignment> => {
  const delivery = await deliveryCollection.findOne({
    orderId,
    riderId,
    status: 'on_the_way',
  } as any);

  if (!delivery) {
    throw new Error('Delivery not found or not on the way.');
  }

  const now = new Date();
  const earning = delivery.deliveryFee || 0;

  await deliveryCollection.updateOne(
    { _id: delivery._id } as any,
    {
      $set: {
        status: 'delivered',
        deliveredAt: now,
        totalEarning: earning,
        updatedAt: now,
      },
    }
  );

  // Update order
  await orderCollection.updateOne(
    { orderId } as any,
    {
      $set: {
        status: 'delivered',
        actualDeliveryTime: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: { status: 'delivered', timestamp: now, updatedBy: riderId },
      },
    } as any
  );

  // Update rider stats — find rider profile by multiple fields
  const riderEmail = delivery.riderEmail || '';
  const riderQuery: Record<string, any> = {
    $or: [
      { userId: riderId },
      { email: riderId },
      ...(riderEmail ? [{ email: riderEmail }] : []),
    ],
  };
  if (ObjectId.isValid(riderId)) {
    riderQuery.$or.push({ _id: new ObjectId(riderId) });
  }

  await riderCollection.updateOne(
    riderQuery,
    {
      $inc: {
        totalDeliveries: 1,
        totalEarnings: earning,
      },
      $set: { updatedAt: now },
    }
  );

  // Emit Socket.io events
  const io = getIoInstance();
  if (io) {
    io.to(`order:${orderId}`).emit('order:status_update', {
      orderId,
      status: 'delivered',
      timestamp: now,
    });
    io.to(`order:${orderId}`).emit('order:delivered', {
      orderId,
      message: 'Your order has been delivered!',
      timestamp: now,
    });
  }

  const updated = await deliveryCollection.findOne({ _id: delivery._id });
  return updated as TDeliveryAssignment;
};

const getActiveDelivery = async (riderId: string): Promise<TDeliveryAssignment | null> => {
  const delivery = await deliveryCollection.findOne({
    riderId,
    status: { $in: ['accepted', 'picked_up', 'on_the_way'] },
  } as any);

  return delivery as TDeliveryAssignment | null;
};

const getRiderDeliveryHistory = async (
  riderId: string,
  from?: string,
  to?: string,
  page = 1,
  limit = 20
): Promise<{ deliveries: TDeliveryAssignment[]; total: number; page: number; totalPages: number }> => {
  const query: Record<string, any> = {
    riderId,
    status: { $in: ['delivered', 'failed'] },
  };

  if (from || to) {
    query.deliveredAt = {};
    if (from) query.deliveredAt.$gte = new Date(from);
    if (to) query.deliveredAt.$lte = new Date(to);
  }

  const total = await deliveryCollection.countDocuments(query);
  const deliveries = await deliveryCollection
    .find(query)
    .sort({ deliveredAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return {
    deliveries: deliveries as TDeliveryAssignment[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Auto-create delivery when order is ready
const createDeliveryForOrder = async (orderId: string): Promise<TDeliveryAssignment> => {
  const order = await orderCollection.findOne({ orderId } as any);
  if (!order) throw new Error('Order not found.');

  const now = new Date();

  const delivery: TDeliveryAssignment = {
    orderId,
    riderId: '',
    status: 'available',
    pickupRestaurant: {
      restaurantId: order.restaurantId,
      name: order.restaurantName,
      address: order.restaurantLocation?.address || '',
      lat: order.restaurantLocation?.lat || 0,
      lng: order.restaurantLocation?.lng || 0,
    },
    dropoffCustomer: {
      customerId: order.customerId,
      name: order.customerName,
      address: order.customerLocation?.address || '',
      lat: order.customerLocation?.lat || 0,
      lng: order.customerLocation?.lng || 0,
      phone: order.customerPhone || '',
    },
    deliveryFee: order.deliveryFee || 0,
    tip: 0,
    totalEarning: 0,
    estimatedDistance: 0,
    estimatedTime: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await deliveryCollection.insertOne(delivery as any);
  delivery._id = result.insertedId;
  return delivery;
};

export const DeliveryService = {
  getAvailableDeliveries,
  acceptDelivery,
  pickupOrder,
  updateRiderLocation,
  markOnTheWay,
  markDelivered,
  getActiveDelivery,
  getRiderDeliveryHistory,
  createDeliveryForOrder,
};
