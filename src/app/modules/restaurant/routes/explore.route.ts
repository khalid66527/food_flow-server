import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Public Restaurant Discovery & Explore Routes (/api/restaurants)
 */

// 1. Get All Restaurants (Search, Filter by Category, Price, Rating, Location, Sorting, Pagination)
router.get('/', RestaurantController.getAllRestaurants);

// 2. Get Single Restaurant Details by ID or Slug (with menu items)
router.get('/:id', RestaurantController.getSingleRestaurant);

export const ExploreRestaurantRoutes = router;
