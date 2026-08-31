import { ObjectId } from 'mongodb';

export type TOrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'rider_assigned'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type TPaymentMethod = 'cash_on_delivery' | 'online';
export type TPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface TOrderItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  specialInstructions?: string;
}

export interface TOrderLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface TStatusHistory {
  status: string;
  timestamp: Date;
  updatedBy?: string;
}

export interface TOrder {
  _id?: ObjectId | string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerLocation: TOrderLocation;
  restaurantId: string;
  restaurantName: string;
  restaurantLocation: TOrderLocation;
  items: TOrderItem[];
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: TPaymentMethod;
  paymentStatus: TPaymentStatus;
  status: TOrderStatus;
  statusHistory: TStatusHistory[];
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryDistance?: number;
  customerRating?: number;
  customerReview?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Valid status transitions
export const STATUS_TRANSITIONS: Record<TOrderStatus, TOrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['rider_assigned'],
  rider_assigned: ['picked_up'],
  picked_up: ['on_the_way'],
  on_the_way: ['delivered'],
  delivered: [],
  cancelled: [],
};
