import express, { Router } from 'express';
import { StatsController } from './stats.controller';

const router: Router = express.Router();

router.get('/public', StatsController.getPublicStats);
router.get('/restaurants-count', StatsController.getRestaurantsCount);
router.get('/orders-delivered-count', StatsController.getOrdersDeliveredCount);
router.get('/riders-count', StatsController.getRidersCount);
router.get('/happy-customers-count', StatsController.getHappyCustomersCount);
router.get('/', StatsController.getPublicStats);

export const StatsRoutes = router;
