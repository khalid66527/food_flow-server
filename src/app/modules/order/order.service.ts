import { ObjectId } from 'mongodb';
import { orderCollection, deliveryCollection } from '../../config/db';
import { TOrder, TOrderStatus, STATUS_TRANSITIONS } from './order.interface';
import { getIoInstance } from '../../sockets';

const generateOrderId = (): string => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${random}`;
};

const createOrder = async (data: Partial<TOrder>): Promise<TOrder> => {
  const {
    customerId,
    customerName,
    customerPhone,
    customerLocation,
    restaurantId,
    restaurantName,
    restaurantLocation,
    items,
    subtotal,
    deliveryFee = 0,
    discount = 0,
    total,
    paymentMethod = 'cash_on_delivery',
  } = data;

  if (!customerId || !restaurantId || !items || items.length === 0) {
    throw new Error('Customer ID, Restaurant ID and at least one item are required.');
  }

  const now = new Date();
  const order: TOrder = {
    orderId: generateOrderId(),
    customerId,
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    customerLocation: customerLocation || { lat: 0, lng: 0, address: '' },
    restaurantId,
    restaurantName: restaurantName || '',
    restaurantLocation: restaurantLocation || { lat: 0, lng: 0, address: '' },
    items,
    subtotal: subtotal || 0,
    deliveryFee,
    discount,
    total: total || subtotal || 0,
    paymentMethod,
    paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
    status: 'placed',
    statusHistory: [{ status: 'placed', timestamp: now, updatedBy: customerId }],
    createdAt: now,
    updatedAt: now,
  };

  const result = await orderCollection.insertOne(order as any);
  order._id = result.insertedId;
  return order;
};

const getOrderById = async (orderId: string): Promise<TOrder | null> => {
  let order = await orderCollection.findOne({ orderId } as any);

  if (!order && ObjectId.isValid(orderId)) {
    order = await orderCollection.findOne({ _id: new ObjectId(orderId) });
  }

  return order as TOrder | null;
};

const getCustomerOrders = async (
  customerId: string,
  status?: TOrderStatus,
  page = 1,
  limit = 20
): Promise<{ orders: TOrder[]; total: number; page: number; totalPages: number }> => {
  const query: Record<string, any> = { customerId };
  if (status) query.status = status;

  const total = await orderCollection.countDocuments(query);
  const orders = await orderCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return {
    orders: orders as TOrder[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const getRestaurantOrders = async (
  restaurantId: string,
  status?: TOrderStatus
): Promise<TOrder[]> => {
  const query: Record<string, any> = { restaurantId };
  if (status) query.status = status;

  const orders = await orderCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return orders as TOrder[];
};

const updateOrderStatus = async (
  orderId: string,
  newStatus: TOrderStatus,
  updatedBy?: string
): Promise<TOrder> => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found.');

  const currentStatus = order.status as TOrderStatus;
  const allowedNext = STATUS_TRANSITIONS[currentStatus];

  if (!allowedNext || !allowedNext.includes(newStatus)) {
    throw new Error(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedNext?.join(', ') || 'none'}`
    );
  }

  const now = new Date();
  const setUpdate: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'delivered') {
    setUpdate.actualDeliveryTime = now;
  }

  const pushUpdate: Record<string, any> = {
    statusHistory: { status: newStatus, timestamp: now, updatedBy },
  };

  await orderCollection.updateOne(
    { _id: order._id } as any,
    { $set: setUpdate, $push: pushUpdate } as any
  );

  const updatedOrder = (await getOrderById(orderId as string)) as TOrder;

  // Auto-create delivery when order is ready for pickup
  if (newStatus === 'ready') {
    const now2 = new Date();
    const deliveryDoc = {
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
      estimatedDistance: order.deliveryDistance || 0,
      estimatedTime: 0,
      createdAt: now2,
      updatedAt: now2,
    };

    await deliveryCollection.insertOne(deliveryDoc as any);

    // Emit socket event to notify available riders
    const io = getIoInstance();
    if (io) {
      io.to('riders').emit('order:ready', {
        orderId,
        restaurantName: order.restaurantName,
        restaurantAddress: order.restaurantLocation?.address || '',
        deliveryFee: order.deliveryFee || 0,
        message: 'New delivery available!',
      });
    }
  }

  // Emit socket event for status updates
  const io = getIoInstance();
  if (io) {
    io.to(`order:${orderId}`).emit('order:status_update', {
      orderId,
      status: newStatus,
      timestamp: now,
    });

    if (newStatus === 'delivered') {
      io.to(`order:${orderId}`).emit('order:delivered', {
        orderId,
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        message: 'Your order has been delivered!',
      });
    }
  }

  return updatedOrder;
};

const cancelOrder = async (orderId: string, userId: string): Promise<TOrder> => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found.');

  if (!['placed', 'accepted'].includes(order.status)) {
    throw new Error('Order can only be cancelled when placed or accepted.');
  }

  return updateOrderStatus(orderId, 'cancelled', userId);
};

const assignRider = async (
  orderId: string,
  riderId: string,
  riderName: string,
  riderPhone: string
): Promise<TOrder> => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found.');

  if (order.status !== 'ready') {
    throw new Error('Order must be ready before assigning a rider.');
  }

  const now = new Date();
  await orderCollection.updateOne(
    { _id: order._id } as any,
    {
      $set: {
        riderId,
        riderName,
        riderPhone,
        status: 'rider_assigned',
        updatedAt: now,
      },
      $push: {
        statusHistory: { status: 'rider_assigned', timestamp: now, updatedBy: riderId },
      },
    } as any
  );

  return (await getOrderById(orderId)) as TOrder;
};

export const OrderService = {
  createOrder,
  getOrderById,
  getCustomerOrders,
  getRestaurantOrders,
  updateOrderStatus,
  cancelOrder,
  assignRider,
};
