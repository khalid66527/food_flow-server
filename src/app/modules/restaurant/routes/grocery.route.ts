import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Restaurant Smart Grocery & Inventory Routes (/api/restaurants/grocery)
 *
 * 1. GET  /:restaurantId  → Get restaurant-specific food items with ingredient data
 * 2. POST /aggregate      → Aggregate ingredient requirements for selected dishes & portions
 */

// 1. Get food items strictly for the specified restaurant
router.get('/:restaurantId', RestaurantController.getRestaurantGroceryItems);

// 2. Aggregate ingredients for selected food items and quantities
router.post('/aggregate', RestaurantController.aggregateGroceryList);

// 3. Save / Update secret recipe ingredients for a specific food item
router.patch('/food/:foodId/recipe', RestaurantController.updateFoodSecretRecipe);
router.put('/food/:foodId/recipe', RestaurantController.updateFoodSecretRecipe);

export const RestaurantGroceryRoutes = router;
