import { ordersCollection, cartCollection, settingsCollection, couponsCollection } from '../../config/db';
import { ObjectId } from 'mongodb';

export class OrderService {
  static async createOrder(payload: any, userId: string, userEmail: string) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `FF-${timestamp.toString().slice(-6)}-${randomSuffix}`;

    // Fetch active platform settings
    const settings = await settingsCollection.findOne({ key: 'global_settings' });
    const vatPercentage = Number(settings?.vatPercentage ?? 5);
    const restaurantCommissionPercentage = Number(settings?.restaurantCommissionPercentage ?? 15);
    const riderCommissionPercentage = Number(settings?.riderCommissionPercentage ?? 100);

    const subtotal = Number(payload.subtotal) || 0;
    const deliveryFee = Number(payload.deliveryFee) || 0;
    const discount = Number(payload.discount) || 0;
    const couponCode = payload.couponCode ? String(payload.couponCode).trim().toUpperCase() : null;

    // Check first-order welcome coupon restriction if applied
    let isFirstOrderDiscount = false;
    if (couponCode) {
      const couponDoc = await couponsCollection.findOne({ code: couponCode });
      if (couponDoc?.isFirstOrderOnly) {
        isFirstOrderDiscount = true;
        const priorOrder = await ordersCollection.findOne({
          userId,
          orderStatus: { $ne: 'Cancelled' },
        });
        if (priorOrder) {
          throw new Error('This welcome coupon is valid exclusively for your first successful order!');
        }
      }
    }

    // Financial calculations
    const vatAmount = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
    const adminGrossCommission = Math.round(subtotal * (restaurantCommissionPercentage / 100) * 100) / 100;
    // Discount subsidy is deducted strictly from Admin Commission
    const adminNetProfit = Math.round((adminGrossCommission - discount) * 100) / 100;
    // Restaurant gets 100% of their earnings (subtotal - commission)
    const restaurantPayout = Math.round((subtotal - adminGrossCommission) * 100) / 100;
    // Rider gets delivery fee * share %
    const riderPayout = Math.round((deliveryFee * (riderCommissionPercentage / 100)) * 100) / 100;
    const taxFundVat = vatAmount;

    const calculatedTotal = subtotal + vatAmount + deliveryFee - discount;
    const finalTotalAmount = payload.totalAmount ? Number(payload.totalAmount) : Math.max(0, calculatedTotal);

    const orderDoc = {
      orderId,
      userId,
      userEmail,
      userName: payload.userName || 'Customer',
      items: payload.items,
      deliveryAddress: payload.deliveryAddress,
      subtotal,
      vatPercentage,
      vatAmount,
      deliveryFee,
      couponCode,
      discount,
      isFirstOrderDiscount,
      totalAmount: finalTotalAmount,
      restaurantCommissionPercentage,
      adminGrossCommission,
      adminNetProfit,
      restaurantPayout,
      riderPayout,
      taxFundVat,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'Pending',
      orderStatus: 'Placed',
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
    const queryConditions: any[] = [{ orderId: id }, { stripeSessionId: id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const order = await ordersCollection.findOne({ $or: queryConditions });
    return order;
  }

  static async getUserOrders(userId: string) {
    const orders = await ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return orders;
  }

  static async updateOrderStatus(id: string, updates: any) {
    const queryConditions: any[] = [{ orderId: id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const updateDoc = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await ordersCollection.updateOne({ $or: queryConditions }, { $set: updateDoc });
    return await ordersCollection.findOne({ $or: queryConditions });
  }
}
