import { ObjectId } from 'mongodb';

export interface TCustomerAddress {
  label?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface TCustomer {
  _id?: ObjectId;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses?: TCustomerAddress[];
  favorites?: string[];
  status?: 'active' | 'blocked';
  createdAt?: string;
  updatedAt?: string;
}
