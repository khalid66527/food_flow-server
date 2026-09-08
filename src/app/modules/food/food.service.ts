import { foodCollection } from '../../config/db';
import { TFoodQueryParams, IPaginationMeta } from './food.interface';
import {
  buildFoodMongoQuery,
  buildFoodSortOptions,
  normalizeFoodDoc,
} from './food.utils';
import { calculateRestaurantDistance } from '../../utils/location.utils';

/**
 * Build flexible regex for Bangladesh location aliases (e.g., Moulvibazar vs Maulavi Bazar, Chattogram vs Chittagong)
 */
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
 * Get All Global Food Items across all restaurants
 * Uses MongoDB aggregation with $lookup to join restaurant data
 */
const getAllGlobalFoodItems = async (queryParams: TFoodQueryParams) => {
  const { page = 1, limit = 12, sortBy, openNow, featuredOnly, lat, lng, latitude, longitude } = queryParams;

  const userLat = lat || latitude ? parseFloat(String(lat || latitude)) : undefined;
  const userLng = lng || longitude ? parseFloat(String(lng || longitude)) : undefined;

  const foodMatchQuery = buildFoodMongoQuery(queryParams);
  const sortOptions = buildFoodSortOptions(sortBy as string);

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 12);
  const skip = (pageNum - 1) * limitNum;

  // Build the aggregation pipeline
  const pipeline: any[] = [];

  // Stage 1: Match food items
  pipeline.push({ $match: foodMatchQuery });

  // Stage 2: Lookup restaurant data
  pipeline.push({
    $lookup: {
      from: 'restaurant',
      let: { foodRestaurantId: '$restaurantId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: [{ $toString: '$_id' }, { $toString: '$$foodRestaurantId' }] },
              ],
            },
          },
        },
        {
          $project: {
            restaurantName: { $ifNull: ['$restaurantName', '$name'] },
            slug: 1,
            logo: 1,
            isOpen: { $ifNull: ['$isOpen', true] },
            isFeatured: { $ifNull: ['$isFeatured', false] },
            status: 1,
            rating: { $ifNull: ['$rating', 0] },
            totalReviews: { $ifNull: ['$totalReviews', 0] },
            address: 1,
            city: 1,
          },
        },
      ],
      as: '_restaurant',
    },
  });

  // Unwind restaurant object so only foods with existing active restaurants remain
  pipeline.push({ $unwind: '$_restaurant' });

  // Stage 3: Filter by restaurant-level conditions (openNow, featuredOnly, city/location)
  if (openNow === true || openNow === 'true' || openNow === '1') {
    pipeline.push({
      $match: {
        '_restaurant.isOpen': true,
      },
    });
  }

  if (featuredOnly === true || featuredOnly === 'true' || featuredOnly === '1') {
    pipeline.push({
      $match: {
        '_restaurant.isFeatured': true,
      },
    });
  }

  const upazilaParam = (queryParams.upazila || '').trim();
  const districtParam = (queryParams.district || '').trim();
  const divisionParam = (queryParams.division || '').trim();
  const activeCity = (queryParams.city || queryParams.location || '').trim();

  if (upazilaParam && upazilaParam.toLowerCase() !== 'all') {
    const upazilaRegex = buildLocationRegex(upazilaParam);
    pipeline.push({
      $match: {
        $or: [
          { '_restaurant.address.upazila': upazilaRegex },
          { '_restaurant.address.area': upazilaRegex },
          { '_restaurant.address.postalCode': upazilaRegex },
          { '_restaurant.address.street': upazilaRegex },
          { '_restaurant.address.fullAddress': upazilaRegex },
        ],
      },
    });
  } else if (districtParam && districtParam.toLowerCase() !== 'all') {
    const districtRegex = buildLocationRegex(districtParam);
    pipeline.push({
      $match: {
        $or: [
          { '_restaurant.address.district': districtRegex },
          { '_restaurant.address.state': districtRegex },
          { '_restaurant.address.city': districtRegex },
          { '_restaurant.address.fullAddress': districtRegex },
          { '_restaurant.city': districtRegex },
        ],
      },
    });
  } else if (divisionParam && divisionParam.toLowerCase() !== 'all') {
    const divisionRegex = buildLocationRegex(divisionParam);
    pipeline.push({
      $match: {
        $or: [
          { '_restaurant.address.division': divisionRegex },
          { '_restaurant.address.city': divisionRegex },
          { '_restaurant.address.state': divisionRegex },
          { '_restaurant.address.fullAddress': divisionRegex },
          { '_restaurant.city': divisionRegex },
        ],
      },
    });
  } else if (activeCity && activeCity.toLowerCase() !== 'all') {
    const cityRegex = buildLocationRegex(activeCity);
    pipeline.push({
      $match: {
        $or: [
          { '_restaurant.address.city': cityRegex },
          { '_restaurant.address.division': cityRegex },
          { '_restaurant.address.district': cityRegex },
          { '_restaurant.address.state': cityRegex },
          { '_restaurant.address.area': cityRegex },
          { '_restaurant.address.upazila': cityRegex },
          { '_restaurant.address.fullAddress': cityRegex },
          { '_restaurant.city': cityRegex },
        ],
      },
    });
  }

  // Stage 4: Filter out food from inactive restaurants
  pipeline.push({
    $match: {
      $or: [
        { '_restaurant.status': { $in: ['active', 'approved'] } },
        { '_restaurant.status': { $exists: false } },
      ],
    },
  });

  // Stage 5: Sort
  pipeline.push({ $sort: sortOptions });

  // Stage 6: Facet for single-query count and pagination data
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        { $skip: skip },
        { $limit: limitNum },
        {
          $addFields: {
            restaurantId: { $toString: '$restaurantId' },
          },
        },
      ],
    },
  });

  // Execute single aggregation query
  const aggregationResult = await foodCollection.aggregate(pipeline).toArray();
  const facetResult = aggregationResult[0] || { metadata: [], data: [] };
  const totalItems = facetResult.metadata[0]?.total || 0;
  const rawItems = facetResult.data || [];

  const normalizedData = rawItems.map((doc: any) => {
    const restObj = Array.isArray(doc._restaurant) ? doc._restaurant[0] : doc._restaurant;
    const dist = calculateRestaurantDistance(restObj || doc, userLat, userLng);
    const norm = normalizeFoodDoc(doc);
    return {
      ...norm,
      distanceKm: dist.distanceKm,
      distanceText: dist.distanceText,
    };
  });
  const totalPages = Math.ceil(totalItems / limitNum) || 0;

  const pagination: IPaginationMeta = {
    currentPage: pageNum,
    totalPages,
    totalItems,
    itemsPerPage: limitNum,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  return {
    data: normalizedData,
    pagination,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: totalItems,
      totalPage: totalPages || 1,
    },
  };
};

/**
 * Get all distinct non-empty category values from the food collection
 */
const getDistinctCategories = async (): Promise<string[]> => {
  const categories = await foodCollection
    .distinct('category', { category: { $exists: true, $ne: '' } });
  return categories
    .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    .sort((a, b) => a.localeCompare(b));
};

export const FoodService = {
  getAllGlobalFoodItems,
  getDistinctCategories,
};
