import { ObjectId } from 'mongodb';

export type TVehicleType = 'bicycle' | 'bike' | 'scooter' | 'electric_bike';
export type TRiderStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface TEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface TRiderAddress {
  street?: string;
  area?: string;
  city?: string;
  fullAddress?: string;
}

export interface TRiderProfile {
  _id?: ObjectId | string;
  id?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  nidNumber?: string;
  drivingLicenseNumber?: string;
  vehicleType: TVehicleType;
  vehicleBrand?: string;
  vehicleNumber?: string;
  deliveryZone: string;
  city: string;
  address?: TRiderAddress;
  emergencyContact?: TEmergencyContact;
  isAvailable: boolean;
  status: TRiderStatus;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  bio?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
