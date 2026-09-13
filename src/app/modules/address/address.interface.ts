import { ObjectId } from 'mongodb';

export interface TAddress {
  _id?: ObjectId | string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  area: string;
  building?: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TAddressApiResponse {
  success: boolean;
  message?: string;
  data?: TAddress | TAddress[] | null;
}
