import { reviewCollection, ordersCollection, riderCollection, restaurantCollection, foodCollection } from '../../config/db';
import { ObjectId } from 'mongodb';
import { IBatchReviewPayload, IReview } from './review.interface';

export class ReviewService {
  /**
   * Submit a batch of reviews for an order (rider, restaurant, food items)
   */
  static async createBatchReviews(payload: IBatchReviewPayload) {
    const { orderId, userId, userName, userEmail, userImage, reviews } = payload;

    if (!orderId || !userId || !Array.isArray(reviews) || reviews.length === 0) {
      throw new Error('Order ID, User ID, and at least one review are required.');
    }

    const queryConditions: any[] = [{ orderId }];
    if (ObjectId.isValid(orderId)) {
      queryConditions.push({ _id: new ObjectId(orderId) });
    }

    const orderDoc = await ordersCollection.findOne({ $or: queryConditions });
    if (!orderDoc) {
      throw new Error(`Order not found for ID: ${orderId}`);
    }

    const now = new Date().toISOString();
    const insertedReviews: IReview[] = [];

    for (const r of reviews) {
      if (!r.targetType || !r.targetId || !r.rating) continue;
      const numericRating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      
      const doc: IReview = {
        orderId: orderDoc.orderId || orderId,
        userId,
        userName: userName || orderDoc.userName || 'Customer',
        userEmail: userEmail || orderDoc.userEmail || '',
        userImage: userImage || '',
        targetType: r.targetType,
        targetId: r.targetId,
        targetName: r.targetName || '',
        rating: numericRating,
        comment: (r.comment || '').trim(),
        createdAt: now,
        updatedAt: now,
      };

      // Upsert review (prevent duplicate review per user for the same target item)
      await reviewCollection.updateOne(
        { userId: doc.userId, targetType: doc.targetType, targetId: doc.targetId },
        {
          $set: {
            orderId: doc.orderId,
            userName: doc.userName,
            userEmail: doc.userEmail,
            userImage: doc.userImage,
            targetName: doc.targetName,
            rating: doc.rating,
            comment: doc.comment,
            updatedAt: now,
          },
          $setOnInsert: {
            userId: doc.userId,
            targetType: doc.targetType,
            targetId: doc.targetId,
            createdAt: now,
          },
        },
        { upsert: true }
      );

      insertedReviews.push(doc);

      // Asynchronously update aggregated average ratings on target collections
      this.recalculateTargetRating(r.targetType, r.targetId).catch((err) =>
        console.warn(`Error updating target rating for ${r.targetType} ${r.targetId}:`, err)
      );
    }

    // Mark order as reviewed
    await ordersCollection.updateOne(
      { $or: queryConditions },
      { $set: { isReviewed: true, reviewedAt: now } }
    );

    return {
      success: true,
      message: 'Reviews submitted successfully!',
      count: insertedReviews.length,
      data: insertedReviews,
    };
  }

  /**
   * Recalculate average rating & rating count for target (rider, restaurant, food)
   */
  private static async recalculateTargetRating(targetType: 'rider' | 'restaurant' | 'food', targetId: string) {
    if (!targetId) return;

    const pipeline = [
      { $match: { targetType, targetId } },
      {
        $group: {
          _id: '$targetId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ];

    const result = await reviewCollection.aggregate(pipeline).toArray();
    if (result.length > 0) {
      const avgRating = Math.round(result[0].avgRating * 10) / 10;
      const totalReviews = result[0].totalReviews;

      const updateData = { rating: avgRating, reviewCount: totalReviews, updatedAt: new Date().toISOString() };
      const queryConditions: any[] = [{ id: targetId }, { _id: targetId }];
      if (ObjectId.isValid(targetId)) {
        queryConditions.push({ _id: new ObjectId(targetId) });
      }

      if (targetType === 'food') {
        await foodCollection.updateOne({ $or: queryConditions }, { $set: updateData });
      } else if (targetType === 'restaurant') {
        await restaurantCollection.updateOne({ $or: queryConditions }, { $set: updateData });
      } else if (targetType === 'rider') {
        await riderCollection.updateOne({ $or: queryConditions }, { $set: updateData });
      }
    }
  }

  /**
   * Get reviews for a Rider with summary metrics
   */
  static async getRiderReviews(riderId: string) {
    const reviews = await reviewCollection
      .find({ targetType: 'rider', targetId: riderId })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    let avgRating = 0;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
        ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    return {
      riderId,
      avgRating,
      totalReviews,
      ratingBreakdown,
      reviews,
    };
  }

  /**
   * Get reviews for a Restaurant (overall + food item reviews)
   */
  static async getRestaurantReviews(restaurantId: string) {
    // Direct restaurant reviews
    const restaurantReviews = await reviewCollection
      .find({ targetType: 'restaurant', targetId: restaurantId })
      .sort({ createdAt: -1 })
      .toArray();

    // Food items belonging to this restaurant (to fetch item reviews too if requested)
    const foodItems = await foodCollection
      .find({ $or: [{ restaurantId }, { 'restaurant._id': restaurantId }] })
      .toArray();
    
    const foodIds = foodItems.map((item) => item._id.toString()).concat(foodItems.map((item) => item.id).filter(Boolean));

    const foodReviews = await reviewCollection
      .find({ targetType: 'food', targetId: { $in: foodIds } })
      .sort({ createdAt: -1 })
      .toArray();

    const totalRestaurantReviews = restaurantReviews.length;
    let avgRating = 0;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalRestaurantReviews > 0) {
      const sum = restaurantReviews.reduce((acc, r) => {
        const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
        ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Math.round((sum / totalRestaurantReviews) * 10) / 10;
    }

    return {
      restaurantId,
      avgRating,
      totalReviews: totalRestaurantReviews,
      ratingBreakdown,
      reviews: restaurantReviews,
      foodReviews,
    };
  }

  /**
   * Get reviews for a specific Food item
   */
  static async getFoodReviews(foodId: string) {
    const queryConditions: any[] = [{ targetId: foodId }];
    if (ObjectId.isValid(foodId)) {
      queryConditions.push({ targetId: foodId });
    }

    const reviews = await reviewCollection
      .find({ targetType: 'food', $or: queryConditions })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    let avgRating = 0;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
        ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
        return acc + r.rating;
      }, 0);
      avgRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    return {
      foodId,
      avgRating,
      totalReviews,
      ratingBreakdown,
      reviews,
    };
  }

  /**
   * Get review status for an order
   */
  static async getOrderReviewStatus(orderId: string) {
    const reviews = await reviewCollection
      .find({ orderId })
      .toArray();

    return {
      orderId,
      isReviewed: reviews.length > 0,
      reviews,
    };
  }

  /**
   * Get All Reviews for Admin Panel with filters & platform summary stats
   */
  static async getAllReviewsForAdmin(targetType?: string, minRating?: number, search?: string) {
    const query: any = {};

    if (targetType && targetType.toLowerCase() !== 'all') {
      query.targetType = targetType.toLowerCase();
    }

    if (minRating && Number(minRating) > 0) {
      query.rating = { $gte: Number(minRating) };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { targetName: searchRegex },
        { comment: searchRegex },
        { orderId: searchRegex },
      ];
    }

    const allReviews = await reviewCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = allReviews.length;
    const riderReviews = allReviews.filter((r) => r.targetType === 'rider');
    const restaurantReviews = allReviews.filter((r) => r.targetType === 'restaurant');
    const foodReviews = allReviews.filter((r) => r.targetType === 'food');

    const calcAvg = (items: any[]) =>
      items.length > 0
        ? Math.round((items.reduce((acc, i) => acc + (i.rating || 5), 0) / items.length) * 10) / 10
        : 0;

    const avgRating = calcAvg(allReviews);
    const avgRiderRating = calcAvg(riderReviews);
    const avgRestaurantRating = calcAvg(restaurantReviews);

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      ratingBreakdown[star as keyof typeof ratingBreakdown] =
        (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
    });

    return {
      totalReviews,
      avgRating,
      avgRiderRating,
      avgRestaurantRating,
      totalRiderReviews: riderReviews.length,
      totalRestaurantReviews: restaurantReviews.length,
      totalFoodReviews: foodReviews.length,
      ratingBreakdown,
      reviews: allReviews,
    };
  }

  /**
   * Toggle or set isFeatured status for a review
   */
  static async toggleReviewFeatured(reviewId: string, isFeatured?: boolean) {
    const queryConditions: any[] = [{ _id: reviewId }];
    if (ObjectId.isValid(reviewId)) {
      queryConditions.push({ _id: new ObjectId(reviewId) });
    }

    const reviewDoc = await reviewCollection.findOne({ $or: queryConditions });
    if (!reviewDoc) {
      throw new Error(`Review not found for ID: ${reviewId}`);
    }

    const nextFeatured = typeof isFeatured === 'boolean' ? isFeatured : !reviewDoc.isFeatured;

    await reviewCollection.updateOne(
      { $or: queryConditions },
      { $set: { isFeatured: nextFeatured, updatedAt: new Date().toISOString() } }
    );

    return {
      success: true,
      reviewId,
      isFeatured: nextFeatured,
      message: nextFeatured ? 'Review marked as featured on homepage!' : 'Review unfeatured.',
    };
  }

  /**
   * Get Featured & Approved Testimonials for Public Homepage with optional rating star filtering
   */
  static async getFeaturedTestimonials(starFilter?: string | number) {
    const query: any = { isFeatured: true };

    if (starFilter && starFilter !== 'all' && Number(starFilter) > 0) {
      query.rating = Number(starFilter);
    }

    let reviews = await reviewCollection.find(query).sort({ createdAt: -1 }).toArray();

    // Fallback: If no reviews have been explicitly featured by Admin yet, fetch top rated (4-5 star) reviews
    if (reviews.length === 0) {
      const fallbackQuery: any = {};
      if (starFilter && starFilter !== "all" && Number(starFilter) > 0) {
        fallbackQuery.rating = Number(starFilter);
      } else {
        fallbackQuery.rating = { $gte: 4 };
      }
      reviews = await reviewCollection.find(fallbackQuery).sort({ createdAt: -1 }).limit(10).toArray();
    }
    const totalReviews = await reviewCollection.countDocuments({}).catch(() => 0);

    let avgRating = 4.8;
    try {
      const ratingPipeline = [
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ];
      const ratingResult = await reviewCollection.aggregate(ratingPipeline).toArray();
      if (ratingResult.length > 0 && ratingResult[0].avgRating > 0) {
        avgRating = Math.round(ratingResult[0].avgRating * 10) / 10;
      }
    } catch (e) {
      console.warn('Error computing avg rating in review service:', e);
    }

    return {
      reviews,
      avgRating,
      happyCustomers: totalReviews,
      totalReviews,
      count: reviews.length,
    };
  }
}

