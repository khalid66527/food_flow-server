import { ObjectId } from 'mongodb';

export interface TRestaurantAddress {
  street?: string;
  city?: string;
  area?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  zoneId?: string;
  numericZoneId?: number;
  zoneIds?: string[];
  numericZoneIds?: number[];
}

export interface TRestaurantPricing {
  minOrderAmount?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  costForTwo?: number;
}

export interface TRestaurantFeatures {
  hasDelivery?: boolean;
  hasTakeaway?: boolean;
  hasDineIn?: boolean;
  isPureVeg?: boolean;
  isHalal?: boolean;
  freeDelivery?: boolean;
  openNow?: boolean;
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
  _id?: ObjectId | string;
  restaurantName: string;
  name?: string; // Standardized name field alias
  ownerEmail: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  cuisineTypes?: string[];
  cuisines?: string[]; // Standardized cuisines field alias
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
  reviewCount?: number;
  totalReviews?: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
  deliveryFee?: number;
  minOrderAmount?: number;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  isOpen?: boolean;
  status?: 'active' | 'inactive' | 'pending' | 'closed' | string;
  isFeatured?: boolean;
  discountOffer?: string;
  zoneId?: string;
  numericZoneId?: number;
  zoneIds?: string[];
  numericZoneIds?: number[];
  zoneMongoId?: any;
  zoneMongoIdStr?: string;
  zoneMongoIds?: any[];
  zoneName?: string;
  zoneNames?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  deliveryRadiusKm?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface TRestaurantQueryParams {
  search?: string;
  searchQuery?: string;
  category?: string;
  cuisine?: string;
  restaurantId?: string;
  zoneId?: string;
  city?: string;
  location?: string;
  division?: string;
  district?: string;
  upazila?: string;
  lat?: string | number;
  lng?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  maxDistanceKm?: string | number;
  sortBy?: 'relevance' | 'rating_desc' | 'delivery_time_asc' | 'delivery_fee_asc' | 'min_order_asc' | 'popular' | 'distance' | string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$' | 'ALL' | string;
  minRating?: string | number;
  freeDelivery?: string | boolean;
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

export interface TRestaurantApiResponse {
  success: boolean;
  message?: string;
  data: TRestaurant[] | TRestaurant | null;
  pagination?: IPaginationMeta;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}
