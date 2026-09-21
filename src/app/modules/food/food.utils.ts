import { ObjectId } from 'mongodb';
import { TFoodQueryParams } from './food.interface';

/**
 * Helper to build strict, exact category matching regex
 */
export const buildCategoryMatchRegex = (categoryInput: string): RegExp => {
  const clean = categoryInput.trim();
  const lower = clean.toLowerCase();

  // Escape special regex characters
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (lower === 'burger' || lower === 'burgers') {
    return /^burgers?(?:\s.*)?$/i;
  }
  if (lower === 'pizza' || lower === 'pizzas') {
    return /^pizzas?(?:\s.*)?$/i;
  }
  if (lower === 'biryani' || lower === 'biryanis') {
    return /^biryanis?(?:\s.*)?$/i;
  }
  if (lower === 'pasta' || lower === 'pastas') {
    return /^pastas?(?:\s.*)?$/i;
  }
  if (lower === 'dessert' || lower === 'desserts') {
    return /^desserts?(?:\s.*)?$/i;
  }
  if (lower === 'drink' || lower === 'drinks' || lower === 'beverage' || lower === 'beverages') {
    return /^(drinks?|beverages?)(?:\s.*)?$/i;
  }
  if (lower === 'healthy' || lower === 'salad' || lower === 'salads') {
    return /^(healthy|salads?)(?:\s.*)?$/i;
  }
  if (lower === 'bbq' || lower === 'grill' || lower === 'bbq & grill') {
    return /^(bbq|grill|bbq\s*&\s*grill)(?:\s.*)?$/i;
  }
  if (lower === 'sushi') {
    return /^sushis?(?:\s.*)?$/i;
  }
  if (lower === 'chinese') {
    return /^chinese(?:\s.*)?$/i;
  }
  if (lower === 'thai') {
    return /^thai(?:\s.*)?$/i;
  }
  if (lower === 'soup' || lower === 'soups') {
    return /^soups?(?:\s.*)?$/i;
  }
  if (lower === 'snack' || lower === 'snacks') {
    return /^snacks?(?:\s.*)?$/i;
  }
  if (lower === 'seafood') {
    return /^seafood(?:\s.*)?$/i;
  }

  // Fallback anchored prefix word regex
  const base = escaped.replace(/s$/i, '');
  return new RegExp(`^${base}s?(?:\\s.*)?$`, 'i');
};

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

  // Search keyword (matches dish name, description, tags)
  const searchKeyword = (search || '').trim();
  if (searchKeyword) {
    const searchRegex = new RegExp(searchKeyword, 'i');
    queryFilters.push({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $elemMatch: { $regex: searchKeyword, $options: 'i' } } },
      ],
    });
  }

  // Category filter (Strict anchored matching)
  const activeCategory = (category || '').trim();
  if (activeCategory && activeCategory.toLowerCase() !== 'all') {
    const categoryRegex = buildCategoryMatchRegex(activeCategory);
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

  // Vegetarian filter (matches boolean true, string 'true', tags 'veg'/'vegetarian'/'healthy'/'salad', or category 'healthy'/'salad')
  if (isVegetarian === true || isVegetarian === 'true' || isVegetarian === '1') {
    queryFilters.push({
      $or: [
        { isVegetarian: true },
        { isVegetarian: 'true' },
        { isVegetarian: 1 },
        { tags: { $elemMatch: { $regex: 'veg|vegetarian|healthy|salad', $options: 'i' } } },
        { category: { $regex: 'healthy|salad', $options: 'i' } },
      ],
    });
  }

  // Spicy filter (matches boolean true, string 'true', tags 'spicy'/'hot'/'chili'/'curry'/'spiced', or categoryDetails)
  if (isSpicy === true || isSpicy === 'true' || isSpicy === '1') {
    queryFilters.push({
      $or: [
        { isSpicy: true },
        { isSpicy: 'true' },
        { isSpicy: 1 },
        { tags: { $elemMatch: { $regex: 'spicy|hot|chili|curry|spiced', $options: 'i' } } },
        { 'categoryDetails.spicyLevel': { $exists: true, $ne: 'mild' } },
      ],
    });
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
  const rawRest = doc._restaurant;
  const restaurant = (Array.isArray(rawRest) ? rawRest[0] : rawRest) || {};

  const mainImg = doc.image || (Array.isArray(doc.images) && doc.images[0]) || '';
  const imagesList = Array.isArray(doc.images) && doc.images.length > 0 ? doc.images : mainImg ? [mainImg] : [];

  return {
    _id: idStr,
    restaurantId: doc.restaurantId?.toString?.() || doc.restaurantId || '',
    name: doc.name || '',
    description: doc.description || '',
    price: Number(doc.price) || 0,
    discountPrice: doc.discountPrice ? Number(doc.discountPrice) : undefined,
    category: doc.category || 'General',
    image: mainImg,
    images: imagesList,
    status: doc.status || 'available',
    isAvailable: doc.isAvailable ?? true,
    isVegetarian: doc.isVegetarian ?? false,
    isSpicy: doc.isSpicy ?? false,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    ingredients: Array.isArray(doc.ingredients) ? doc.ingredients : [],
    sizeOptions: Array.isArray(doc.sizeOptions) ? doc.sizeOptions : [],
    extras: Array.isArray(doc.extras) ? doc.extras : [],
    categoryDetails:
      typeof doc.categoryDetails === 'object' && doc.categoryDetails !== null
        ? doc.categoryDetails
        : {},
    restaurantName: restaurant.restaurantName || restaurant.name || 'Unknown Restaurant',
    restaurantSlug: restaurant.slug || '',
    restaurantLogo: restaurant.logo || '',
    restaurantIsOpen: restaurant.isOpen ?? true,
    restaurantRating: Number(restaurant.rating) || 0,
    restaurantReviewCount: Number(restaurant.totalReviews) || 0,
    rating: Number(doc.rating) > 0 ? Number(doc.rating) : Number(restaurant.rating) || 0,
    reviewCount: Number(doc.reviewCount) || 0,
    createdAt: doc.createdAt || '',
    updatedAt: doc.updatedAt || '',
  };
};
