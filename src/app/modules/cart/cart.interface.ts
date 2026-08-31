import { ObjectId } from 'mongodb';

export interface TCartItem {
  _id?: ObjectId | string;
  userId: string;
  foodId: string;
  restaurantId: string;
  name: string;
  price: number;
  discountPrice?: number;
  image?: string;
  restaurantName?: string;
  quantity: number;
  specialInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TCartApiResponse {
  success: boolean;
  message?: string;
  data?: TCartItem | TCartItem[] | null;
}
