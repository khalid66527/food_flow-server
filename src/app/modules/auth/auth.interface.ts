import { ObjectId } from 'mongodb';

export type TUserRole = 'Customer' | 'Restaurant Partner' | 'Delivery Partner' | 'Admin';

export interface TAuthUser {
  _id?: ObjectId | string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: TUserRole;
  image?: string;
  status: 'active' | 'blocked' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface TRegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: TUserRole;
}

export interface TLoginData {
  email: string;
  password: string;
}

export interface TAuthResponse {
  user: Omit<TAuthUser, 'password'>;
  token: string;
}
