import { ordersCollection, cartCollection } from '../../config/db';
import { ObjectId } from 'mongodb';
import {
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  RESTAURANT_STATUS_TRANSITIONS,
  RIDER_STATUS_TRANSITIONS,
  OrderStatus,
} from './order.constant';

const buildOrderQuery = (id: string) => {
  const queryConditions: any[] = [{ orderId: id }, { stripeSessionId: id }];
  if (ObjectId.isValid(id)) {
    queryConditions.push({ _id: new ObjectId(id) });
  }
  return { $or: queryConditions };
};

export class OrderService {
  static async createOrder(payload: any, userId: string, userEmail: string) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `FF-${timestamp.toString().slice(-6)}-${randomSuffix}`;

    const orderDoc = {
      orderId,
      userId,
      userEmail,
      userName: payload.userName || 'Customer',
      items: payload.items,
      deliveryAddress: payload.deliveryAddress,
      subtotal: Number(payload.subtotal) || 0,
      deliveryFee: Number(payload.deliveryFee) || 0,
      discount: Number(payload.discount) || 0,
      totalAmount: Number(payload.totalAmount) || 0,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'Pending',
      // Legacy shorthand kept for backward compatibility
      orderStatus: 'Placed',
      status: ORDER_STATUS.PENDING,
      riderLocation: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await ordersCollection.insertOne(orderDoc);
    const mongoId = result.insertedId.toString();

    if (payload.paymentMethod === 'COD') {
      // Clear user's cart
      await cartCollection.deleteOne({ userId });
    }

    return {
      orderId,
      mongoId,
      order: { ...orderDoc, _id: mongoId },
    };
  }

  static async getOrderById(id: string) {
    return await ordersCollection.findOne(buildOrderQuery(id));
  }

  static async getUserOrders(userId: string) {
    const orders = await ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return orders;
  }

  /**
   * Existing generic update (PATCH /orders/:id). Kept as-is for backward
   * compatibility with the current API logic.
   */
  static async updateOrderStatus(id: string, updates: any) {
    const query = buildOrderQuery(id);

    const updateDoc = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await ordersCollection.updateOne(query, { $set: updateDoc });
    return await ordersCollection.findOne(query);
  }

  /**
   * Advance an order's status (PATCH /orders/:id/status).
   *
   * Enforces the status enum and role-permitted transitions:
   *  - Restaurant Partner: pending -> preparing -> ready_for_pickup
   *  - Delivery Partner:   ready_for_pickup -> out_for_delivery -> delivered
   *  - admin:              any valid status
   */
  static async advanceOrderStatus(id: string, newStatus: string, actorRole: string) {
    if (!ORDER_STATUS_VALUES.includes(newStatus as OrderStatus)) {
      throw new Error(
        `Invalid order status '${newStatus}'. Allowed: ${ORDER_STATUS_VALUES.join(', ')}`
      );
    }

    const query = buildOrderQuery(id);
    const order = await ordersCollection.findOne(query);
    if (!order) {
      throw new Error('Order not found.');
    }

    const actorRoleLower = String(actorRole || '').toLowerCase();
    const isAdmin = /^(admin|super-admin|super_admin)$/.test(actorRoleLower);
    const isRestaurant = /restaurant|vendor/i.test(actorRoleLower);
    const isRider = /rider|delivery|driver/i.test(actorRoleLower);

    if (!isAdmin) {
      const currentStatus: OrderStatus =
        (order.status as OrderStatus) || ORDER_STATUS.PENDING;

      const allowedNext = isRestaurant
        ? RESTAURANT_STATUS_TRANSITIONS[currentStatus] || []
        : isRider
          ? RIDER_STATUS_TRANSITIONS[currentStatus] || []
          : [];

      if (!allowedNext.includes(newStatus as OrderStatus)) {
        const from = currentStatus;
        const to = newStatus;
        throw new Error(
          isRestaurant || isRider
            ? `Status cannot move from '${from}' to '${to}' for your role.`
            : 'You are not authorized to update order status.'
        );
      }
    }

    await ordersCollection.updateOne(query, {
      $set: {
        status: newStatus,
        orderStatus: newStatus,
        updatedAt: new Date().toISOString(),
      },
    });

    return await ordersCollection.findOne(query);
  }

  /**
   * Update the rider's live location for an order (PATCH /orders/:id/location).
   * Stores { lat, lng, updatedAt } as the order's riderLocation.
   */
  static async updateRiderLocation(id: string, lat: number, lng: number) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      throw new Error('Valid numeric lat and lng are required.');
    }

    const query = buildOrderQuery(id);
    const order = await ordersCollection.findOne(query);
    if (!order) {
      throw new Error('Order not found.');
    }

    const now = new Date();
    await ordersCollection.updateOne(query, {
      $set: {
        riderLocation: {
          lat: parsedLat,
          lng: parsedLng,
          updatedAt: now,
        },
        updatedAt: now.toISOString(),
      },
    });

    return await ordersCollection.findOne(query);
  }
}
