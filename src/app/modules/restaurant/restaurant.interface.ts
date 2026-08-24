import { ObjectId } from 'mongodb';

export interface TRestaurantAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface TRestaurantPricing {
  minOrderAmount?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  costForTwo?: number;
}

export interface TRestaurantFeatures {
  hasDelivery?: boolean;
  hasTakeaway?: boolean;
  hasDineIn?: boolean;
  isPureVeg?: boolean;
  isHalal?: boolean;
  [key: string]: any;
}

export interface TRestaurantSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  [key: string]: any;
}

export interface TRestaurant {
  _id?: ObjectId;
  restaurantName: string;
  ownerEmail: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  cuisineTypes?: string[];
  logo?: string;
  bannerImage?: string;
  contactNumber?: string;
  contactEmail?: string;
  website?: string;
  address?: TRestaurantAddress;
  openingHours?: any;
  generalOpenTime?: string;
  generalCloseTime?: string;
  pricing?: TRestaurantPricing;
  features?: TRestaurantFeatures;
  socialLinks?: TRestaurantSocialLinks;
  rating?: number;
  totalReviews?: number;
  isOpen?: boolean;
  status?: string;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface TRestaurantQueryParams {
  search?: string;
  cuisine?: string;
  city?: string;
  page?: string;
  limit?: string;
}
