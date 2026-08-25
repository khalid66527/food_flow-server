import express, { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { restaurantCollection } from '../../config/db';
import { RestaurantController } from './restaurant.controller';
import { RestaurantProfileRoutes } from './routes/profile.route';

const router: Router = express.Router();

/**
 * ====================================================================
 * 📁 PROFILE & STORE OWNER APIS (MUST BE DECLARED BEFORE /:idOrSlug)
 * ====================================================================
 */

// Sub-router for /api/restaurants/profile/*
router.use('/profile', RestaurantProfileRoutes);

// Direct endpoints for restaurant owner profile management
router.get('/my-profile', RestaurantController.getMyProfile);
router.patch('/my-profile', RestaurantController.updateMyProfile);
router.patch('/toggle-status', RestaurantController.toggleStatus);

// Create or update restaurant (POST /api/restaurants)
router.post('/', RestaurantController.createRestaurant);

/**
 * ====================================================================
 * 🌐 PUBLIC RESTAURANT APIS (Search, Filter, Single Restaurant by ID/Slug)
 * ====================================================================
 */

// 1. Get All Restaurants (Search, Filter, Pagination)
// Endpoint: GET /api/restaurants?search=...&cuisine=...&city=...&page=1&limit=10
router.get('/', RestaurantController.getAllRestaurants);

// 2. Get Single Restaurant by ID or Slug
// Endpoint: GET /api/restaurants/:idOrSlug
router.get('/:idOrSlug', RestaurantController.getSingleRestaurant);

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

export const RestaurantRoutes = router;

