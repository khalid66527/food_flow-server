import { ObjectId } from 'mongodb';

export type TDeliveryStatus =
  | 'available'
  | 'accepted'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'failed';

export interface TDeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface TDeliveryAssignment {
  _id?: ObjectId | string;
  orderId: string;
  riderId: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  status: TDeliveryStatus;
  riderLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  pickupRestaurant: {
    restaurantId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
  };
  dropoffCustomer: {
    customerId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
  };
  deliveryFee: number;
  tip: number;
  totalEarning: number;
  assignedAt?: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  onTheWayAt?: Date;
  deliveredAt?: Date;
  estimatedDistance: number;
  estimatedTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DELIVERY_STATUS_TRANSITIONS: Record<TDeliveryStatus, TDeliveryStatus[]> = {
  available: ['accepted', 'failed'],
  accepted: ['picked_up', 'failed'],
  picked_up: ['on_the_way'],
  on_the_way: ['delivered'],
  delivered: [],
  failed: [],
};
