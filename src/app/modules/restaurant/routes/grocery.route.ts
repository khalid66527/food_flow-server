import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';
import { auth } from '../../../middlewares/auth';

const router: Router = express.Router();

/**
 * Restaurant Smart Grocery & Inventory Routes (/api/restaurants/grocery)
 * Strictly protected for Restaurant Partners & Admins
 *
 * 1. GET  /:restaurantId  → Get restaurant-specific food items with ingredient data
 * 2. POST /aggregate      → Aggregate ingredient requirements for selected dishes & portions
 * 3. PATCH/PUT /food/:foodId/recipe → Save / Update secret recipe ingredients
 */

// 1. Get food items strictly for the specified restaurant
router.get(
  '/:restaurantId',
  auth('Restaurant Partner', 'admin'),
  RestaurantController.getRestaurantGroceryItems
);

// 2. Aggregate ingredients for selected food items and quantities
router.post(
  '/aggregate',
  auth('Restaurant Partner', 'admin'),
  RestaurantController.aggregateGroceryList
);

// 3. Save / Update secret recipe ingredients for a specific food item
router.patch(
  '/food/:foodId/recipe',
  auth('Restaurant Partner', 'admin'),
  RestaurantController.updateFoodSecretRecipe
);
router.put(
  '/food/:foodId/recipe',
  auth('Restaurant Partner', 'admin'),
  RestaurantController.updateFoodSecretRecipe
);

export const RestaurantGroceryRoutes = router;

