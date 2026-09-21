import { ObjectId } from 'mongodb';

export interface TFavorite {
  _id?: ObjectId | string;
  userId: string;
  userEmail?: string;
  foodId: string;
  foodDetails?: any;
  createdAt: string;
  updatedAt: string;
}
