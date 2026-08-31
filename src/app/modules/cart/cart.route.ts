import express, { Router } from 'express';
import { CartController } from './cart.controller';

const router: Router = express.Router();

/**
 * Cart Routes (/api/cart)
 */

// Get full cart for a user
router.get('/:userId', CartController.getCart);

// Add an item to the user's cart
router.post('/:userId', CartController.addItem);

// Update the quantity of a specific food item in the user's cart
router.patch('/:userId/:foodId', CartController.updateQuantity);

// Remove a specific food item from the user's cart
router.delete('/:userId/:foodId', CartController.removeItem);

// Clear the entire user's cart
router.delete('/:userId', CartController.clearCart);

export const CartRoutes = router;
