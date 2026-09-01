import express, { Router } from 'express';
import { RestaurantRoutes } from '../modules/restaurant/restaurant.route';
import { FoodRoutes } from '../modules/food/food.routes';
import { AdminRoutes } from '../modules/admin/admin.route';
import { RiderRoutes } from '../modules/rider/rider.route';
import { CustomerRoutes } from '../modules/customer/customer.route';
import { AiRoutes } from '../modules/ai/ai.route';
import { ContactRoutes } from '../modules/contact/contact.route';

const router: Router = express.Router();

const moduleRoutes = [
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
    path: '/ai',
    route: AiRoutes,
  },
  {
    path: '/contacts',
    route: ContactRoutes,
  },
  {
    path: '/contact',
    route: ContactRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

