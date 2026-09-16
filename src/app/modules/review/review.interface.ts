import { ObjectId } from 'mongodb';

export type TReviewTargetType = 'rider' | 'restaurant' | 'food';

export interface IReview {
  _id?: string | ObjectId;
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  targetType: TReviewTargetType;
  targetId: string; // riderId, restaurantId, or foodId
  targetName?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IReviewItemPayload {
  targetType: TReviewTargetType;
  targetId: string;
  targetName?: string;
  rating: number;
  comment: string;
}

export interface IBatchReviewPayload {
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  reviews: IReviewItemPayload[];
}
