import express, { Router } from 'express';
import { AdminController } from './admin.controller';

const router: Router = express.Router();

// User management routes under /api/admin
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Restaurant details for modal view
router.get('/restaurant-details/:identifier', AdminController.getRestaurantDetails);

// Restaurant & Rider Approval & Management routes under /api/admin
router.get('/restaurants', AdminController.getAllRestaurants);
router.patch('/restaurants/:id/status', AdminController.updateRestaurantStatus);
router.delete('/restaurants/:id', AdminController.deleteRestaurant);

router.get('/riders', AdminController.getAllRiders);
router.patch('/riders/:id/status', AdminController.updateRiderStatus);
router.delete('/riders/:id', AdminController.deleteRider);

router.get('/restaurant-rider-stats', AdminController.getRestaurantAndRiderStats);

export const AdminRoutes = router;
