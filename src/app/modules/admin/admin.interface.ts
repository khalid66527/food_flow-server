import { ObjectId } from 'mongodb';

export interface TAdmin {
  _id?: ObjectId;
  name: string;
  email: string;
  role: 'admin' | 'super-admin';
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
