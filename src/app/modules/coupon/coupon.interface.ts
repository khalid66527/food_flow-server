export interface TCoupon {
  _id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  isFirstOrderOnly: boolean;
  expiryDate?: string;
  isActive: boolean;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TApplyCouponPayload {
  code: string;
  userId: string;
  subtotal: number;
}
