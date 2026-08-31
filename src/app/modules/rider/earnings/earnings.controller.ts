import { Request, Response } from 'express';
import { EarningsService } from './earnings.service';

const getRiderStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = req.user?.userId;
    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const stats = await EarningsService.getRiderStats(riderId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stats',
    });
  }
};

const getEarningsByPeriod = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = req.user?.userId;
    const period = (req.query.period as 'today' | 'week' | 'month') || 'today';

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const earnings = await EarningsService.getEarningsByPeriod(riderId, period);

    res.status(200).json({
      success: true,
      data: earnings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch earnings',
    });
  }
};

const getEarningsChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = req.user?.userId;
    const period = (req.query.period as 'week' | 'month') || 'week';

    if (!riderId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const chart = await EarningsService.getEarningsChart(riderId, period);

    res.status(200).json({
      success: true,
      data: chart,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch chart data',
    });
  }
};

export const EarningsController = {
  getRiderStats,
  getEarningsByPeriod,
  getEarningsChart,
};
