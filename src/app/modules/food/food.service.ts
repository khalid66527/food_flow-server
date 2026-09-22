import { ObjectId } from 'mongodb';
import { foodCollection, categoryCollection, zoneCollection } from '../../config/db';
import { TFoodQueryParams, IPaginationMeta } from './food.interface';
import {
  buildFoodMongoQuery,
  buildFoodSortOptions,
  normalizeFoodDoc,
} from './food.utils';
import { calculateRestaurantDistance } from '../../utils/location.utils';
import { ZoneService } from '../zone/zone.service';

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

  if (queryParams.zoneId === 'none') {
    return {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limitNum,
        hasNextPage: false,
        hasPrevPage: false,
      },
      meta: {
        page: 1,
        limit: limitNum,
        total: 0,
        totalPage: 0,
      },
    };
  }

  let effectiveMaxDistanceKm = (queryParams as any).maxDistanceKm
    ? Number((queryParams as any).maxDistanceKm)
    : undefined;

  // Geofencing: Detect Delivery Zone from GPS Coordinates (lat/lng)
  if (userLat !== undefined && userLng !== undefined) {
    try {
      const detection = await ZoneService.detectUserZone(userLat, userLng);
      if (detection.isInsideServiceArea && detection.candidateZoneIds && detection.candidateZoneIds.length > 0) {
        const existingZoneIds =
          queryParams.zoneId && queryParams.zoneId !== 'all'
            ? String(queryParams.zoneId).split(',').map((z: string) => z.trim()).filter(Boolean)
            : [];
        const mergedZoneIds = Array.from(new Set([...existingZoneIds, ...detection.candidateZoneIds]));
        queryParams.zoneId = mergedZoneIds.join(',');
        if (!effectiveMaxDistanceKm && detection.maxDeliveryRadiusKm) {
          effectiveMaxDistanceKm = detection.maxDeliveryRadiusKm;
        }
      } else if (!queryParams.zoneId) {
        // Outside all delivery zones => Return 0 foods!
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false,
          },
          meta: {
            page: 1,
            limit: limitNum,
            total: 0,
            totalPage: 0,
          },
        };
      }
    } catch {
      if (!queryParams.zoneId) {
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false,
          },
          meta: {
            page: 1,
            limit: limitNum,
            total: 0,
            totalPage: 0,
          },
        };
      }
    }
  }

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
            coordinates: 1,
            deliveryRadiusKm: 1,
            city: 1,
            zoneId: 1,
            numericZoneId: 1,
            zoneIds: 1,
            numericZoneIds: 1,
            zoneMongoId: 1,
            zoneMongoIdStr: 1,
            zoneMongoIds: 1,
            zoneNames: 1,
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

  // Stage 3.5: Strict Zone ID filter (matching restaurant geofenced delivery zones)
  if (queryParams.zoneId && queryParams.zoneId !== 'all') {
    const rawZoneIds = String(queryParams.zoneId).split(',').map((z: string) => z.trim()).filter(Boolean);
    if (rawZoneIds.length > 0) {
      const numericIds = rawZoneIds.map(Number).filter(n => !isNaN(n));
      const allMatches: (string | number)[] = [...rawZoneIds, ...numericIds];
      const validObjectIds = rawZoneIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

      pipeline.push({
        $match: {
          $or: [
            { zoneId: { $in: allMatches } },
            { numericZoneId: { $in: allMatches } },
            { zoneIds: { $in: allMatches } },
            { numericZoneIds: { $in: allMatches } },
            { zoneMongoIdStr: { $in: rawZoneIds } },
            { '_restaurant.zoneId': { $in: allMatches } },
            { '_restaurant.numericZoneId': { $in: allMatches } },
            { '_restaurant.zoneIds': { $in: allMatches } },
            { '_restaurant.numericZoneIds': { $in: allMatches } },
            { '_restaurant.address.zoneId': { $in: allMatches } },
            { '_restaurant.address.numericZoneId': { $in: allMatches } },
            { '_restaurant.address.zoneIds': { $in: allMatches } },
            { '_restaurant.address.numericZoneIds': { $in: allMatches } },
            { '_restaurant.zoneMongoIdStr': { $in: rawZoneIds } },
            ...(validObjectIds.length > 0
              ? [
                  { zoneMongoId: { $in: validObjectIds } },
                  { zoneMongoIds: { $in: validObjectIds } },
                  { '_restaurant.zoneMongoId': { $in: validObjectIds } },
                  { '_restaurant.zoneMongoIds': { $in: validObjectIds } },
                ]
              : []),
          ],
        },
      });
    }
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

  const isGpsProvided = userLat !== undefined && userLng !== undefined;
  const thresholdRadiusKm = effectiveMaxDistanceKm && effectiveMaxDistanceKm > 0 ? effectiveMaxDistanceKm : 4.5;

  let normalizedData: any[] = [];
  let totalItems = 0;

  if (isGpsProvided) {
    // When user coordinates are available, run pipeline without facet limit to allow
    // in-memory hybrid distance pruning (removing dishes outside reachable delivery radius)
    const rawItems = await foodCollection.aggregate(pipeline).toArray();

    const processedAndPruned = rawItems
      .map((doc: any) => {
        const restObj = Array.isArray(doc._restaurant) ? doc._restaurant[0] : doc._restaurant;
        const dist = calculateRestaurantDistance(restObj || doc, userLat, userLng);
        const norm = normalizeFoodDoc(doc);
        return {
          ...norm,
          restaurantDeliveryRadiusKm: restObj?.deliveryRadiusKm,
          distanceKm: dist.distanceKm,
          distanceText: dist.distanceText,
        };
      })
      .filter((item: any) => {
        const restMaxRadius = Number(item.restaurantDeliveryRadiusKm) || thresholdRadiusKm;
        const allowedRadius = Math.max(restMaxRadius, thresholdRadiusKm);
        return item.distanceKm <= allowedRadius;
      });

    if (sortBy === 'distance' || !sortBy) {
      processedAndPruned.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    }

    totalItems = processedAndPruned.length;
    const paginatedItems = processedAndPruned.slice(skip, skip + limitNum);
    normalizedData = paginatedItems;
  } else {
    // Stage 6: Facet for single-query count and pagination data when no GPS coordinates
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

    const aggregationResult = await foodCollection.aggregate(pipeline).toArray();
    const facetResult = aggregationResult[0] || { metadata: [], data: [] };
    totalItems = facetResult.metadata[0]?.total || 0;
    const rawItems = facetResult.data || [];

    normalizedData = rawItems.map((doc: any) => {
      const restObj = Array.isArray(doc._restaurant) ? doc._restaurant[0] : doc._restaurant;
      const dist = calculateRestaurantDistance(restObj || doc, userLat, userLng);
      const norm = normalizeFoodDoc(doc);
      return {
        ...norm,
        distanceKm: dist.distanceKm,
        distanceText: dist.distanceText,
      };
    });
  }

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
 * Get all distinct non-empty category values from food collection & category collection
 */
const getDistinctCategories = async (): Promise<string[]> => {
  const result = await foodCollection
    .aggregate([
      {
        $match: {
          category: { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$category',
        },
      },
    ])
    .toArray();

  const foodCategories = result
    .map((doc) => (typeof doc._id === 'string' ? doc._id.trim() : ''))
    .filter((c) => c !== '');

  let dbCategories: string[] = [];
  try {
    const categoriesFromDb = await categoryCollection
      .find({ isActive: true }, { projection: { name: 1 } })
      .toArray();
    dbCategories = categoriesFromDb
      .map((c) => (typeof c.name === 'string' ? c.name.trim() : ''))
      .filter((c) => c !== '');
  } catch (err) {
    // ignore fallback error
  }

  const combined = Array.from(new Set([...foodCategories, ...dbCategories]));
  return combined.sort((a, b) => a.localeCompare(b));
};

export const FoodService = {
  getAllGlobalFoodItems,
  getDistinctCategories,
};
