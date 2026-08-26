import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Restaurant Food / Menu Routes (/api/restaurants/food)
 *
 * 1. POST   /               → Add Food Item to Restaurant Menu
 * 2. GET    /:restaurantId  → Get all Menu Items for a Restaurant
 * 3. PATCH  /:foodId        → Update Food Item Details
 * 4. PATCH  /:foodId/status → Toggle Food Availability (In Stock / Out of Stock)
 * 5. DELETE /:foodId        → Delete Food Item from Menu
 */

// 1. Add Food Item to Restaurant Menu
router.post('/', RestaurantController.addFoodItem);

// 2. Get Restaurant Menu Items
router.get('/:restaurantId', RestaurantController.getRestaurantMenu);

// 3. Update Food Item Details & Offers
router.patch('/:foodId', RestaurantController.updateFoodItem);

// 4. Toggle Food Availability
router.patch('/:foodId/status', RestaurantController.toggleFoodAvailability);

// 5. Delete Food Item
router.delete('/:foodId', RestaurantController.deleteFoodItem);

export const AddFoodRoutes = router;
