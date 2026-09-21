import express, { Router } from 'express';
import { FavoriteController } from './favorite.controller';

const router: Router = express.Router();

// Toggle favorite (add/remove)
router.post('/toggle', FavoriteController.toggleFavorite);

// Check if a food is favorite for a user
router.get('/check/:userId/:foodId', FavoriteController.checkIsFavorite);

// Get user's favorites list
router.get('/user/:userId', FavoriteController.getUserFavorites);

// Remove favorite directly
router.delete('/:userId/:foodId', FavoriteController.removeFavorite);

export const FavoriteRoutes = router;
