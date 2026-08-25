import { ObjectId } from 'mongodb';
import { TFoodQueryParams } from './food.interface';

/**
 * Build MongoDB Query Filter Object for global food items
 */
export const buildFoodMongoQuery = (
  queryParams: TFoodQueryParams
): Record<string, any> => {
  const {
    search,
    category,
    restaurantId,
    isVegetarian,
    isSpicy,
    status,
    minPrice,
    maxPrice,
  } = queryParams;

  const queryFilters: Record<string, any>[] = [];

  // Search keyword (matches name, description, tags, category)
  const searchKeyword = (search || '').trim();
  if (searchKeyword) {
    const searchRegex = new RegExp(searchKeyword, 'i');
    queryFilters.push({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: { $elemMatch: { $regex: searchKeyword, $options: 'i' } } },
      ],
    });
  }

  // Category filter
  const activeCategory = (category || '').trim();
  if (activeCategory && activeCategory.toLowerCase() !== 'all') {
    const categoryRegex = new RegExp(activeCategory, 'i');
    queryFilters.push({ category: categoryRegex });
  }

  // Specific Restaurant ID
  if (restaurantId && restaurantId.toLowerCase() !== 'all') {
    if (ObjectId.isValid(restaurantId)) {
      queryFilters.push({
        $or: [{ restaurantId }, { restaurantId: new ObjectId(restaurantId) }],
      });
    } else {
      queryFilters.push({ restaurantId });
    }
  }

  // Vegetarian filter
  if (isVegetarian === true || isVegetarian === 'true' || isVegetarian === '1') {
    queryFilters.push({ isVegetarian: true });
  }

  // Spicy filter
  if (isSpicy === true || isSpicy === 'true' || isSpicy === '1') {
    queryFilters.push({ isSpicy: true });
  }

  // Status filter (default to available)
  const activeStatus = (status || '').trim();
  if (activeStatus) {
    queryFilters.push({ status: activeStatus });
  } else {
    queryFilters.push({ status: 'available' });
  }

  // Price range filters
  if (minPrice && Number(minPrice) > 0) {
    queryFilters.push({ price: { $gte: Number(minPrice) } });
  }
  if (maxPrice && Number(maxPrice) > 0) {
    queryFilters.push({ price: { $lte: Number(maxPrice) } });
  }

  if (queryFilters.length === 0) {
    return {};
  }
  if (queryFilters.length === 1) {
    return queryFilters[0];
  }
  return { $and: queryFilters };
};

/**
 * Build MongoDB Sort Object for food items
 */
export const buildFoodSortOptions = (
  sortBy?: string
): Record<string, 1 | -1> => {
  switch (sortBy) {
    case 'price_asc':
      return { price: 1 };
    case 'price_desc':
      return { price: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'relevance':
    default:
      return { createdAt: -1 };
  }
};

/**
 * Normalize a raw MongoDB food document into IGlobalFoodItem shape
 */
export const normalizeFoodDoc = (doc: any): Record<string, any> => {
  if (!doc) return doc;

  const idStr = doc._id ? doc._id.toString() : doc.id || '';
  const restaurant = doc._restaurant?.[0] || {};

  return {
    _id: idStr,
    restaurantId: doc.restaurantId?.toString?.() || doc.restaurantId || '',
    name: doc.name || '',
    description: doc.description || '',
    price: Number(doc.price) || 0,
    discountPrice: doc.discountPrice ? Number(doc.discountPrice) : undefined,
    category: doc.category || 'General',
    image: doc.image || '',
    status: doc.status || 'available',
    isAvailable: doc.isAvailable ?? true,
    isVegetarian: doc.isVegetarian ?? false,
    isSpicy: doc.isSpicy ?? false,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    restaurantName: restaurant.restaurantName || restaurant.name || 'Unknown Restaurant',
    restaurantSlug: restaurant.slug || '',
    restaurantLogo: restaurant.logo || '',
    restaurantIsOpen: restaurant.isOpen ?? true,
    restaurantRating: Number(restaurant.rating) || 0,
    restaurantReviewCount: Number(restaurant.totalReviews) || 0,
    createdAt: doc.createdAt || '',
    updatedAt: doc.updatedAt || '',
  };
};
