import { ObjectId } from 'mongodb';

export interface ICategory {
  _id?: ObjectId | string;
  name: string;
  slug: string;
  emoji?: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ICategoryPayload {
  name: string;
  emoji?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}
