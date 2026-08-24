import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Restaurant Food / Menu Routes (/api/restaurants/food)
 */

// 1. Add Food Item to Restaurant Menu
router.post('/', RestaurantController.addFoodItem);

// 2. Get Restaurant Menu Items
router.get('/:restaurantId', RestaurantController.getRestaurantMenu);

export const AddFoodRoutes = router;
