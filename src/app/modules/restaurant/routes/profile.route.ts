import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

// 1. Create or Update (POST /api/restaurants/profile)
router.post('/', RestaurantController.createRestaurant);

// 2. Get Logged-in Owner Profile (GET /api/restaurants/profile/my-profile)
router.get('/my-profile', RestaurantController.getMyProfile);

// 3. Update Owner Profile (PATCH /api/restaurants/profile/my-profile)
router.patch('/my-profile', RestaurantController.updateMyProfile);

// 4. Toggle Open/Closed Status (PATCH /api/restaurants/profile/toggle-status)
router.patch('/toggle-status', RestaurantController.toggleStatus);

export const RestaurantProfileRoutes = router;

