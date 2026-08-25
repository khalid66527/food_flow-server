import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Restaurant Profile Routes (/api/restaurants/profile)
 */

// 1. Create or Onboard Restaurant Profile
router.post('/', RestaurantController.createRestaurant);

// 2. Get Logged-In Owner's Profile
router.get('/my-profile', RestaurantController.getMyProfile);

// 3. Update Owner's Profile
router.patch('/my-profile', RestaurantController.updateMyProfile);

// 4. Toggle Open / Closed Status
router.patch('/toggle-status', RestaurantController.toggleStatus);

export const RestaurantProfileRoutes = router;
