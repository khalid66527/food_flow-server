import { ObjectId } from 'mongodb';
import { notificationCollection } from '../../config/db';

export type TNotificationType = 'order_update' | 'delivery' | 'payment' | 'system';

export interface TNotification {
  _id?: ObjectId | string;
  userId: string;
  type: TNotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

const getNotifications = async (
  userId: string,
  page = 1,
  limit = 20
): Promise<{ notifications: TNotification[]; total: number; unreadCount: number }> => {
  const query = { userId };
  const total = await notificationCollection.countDocuments(query);
  const unreadCount = await notificationCollection.countDocuments({ ...query, isRead: false });

  const notifications = await notificationCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return { notifications: notifications as TNotification[], total, unreadCount };
};

const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  await notificationCollection.updateOne(
    { _id: new ObjectId(notificationId), userId },
    { $set: { isRead: true } }
  );
};

const markAllAsRead = async (userId: string): Promise<void> => {
  await notificationCollection.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
};

const createNotification = async (data: Omit<TNotification, '_id' | 'createdAt'>): Promise<TNotification> => {
  const notification: TNotification = {
    ...data,
    isRead: false,
    createdAt: new Date(),
  };

  const result = await notificationCollection.insertOne(notification as any);
  notification._id = result.insertedId;
  return notification;
};

export const NotificationService = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
