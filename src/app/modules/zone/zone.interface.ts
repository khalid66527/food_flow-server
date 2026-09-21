import { ObjectId } from 'mongodb';

export type TZoneShapeType = 'circle' | 'polygon' | 'rectangle' | 'polyline';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface TZone {
  _id?: ObjectId | string;
  zoneId?: number;
  name: string;
  slug?: string;
  shapeType: TZoneShapeType;
  color: string;
  centerCoordinates: ICoordinates;
  radiusKm: number; // For circles or default bounding radius
  polygonCoordinates?: ICoordinates[]; // Vertices for polygon, rectangle, polyline
  city: string;
  division: string;
  district: string;
  upazila?: string;
  maxDeliveryRadiusKm: number; // Maximum order distance allowed for this zone
  baseDeliveryFee: number; // e.g. 30 BDT
  perKmDeliveryFee: number; // e.g. 10 BDT / KM
  estimatedBaseDeliveryMinutes?: number; // e.g. 25 mins
  isActive: boolean;
  totalRestaurants?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TZoneQueryParams {
  search?: string;
  city?: string;
  division?: string;
  district?: string;
  isActive?: string | boolean;
  lat?: string | number;
  lng?: string | number;
}
