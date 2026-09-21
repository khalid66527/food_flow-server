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
import { ZoneService } from '../zone/zone.service';
import { calculateDynamicDeliveryFee } from '../../utils/geofence.utils';

/**
 * Helper to resolve coordinates and automatically detect active delivery zone
 */
const resolveCoordinatesAndZone = async (payload: Record<string, any>) => {
  const lat = Number(
    payload.coordinates?.latitude ??
    payload.address?.coordinates?.latitude ??
    payload.address?.latitude ??
    payload.latitude
  );
  const lng = Number(
    payload.coordinates?.longitude ??
    payload.address?.coordinates?.longitude ??
    payload.address?.longitude ??
    payload.longitude
  );

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    payload.coordinates = { latitude: lat, longitude: lng };
    if (!payload.address) {
      payload.address = {};
    }
    payload.address.coordinates = { latitude: lat, longitude: lng };
    payload.address.latitude = lat;
    payload.address.longitude = lng;

    const detection = await ZoneService.detectUserZone(lat, lng);
    if (detection.isInsideServiceArea && detection.primaryZone) {
      const pZone = detection.primaryZone;
      const zoneIdStr = String(pZone.zoneId !== undefined ? pZone.zoneId : pZone._id);
      const numericZoneId = pZone.zoneId !== undefined ? Number(pZone.zoneId) : undefined;
      const zoneMongoId = pZone._id ? (ObjectId.isValid(pZone._id) ? new ObjectId(pZone._id) : pZone._id) : undefined;
      const zoneMongoIdStr = pZone._id ? String(pZone._id) : undefined;
      const zoneName = pZone.name;

      payload.zoneId = zoneIdStr;
      payload.numericZoneId = numericZoneId;
      payload.zoneMongoId = zoneMongoId;
      payload.zoneMongoIdStr = zoneMongoIdStr;
      payload.zoneName = zoneName;

      // Multi-zone coverage: Include primary and all adjacent zones within delivery radius
      const candidateZoneIds = Array.isArray(detection.candidateZoneIds)
        ? detection.candidateZoneIds.map(String)
        : [zoneIdStr];
      const numericCandidateIds = candidateZoneIds.map(Number).filter((n) => !isNaN(n));
      const zoneNames = (detection.candidateZones || []).map((z: any) => z.name).filter(Boolean);
      const zoneMongoIds = (detection.candidateZones || [])
        .map((z: any) => (z._id && ObjectId.isValid(z._id) ? new ObjectId(z._id) : z._id))
        .filter(Boolean);

      payload.zoneIds = Array.from(new Set([zoneIdStr, ...candidateZoneIds]));
      payload.numericZoneIds = Array.from(
        new Set(numericZoneId !== undefined ? [numericZoneId, ...numericCandidateIds] : numericCandidateIds)
      );
      payload.zoneNames = zoneNames.length > 0 ? zoneNames : zoneName ? [zoneName] : [];
      payload.zoneMongoIds = zoneMongoIds;

      if (payload.address) {
        payload.address.zoneId = zoneIdStr;
        payload.address.numericZoneId = numericZoneId;
        payload.address.zoneIds = payload.zoneIds;
        payload.address.numericZoneIds = payload.numericZoneIds;
      }
    }
  }
};

/**
 * Synchronize all food items of a restaurant with its assigned zone
 */
const syncFoodItemsZone = async (restaurantId: any, zoneData: Record<string, any>) => {
  if (!restaurantId || !zoneData.zoneId) return;
  const restIdObj = ObjectId.isValid(restaurantId) ? new ObjectId(restaurantId) : null;
  const restIdStr = restaurantId.toString();
  const restQuery = restIdObj
    ? { $or: [{ restaurantId: restIdStr }, { restaurantId: restIdObj }] }
    : { restaurantId: restIdStr };

  const numZoneId =
    zoneData.numericZoneId !== undefined
      ? Number(zoneData.numericZoneId)
      : zoneData.zoneId && !isNaN(Number(zoneData.zoneId))
      ? Number(zoneData.zoneId)
      : undefined;

  const rawZoneIds =
    Array.isArray(zoneData.zoneIds) && zoneData.zoneIds.length > 0
      ? zoneData.zoneIds.map(String)
      : [String(zoneData.zoneId)];

  const numZoneIds =
    Array.isArray(zoneData.numericZoneIds) && zoneData.numericZoneIds.length > 0
      ? zoneData.numericZoneIds.map(Number).filter((n: number) => !isNaN(n))
      : numZoneId !== undefined
      ? [numZoneId]
      : [];

  await foodCollection.updateMany(restQuery, {
    $set: {
      zoneId: String(zoneData.zoneId),
      numericZoneId: numZoneId,
      zoneIds: rawZoneIds,
      numericZoneIds: numZoneIds,
      zoneMongoId: zoneData.zoneMongoId,
      zoneMongoIdStr: zoneData.zoneMongoIdStr || (zoneData.zoneMongoId ? String(zoneData.zoneMongoId) : undefined),
      zoneName: zoneData.zoneName,
    },
  });
};

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
      await resolveCoordinatesAndZone(restPayload);
      const updateResult = await restaurantCollection.findOneAndUpdate(
        { _id: existing._id },
        { $set: { ...restPayload, contactEmail, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (updateResult) {
        await syncFoodItemsZone(existing._id, updateResult);
      }
      return { isUpdated: true, data: normalizeRestaurantDoc(updateResult) };
    }
  }

  const cuisines =
    Array.isArray(payload.cuisines) && payload.cuisines.length > 0
      ? payload.cuisines
      : Array.isArray(payload.cuisineTypes) && payload.cuisineTypes.length > 0
      ? payload.cuisineTypes
      : [];

  await resolveCoordinatesAndZone(payload);

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
      city: 'Dhaka',
      area: 'Banani',
      state: 'Dhaka',
      postalCode: '',
      country: 'Bangladesh',
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
    zoneId: payload.zoneId || '',
    numericZoneId: payload.numericZoneId,
    zoneIds: payload.zoneIds || (payload.zoneId ? [String(payload.zoneId)] : []),
    numericZoneIds: payload.numericZoneIds || (payload.numericZoneId ? [payload.numericZoneId] : []),
    zoneMongoId: payload.zoneMongoId,
    zoneMongoIdStr: payload.zoneMongoIdStr,
    zoneMongoIds: payload.zoneMongoIds,
    zoneName: payload.zoneName || '',
    zoneNames: payload.zoneNames,
    deliveryRadiusKm: Number(payload.deliveryRadiusKm) || 5.0,
    coordinates: payload.coordinates,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  delete restaurantDoc._id;

  const result = await restaurantCollection.insertOne(restaurantDoc);
  const createdDoc = { _id: result.insertedId, ...restaurantDoc };
  if (createdDoc._id) {
    await syncFoodItemsZone(createdDoc._id, createdDoc);
  }

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
  await resolveCoordinatesAndZone(restPayload);
  const updateData = { ...restPayload, updatedAt: new Date().toISOString() };

  const result = await restaurantCollection.findOneAndUpdate(
    query,
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (result) {
    await syncFoodItemsZone(result._id, result);
  }

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
  const { page = 1, limit = 9, sortBy, lat, lng, latitude, longitude, maxDistanceKm } = queryParams;

  const userLat = lat || latitude ? parseFloat(String(lat || latitude)) : undefined;
  const userLng = lng || longitude ? parseFloat(String(lng || longitude)) : undefined;

  let effectiveQueryParams = { ...queryParams };
  let baseDeliveryFee = 30;
  let perKmDeliveryFee = 10;
  let effectiveMaxDistanceKm = maxDistanceKm ? Number(maxDistanceKm) : undefined;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 9);

  if (queryParams.zoneId === 'none') {
    return {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limitNum,
        hasNextPage: false,
        hasPrevPage: false,
      },
      meta: {
        page: 1,
        limit: limitNum,
        total: 0,
        totalPage: 0,
      },
      message: 'Delivery not available in this area',
    };
  }

  // Geofencing: Detect Delivery Zone from GPS Coordinates (lat/lng)
  if (userLat !== undefined && userLng !== undefined) {
    try {
      const detection = await ZoneService.detectUserZone(userLat, userLng);
      if (detection.isInsideServiceArea && detection.candidateZoneIds && detection.candidateZoneIds.length > 0) {
        const existingZoneIds =
          queryParams.zoneId && queryParams.zoneId !== 'all'
            ? queryParams.zoneId.split(',').map((z) => z.trim()).filter(Boolean)
            : [];
        const mergedZoneIds = Array.from(new Set([...existingZoneIds, ...detection.candidateZoneIds]));
        effectiveQueryParams.zoneId = mergedZoneIds.join(',');
        if (!effectiveMaxDistanceKm && detection.maxDeliveryRadiusKm) {
          effectiveMaxDistanceKm = detection.maxDeliveryRadiusKm;
        }
        if (detection.baseDeliveryFee) baseDeliveryFee = detection.baseDeliveryFee;
        if (detection.perKmDeliveryFee) perKmDeliveryFee = detection.perKmDeliveryFee;
      } else if (!queryParams.zoneId) {
        // Strict Geofence: Outside all delivery zones => Return 0 restaurants!
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false,
          },
          meta: {
            page: 1,
            limit: limitNum,
            total: 0,
            totalPage: 0,
          },
          message: detection.message || 'Delivery not available in your area',
        };
      }
    } catch {
      if (!queryParams.zoneId) {
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false,
          },
          meta: {
            page: 1,
            limit: limitNum,
            total: 0,
            totalPage: 0,
          },
          message: 'Delivery not available in your area',
        };
      }
    }
  }

  const mongoQuery = buildRestaurantMongoQuery(effectiveQueryParams);
  const sortOptions = buildRestaurantSortOptions(sortBy as string);

  // If user provided valid GPS coordinates or asked for distance sorting, fetch matching items and sort by proximity
  const isDistanceSortRequested = sortBy === 'distance' || (userLat !== undefined && userLng !== undefined && !sortBy);

  if (isDistanceSortRequested || (userLat !== undefined && userLng !== undefined)) {
    const rawItems = await restaurantCollection.find(mongoQuery).toArray();

    // Step 1: Attach exact distance & calculate dynamic delivery fee
    let processedItems = rawItems.map((doc) => {
      const dist = calculateRestaurantDistance(doc, userLat, userLng);
      const dynamicFee = calculateDynamicDeliveryFee(
        dist.distanceKm,
        Number(doc.pricing?.deliveryFee || doc.deliveryFee || baseDeliveryFee),
        perKmDeliveryFee
      );

      return {
        ...doc,
        distanceKm: dist.distanceKm,
        distanceText: dist.distanceText,
        deliveryFee: dynamicFee,
        pricing: {
          ...doc.pricing,
          deliveryFee: dynamicFee,
        },
      };
    });

    // Step 2: Hybrid Distance Pruning (Filter out restaurants beyond reachable delivery radius)
    const thresholdRadiusKm = effectiveMaxDistanceKm && effectiveMaxDistanceKm > 0 ? effectiveMaxDistanceKm : 4.5;
    processedItems = processedItems.filter((item: any) => {
      const restMaxRadius = Number(item.deliveryRadiusKm) || thresholdRadiusKm;
      const allowedRadius = Math.max(restMaxRadius, thresholdRadiusKm);
      return item.distanceKm <= allowedRadius;
    });

    if (isDistanceSortRequested || sortBy === 'distance') {
      processedItems.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    const totalItems = processedItems.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedItems = processedItems.slice(skip, skip + limitNum);

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

import {
  parseIngredientString,
  classifyIngredient,
  formatDisplayQuantity,
  GROCERY_AISLES,
  IAisleGroup,
} from './grocery.utils';

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

/**
 * Get Food Items specifically for Restaurant Grocery & Inventory
 * Strictly scoped to the given restaurant ID only (no global or other restaurant foods).
 */
const getRestaurantGroceryFoods = async (restaurantId: string) => {
  if (!restaurantId || !String(restaurantId).trim()) {
    throw new Error('Restaurant ID is required to fetch grocery foods.');
  }

  const cleanId = String(restaurantId).trim();
  const query = ObjectId.isValid(cleanId)
    ? { $or: [{ restaurantId: cleanId }, { restaurantId: new ObjectId(cleanId) }] }
    : { restaurantId: cleanId };

  const items = await foodCollection.find(query).sort({ name: 1 }).toArray();

  return items.map((item) => {
    let ingList: string[] = [];
    if (Array.isArray(item.ingredients)) {
      ingList = item.ingredients;
    } else if (typeof item.ingredients === 'string' && item.ingredients.trim()) {
      ingList = item.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    return {
      _id: item._id?.toString(),
      id: item._id?.toString(),
      restaurantId: item.restaurantId?.toString(),
      name: item.name,
      category: item.category || 'General',
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.image || (Array.isArray(item.images) ? item.images[0] : ''),
      ingredients: ingList,
      isAvailable: item.isAvailable ?? (item.status !== 'unavailable'),
      status: item.status || 'available',
      isVegetarian: item.isVegetarian || false,
      createdAt: item.createdAt,
    };
  });
};

/**
 * Aggregate ingredient requirements for selected dishes & portions
 * Strictly verifies and limits to the given restaurant ID.
 */
const aggregateGroceryList = async (
  restaurantId: string,
  selectedItems: Array<{ foodId: string; portions: number }>
) => {
  if (!restaurantId || !String(restaurantId).trim()) {
    throw new Error('Restaurant ID is required.');
  }

  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return {
      totalDishes: 0,
      totalPortions: 0,
      uniqueIngredientsCount: 0,
      aisles: [],
      selectedDishesSummary: [],
    };
  }

  const cleanId = String(restaurantId).trim();
  const foodIds = selectedItems
    .map((s) => s.foodId)
    .filter(Boolean)
    .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));

  // Strict Scoping: Query food items matching these IDs AND strictly matching this restaurantId
  const scopedQuery: any = {
    _id: { $in: foodIds },
    ...(ObjectId.isValid(cleanId)
      ? { $or: [{ restaurantId: cleanId }, { restaurantId: new ObjectId(cleanId) }] }
      : { restaurantId: cleanId }),
  };

  const dbFoods = await foodCollection.find(scopedQuery).toArray();
  const foodMap = new Map<string, any>();
  dbFoods.forEach((f) => {
    foodMap.set(f._id.toString(), f);
  });

  // Map to hold aggregated ingredients keyed by normalized `${category}:::${cleanName}:::${unit}`
  const ingredientMap = new Map<
    string,
    {
      name: string;
      category: string;
      quantity: number;
      unit: string;
      dishes: Set<string>;
    }
  >();

  const selectedDishesSummary: Array<{
    foodId: string;
    name: string;
    category: string;
    image: string;
    portions: number;
    ingredientsCount: number;
  }> = [];

  let totalPortions = 0;

  for (const item of selectedItems) {
    const food = foodMap.get(item.foodId);
    if (!food) continue; // Skip items that don't belong to this restaurant

    const portions = Math.max(1, Number(item.portions) || 1);
    totalPortions += portions;

    let ingredientsList: string[] = [];
    if (Array.isArray(food.ingredients)) {
      ingredientsList = food.ingredients;
    } else if (typeof food.ingredients === 'string' && food.ingredients.trim()) {
      ingredientsList = food.ingredients.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    selectedDishesSummary.push({
      foodId: food._id.toString(),
      name: food.name,
      category: food.category || 'General',
      image: food.image || (Array.isArray(food.images) ? food.images[0] : ''),
      portions,
      ingredientsCount: ingredientsList.length,
    });

    for (const rawIng of ingredientsList) {
      if (!rawIng || !String(rawIng).trim()) continue;

      const parsed = parseIngredientString(rawIng);
      const category = classifyIngredient(parsed.name);
      const scaledQuantity = parsed.quantity * portions;

      // Group key (case-insensitive name + unit + category)
      const key = `${category}:::${parsed.name.toLowerCase()}:::${parsed.unit}`;

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.quantity += scaledQuantity;
        existing.dishes.add(food.name);
      } else {
        ingredientMap.set(key, {
          name: parsed.name,
          category,
          quantity: scaledQuantity,
          unit: parsed.unit,
          dishes: new Set([food.name]),
        });
      }
    }
  }

  // Group into Aisle Categories
  const aisleMap = new Map<string, IAisleGroup>();
  GROCERY_AISLES.forEach((aisle) => {
    aisleMap.set(aisle.name, {
      category: aisle.id,
      aisleName: aisle.name,
      icon: aisle.icon,
      items: [],
    });
  });

  let uniqueIngredientsCount = 0;

  ingredientMap.forEach((entry) => {
    uniqueIngredientsCount++;
    const targetAisle = aisleMap.get(entry.category) || aisleMap.get('General Pantry Staples')!;

    targetAisle.items.push({
      id: `ing-${Math.random().toString(36).substring(2, 9)}`,
      name: entry.name,
      quantity: Math.round(entry.quantity * 100) / 100,
      displayQuantity: formatDisplayQuantity(entry.quantity, entry.unit),
      unit: entry.unit,
      dishes: Array.from(entry.dishes),
      isChecked: false,
    });
  });

  // Filter out empty aisles and sort items alphabetically within each aisle
  const activeAisles = Array.from(aisleMap.values())
    .filter((a) => a.items.length > 0)
    .map((a) => ({
      ...a,
      items: a.items.sort((x, y) => x.name.localeCompare(y.name)),
    }));

  return {
    totalDishes: selectedDishesSummary.length,
    totalPortions,
    uniqueIngredientsCount,
    aisles: activeAisles,
    selectedDishesSummary,
  };
};

/**
 * Update Secret Grocery Ingredients / Raw Materials for a specific food item
 */
const updateFoodSecretRecipe = async (foodId: string, ingredients: string[]) => {
  if (!foodId) throw new Error("Food ID is required to update secret recipe.");

  const cleanIngredients = Array.isArray(ingredients)
    ? ingredients.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const query: any = ObjectId.isValid(foodId) ? { _id: new ObjectId(foodId) } : { _id: foodId };

  const result = await foodCollection.findOneAndUpdate(
    query,
    {
      $set: {
        ingredients: cleanIngredients,
        updatedAt: new Date().toISOString(),
      },
    },
    { returnDocument: 'after' }
  );

  return result;
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
  getRestaurantGroceryFoods,
  aggregateGroceryList,
  updateFoodSecretRecipe,
};


