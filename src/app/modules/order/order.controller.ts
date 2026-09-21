import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { getIO } from '../../sockets/socket';
import { emitOrderStatusUpdated, emitLocationUpdated } from '../../sockets/orderTracking.socket';

export class OrderController {
  static async createOrder(req: Request, res: Response) {
    try {
      const userId = (req.headers['x-user-id'] as string) || req.body.userId;
      const userEmail = (req.headers['x-user-email'] as string) || req.body.userEmail;

      if (!userId || !userEmail) {
        return res.status(401).json({
          success: false,
          message: 'User authentication credentials missing.',
        });
      }

      const orderData = await OrderService.createOrder(req.body, userId, userEmail);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        orderId: orderData.orderId,
        redirectUrl: `/order-tracking/${orderData.orderId}`,
        data: orderData.order,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create order.',
      });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch order.',
      });
    }
  }

  static async getUserOrders(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      const orders = await OrderService.getUserOrders(userId);

      return res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user orders.',
      });
    }
  }

  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedOrder = await OrderService.updateOrderStatus(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully.',
        data: updatedOrder,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update order.',
      });
    }
  }

  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorRole = req.authedUser?.role;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'status is required.',
        });
      }

      const updatedOrder = await OrderService.advanceOrderStatus(id, status, actorRole || '');

      // Broadcast real-time status update to order tracking room
      emitOrderStatusUpdated(getIO(), id, status);

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully.',
        data: updatedOrder,
      });
    } catch (error: any) {
      const isClientError = /Invalid order status|Status cannot move|Order not found/i.test(
        error.message || ''
      );
      return res.status(isClientError ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update order status.',
      });
    }
  }

  static async updateRiderLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;

      const updatedOrder = await OrderService.updateRiderLocation(id, lat, lng);

      // Broadcast real-time location update to order tracking room
      emitLocationUpdated(
        getIO(),
        id,
        lat,
        lng,
        updatedOrder?.riderLocation?.updatedAt || null
      );

      return res.status(200).json({
        success: true,
        message: 'Rider location updated successfully.',
        data: updatedOrder,
      });
    } catch (error: any) {
      const isClientError = /required|Order not found/i.test(error.message || '');
      return res.status(isClientError ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update rider location.',
      });
    }
  }
}
