import { ObjectId } from 'mongodb';
import { couponsCollection, ordersCollection } from '../../config/db';
import { TCoupon, TApplyCouponPayload } from './coupon.interface';

export class CouponService {
  static async createCoupon(payload: Partial<TCoupon>): Promise<TCoupon> {
    const formattedCode = (payload.code || '').trim().toUpperCase();
    if (!formattedCode) {
      throw new Error('Coupon code is required');
    }

    const existing = await couponsCollection.findOne({ code: formattedCode });
    if (existing) {
      throw new Error(`Coupon code "${formattedCode}" already exists!`);
    }

    const couponDoc: TCoupon = {
      code: formattedCode,
      discountType: (payload.discountType === 'percentage' ? 'percentage' : 'fixed') as 'percentage' | 'fixed',
      discountValue: Math.max(0, Number(payload.discountValue || 0)),
      minOrderValue: Math.max(0, Number(payload.minOrderValue || 0)),
      maxDiscountAmount: payload.maxDiscountAmount ? Math.max(0, Number(payload.maxDiscountAmount)) : undefined,
      isFirstOrderOnly: Boolean(payload.isFirstOrderOnly),
      expiryDate: payload.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await couponsCollection.insertOne(couponDoc as any);
    return { ...couponDoc, _id: result.insertedId.toString() };
  }

  static async getAllCoupons(): Promise<TCoupon[]> {
    const coupons = await couponsCollection.find({}).sort({ createdAt: -1 }).toArray();
    return coupons as any[];
  }

  static async getActiveCoupons(): Promise<TCoupon[]> {
    const now = new Date().toISOString();
    const coupons = await couponsCollection
      .find({
        isActive: true,
        $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }, { expiryDate: { $exists: false } }],
      })
      .sort({ createdAt: -1 })
      .toArray();
    return coupons as any[];
  }

  static async toggleCouponStatus(id: string, isActive: boolean) {
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    await couponsCollection.updateOne(query as any, {
      $set: { isActive: Boolean(isActive), updatedAt: new Date().toISOString() },
    });
    return await couponsCollection.findOne(query as any);
  }

  static async deleteCoupon(id: string) {
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await couponsCollection.deleteOne(query as any);
    return result.deletedCount > 0;
  }

  static async applyCoupon(payload: TApplyCouponPayload) {
    const { code, userId, subtotal } = payload;
    const formattedCode = (code || '').trim().toUpperCase();

    if (!formattedCode) {
      throw new Error('Please enter a coupon code.');
    }

    const coupon = (await couponsCollection.findOne({ code: formattedCode })) as unknown as TCoupon | null;

    if (!coupon) {
      throw new Error(`Coupon "${formattedCode}" does not exist.`);
    }

    if (!coupon.isActive) {
      throw new Error(`Coupon "${formattedCode}" is currently inactive.`);
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      throw new Error(`Coupon "${formattedCode}" has expired.`);
    }

    if (subtotal < (coupon.minOrderValue || 0)) {
      throw new Error(
        `Minimum order subtotal of ৳${coupon.minOrderValue} is required to apply "${formattedCode}".`
      );
    }

    // REQUIREMENT 4: FIRST-ORDER CHECK
    if (coupon.isFirstOrderOnly && userId) {
      const priorOrder = await ordersCollection.findOne({
        userId,
        orderStatus: { $ne: 'Cancelled' },
      });

      if (priorOrder) {
        throw new Error('This welcome coupon is valid exclusively for your first successful order!');
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // Cannot exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      success: true,
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isFirstOrderOnly: coupon.isFirstOrderOnly,
      message: `🎉 Coupon "${coupon.code}" applied! Saved ৳${discountAmount.toFixed(2)}.`,
    };
  }
}
