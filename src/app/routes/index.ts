import express, { Router } from 'express';
import { RestaurantRoutes } from '../modules/restaurant/restaurant.route';
import { FoodRoutes } from '../modules/food/food.routes';
import { AdminRoutes } from '../modules/admin/admin.route';
import { RiderRoutes } from '../modules/rider/rider.route';
import { CustomerRoutes } from '../modules/customer/customer.route';
import { AiRoutes } from '../modules/ai/ai.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { OrderRoutes } from '../modules/order/order.route';
import { NotificationRoutes } from '../modules/notification/notification.route';

const router: Router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/orders',
    route: OrderRoutes,
  },
  {
    path: '/restaurants',
    route: RestaurantRoutes,
  },
  {
    path: '/food',
    route: FoodRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/rider',
    route: RiderRoutes,
  },
  {
    path: '/customer',
    route: CustomerRoutes,
  },
  {
    path: '/ai',
    route: AiRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
