import express, { Router } from 'express';
import { RestaurantController } from '../restaurant.controller';

const router: Router = express.Router();

/**
 * Public Restaurant Discovery & Explore Routes (/api/restaurants)
 */

// 1. Get All Restaurants (Search, Filter by Category, Price, Rating, Location, Sorting, Pagination)
router.get('/', RestaurantController.getAllRestaurants);

// 2. Get Single Restaurant by ID or Slug
router.get('/:idOrSlug', RestaurantController.getSingleRestaurant);

export const ExploreRestaurantRoutes = router;
