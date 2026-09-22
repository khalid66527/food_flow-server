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

export const buildLocationRegex = (locName: string): RegExp => {
  const clean = locName.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('moulvi') || lower.includes('maulavi') || lower.includes('moulvibazar')) {
    return /(moulvi|maulavi|moulavibazar|moulvibazar)/i;
  }
  if (lower.includes('chattogram') || lower.includes('chittagong')) {
    return /(chattogram|chittagong)/i;
  }
  if (lower.includes('cumilla') || lower.includes('comilla')) {
    return /(cumilla|comilla)/i;
  }
  if (lower.includes('barishal') || lower.includes('barisal')) {
    return /(barishal|barisal)/i;
  }
  if (lower.includes('bogura') || lower.includes('bogra')) {
    return /(bogura|bogra)/i;
  }
  if (lower.includes('jashore') || lower.includes('jessore')) {
    return /(jashore|jessore)/i;
  }
  if (lower.includes("cox's bazar") || lower.includes('coxsbazar') || lower.includes('coxs bazar')) {
    return /(cox'?s?\s*bazar)/i;
  }

  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
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

  // Zone ID Filter (Single or Multiple Candidate Zones for Hybrid Geofencing)
  const { zoneId } = queryParams;
  if (zoneId && zoneId !== 'all') {
    const rawZoneIds = zoneId.split(',').map((z) => z.trim()).filter(Boolean);
    const numericIds = rawZoneIds.map(Number).filter((n) => !isNaN(n));
    const allMatches: (string | number)[] = [...rawZoneIds, ...numericIds];

    const validObjectIds = rawZoneIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

    queryFilters.push({
      $or: [
        { zoneId: { $in: allMatches } },
        { numericZoneId: { $in: allMatches } },
        { zoneIds: { $in: allMatches } },
        { numericZoneIds: { $in: allMatches } },
        { 'address.zoneId': { $in: allMatches } },
        { 'address.numericZoneId': { $in: allMatches } },
        { 'address.zoneIds': { $in: allMatches } },
        { 'address.numericZoneIds': { $in: allMatches } },
        { zoneMongoIdStr: { $in: rawZoneIds } },
        ...(validObjectIds.length > 0
          ? [
              { zoneMongoId: { $in: validObjectIds } },
              { zoneId: { $in: validObjectIds } },
              { zoneMongoIds: { $in: validObjectIds } },
            ]
          : []),
      ],
    });
  }

  // Hierarchical Location / Upazila / District / Division / City filter
  const { upazila, district, division } = queryParams;
  const activeLocation = (location || city || '').trim();

  if (upazila && upazila.toLowerCase() !== 'all') {
    const upazilaRegex = buildLocationRegex(upazila);
    queryFilters.push({
      $or: [
        { 'address.upazila': upazilaRegex },
        { 'address.area': upazilaRegex },
        { 'address.postalCode': upazilaRegex },
        { 'address.street': upazilaRegex },
        { 'address.fullAddress': upazilaRegex },
      ],
    });
  } else if (district && district.toLowerCase() !== 'all') {
    const districtRegex = buildLocationRegex(district);
    queryFilters.push({
      $or: [
        { 'address.district': districtRegex },
        { 'address.state': districtRegex },
        { 'address.city': districtRegex },
        { 'address.fullAddress': districtRegex },
        { city: districtRegex },
      ],
    });
  } else if (division && division.toLowerCase() !== 'all') {
    const divisionRegex = buildLocationRegex(division);
    queryFilters.push({
      $or: [
        { 'address.division': divisionRegex },
        { 'address.city': divisionRegex },
        { 'address.state': divisionRegex },
        { 'address.fullAddress': divisionRegex },
        { city: divisionRegex },
      ],
    });
  } else if (activeLocation && activeLocation.toLowerCase() !== 'all') {
    const locationRegex = buildLocationRegex(activeLocation);
    queryFilters.push({
      $or: [
        { 'address.city': locationRegex },
        { 'address.division': locationRegex },
        { 'address.district': locationRegex },
        { 'address.state': locationRegex },
        { 'address.area': locationRegex },
        { 'address.upazila': locationRegex },
        { 'address.street': locationRegex },
        { 'address.fullAddress': locationRegex },
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
    zoneId: doc.zoneId || doc.address?.zoneId || '',
    numericZoneId: doc.numericZoneId !== undefined ? Number(doc.numericZoneId) : (doc.zoneId && !isNaN(Number(doc.zoneId)) ? Number(doc.zoneId) : undefined),
    zoneMongoId: doc.zoneMongoId ? String(doc.zoneMongoId) : undefined,
    zoneName: doc.zoneName || '',
    coordinates: doc.coordinates || doc.address?.coordinates || (Number.isFinite(doc.latitude) && Number.isFinite(doc.longitude) ? { latitude: Number(doc.latitude), longitude: Number(doc.longitude) } : undefined),
    deliveryRadiusKm: Number(doc.deliveryRadiusKm) || 5.0,
    address: {
      street: doc.address?.street || '',
      city: doc.address?.city || 'Dhaka',
      area: doc.address?.area || '',
      state: doc.address?.state || '',
      postalCode: doc.address?.postalCode || '',
      country: doc.address?.country || 'Bangladesh',
      latitude: doc.address?.latitude || doc.coordinates?.latitude,
      longitude: doc.address?.longitude || doc.coordinates?.longitude,
      coordinates: doc.address?.coordinates || doc.coordinates,
      zoneId: doc.address?.zoneId || doc.zoneId || '',
      fullAddress: doc.address?.fullAddress || '',
      ...doc.address,
    },
  };
};
