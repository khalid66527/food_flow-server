import { Router } from 'express';
import { OrderController } from './order.controller';

const router = Router();

router.post('/', OrderController.createOrder);
router.get('/', OrderController.getUserOrders);
router.get('/:id', OrderController.getOrderById);
router.patch('/:id', OrderController.updateOrder);

export const OrderRoutes = router;
