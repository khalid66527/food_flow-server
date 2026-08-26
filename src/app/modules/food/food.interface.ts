import { ObjectId } from 'mongodb';

export interface TFoodItem {
  _id?: ObjectId | string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  status: 'available' | 'unavailable';
  isAvailable: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IGlobalFoodItem {
  _id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  status: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  tags?: string[];
  restaurantName: string;
  restaurantSlug: string;
  restaurantLogo: string;
  restaurantIsOpen: boolean;
  restaurantRating: number;
  restaurantReviewCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TFoodQueryParams {
  search?: string;
  category?: string;
  restaurantId?: string;
  sortBy?: string;
  isVegetarian?: string | boolean;
  isSpicy?: string | boolean;
  status?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  openNow?: string | boolean;
  featuredOnly?: string | boolean;
  page?: string | number;
  limit?: string | number;
}

export interface IPaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
