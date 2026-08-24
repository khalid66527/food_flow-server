import express, { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { restaurantCollection } from '../../config/db';
import { RestaurantProfileRoutes } from './routes/profile.route';


const router: Router = express.Router();

/**
 * ====================================================================
 * 📁 SUB-ROUTERS (আলাদা আলাদা ফাইলের রাউট এখানে মাউন্ট করা)
 * ====================================================================
 */

// ১. প্রোফাইল রিলেটেড API (/api/restaurants/profile/...)
router.use('/profile', RestaurantProfileRoutes);


/**
 * ====================================================================
 * 🌐 PUBLIC RESTAURANT APIS (সবার জন্য উন্মুক্ত রেস্তোরাঁ খোঁজার API)
 * ====================================================================
 */

// 1. Get All Restaurants (Search, Filter, Pagination)
// Endpoint: GET /api/restaurants?search=...&cuisine=...&city=...&page=1&limit=10
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, cuisine, city, page = '1', limit = '10' } = req.query;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = ['restaurantName', 'tagline', 'description', 'cuisineTypes'].map((field) => ({
        [field]: { $regex: search as string, $options: 'i' },
      }));
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

    const [total, restaurants] = await Promise.all([
      restaurantCollection.countDocuments(filter),
      restaurantCollection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
    ]);

    res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPage: Math.ceil(total / limitNum) || 1,
      },
      data: restaurants,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch restaurants',
    });
  }
});

// 2. Get Single Restaurant by ID or Slug
// Endpoint: GET /api/restaurants/:idOrSlug
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idOrSlug } = req.params;

    if (!idOrSlug) {
      res.status(400).json({ success: false, message: 'ID or Slug is required' });
      return;
    }

    const query = ObjectId.isValid(idOrSlug as string)
      ? { $or: [{ _id: new ObjectId(idOrSlug as string) }, { slug: idOrSlug }] }
      : { slug: idOrSlug };

    const restaurant = await restaurantCollection.findOne(query);

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
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

// 3. Delete Restaurant by ID (Admin / System use)
// Endpoint: DELETE /api/restaurants/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id as string)) {
      res.status(400).json({ success: false, message: 'Valid Restaurant ID is required' });
      return;
    }

    const result = await restaurantCollection.deleteOne({ _id: new ObjectId(id as string) });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to delete restaurant',
    });
  }
});

// Backward compatibility shortcuts for direct root calls
router.post('/', (req, res) => RestaurantProfileRoutes(req, res, () => {}));
router.get('/my-profile', (req, res) => RestaurantProfileRoutes(req, res, () => {}));
router.patch('/my-profile', (req, res) => RestaurantProfileRoutes(req, res, () => {}));
router.patch('/toggle-status', (req, res) => RestaurantProfileRoutes(req, res, () => {}));

export const RestaurantRoutes = router;
