import { ObjectId } from 'mongodb';
import { restaurantCollection, foodCollection } from '../../config/db';
import {
  TRestaurant,
  TRestaurantQueryParams,
  IPaginationMeta,
} from './restaurant.interface';
import {
  generateSlug,
  buildRestaurantMongoQuery,
  buildRestaurantSortOptions,
  normalizeRestaurantDoc,
} from './restaurant.utils';

/**
 * Create or Update Restaurant Profile
 */
const createOrUpdateRestaurant = async (payload: Partial<TRestaurant>) => {
  const restaurantName = payload.restaurantName || payload.name;
  if (!restaurantName) {
    throw new Error('Restaurant Name is required.');
  }

  const ownerEmail = payload.ownerEmail || payload.contactEmail || '';
  const contactEmail = payload.contactEmail || ownerEmail;

  if (ownerEmail) {
    const existing = await restaurantCollection.findOne({
      $or: [
        { ownerEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
        { contactEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
      ],
    });

    if (existing) {
      const { _id, ...restPayload } = payload;
      const updateResult = await restaurantCollection.findOneAndUpdate(
        { _id: existing._id },
        { $set: { ...restPayload, contactEmail, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      return { isUpdated: true, data: normalizeRestaurantDoc(updateResult) };
    }
  }

  const cuisines =
    Array.isArray(payload.cuisines) && payload.cuisines.length > 0
      ? payload.cuisines
      : Array.isArray(payload.cuisineTypes) && payload.cuisineTypes.length > 0
      ? payload.cuisineTypes
      : [];

  const restaurantDoc: Record<string, any> = {
    ...payload,
    restaurantName,
    name: restaurantName,
    ownerEmail,
    ownerId: payload.ownerId || '',
    ownerName: payload.ownerName || '',
    ownerPhone: payload.ownerPhone || '',
    slug: payload.slug || generateSlug(restaurantName),
    tagline: payload.tagline || '',
    description: payload.description || '',
    cuisineTypes: cuisines,
    cuisines,
    logo: payload.logo || '',
    bannerImage: payload.bannerImage || payload.logo || '',
    contactNumber: payload.contactNumber || '',
    contactEmail,
    website: payload.website || '',
    address: payload.address || {
      street: '',
      city: 'Manhattan',
      area: 'Downtown',
      state: 'NY',
      postalCode: '',
      country: 'USA',
    },
    openingHours: payload.openingHours,
    generalOpenTime: payload.generalOpenTime || '09:00 AM',
    generalCloseTime: payload.generalCloseTime || '10:00 PM',
    pricing: {
      minOrderAmount: Number(payload.pricing?.minOrderAmount || payload.minOrderAmount) || 0,
      deliveryFee: Number(payload.pricing?.deliveryFee || payload.deliveryFee) || 0,
      estimatedDeliveryTime:
        payload.pricing?.estimatedDeliveryTime || '20-35 mins',
      costForTwo: Number(payload.pricing?.costForTwo) || 0,
      priceRange: payload.priceRange || payload.pricing?.priceRange || '$$',
    },
    features: {
      hasDelivery: true,
      hasTakeaway: true,
      hasDineIn: false,
      isPureVeg: false,
      isHalal: true,
      freeDelivery: payload.deliveryFee === 0,
      openNow: true,
      ...payload.features,
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      website: '',
      ...payload.socialLinks,
    },
    rating: Number(payload.rating) || 4.5,
    reviewCount: Number(payload.reviewCount || payload.totalReviews) || 0,
    totalReviews: Number(payload.totalReviews || payload.reviewCount) || 0,
    deliveryTimeMin: Number(payload.deliveryTimeMin) || 20,
    deliveryTimeMax: Number(payload.deliveryTimeMax) || 35,
    deliveryFee: Number(payload.deliveryFee) || 0,
    minOrderAmount: Number(payload.minOrderAmount) || 0,
    priceRange: payload.priceRange || '$$',
    isOpen: payload.isOpen ?? true,
    status: payload.status || 'active',
    isFeatured: payload.isFeatured ?? false,
    discountOffer: payload.discountOffer || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  delete restaurantDoc._id;

  const result = await restaurantCollection.insertOne(restaurantDoc);
  const createdDoc = { _id: result.insertedId, ...restaurantDoc };

  return { isUpdated: false, data: normalizeRestaurantDoc(createdDoc) };
};

/**
 * Get My Restaurant Profile
 */
const getMyRestaurantProfile = async (ownerEmail?: string, ownerId?: string) => {
  const queryConditions: any[] = [];
  if (ownerEmail) {
    queryConditions.push({ ownerEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } });
    queryConditions.push({ contactEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } });
  }
  if (ownerId) {
    queryConditions.push({ ownerId });
  }

  let restaurant =
    queryConditions.length > 0
      ? await restaurantCollection.findOne({ $or: queryConditions })
      : null;

  // Fallback to latest restaurant if no specific query is given
  if (!restaurant && !ownerEmail && !ownerId) {
    const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    if (latest?.[0]) restaurant = latest[0];
  }

  return restaurant ? normalizeRestaurantDoc(restaurant) : null;
};

/**
 * Update My Restaurant Profile
 */
const updateMyRestaurantProfile = async (
  ownerEmail: string | undefined,
  payload: Record<string, any>
) => {
  let query: any = ownerEmail
    ? {
        $or: [
          { ownerEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
          { contactEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
        ],
      }
    : null;

  if (!query) {
    const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    if (latest?.[0]) query = { _id: latest[0]._id };
  }

  if (!query) {
    return null;
  }

  const { _id, ...restPayload } = payload;
  const updateData = { ...restPayload, updatedAt: new Date().toISOString() };

  const result = await restaurantCollection.findOneAndUpdate(
    query,
    { $set: updateData },
    { returnDocument: 'after' }
  );

  return result ? normalizeRestaurantDoc(result) : null;
};

/**
 * Toggle Open / Closed Status
 */
const toggleRestaurantStatus = async (ownerEmail: string | undefined, isOpen: boolean) => {
  let query: any = ownerEmail
    ? {
        $or: [
          { ownerEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
          { contactEmail: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } },
        ],
      }
    : null;

  if (!query) {
    const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    if (latest?.[0]) query = { _id: latest[0]._id };
  }

  if (!query) {
    return null;
  }

  const result = await restaurantCollection.findOneAndUpdate(
    query,
    { $set: { isOpen: Boolean(isOpen), updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );

  return result ? normalizeRestaurantDoc(result) : null;
};

/**
 * Get All Restaurants for Explore Page (Search, Category, Filter, Sort, Pagination)
 */
const getAllRestaurants = async (queryParams: TRestaurantQueryParams) => {
  const { page = 1, limit = 9, sortBy } = queryParams;

  const mongoQuery = buildRestaurantMongoQuery(queryParams);
  const sortOptions = buildRestaurantSortOptions(sortBy as string);

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 9);
  const skip = (pageNum - 1) * limitNum;

  const [totalItems, rawItems] = await Promise.all([
    restaurantCollection.countDocuments(mongoQuery),
    restaurantCollection
      .find(mongoQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .toArray(),
  ]);

  const normalizedData = rawItems.map((doc) => normalizeRestaurantDoc(doc));
  const totalPages = Math.ceil(totalItems / limitNum) || 0;

  const pagination: IPaginationMeta = {
    currentPage: pageNum,
    totalPages,
    totalItems,
    itemsPerPage: limitNum,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  return {
    data: normalizedData,
    pagination,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: totalItems,
      totalPage: totalPages || 1,
    },
  };
};

/**
 * Add Food Item to Restaurant Menu
 */
const addFoodItem = async (foodData: Record<string, any>) => {
  const name = typeof foodData.name === 'string' ? foodData.name.trim() : '';
  const price = Number(foodData.price);

  if (!name) {
    throw new Error('Food Name is required.');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Food Price must be a valid number greater than 0.');
  }
  if (!foodData.restaurantId || !String(foodData.restaurantId).trim()) {
    throw new Error('Restaurant ID is required.');
  }

  // Status ("available" | "unavailable") maps to the isAvailable flag
  let isAvailable: boolean;
  if (typeof foodData.isAvailable === 'boolean') {
    isAvailable = foodData.isAvailable;
  } else if (typeof foodData.status === 'string') {
    isAvailable = foodData.status.toLowerCase() !== 'unavailable';
  } else {
    isAvailable = true;
  }
  const status = isAvailable ? 'available' : 'unavailable';

  const foodDoc = {
    restaurantId: String(foodData.restaurantId).trim(),
    name,
    description: typeof foodData.description === 'string' ? foodData.description.trim() : '',
    price,
    discountPrice: foodData.discountPrice ? Number(foodData.discountPrice) : undefined,
    category: (foodData.category || 'General').trim() || 'General',
    image: typeof foodData.image === 'string' ? foodData.image.trim() : '',
    status,
    isAvailable,
    isVegetarian: foodData.isVegetarian ?? false,
    isSpicy: foodData.isSpicy ?? false,
    tags: Array.isArray(foodData.tags) ? foodData.tags : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await foodCollection.insertOne(foodDoc);
  return { _id: result.insertedId, ...foodDoc };
};

/**
 * Get Food Menu Items for a Restaurant
 */
const getRestaurantMenu = async (restaurantId: string) => {
  if (!restaurantId) return [];

  const query = ObjectId.isValid(restaurantId)
    ? { $or: [{ restaurantId }, { restaurantId: new ObjectId(restaurantId) }] }
    : { restaurantId };

  const items = await foodCollection.find(query).sort({ createdAt: -1 }).toArray();
  return items;
};

export const RestaurantService = {
  createOrUpdateRestaurant,
  getMyRestaurantProfile,
  updateMyRestaurantProfile,
  toggleRestaurantStatus,
  getAllRestaurants,
  addFoodItem,
  getRestaurantMenu,
};
