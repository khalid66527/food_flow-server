import { Request, Response } from 'express';
import { StatsService } from './stats.service';

export class StatsController {
  static async getPublicStats(req: Request, res: Response) {
    try {
      const stats = await StatsService.getPublicStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching public stats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch platform statistics.',
      });
    }
  }

  static async getRestaurantsCount(req: Request, res: Response) {
    try {
      const result = await StatsService.getRestaurantsCount();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching restaurants count:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch restaurants count.',
      });
    }
  }

  static async getOrdersDeliveredCount(req: Request, res: Response) {
    try {
      const result = await StatsService.getOrdersDeliveredCount();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching orders delivered count:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch orders delivered count.',
      });
    }
  }

  static async getRidersCount(req: Request, res: Response) {
    try {
      const result = await StatsService.getRidersCount();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching riders count:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch riders count.',
      });
    }
  }

  static async getHappyCustomersCount(req: Request, res: Response) {
    try {
      const result = await StatsService.getHappyCustomersCount();
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching happy customers count:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch happy customers count.',
      });
    }
  }
}
