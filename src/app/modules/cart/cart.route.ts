import express, { Router } from 'express';
import { CartController } from './cart.controller';
import { requireCustomer } from './cart.auth';

const router: Router = express.Router();

/**
 * Cart Routes (/api/cart)
 * All routes are protected by requireCustomer which enforces
 * customer-only access and binds the userId to the authenticated user.
 */

// Get full cart for a user
router.get('/:userId', requireCustomer, CartController.getCart);

// Add an item to the user's cart
router.post('/:userId', requireCustomer, CartController.addItem);

// Update the quantity of a specific food item in the user's cart
router.patch('/:userId/:foodId', requireCustomer, CartController.updateQuantity);

// Remove a specific food item from the user's cart
router.delete('/:userId/:foodId', requireCustomer, CartController.removeItem);

// Clear the entire user's cart
router.delete('/:userId', requireCustomer, CartController.clearCart);

export const CartRoutes = router;
