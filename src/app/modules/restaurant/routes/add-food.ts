import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Restaurant Food / Menu Routes (/api/restaurants/food)
 *
 * 1. POST  /               → Add Food Item to Restaurant Menu
 *    Body: { restaurantId, name, category, price, description, image, status }
 *    - image  : ImgBB-hosted image URL (uploaded from the client)
 *    - status : "available" | "unavailable" (stored as isAvailable)
 *
 * 2. GET   /:restaurantId  → Get all Menu Items for a Restaurant
 */

// 1. Add Food Item to Restaurant Menu
router.post('/', RestaurantController.addFoodItem);

// 2. Get Restaurant Menu Items
router.get('/:restaurantId', RestaurantController.getRestaurantMenu);

export const AddFoodRoutes = router;
