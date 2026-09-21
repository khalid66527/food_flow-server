import express, { Router } from 'express';
import { RiderProfileController } from './profile/rider.profile.controller';

const router: Router = express.Router();

// ---------------------------------------------------------------------------
// Rider Profile Routes: /api/rider/profile, /api/rider/my-profile
// ---------------------------------------------------------------------------

// 1. Get current rider's profile
router.get('/my-profile', RiderProfileController.getMyProfile);
router.get('/profile', RiderProfileController.getMyProfile);

// 2. Create rider profile
router.post('/profile', RiderProfileController.createProfile);
router.post('/', RiderProfileController.createProfile);

// 3. Update rider profile
router.patch('/profile', RiderProfileController.updateProfile);
router.put('/profile', RiderProfileController.updateProfile);

// 4. Toggle online/offline availability
router.patch('/profile/availability', RiderProfileController.toggleAvailability);

// 5. Delete rider profile
router.delete('/profile', RiderProfileController.deleteProfile);

// 6. Get all riders
router.get('/all', RiderProfileController.getAllRiders);

export const RiderRoutes = router;
