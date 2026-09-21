import { restaurantCollection, riderCollection, ordersCollection, successOrdersCollection, reviewCollection, usersCollection } from '../../config/db';

export interface IPublicStats {
  partnerRestaurants: number;
  successfulOrders: number;
  activeRiders: number;
  happyCustomers: number;
  avgRating: number;
  totalReviews: number;
}

export class StatsService {
  /**
   * 1. Total Partner Restaurants Count
   */
  static async getRestaurantsCount(): Promise<{ count: number }> {
    const [restaurantDocCount, userRestaurantCount] = await Promise.all([
      restaurantCollection.countDocuments({ status: { $ne: 'rejected' } }).catch(() => 0),
      usersCollection.countDocuments({ role: { $regex: /^(restaurant|vendor)/i } }).catch(() => 0),
    ]);
    const count = Math.max(restaurantDocCount, userRestaurantCount);
    return { count };
  }

  /**
   * 2. Successful Orders Delivered Count
   */
  static async getOrdersDeliveredCount(): Promise<{ count: number }> {
    const [ordersDeliveredCount, successOrdersCount] = await Promise.all([
      ordersCollection.countDocuments({
        $or: [
          { orderStatus: { $regex: /^delivered$/i } },
          { deliveryStatus: { $regex: /^delivered$/i } },
        ],
      }).catch(() => 0),
      successOrdersCollection.countDocuments().catch(() => 0),
    ]);
    const count = Math.max(ordersDeliveredCount, successOrdersCount);
    return { count };
  }

  /**
   * 3. Active Riders Count
   */
  static async getRidersCount(): Promise<{ count: number }> {
    const [riderDocCount, userRiderCount] = await Promise.all([
      riderCollection.countDocuments({ status: { $ne: 'rejected' } }).catch(() => 0),
      usersCollection.countDocuments({ role: { $regex: /^(rider|driver|delivery)/i } }).catch(() => 0),
    ]);
    const count = Math.max(riderDocCount, userRiderCount);
    return { count };
  }

  /**
   * 4. Happy Customers Count (Total review entries submitted in reviews collection)
   */
  static async getHappyCustomersCount(): Promise<{ count: number }> {
    const totalReviewSubmissions = await reviewCollection.countDocuments({}).catch(() => 0);

    let count = totalReviewSubmissions;
    if (count === 0) {
      // Fallback if review collection is empty in fresh DB
      const [orderUsers, registeredUsers] = await Promise.all([
        ordersCollection.countDocuments({
          $or: [
            { orderStatus: { $regex: /^delivered$/i } },
            { deliveryStatus: { $regex: /^delivered$/i } },
          ],
        }).catch(() => 0),
        usersCollection.countDocuments().catch(() => 0),
      ]);
      count = Math.max(orderUsers, registeredUsers);
    }
    return { count };
  }

  /**
   * Aggregate dynamic database metrics for homepage and public counters
   */
  static async getPublicStats(): Promise<IPublicStats> {
    const [restaurantsRes, ordersRes, ridersRes, happyCustomersRes] = await Promise.all([
      this.getRestaurantsCount(),
      this.getOrdersDeliveredCount(),
      this.getRidersCount(),
      this.getHappyCustomersCount(),
    ]);

    // Average Customer Rating & Total Reviews Count
    let avgRating = 4.8;
    let totalReviews = 0;
    try {
      const ratingPipeline = [
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ];
      const ratingResult = await reviewCollection.aggregate(ratingPipeline).toArray();
      if (ratingResult.length > 0 && ratingResult[0].totalReviews > 0) {
        avgRating = Math.round(ratingResult[0].avgRating * 10) / 10;
        totalReviews = ratingResult[0].totalReviews;
      }
    } catch (e) {
      console.warn('Error computing avg rating:', e);
    }

    return {
      partnerRestaurants: restaurantsRes.count,
      successfulOrders: ordersRes.count,
      activeRiders: ridersRes.count,
      happyCustomers: happyCustomersRes.count,
      avgRating,
      totalReviews,
    };
  }
}
