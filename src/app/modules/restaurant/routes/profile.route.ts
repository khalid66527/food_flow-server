import express, { Router, Request, Response } from 'express';
import { restaurantCollection } from '../../../config/db';
import { generateSlug } from '../restaurant.utils';

const router: Router = express.Router();

/**
 * ====================================================================
 * 1. CREATE OR UPDATE RESTAURANT PROFILE (POST /api/restaurants/profile)
 * ====================================================================
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload?.restaurantName) {
      res.status(400).json({
        success: false,
        message: 'Restaurant Name is required',
      });
      return;
    }

    const ownerEmail = payload.ownerEmail || payload.contactEmail || '';
    const contactEmail = payload.contactEmail || ownerEmail;

    // Check if restaurant already exists for this owner
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

        res.status(200).json({
          success: true,
          message: 'Restaurant profile updated successfully',
          data: updateResult,
        });
        return;
      }
    }

    // Prepare full document
    const newRestaurant = {
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
      openingHours: payload.openingHours || {},
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

    const result = await restaurantCollection.insertOne(newRestaurant);

    res.status(201).json({
      success: true,
      message: 'Restaurant profile created successfully',
      data: { _id: result.insertedId, ...newRestaurant },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to save restaurant profile',
    });
  }
});

/**
 * ====================================================================
 * 2. GET LOGGED-IN OWNER'S PROFILE (GET /api/restaurants/profile/my-profile)
 * Supports query: ?email=owner@example.com or ?ownerId=...
 * ====================================================================
 */
router.get('/my-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = (req.query.email as string) || (req.headers['x-user-email'] as string);
    const ownerId = req.query.ownerId as string;

    const query: Record<string, any> =
      email && ownerId
        ? { $or: [{ ownerEmail: email }, { contactEmail: email }, { ownerId }] }
        : email
        ? { $or: [{ ownerEmail: email }, { contactEmail: email }] }
        : ownerId
        ? { ownerId }
        : {};

    let restaurant = Object.keys(query).length > 0 ? await restaurantCollection.findOne(query) : null;

    // Fallback to latest restaurant if empty query (for easy testing)
    if (!restaurant) {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest?.[0]) restaurant = latest[0];
    }

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'No restaurant profile found for this user',
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant profile fetched successfully',
      data: restaurant,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurant profile',
    });
  }
});

/**
 * ====================================================================
 * 3. UPDATE OWNER'S PROFILE (PATCH /api/restaurants/profile/my-profile)
 * ====================================================================
 */
router.patch('/my-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = (req.query.email as string) || req.body?.ownerEmail || req.body?.contactEmail;
    let query: Record<string, any> = email
      ? { $or: [{ ownerEmail: email }, { contactEmail: email }] }
      : {};

    if (Object.keys(query).length === 0) {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest?.[0]) query = { _id: latest[0]._id };
    }

    const { _id, ...restPayload } = req.body;
    const updateData = { ...restPayload, updatedAt: new Date().toISOString() };

    const result = await restaurantCollection.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant profile not found to update',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant profile updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update restaurant profile',
    });
  }
});

/**
 * ====================================================================
 * 4. TOGGLE OPEN / CLOSED (PATCH /api/restaurants/profile/toggle-status)
 * ====================================================================
 */
router.patch('/toggle-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { isOpen, email } = req.body;
    const ownerEmail = (req.query.email as string) || email;

    let query: Record<string, any> = ownerEmail
      ? { $or: [{ ownerEmail: ownerEmail }, { contactEmail: ownerEmail }] }
      : {};

    if (Object.keys(query).length === 0) {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest?.[0]) query = { _id: latest[0]._id };
    }

    const result = await restaurantCollection.findOneAndUpdate(
      query,
      { $set: { isOpen: Boolean(isOpen), updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found to toggle status',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${isOpen ? 'OPEN' : 'CLOSED'}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to toggle status',
    });
  }
});

export const RestaurantProfileRoutes = router;
