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
      $or: [{ ownerEmail }, { contactEmail: ownerEmail }],
    });

    if (existing) {
      const { _id, ...restPayload } = payload;
      const updateResult = await restaurantCollection.findOneAndUpdate(
        { _id: existing._id },
        { $set: { ...restPayload, updatedAt: new Date().toISOString() } },
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
  const query: any =
    ownerEmail && ownerId
      ? { $or: [{ ownerEmail }, { contactEmail: ownerEmail }, { ownerId }] }
      : ownerEmail
      ? { $or: [{ ownerEmail }, { contactEmail: ownerEmail }] }
      : ownerId
      ? { ownerId }
      : {};

  let restaurant = Object.keys(query).length > 0 ? await restaurantCollection.findOne(query) : null;

  if (!restaurant) {
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
    ? { $or: [{ ownerEmail }, { contactEmail: ownerEmail }] }
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
    ? { $or: [{ ownerEmail }, { contactEmail: ownerEmail }] }
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
 * Get Single Restaurant by ID or Slug
 */
const getSingleRestaurant = async (idOrSlug: string) => {
  if (!idOrSlug) return null;

  const query = ObjectId.isValid(idOrSlug)
    ? { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

  const restaurant = await restaurantCollection.findOne(query);
  return restaurant ? normalizeRestaurantDoc(restaurant) : null;
};

/**
 * Add Food Item to Restaurant Menu
 */
const addFoodItem = async (foodData: Record<string, any>) => {
  if (!foodData.name || !foodData.price || !foodData.restaurantId) {
    throw new Error('Food Name, Price, and Restaurant ID are required.');
  }

  const foodDoc = {
    restaurantId: foodData.restaurantId,
    name: foodData.name,
    description: foodData.description || '',
    price: Number(foodData.price) || 0,
    discountPrice: foodData.discountPrice ? Number(foodData.discountPrice) : undefined,
    category: foodData.category || 'General',
    image: foodData.image || '',
    isAvailable: foodData.isAvailable ?? true,
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
  getSingleRestaurant,
  addFoodItem,
  getRestaurantMenu,
};
