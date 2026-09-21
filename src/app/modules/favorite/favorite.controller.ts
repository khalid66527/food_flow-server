import { Request, Response } from 'express';
import { FavoriteService } from './favorite.service';

export class FavoriteController {
  /**
   * POST /api/favorites/toggle
   */
  static async toggleFavorite(req: Request, res: Response): Promise<void> {
    try {
      const { foodId } = req.body;
      const user = (req as any).user;
      const userId = user?.id || user?.userId || req.body.userId;
      const userEmail = user?.email || req.body.userEmail;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required. Please login to save favorites.',
        });
        return;
      }

      if (!foodId) {
        res.status(400).json({
          success: false,
          message: 'Food ID is required.',
        });
        return;
      }

      const result = await FavoriteService.toggleFavorite(userId, userEmail, foodId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to toggle favorite.',
      });
    }
  }

  /**
   * GET /api/favorites/user/:userId
   */
  static async getUserFavorites(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = (req as any).user;
      const activeUserId = userId || user?.id || user?.userId;
      const userEmail = user?.email || (req.query.email as string);

      if (!activeUserId && !userEmail) {
        res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
        return;
      }

      const favorites = await FavoriteService.getUserFavorites(activeUserId, userEmail);

      res.status(200).json({
        success: true,
        message: 'Favorites retrieved successfully.',
        data: favorites,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to retrieve favorites.',
      });
    }
  }

  /**
   * GET /api/favorites/check/:userId/:foodId
   */
  static async checkIsFavorite(req: Request, res: Response): Promise<void> {
    try {
      const { userId, foodId } = req.params;

      if (!userId || !foodId) {
        res.status(400).json({
          success: false,
          message: 'User ID and Food ID are required.',
        });
        return;
      }

      const status = await FavoriteService.checkIsFavorite(userId, foodId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to check favorite status.',
      });
    }
  }

  /**
   * DELETE /api/favorites/:userId/:foodId
   */
  static async removeFavorite(req: Request, res: Response): Promise<void> {
    try {
      const { userId, foodId } = req.params;
      const user = (req as any).user;
      const activeUserId = userId || user?.id || user?.userId;

      if (!activeUserId || !foodId) {
        res.status(400).json({
          success: false,
          message: 'User ID and Food ID are required.',
        });
        return;
      }

      const result = await FavoriteService.removeFavorite(activeUserId, foodId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to remove favorite.',
      });
    }
  }
}
