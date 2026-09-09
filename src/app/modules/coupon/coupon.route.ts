import express, { Router } from 'express';
import { CouponController } from './coupon.controller';

const router: Router = express.Router();

router.get('/active', CouponController.getActiveCoupons);
router.post('/apply', CouponController.applyCoupon);

// Admin Coupon Management
router.get('/admin/all', CouponController.getAllCoupons);
router.post('/admin', CouponController.createCoupon);
router.patch('/admin/:id/status', CouponController.toggleCoupon);
router.delete('/admin/:id', CouponController.deleteCoupon);

export const CouponRoutes = router;
