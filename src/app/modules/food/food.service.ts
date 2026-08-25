import { foodCollection } from '../../config/db';
import { TFoodQueryParams, IPaginationMeta } from './food.interface';
import {
  buildFoodMongoQuery,
  buildFoodSortOptions,
  normalizeFoodDoc,
} from './food.utils';

/**
 * Get All Global Food Items across all restaurants
 * Uses MongoDB aggregation with $lookup to join restaurant data
 */
const getAllGlobalFoodItems = async (queryParams: TFoodQueryParams) => {
  const { page = 1, limit = 12, sortBy, openNow, featuredOnly } = queryParams;

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
                { $eq: ['$_id', { $toObjectId: '$$foodRestaurantId' }] },
                { $eq: [{ $toString: '$_id' }, '$$foodRestaurantId'] },
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
          },
        },
      ],
      as: '_restaurant',
    },
  });

  // Stage 3: Filter by restaurant-level conditions (openNow, featuredOnly)
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

  // Stage 4: Filter out food from inactive restaurants
  pipeline.push({
    $match: {
      $or: [
        { '_restaurant.status': { $ne: 'inactive' } },
        { '_restaurant.status': { $exists: false } },
      ],
    },
  });

  // Stage 5: Count total (before sort/skip/limit)
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await foodCollection.aggregate(countPipeline).toArray();
  const totalItems = countResult[0]?.total || 0;

  // Stage 6: Sort
  pipeline.push({ $sort: sortOptions });

  // Stage 7: Skip & Limit
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limitNum });

  // Stage 8: Add fields to flatten restaurant info
  pipeline.push({
    $addFields: {
      restaurantId: { $toString: '$restaurantId' },
    },
  });

  // Execute aggregation
  const rawItems = await foodCollection.aggregate(pipeline).toArray();
  const normalizedData = rawItems.map((doc) => normalizeFoodDoc(doc));

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
