import express, { Router } from 'express';
import { DeliveryController } from './delivery.controller';
import { authenticate } from '../../../middleware/auth';

const router: Router = express.Router();

// Admin/system: create delivery for an order (MUST be before /:orderId routes)
router.post('/create', authenticate, DeliveryController.createDeliveryForOrder);

// Rider delivery routes
router.get('/available', authenticate, DeliveryController.getAvailableDeliveries);
router.get('/active', authenticate, DeliveryController.getActiveDelivery);
router.get('/history', authenticate, DeliveryController.getRiderDeliveryHistory);

// Order-specific routes (MUST be after /create to avoid conflict)
router.post('/:orderId/accept', authenticate, DeliveryController.acceptDelivery);
router.post('/:orderId/pickup', authenticate, DeliveryController.pickupOrder);
router.post('/:orderId/on-the-way', authenticate, DeliveryController.markOnTheWay);
router.post('/:orderId/delivered', authenticate, DeliveryController.markDelivered);
router.patch('/:orderId/location', authenticate, DeliveryController.updateRiderLocation);

export const DeliveryRoutes = router;
