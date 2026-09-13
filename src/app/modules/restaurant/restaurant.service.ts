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
import { calculateRestaurantDistance } from '../../utils/location.utils';

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
    status: payload.status || 'pending',
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

  const { _id, status, ...restPayload } = payload;
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
  const { page = 1, limit = 9, sortBy, lat, lng, latitude, longitude } = queryParams;

  const mongoQuery = buildRestaurantMongoQuery(queryParams);
  const sortOptions = buildRestaurantSortOptions(sortBy as string);

  const userLat = lat || latitude ? parseFloat(String(lat || latitude)) : undefined;
  const userLng = lng || longitude ? parseFloat(String(lng || longitude)) : undefined;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 9);

  // If user provided valid GPS coordinates or asked for distance sorting, fetch matching items and sort by proximity
  const isDistanceSortRequested = sortBy === 'distance' || (userLat !== undefined && userLng !== undefined && !sortBy);

  if (isDistanceSortRequested || (userLat !== undefined && userLng !== undefined)) {
    const rawItems = await restaurantCollection.find(mongoQuery).toArray();

    // Attach distance and sort by proximity (closest first)
    let sortedItems = rawItems.map((doc) => {
      const dist = calculateRestaurantDistance(doc, userLat, userLng);
      return {
        ...doc,
        distanceKm: dist.distanceKm,
        distanceText: dist.distanceText,
      };
    });

    if (isDistanceSortRequested || sortBy === 'distance') {
      sortedItems.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    const totalItems = sortedItems.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedItems = sortedItems.slice(skip, skip + limitNum);

    const normalizedData = paginatedItems.map((doc) => normalizeRestaurantDoc(doc));
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
  }

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

  const normalizedData = rawItems.map((doc) => {
    const dist = calculateRestaurantDistance(doc, userLat, userLng);
    return normalizeRestaurantDoc({
      ...doc,
      distanceKm: dist.distanceKm,
      distanceText: dist.distanceText,
    });
  });
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

  const rawRestId = String(foodData.restaurantId).trim();
  const restQueries: Record<string, any>[] = [
    { slug: rawRestId },
    { ownerEmail: rawRestId },
    { ownerId: rawRestId },
    { contactEmail: rawRestId },
  ];

  if (ObjectId.isValid(rawRestId)) {
    try {
      restQueries.push({ _id: new ObjectId(rawRestId) });
    } catch (e) {}
  }

  const restaurant = await restaurantCollection.findOne({ $or: restQueries });
  if (!restaurant) {
    throw new Error('Restaurant profile not found. You must create and complete your restaurant profile first.');
  }

  if ((restaurant.status || '').toLowerCase() !== 'active') {
    throw new Error('Your restaurant is pending approval by admin. You cannot add food items until your restaurant is approved.');
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

  const mainImage =
    typeof foodData.image === 'string' && foodData.image.trim()
      ? foodData.image.trim()
      : Array.isArray(foodData.images) && foodData.images.length > 0
      ? foodData.images[0]
      : '';

  const imagesList =
    Array.isArray(foodData.images) && foodData.images.length > 0
      ? foodData.images
      : mainImage
      ? [mainImage]
      : [];

  const foodDoc = {
    restaurantId: String(foodData.restaurantId).trim(),
    name,
    description: typeof foodData.description === 'string' ? foodData.description.trim() : '',
    price,
    discountPrice: foodData.discountPrice ? Number(foodData.discountPrice) : undefined,
    category: (foodData.category || 'General').trim() || 'General',
    image: mainImage,
    images: imagesList,
    status,
    isAvailable,
    isVegetarian: foodData.isVegetarian ?? false,
    isSpicy: foodData.isSpicy ?? false,
    tags: Array.isArray(foodData.tags) ? foodData.tags : [],
    ingredients: Array.isArray(foodData.ingredients) ? foodData.ingredients : [],
    sizeOptions: Array.isArray(foodData.sizeOptions) ? foodData.sizeOptions : [],
    extras: Array.isArray(foodData.extras) ? foodData.extras : [],
    categoryDetails:
      typeof foodData.categoryDetails === 'object' && foodData.categoryDetails !== null
        ? foodData.categoryDetails
        : {},
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

/**
 * Update Food Item
 */
const updateFoodItem = async (foodId: string, updateData: Record<string, any>) => {
  if (!foodId) throw new Error("Food ID is required");

  const query: any = ObjectId.isValid(foodId) ? { _id: new ObjectId(foodId) } : { _id: foodId };

  const sanitizedUpdate: Record<string, any> = { ...updateData };
  delete sanitizedUpdate._id;
  delete sanitizedUpdate.id;

  if (typeof sanitizedUpdate.price === 'string') {
    sanitizedUpdate.price = Number(sanitizedUpdate.price);
  }
  if (sanitizedUpdate.discountPrice !== undefined && sanitizedUpdate.discountPrice !== '') {
    sanitizedUpdate.discountPrice = Number(sanitizedUpdate.discountPrice);
  } else if (sanitizedUpdate.discountPrice === '') {
    sanitizedUpdate.discountPrice = null;
  }

  if (typeof sanitizedUpdate.isAvailable === 'boolean') {
    sanitizedUpdate.status = sanitizedUpdate.isAvailable ? 'available' : 'unavailable';
  } else if (typeof sanitizedUpdate.status === 'string') {
    sanitizedUpdate.isAvailable = sanitizedUpdate.status.toLowerCase() === 'available';
  }

  if (Array.isArray(sanitizedUpdate.images) && sanitizedUpdate.images.length > 0) {
    sanitizedUpdate.image = sanitizedUpdate.images[0];
  }

  sanitizedUpdate.updatedAt = new Date().toISOString();

  const result = await foodCollection.findOneAndUpdate(
    query,
    { $set: sanitizedUpdate },
    { returnDocument: 'after' }
  );

  return result;
};

/**
 * Toggle Food Item Availability
 */
const toggleFoodAvailability = async (foodId: string, isAvailable: boolean) => {
  if (!foodId) throw new Error("Food ID is required");

  const query: any = ObjectId.isValid(foodId) ? { _id: new ObjectId(foodId) } : { _id: foodId };
  const status = isAvailable ? 'available' : 'unavailable';

  const result = await foodCollection.findOneAndUpdate(
    query,
    {
      $set: {
        isAvailable,
        status,
        updatedAt: new Date().toISOString(),
      },
    },
    { returnDocument: 'after' }
  );

  return result;
};

/**
 * Delete Food Item
 */
const deleteFoodItem = async (foodId: string) => {
  if (!foodId) throw new Error("Food ID is required");

  const query: any = ObjectId.isValid(foodId) ? { _id: new ObjectId(foodId) } : { _id: foodId };
  const result = await foodCollection.deleteOne(query);
  return result.deletedCount > 0;
};

/**
 * Get Single Food Item Details by ID (with Restaurant Details Populated)
 */
const getFoodItemById = async (foodId: string) => {
  if (!foodId) return null;

  const query: any = ObjectId.isValid(foodId)
    ? { $or: [{ _id: new ObjectId(foodId) }, { _id: foodId }] }
    : { _id: foodId };

  const foodDoc = await foodCollection.findOne(query);
  if (!foodDoc) return null;

  let restaurantDoc = null;
  if (foodDoc.restaurantId) {
    const restQuery: any = ObjectId.isValid(foodDoc.restaurantId)
      ? {
          $or: [
            { _id: new ObjectId(foodDoc.restaurantId) },
            { _id: String(foodDoc.restaurantId) },
            { id: String(foodDoc.restaurantId) },
          ],
        }
      : {
          $or: [
            { _id: String(foodDoc.restaurantId) },
            { id: String(foodDoc.restaurantId) },
          ],
        };
    restaurantDoc = await restaurantCollection.findOne(restQuery);
  }

  return {
    ...foodDoc,
    restaurant: restaurantDoc || null,
  };
};

/**
 * Get Single Restaurant Details by ID or Slug (with Menu)
 */
const getSingleRestaurant = async (idOrSlug: string) => {
  if (!idOrSlug) return null;

  const query: any = ObjectId.isValid(idOrSlug)
    ? {
        $or: [
          { _id: new ObjectId(idOrSlug) },
          { _id: idOrSlug },
          { slug: idOrSlug },
        ],
      }
    : { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] };

  const restaurantDoc = await restaurantCollection.findOne(query);
  if (!restaurantDoc) return null;

  const restId = String(restaurantDoc._id || restaurantDoc.id || idOrSlug);
  const menuItems = await getRestaurantMenu(restId);

  return {
    ...restaurantDoc,
    menu: menuItems,
  };
};

export const RestaurantService = {
  createOrUpdateRestaurant,
  getMyRestaurantProfile,
  updateMyRestaurantProfile,
  toggleRestaurantStatus,
  getAllRestaurants,
  addFoodItem,
  getRestaurantMenu,
  updateFoodItem,
  toggleFoodAvailability,
  deleteFoodItem,
  getFoodItemById,
  getSingleRestaurant,
};

