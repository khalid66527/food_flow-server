import express, { Router } from 'express';
import { EarningsController } from './earnings.controller';
import { authenticate } from '../../../middleware/auth';

const router: Router = express.Router();

router.get('/stats', authenticate, EarningsController.getRiderStats);
router.get('/', authenticate, EarningsController.getEarningsByPeriod);
router.get('/chart', authenticate, EarningsController.getEarningsChart);

export const EarningsRoutes = router;
