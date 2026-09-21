import { ObjectId } from 'mongodb';
import { favoritesCollection, foodCollection, restaurantCollection } from '../../config/db';
import { TFavorite } from './favorite.interface';

export class FavoriteService {
  /**
   * Toggle a food item in user's favorites
   */
  static async toggleFavorite(userId: string, userEmail: string | undefined, foodId: string) {
    if (!userId || !foodId) {
      throw new Error('User ID and Food ID are required.');
    }

    const cleanUserId = String(userId).trim();
    const cleanFoodId = String(foodId).trim();

    // Look for existing favorite
    const existing = await favoritesCollection.findOne({
      userId: cleanUserId,
      foodId: cleanFoodId,
    });

    if (existing) {
      // Remove from favorites
      await favoritesCollection.deleteOne({ _id: existing._id });
      return {
        isFavorite: false,
        message: 'Removed from favorites',
        foodId: cleanFoodId,
      };
    }

    // Fetch food details to ensure valid food
    let foodQuery: any = { _id: cleanFoodId };
    if (ObjectId.isValid(cleanFoodId)) {
      foodQuery = { $or: [{ _id: new ObjectId(cleanFoodId) }, { _id: cleanFoodId }] };
    }
    const foodDoc = await foodCollection.findOne(foodQuery);

    if (!foodDoc) {
      throw new Error('Food item not found.');
    }

    const newFavorite: TFavorite = {
      userId: cleanUserId,
      userEmail: userEmail ? String(userEmail).trim().toLowerCase() : undefined,
      foodId: cleanFoodId,
      foodDetails: {
        name: foodDoc.name,
        price: foodDoc.price,
        discountPrice: foodDoc.discountPrice,
        image: Array.isArray(foodDoc.images) ? foodDoc.images[0] : (foodDoc.image || ''),
        category: foodDoc.category,
        restaurantId: foodDoc.restaurantId,
        restaurantName: foodDoc.restaurantName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await favoritesCollection.insertOne(newFavorite as any);

    return {
      isFavorite: true,
      message: 'Added to favorites',
      foodId: cleanFoodId,
      favorite: { ...newFavorite, _id: result.insertedId.toString() },
    };
  }

  /**
   * Get all favorite foods for a specific user
   */
  static async getUserFavorites(userId: string, userEmail?: string) {
    if (!userId && !userEmail) {
      throw new Error('User ID or Email is required.');
    }

    const orClauses: any[] = [];
    if (userId) orClauses.push({ userId: String(userId).trim() });
    if (userEmail) orClauses.push({ userEmail: String(userEmail).trim().toLowerCase() });

    const rawFavorites = await favoritesCollection
      .find({ $or: orClauses })
      .sort({ createdAt: -1 })
      .toArray();

    if (rawFavorites.length === 0) {
      return [];
    }

    // Extract foodIds to fetch current live food details
    const foodIds = rawFavorites.map((f) => f.foodId).filter(Boolean);
    const validObjectIds = foodIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

    const liveFoods = await foodCollection
      .find({
        $or: [{ _id: { $in: validObjectIds } }, { _id: { $in: foodIds } }],
      })
      .toArray();

    const liveFoodMap = new Map<string, any>();
    liveFoods.forEach((food) => {
      liveFoodMap.set(food._id.toString(), food);
    });

    // Merge live food data with favorite record
    const formatted = rawFavorites.map((fav) => {
      const liveFood = liveFoodMap.get(fav.foodId) || {};
      const primaryImage =
        (Array.isArray(liveFood.images) && liveFood.images[0]) ||
        liveFood.image ||
        fav.foodDetails?.image ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

      return {
        _id: fav._id.toString(),
        favoriteId: fav._id.toString(),
        foodId: fav.foodId,
        userId: fav.userId,
        createdAt: fav.createdAt,
        name: liveFood.name || fav.foodDetails?.name || 'Delicious Dish',
        description: liveFood.description || '',
        price: Number(liveFood.price ?? fav.foodDetails?.price ?? 0),
        discountPrice: liveFood.discountPrice !== undefined ? Number(liveFood.discountPrice) : fav.foodDetails?.discountPrice,
        image: primaryImage,
        images: Array.isArray(liveFood.images) && liveFood.images.length > 0 ? liveFood.images : [primaryImage],
        category: liveFood.category || fav.foodDetails?.category || 'General',
        restaurantId: liveFood.restaurantId || fav.foodDetails?.restaurantId || '',
        restaurantName: liveFood.restaurantName || fav.foodDetails?.restaurantName || 'Food Flow Restaurant',
        rating: Number(liveFood.rating ?? 4.5),
        isAvailable: liveFood.isAvailable !== false,
        status: liveFood.status || 'available',
        prepTime: liveFood.prepTime || '20-30 mins',
      };
    });

    return formatted;
  }

  /**
   * Check if a specific food item is in user's favorites
   */
  static async checkIsFavorite(userId: string, foodId: string) {
    if (!userId || !foodId) {
      return { isFavorite: false };
    }

    const cleanUserId = String(userId).trim();
    const cleanFoodId = String(foodId).trim();

    const existing = await favoritesCollection.findOne({
      userId: cleanUserId,
      foodId: cleanFoodId,
    });

    return {
      isFavorite: !!existing,
      favoriteId: existing?._id?.toString() || null,
    };
  }

  /**
   * Remove a favorite food directly
   */
  static async removeFavorite(userId: string, foodId: string) {
    if (!userId || !foodId) {
      throw new Error('User ID and Food ID are required.');
    }

    const cleanUserId = String(userId).trim();
    const cleanFoodId = String(foodId).trim();

    const result = await favoritesCollection.deleteOne({
      userId: cleanUserId,
      foodId: cleanFoodId,
    });

    return {
      success: result.deletedCount > 0,
      message: result.deletedCount > 0 ? 'Removed from favorites' : 'Favorite not found',
      foodId: cleanFoodId,
    };
  }
}
