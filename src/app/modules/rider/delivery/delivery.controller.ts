import { Request, Response } from 'express';
import { DeliveryService } from './delivery.service';

const getAvailableDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = req.query.city as string | undefined;
    const deliveries = await DeliveryService.getAvailableDeliveries(city);

    res.status(200).json({
      success: true,
      data: deliveries,
      count: deliveries.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch available deliveries',
    });
  }
};

const acceptDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.userId;
    const { riderName, riderPhone, riderEmail } = req.body;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const delivery = await DeliveryService.acceptDelivery(
      orderId,
      riderId,
      riderName || '',
      riderPhone || '',
      riderEmail || req.user?.email || ''
    );

    res.status(200).json({
      success: true,
      message: 'Delivery accepted successfully!',
      data: delivery,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to accept delivery',
    });
  }
};

const pickupOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.userId;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const delivery = await DeliveryService.pickupOrder(orderId, riderId);

    res.status(200).json({
      success: true,
      message: 'Order picked up successfully!',
      data: delivery,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to pickup order',
    });
  }
};

const updateRiderLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.userId;
    const { lat, lng } = req.body;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    await DeliveryService.updateRiderLocation(orderId, riderId, lat, lng);

    res.status(200).json({
      success: true,
      message: 'Location updated',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update location',
    });
  }
};

const markOnTheWay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.userId;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const delivery = await DeliveryService.markOnTheWay(orderId, riderId);

    res.status(200).json({
      success: true,
      message: 'On the way!',
      data: delivery,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update status',
    });
  }
};

const markDelivered = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.userId;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const delivery = await DeliveryService.markDelivered(orderId, riderId);

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully!',
      data: delivery,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark as delivered',
    });
  }
};

const getActiveDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = req.user?.userId;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const delivery = await DeliveryService.getActiveDelivery(riderId);

    res.status(200).json({
      success: true,
      data: delivery || null,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch active delivery',
    });
  }
};

const getRiderDeliveryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = req.user?.userId;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const result = await DeliveryService.getRiderDeliveryHistory(riderId, from, to, page, limit);

    res.status(200).json({
      success: true,
      data: result.deliveries,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch delivery history',
    });
  }
};

const createDeliveryForOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const delivery = await DeliveryService.createDeliveryForOrder(orderId);

    res.status(201).json({
      success: true,
      message: 'Delivery created for order',
      data: delivery,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create delivery',
    });
  }
};

export const DeliveryController = {
  getAvailableDeliveries,
  acceptDelivery,
  pickupOrder,
  updateRiderLocation,
  markOnTheWay,
  markDelivered,
  getActiveDelivery,
  getRiderDeliveryHistory,
  createDeliveryForOrder,
};
