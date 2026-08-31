import express, { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = express.Router();

// Customer routes
router.post('/', authenticate, OrderController.createOrder);
router.get('/my-orders', authenticate, OrderController.getCustomerOrders);
router.get('/:orderId', authenticate, OrderController.getOrderById);
router.patch('/:orderId/cancel', authenticate, OrderController.cancelOrder);

// Restaurant routes
router.get('/restaurant/:restaurantId', authenticate, OrderController.getRestaurantOrders);

// Status update (restaurant, rider, admin can use)
router.patch('/:orderId/status', authenticate, OrderController.updateOrderStatus);

export const OrderRoutes = router;
