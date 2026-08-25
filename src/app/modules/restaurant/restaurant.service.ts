import { ObjectId } from 'mongodb';
import { restaurantCollection } from '../../config/db';
import { TRestaurant, TRestaurantQueryParams } from './restaurant.interface';
import { generateSlug } from './restaurant.utils';

/**
 * Create or Update Restaurant Profile
 */
const createOrUpdateRestaurant = async (payload: Partial<TRestaurant>) => {
  if (!payload?.restaurantName) {
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
      return { isUpdated: true, data: updateResult };
    }
  }

  const restaurantDoc: Record<string, any> = {
    ...payload,
    restaurantName: payload.restaurantName,
    ownerEmail,
    ownerId: payload.ownerId || '',
    ownerName: payload.ownerName || '',
    ownerPhone: payload.ownerPhone || '',
    slug: payload.slug || generateSlug(payload.restaurantName),
    tagline: payload.tagline || '',
    description: payload.description || '',
    cuisineTypes: Array.isArray(payload.cuisineTypes) ? payload.cuisineTypes : [],
    logo: payload.logo || '',
    bannerImage: payload.bannerImage || '',
    contactNumber: payload.contactNumber || '',
    contactEmail,
    website: payload.website || '',
    address: payload.address || {
      street: '',
      city: '',
      state: '',
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
        payload.pricing?.estimatedDeliveryTime || payload.estimatedDeliveryTime || '30-45 mins',
      costForTwo: Number(payload.pricing?.costForTwo || payload.costForTwo) || 0,
    },
    features: {
      hasDelivery: true,
      hasTakeaway: true,
      hasDineIn: false,
      isPureVeg: false,
      isHalal: true,
      ...payload.features,
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      website: '',
      ...payload.socialLinks,
    },
    rating: 0,
    totalReviews: 0,
    isOpen: payload.isOpen ?? true,
    status: payload.status || 'active',
    isFeatured: payload.isFeatured ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  delete restaurantDoc._id;

  const result = await restaurantCollection.insertOne(restaurantDoc);
  return { isUpdated: false, data: { _id: result.insertedId, ...restaurantDoc } };
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

  return restaurant;
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

  return result;
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

  return result;
};

/**
 * Get All Restaurants (with search, filter, pagination)
 */
const getAllRestaurants = async (queryParams: TRestaurantQueryParams) => {
  const { search, cuisine, city, page = '1', limit = '10' } = queryParams;

  const filter: any = {};
  if (search) {
    filter.$or = ['restaurantName', 'tagline', 'description', 'cuisineTypes'].map((field) => ({
      [field]: { $regex: search as string, $options: 'i' },
    }));
  }
  if (cuisine) filter.cuisineTypes = { $in: [new RegExp(cuisine as string, 'i')] };
  if (city) filter['address.city'] = { $regex: city as string, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    restaurantCollection.countDocuments(filter),
    restaurantCollection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
  ]);

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum) || 1,
    },
    data: items,
  };
};

/**
 * Get Single Restaurant by ID or Slug
 */
const getSingleRestaurant = async (idOrSlug: string) => {
  const query = ObjectId.isValid(idOrSlug)
    ? { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

  const restaurant = await restaurantCollection.findOne(query);
  return restaurant;
};

export const RestaurantService = {
  createOrUpdateRestaurant,
  getMyRestaurantProfile,
  updateMyRestaurantProfile,
  toggleRestaurantStatus,
  getAllRestaurants,
  getSingleRestaurant,
};
