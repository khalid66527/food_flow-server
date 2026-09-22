import { Request, Response } from 'express';
import { ReviewService } from './review.service';

export class ReviewController {
  static async createBatchReviews(req: Request, res: Response) {
    try {
      const payload = req.body;
      const result = await ReviewService.createBatchReviews(payload);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error creating batch reviews:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit reviews.',
      });
    }
  }

  static async getRiderReviews(req: Request, res: Response) {
    try {
      const { riderId } = req.params;
      const result = await ReviewService.getRiderReviews(riderId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching rider reviews:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch rider reviews.',
      });
    }
  }

  static async getRestaurantReviews(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const result = await ReviewService.getRestaurantReviews(restaurantId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching restaurant reviews:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch restaurant reviews.',
      });
    }
  }

  static async getFoodReviews(req: Request, res: Response) {
    try {
      const { foodId } = req.params;
      const result = await ReviewService.getFoodReviews(foodId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching food reviews:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch food reviews.',
      });
    }
  }

  static async getOrderReviewStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const result = await ReviewService.getOrderReviewStatus(orderId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching order review status:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch order review status.',
      });
    }
  }

  static async getAllReviewsForAdmin(req: Request, res: Response) {
    try {
      const { targetType, minRating, search } = req.query;
      const result = await ReviewService.getAllReviewsForAdmin(
        targetType as string,
        minRating ? Number(minRating) : undefined,
        search as string
      );
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching admin reviews:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch admin reviews.',
      });
    }
  }

  static async toggleReviewFeatured(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body || {};
      const result = await ReviewService.toggleReviewFeatured(id, isFeatured);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error toggling review featured status:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update review featured status.',
      });
    }
  }

  static async getFeaturedTestimonials(req: Request, res: Response) {
    try {
      const { starFilter } = req.query;
      const result = await ReviewService.getFeaturedTestimonials(starFilter as string);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching featured testimonials:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch testimonials.',
      });
    }
  }
}
