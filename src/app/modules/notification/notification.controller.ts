import { Request, Response } from 'express';
import { NotificationService } from './notification.service';

const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await NotificationService.getNotifications(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: { total: result.total, page, totalPages: Math.ceil(result.total / limit) },
      unreadCount: result.unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notifications' });
  }
};

const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    await NotificationService.markAsRead(id, userId!);

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update notification' });
  }
};

const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await NotificationService.markAllAsRead(userId!);

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update notifications' });
  }
};

export const NotificationController = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
