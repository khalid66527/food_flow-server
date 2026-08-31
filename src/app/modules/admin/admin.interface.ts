import { ObjectId } from 'mongodb';

export type TUserRole = 'Customer' | 'Restaurant' | 'Rider' | 'Admin' | 'customer' | 'restaurant' | 'rider' | 'admin' | string;
export type TUserStatus = 'active' | 'blocked' | 'suspended' | 'inactive' | string;

export interface TUser {
  _id?: ObjectId | string;
  id?: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  role?: TUserRole;
  phone?: string;
  status?: TUserStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  restaurant?: any;
}

export interface TAdmin {
  _id?: ObjectId | string;
  name: string;
  email: string;
  role: 'admin' | 'super-admin' | string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TUserQueryParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IUserStats {
  totalUsers: number;
  customers: number;
  restaurants: number;
  riders: number;
  admins: number;
}
