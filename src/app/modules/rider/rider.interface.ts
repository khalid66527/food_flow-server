import { ObjectId } from 'mongodb';

export interface TRider {
  _id?: ObjectId;
  name: string;
  email: string;
  phone: string;
  vehicleType?: 'bicycle' | 'bike' | 'scooter' | 'car';
  vehicleNumber?: string;
  isAvailable?: boolean;
  status?: 'active' | 'inactive' | 'pending';
  currentLocation?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  totalDeliveries?: number;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}
