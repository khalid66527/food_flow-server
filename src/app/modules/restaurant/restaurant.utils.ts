import { ObjectId } from 'mongodb';
import { TRestaurantQueryParams, TRestaurant } from './restaurant.interface';

/**
 * Helper function to generate a clean URL slug from restaurant name
 */
export const generateSlug = (name: string): string => {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Math.random().toString(36).substring(2, 6)}`
  );
};

/**
 * Build MongoDB Query Filter Object based on frontend query parameters
 */
export const buildRestaurantMongoQuery = (
  queryParams: TRestaurantQueryParams
): Record<string, any> => {
  const {
    search,
    searchQuery,
    category,
    cuisine,
    restaurantId,
    city,
    location,
    priceRange,
    minRating,
    freeDelivery,
    openNow,
    featuredOnly,
  } = queryParams;

  const queryFilters: Record<string, any>[] = [];

  // Search keyword (matches name, restaurantName, tagline, description, cuisines, cuisineTypes)
  const searchKeyword = (search || searchQuery || '').trim();
  if (searchKeyword) {
    const searchRegex = new RegExp(searchKeyword, 'i');
    queryFilters.push({
      $or: [
        { restaurantName: searchRegex },
        { name: searchRegex },
        { tagline: searchRegex },
        { description: searchRegex },
        { cuisineTypes: { $elemMatch: { $regex: searchKeyword, $options: 'i' } } },
        { cuisines: { $elemMatch: { $regex: searchKeyword, $options: 'i' } } },
      ],
    });
  }

  // Category or Cuisine filter
  const activeCategory = (category || cuisine || '').trim();
  if (activeCategory && activeCategory.toLowerCase() !== 'all') {
    const categoryRegex = new RegExp(activeCategory, 'i');
    queryFilters.push({
      $or: [
        { cuisineTypes: { $elemMatch: { $regex: activeCategory, $options: 'i' } } },
        { cuisines: { $elemMatch: { $regex: activeCategory, $options: 'i' } } },
        { category: categoryRegex },
        { categories: { $elemMatch: { $regex: activeCategory, $options: 'i' } } },
      ],
    });
  }

  // Specific Restaurant ID
  if (restaurantId && restaurantId.toLowerCase() !== 'all') {
    if (ObjectId.isValid(restaurantId)) {
      queryFilters.push({
        $or: [{ _id: new ObjectId(restaurantId) }, { _id: restaurantId }],
      });
    } else {
      queryFilters.push({ slug: restaurantId });
    }
  }

  // Location / City filter
  const activeLocation = (location || city || '').trim();
  if (activeLocation) {
    const locationRegex = new RegExp(activeLocation, 'i');
    queryFilters.push({
      $or: [
        { 'address.city': locationRegex },
        { 'address.area': locationRegex },
        { 'address.street': locationRegex },
        { 'address.state': locationRegex },
      ],
    });
  }

  // Price Range filter ('$', '$$', '$$$', '$$$$')
  if (priceRange && priceRange !== 'ALL') {
    queryFilters.push({
      $or: [{ priceRange: priceRange }, { 'pricing.priceRange': priceRange }],
    });
  }

  // Minimum Rating filter
  if (minRating && Number(minRating) > 0) {
    queryFilters.push({
      rating: { $gte: Number(minRating) },
    });
  }

  // Free Delivery filter
  if (
    freeDelivery === true ||
    freeDelivery === 'true' ||
    freeDelivery === '1'
  ) {
    queryFilters.push({
      $or: [
        { deliveryFee: 0 },
        { 'pricing.deliveryFee': 0 },
        { 'features.freeDelivery': true },
      ],
    });
  }

  // Open Now filter
  if (openNow === true || openNow === 'true' || openNow === '1') {
    queryFilters.push({ isOpen: true });
  }

  // Featured Only filter
  if (
    featuredOnly === true ||
    featuredOnly === 'true' ||
    featuredOnly === '1'
  ) {
    queryFilters.push({ isFeatured: true });
  }

  // Status active filter - only show approved active restaurants to public customers
  queryFilters.push({
    $and: [
      { status: { $nin: ['pending', 'suspended', 'rejected', 'inactive'] } },
      {
        $or: [
          { status: { $regex: /^(active|approved)$/i } },
          { status: { $exists: false } },
        ],
      },
    ],
  });

  if (queryFilters.length === 0) {
    return {};
  }
  if (queryFilters.length === 1) {
    return queryFilters[0];
  }
  return { $and: queryFilters };
};

/**
 * Build MongoDB Sort Object based on sortBy option
 */
export const buildRestaurantSortOptions = (
  sortBy?: string
): Record<string, 1 | -1> => {
  switch (sortBy) {
    case 'rating_desc':
      return { rating: -1, totalReviews: -1, reviewCount: -1 };
    case 'delivery_time_asc':
      return { deliveryTimeMin: 1, 'pricing.deliveryTimeMin': 1, createdAt: -1 };
    case 'delivery_fee_asc':
      return { deliveryFee: 1, 'pricing.deliveryFee': 1, createdAt: -1 };
    case 'min_order_asc':
      return { minOrderAmount: 1, 'pricing.minOrderAmount': 1, createdAt: -1 };
    case 'popular':
      return { totalReviews: -1, reviewCount: -1, rating: -1 };
    case 'relevance':
    default:
      return { isFeatured: -1, createdAt: -1 };
  }
};

/**
 * Normalizes MongoDB restaurant document for frontend consistency
 */
export const normalizeRestaurantDoc = (doc: any): TRestaurant => {
  if (!doc) return doc;

  const idStr = doc._id ? doc._id.toString() : doc.id || '';
  const restaurantName = doc.restaurantName || doc.name || 'Unnamed Restaurant';
  const cuisines =
    Array.isArray(doc.cuisines) && doc.cuisines.length > 0
      ? doc.cuisines
      : Array.isArray(doc.cuisineTypes) && doc.cuisineTypes.length > 0
      ? doc.cuisineTypes
      : ['Various Cuisines'];

  const deliveryFee =
    doc.deliveryFee !== undefined
      ? Number(doc.deliveryFee)
      : doc.pricing?.deliveryFee !== undefined
      ? Number(doc.pricing.deliveryFee)
      : 0;

  const minOrderAmount =
    doc.minOrderAmount !== undefined
      ? Number(doc.minOrderAmount)
      : doc.pricing?.minOrderAmount !== undefined
      ? Number(doc.pricing.minOrderAmount)
      : 0;

  const deliveryTimeMin =
    doc.deliveryTimeMin !== undefined
      ? Number(doc.deliveryTimeMin)
      : 20;

  const deliveryTimeMax =
    doc.deliveryTimeMax !== undefined
      ? Number(doc.deliveryTimeMax)
      : 35;

  const priceRange =
    doc.priceRange || doc.pricing?.priceRange || '$$';

  const reviewCount =
    doc.reviewCount !== undefined
      ? Number(doc.reviewCount)
      : doc.totalReviews !== undefined
      ? Number(doc.totalReviews)
      : 0;

  return {
    ...doc,
    _id: idStr,
    name: restaurantName,
    restaurantName,
    slug: doc.slug || generateSlug(restaurantName),
    logo: doc.logo || '',
    bannerImage: doc.bannerImage || doc.logo || '',
    cuisines,
    cuisineTypes: cuisines,
    rating: Number(doc.rating) || 0,
    reviewCount,
    totalReviews: reviewCount,
    deliveryTimeMin,
    deliveryTimeMax,
    deliveryFee,
    minOrderAmount,
    priceRange,
    isOpen: doc.isOpen ?? true,
    isFeatured: doc.isFeatured ?? false,
    discountOffer: doc.discountOffer || '',
    address: doc.address || {
      street: '',
      city: 'Manhattan',
      area: 'Downtown',
      state: 'NY',
    },
  };
};
