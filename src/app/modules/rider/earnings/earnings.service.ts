import { deliveryCollection, riderCollection } from '../../../config/db';

const getRiderStats = async (riderId: string) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Today's deliveries
  const todayDeliveries = await deliveryCollection.countDocuments({
    riderId,
    status: 'delivered',
    deliveredAt: { $gte: todayStart },
  });

  // Today's earnings
  const todayEarningsResult = await deliveryCollection
    .aggregate([
      {
        $match: {
          riderId,
          status: 'delivered',
          deliveredAt: { $gte: todayStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$deliveryFee' } } },
    ])
    .toArray();

  const todayEarnings = todayEarningsResult[0]?.total || 0;

  // Find rider email from delivery records for profile lookup
  const recentDelivery = await deliveryCollection.findOne({ riderId });
  const riderEmail = recentDelivery?.riderEmail || '';

  // Rider profile for overall stats
  const riderProfile = await riderCollection.findOne({
    $or: [
      { userId: riderId },
      { email: riderId },
      ...(riderEmail ? [{ email: riderEmail }] : []),
    ],
  });

  return {
    todayDeliveries,
    todayEarnings,
    totalDeliveries: riderProfile?.totalDeliveries || 0,
    totalEarnings: riderProfile?.totalEarnings || 0,
    rating: riderProfile?.rating || 5.0,
    isAvailable: riderProfile?.isAvailable || false,
  };
};

const getEarningsByPeriod = async (
  riderId: string,
  period: 'today' | 'week' | 'month' = 'today'
) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const result = await deliveryCollection
    .aggregate([
      {
        $match: {
          riderId,
          status: 'delivered',
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$deliveryFee' },
          totalDeliveries: { $sum: 1 },
          avgDeliveryFee: { $avg: '$deliveryFee' },
        },
      },
    ])
    .toArray();

  return {
    period,
    totalEarnings: result[0]?.totalEarnings || 0,
    totalDeliveries: result[0]?.totalDeliveries || 0,
    avgDeliveryFee: Math.round(result[0]?.avgDeliveryFee || 0),
  };
};

const getEarningsChart = async (
  riderId: string,
  period: 'week' | 'month' = 'week'
) => {
  const now = new Date();
  const days = period === 'week' ? 7 : 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const chartData = await deliveryCollection
    .aggregate([
      {
        $match: {
          riderId,
          status: 'delivered',
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' },
          },
          earnings: { $sum: '$deliveryFee' },
          deliveries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return chartData.map((item: any) => ({
    date: item._id,
    earnings: item.earnings,
    deliveries: item.deliveries,
  }));
};

export const EarningsService = {
  getRiderStats,
  getEarningsByPeriod,
  getEarningsChart,
};
