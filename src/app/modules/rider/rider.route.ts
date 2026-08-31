import express, { Router } from 'express';
import { RiderProfileController } from './profile/rider.profile.controller';
import { DeliveryRoutes } from './delivery/delivery.route';
import { EarningsRoutes } from './earnings/earnings.route';
import { authenticate } from '../../middleware/auth';

const router: Router = express.Router();

// ---------------------------------------------------------------------------
// Rider Profile Routes: /api/rider/profile, /api/rider/my-profile
// ---------------------------------------------------------------------------

// 1. Get current rider's profile
router.get('/my-profile', authenticate, RiderProfileController.getMyProfile);
router.get('/profile', authenticate, RiderProfileController.getMyProfile);

// 2. Create rider profile
router.post('/profile', authenticate, RiderProfileController.createProfile);
router.post('/', authenticate, RiderProfileController.createProfile);

// 3. Update rider profile
router.patch('/profile', authenticate, RiderProfileController.updateProfile);
router.put('/profile', authenticate, RiderProfileController.updateProfile);

// 4. Toggle online/offline availability
router.patch('/profile/availability', authenticate, RiderProfileController.toggleAvailability);

// 5. Delete rider profile
router.delete('/profile', authenticate, RiderProfileController.deleteProfile);

// 6. Get all riders
router.get('/all', authenticate, RiderProfileController.getAllRiders);

// ---------------------------------------------------------------------------
// Delivery Tracking Routes: /api/rider/deliveries
// ---------------------------------------------------------------------------
router.use('/deliveries', DeliveryRoutes);

// ---------------------------------------------------------------------------
// Earnings Routes: /api/rider/earnings
// ---------------------------------------------------------------------------
router.use('/earnings', EarningsRoutes);

export const RiderRoutes = router;
