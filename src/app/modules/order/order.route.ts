import { Router } from 'express';
import { OrderController } from './order.controller';
import { requireRoles } from './order.auth';

const router = Router();

router.post('/', OrderController.createOrder);
router.get('/', OrderController.getUserOrders);
router.get('/:id', OrderController.getOrderById);
router.patch('/:id', OrderController.updateOrder);

// Advance order status (Restaurant / Rider / Admin)
router.patch(
  '/:id/status',
  requireRoles('restaurant', 'rider', 'admin'),
  OrderController.updateOrderStatus
);

// Rider live location updates (Rider / Admin)
router.patch(
  '/:id/location',
  requireRoles('rider', 'admin'),
  OrderController.updateRiderLocation
);

export const OrderRoutes = router;
