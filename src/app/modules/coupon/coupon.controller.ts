import { Request, Response } from 'express';
import { CouponService } from './coupon.service';

export class CouponController {
  static async createCoupon(req: Request, res: Response) {
    try {
      const coupon = await CouponService.createCoupon(req.body);
      return res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: coupon,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create coupon',
      });
    }
  }

  static async getAllCoupons(req: Request, res: Response) {
    try {
      const coupons = await CouponService.getAllCoupons();
      return res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch coupons',
      });
    }
  }

  static async getActiveCoupons(req: Request, res: Response) {
    try {
      const coupons = await CouponService.getActiveCoupons();
      return res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch active coupons',
      });
    }
  }

  static async toggleCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const updated = await CouponService.toggleCouponStatus(id, isActive);
      return res.status(200).json({
        success: true,
        message: 'Coupon status updated',
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle coupon status',
      });
    }
  }

  static async deleteCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await CouponService.deleteCoupon(id);
      return res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete coupon',
      });
    }
  }

  static async applyCoupon(req: Request, res: Response) {
    try {
      const result = await CouponService.applyCoupon(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to apply coupon',
      });
    }
  }
}
