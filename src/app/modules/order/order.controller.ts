import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { TOrderStatus } from './order.interface';

const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await OrderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  }
};

const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch order' });
  }
};

const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.userId || (req.query.customerId as string);
    const status = req.query.status as TOrderStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await OrderService.getCustomerOrders(customerId, status, page, limit);

    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
};

const getRestaurantOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const status = req.query.status as TOrderStatus | undefined;

    const orders = await OrderService.getRestaurantOrders(restaurantId, status);

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch orders' });
  }
};

const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;

    const order = await OrderService.updateOrderStatus(orderId, status, userId);

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'`,
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update order' });
  }
};

const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId || '';

    const order = await OrderService.cancelOrder(orderId, userId);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to cancel order' });
  }
};

export const OrderController = {
  createOrder,
  getOrderById,
  getCustomerOrders,
  getRestaurantOrders,
  updateOrderStatus,
  cancelOrder,
};
