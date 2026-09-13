import express, { Router } from 'express';
import { FoodController } from './food.controller';

const router: Router = express.Router();

/**
 * Global Food Feed Routes (/api/food)
 */

// Get all distinct food categories
router.get('/categories', FoodController.getDistinctCategories);

// Get All Global Food Items (Search, Filter, Sort, Pagination)
router.get('/', FoodController.getAllGlobalFoodItems);

export const FoodRoutes = router;
