import express, { Router } from 'express';
import { RestaurantProfileRoutes } from './routes/profile.route';
import { AddFoodRoutes } from './routes/add-food';
import { ExploreRestaurantRoutes } from './routes/explore.route';
import { RestaurantGroceryRoutes } from './routes/grocery.route';
import { RestaurantController } from './restaurant.controller';

const router: Router = express.Router();

/**
 * ====================================================================
 * 📁 MODULAR ROUTE MOUNTING (from ./routes/ folder)
 * ====================================================================
 */

// 1. Restaurant Profile Management Routes (/api/restaurants/profile)
router.use('/profile', RestaurantProfileRoutes);

// 2. Restaurant Food & Menu Routes (/api/restaurants/food)
router.use('/food', AddFoodRoutes);

// 2.1 Restaurant Smart Grocery & Inventory Routes (/api/restaurants/grocery)
router.use('/grocery', RestaurantGroceryRoutes);


// 3. Direct Profile & Status Shortcut Endpoints
router.get('/my-profile', RestaurantController.getMyProfile);
router.patch('/my-profile', RestaurantController.updateMyProfile);
router.patch('/toggle-status', RestaurantController.toggleStatus);

// 4. Create / Onboard Restaurant directly on (/api/restaurants)
router.post('/', RestaurantController.createRestaurant);

// 5. Public Restaurant Discovery & Explore Routes (/api/restaurants)
router.use('/', ExploreRestaurantRoutes);

export const RestaurantRoutes = router;
