import express, { Router } from 'express';
import { AuthController } from './auth.controller';
import { verifyToken } from './auth.middleware';

const router: Router = express.Router();

// Public routes for token creation and verification
router.post('/jwt', AuthController.createJwtToken);
router.post('/create-token', AuthController.createJwtToken);
router.get('/verify-token', AuthController.verifyTokenEndpoint);

// Protected route
router.get('/me', verifyToken, AuthController.getMe);

export const AuthRoutes = router;
