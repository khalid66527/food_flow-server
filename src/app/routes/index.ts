import express, { Router } from 'express';
import { RestaurantRoutes } from '../modules/restaurant/restaurant.route';
import { FoodRoutes } from '../modules/food/food.routes';
import { AdminRoutes } from '../modules/admin/admin.route';
import { RiderRoutes } from '../modules/rider/rider.route';
import { CartRoutes } from '../modules/cart/cart.route';
import { AddressRoutes } from '../modules/address/address.route';
import { ContactRoutes } from '../modules/contact/contact.route';
import { AiRoutes } from '../modules/ai/ai.route';
import { OrderRoutes } from '../modules/order/order.route';
import { CategoryRoutes } from '../modules/category/category.route';
import { SettingsRoutes } from '../modules/settings/settings.route';
import { CouponRoutes } from '../modules/coupon/coupon.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { ReviewRoutes } from '../modules/review/review.route';
import { StatsRoutes } from '../modules/stats/stats.route';

const router: Router = express.Router();

const moduleRoutes = [
  {
    path: '/stats',
    route: StatsRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/settings',
    route: SettingsRoutes,
  },
  {
    path: '/coupons',
    route: CouponRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
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
    path: '/cart',
    route: CartRoutes,
  },
  {
    path: '/addresses',
    route: AddressRoutes,
  },
  {
    path: '/contacts',
    route: ContactRoutes,
  },
  {
    path: '/contact',
    route: ContactRoutes,
  },
  {
    path: '/ai',
    route: AiRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;


