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

export const AdminRoutes = router;
