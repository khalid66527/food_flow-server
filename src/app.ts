import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Helper function to generate clean URL slug
const generateSlug = (name: string): string => {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Math.random().toString(36).substring(2, 6)}`
  );
};

// ==========================================
// 1. HEALTH & ROOT
// ==========================================
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Food Flow Restaurant Server API 🚀',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. RESTAURANT ROUTER
// ==========================================
const restaurantRouter = express.Router();

// 1. Create Restaurant Profile (POST /)
restaurantRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const payload = req.body;

    if (!payload?.restaurantName) {
      res.status(400).json({
        success: false,
        message: 'Restaurant Name is required.',
      });
      return;
    }

    const ownerEmail = payload.ownerEmail || payload.contactEmail || '';
    const contactEmail = payload.contactEmail || ownerEmail;

    // Check if owner already registered a restaurant
    if (ownerEmail) {
      const existing = await restaurantCollection.findOne({
        $or: [{ ownerEmail }, { contactEmail: ownerEmail }],
      });
      if (existing) {
        // If already exists, update it instead of erroring out
        const updateResult = await restaurantCollection.findOneAndUpdate(
          { _id: existing._id },
          { $set: { ...payload, updatedAt: new Date().toISOString() } },
          { returnDocument: 'after' }
        );
        res.status(200).json({
          success: true,
          message: 'Existing restaurant profile updated successfully!',
          data: updateResult,
        });
        return;
      }
    }

    const slug = payload.slug || generateSlug(payload.restaurantName);

    const restaurantDoc = {
      ownerEmail,
      ownerId: payload.ownerId || '',
      ownerName: payload.ownerName || '',
      ownerPhone: payload.ownerPhone || '',
      restaurantName: payload.restaurantName,
      slug,
      tagline: payload.tagline || '',
      description: payload.description || '',
      cuisineTypes: Array.isArray(payload.cuisineTypes) ? payload.cuisineTypes : [],
      logo: payload.logo || '',
      bannerImage: payload.bannerImage || '',
      contactNumber: payload.contactNumber || '',
      contactEmail,
      website: payload.website || '',
      address: payload.address || {
        street: payload.street || '',
        city: payload.city || '',
        state: payload.state || '',
        postalCode: payload.postalCode || '',
        country: payload.country || 'Bangladesh',
      },
      openingHours: payload.openingHours,
      generalOpenTime: payload.generalOpenTime || '09:00 AM',
      generalCloseTime: payload.generalCloseTime || '10:00 PM',
      pricing: {
        minOrderAmount: Number(payload.pricing?.minOrderAmount || payload.minOrderAmount) || 0,
        deliveryFee: Number(payload.pricing?.deliveryFee || payload.deliveryFee) || 0,
        estimatedDeliveryTime: payload.pricing?.estimatedDeliveryTime || payload.estimatedDeliveryTime || '30-45 mins',
        costForTwo: Number(payload.pricing?.costForTwo || payload.costForTwo) || 0,
      },
      features: {
        hasDelivery: payload.features?.hasDelivery ?? payload.hasDelivery ?? true,
        hasTakeaway: payload.features?.hasTakeaway ?? payload.hasTakeaway ?? true,
        hasDineIn: payload.features?.hasDineIn ?? payload.hasDineIn ?? false,
        isPureVeg: payload.features?.isPureVeg ?? payload.isPureVeg ?? false,
        isHalal: payload.features?.isHalal ?? payload.isHalal ?? true,
      },
      socialLinks: payload.socialLinks || {
        facebook: payload.facebook || '',
        instagram: payload.instagram || '',
        twitter: payload.twitter || '',
        website: payload.website || '',
      },
      rating: 0,
      totalReviews: 0,
      isOpen: payload.isOpen ?? true,
      status: payload.status || 'active',
      isFeatured: payload.isFeatured ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await restaurantCollection.insertOne(restaurantDoc);

    res.status(201).json({
      success: true,
      message: 'Restaurant profile created successfully!',
      data: { _id: result.insertedId, ...restaurantDoc },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create restaurant profile',
    });
  }
});

// 2. Get My Restaurant Profile (GET /my-profile)
restaurantRouter.get('/my-profile', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const ownerEmail =
      (req.query.ownerEmail as string) ||
      (req.headers['x-user-email'] as string);
    const ownerId =
      (req.query.ownerId as string) ||
      (req.headers['x-user-id'] as string);

    let query: any = {};
    if (ownerEmail && ownerId) {
      query = {
        $or: [
          { ownerEmail },
          { contactEmail: ownerEmail },
          { ownerId },
        ],
      };
    } else if (ownerEmail) {
      query = {
        $or: [{ ownerEmail }, { contactEmail: ownerEmail }],
      };
    } else if (ownerId) {
      query = { ownerId };
    }

    let restaurant = null;
    if (Object.keys(query).length > 0) {
      restaurant = await restaurantCollection.findOne(query);
    }

    // Fallback: If not found by query or query was empty, fetch the most recent restaurant for smooth preview
    if (!restaurant) {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest && latest.length > 0) {
        restaurant = latest[0];
      }
    }

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'No restaurant found for this account',
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

// 3. Update Restaurant Profile (PATCH /my-profile)
restaurantRouter.patch('/my-profile', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const ownerEmail =
      (req.query.ownerEmail as string) ||
      (req.headers['x-user-email'] as string) ||
      req.body.ownerEmail ||
      req.body.contactEmail;

    let query: any = {};
    if (ownerEmail) {
      query = {
        $or: [{ ownerEmail }, { contactEmail: ownerEmail }],
      };
    } else {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest && latest.length > 0) {
        query = { _id: latest[0]._id };
      }
    }

    const payload = { ...req.body };
    delete payload._id; // Never mutate immutable MongoDB _id
    payload.updatedAt = new Date().toISOString();

    const result = await restaurantCollection.findOneAndUpdate(
      query,
      { $set: payload },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant profile not found for update',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant profile updated successfully!',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update profile',
    });
  }
});

// 4. Toggle Open / Closed Status (PATCH /toggle-status)
restaurantRouter.patch('/toggle-status', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const { ownerEmail, isOpen } = req.body;

    let query: any = {};
    if (ownerEmail) {
      query = {
        $or: [{ ownerEmail }, { contactEmail: ownerEmail }],
      };
    } else {
      const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
      if (latest && latest.length > 0) {
        query = { _id: latest[0]._id };
      }
    }

    const result = await restaurantCollection.findOneAndUpdate(
      query,
      { $set: { isOpen: Boolean(isOpen), updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${isOpen ? 'Open' : 'Closed'}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to toggle status',
    });
  }
});

// 5. Get All Restaurants (GET /)
restaurantRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const { search, cuisine, city, page = '1', limit = '10' } = req.query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { restaurantName: { $regex: search as string, $options: 'i' } },
        { tagline: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { cuisineTypes: { $regex: search as string, $options: 'i' } },
      ];
    }

    if (cuisine) {
      filter.cuisineTypes = { $in: [new RegExp(cuisine as string, 'i')] };
    }

    if (city) {
      filter['address.city'] = { $regex: city as string, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await restaurantCollection.countDocuments(filter);
    const items = await restaurantCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPage: Math.ceil(total / limitNum) || 1,
      },
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurants',
    });
  }
});

// 6. Get Single Restaurant by ID or Slug (GET /:idOrSlug)
restaurantRouter.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { restaurantCollection } = await import('./server');
    const { idOrSlug } = req.params;

    let query: any = { slug: idOrSlug };
    if (ObjectId.isValid(idOrSlug)) {
      query = {
        $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }],
      };
    }

    const restaurant = await restaurantCollection.findOne(query);

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant fetched successfully',
      data: restaurant,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurant',
    });
  }
});

// ==========================================
// Mount Router for BOTH /api/restaurants 
// ==========================================

app.use('/api/restaurants', restaurantRouter);

// ==========================================
// 404 & Global Error Handling
// ==========================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
