import { ObjectId } from 'mongodb';
import { zoneCollection, restaurantCollection, foodCollection } from '../../config/db';
import { TZone, TZoneQueryParams, ICoordinates } from './zone.interface';
import {
  isPointInZone,
  findCandidateZones,
  getHaversineDistanceKm,
} from '../../utils/geofence.utils';

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Math.random().toString(36).substring(2, 6)}`
  );
}

/**
 * Predefined Bangladesh Delivery Zones seed data
 */
export const INITIAL_ZONES_SEED: Partial<TZone>[] = [
  {
    zoneId: 1,
    name: 'Mymensingh Sadar Hub',
    shapeType: 'circle',
    color: '#F59E0B',
    centerCoordinates: { latitude: 24.7471, longitude: 90.4203 },
    radiusKm: 7.0,
    city: 'Mymensingh',
    division: 'Mymensingh',
    district: 'Mymensingh',
    upazila: 'Mymensingh Sadar',
    maxDeliveryRadiusKm: 8.0,
    baseDeliveryFee: 30,
    perKmDeliveryFee: 10,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: 'Serving Ganginar Par, Town Hall, Charpara, Notun Bazar, and BAU Campus.',
  },
  {
    zoneId: 2,
    name: 'Dhanmondi & Central Dhaka Hub',
    shapeType: 'circle',
    color: '#FF6B35',
    centerCoordinates: { latitude: 23.7461, longitude: 90.3742 },
    radiusKm: 6.0,
    city: 'Dhaka',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    maxDeliveryRadiusKm: 7.0,
    baseDeliveryFee: 35,
    perKmDeliveryFee: 12,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: 'Serving Dhanmondi, Lalmatia, Kalabagan, Mirpur Road, and Central Dhaka.',
  },
  {
    zoneId: 3,
    name: 'Gulshan & Banani Zone',
    shapeType: 'polygon',
    color: '#3B82F6',
    centerCoordinates: { latitude: 23.7937, longitude: 90.4066 },
    radiusKm: 5.5,
    polygonCoordinates: [
      { latitude: 23.805, longitude: 90.395 },
      { latitude: 23.808, longitude: 90.42 },
      { latitude: 23.775, longitude: 90.428 },
      { latitude: 23.772, longitude: 90.4 },
    ],
    city: 'Dhaka',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    maxDeliveryRadiusKm: 6.5,
    baseDeliveryFee: 40,
    perKmDeliveryFee: 15,
    estimatedBaseDeliveryMinutes: 30,
    isActive: true,
    description: 'Serving Banani, Gulshan 1 & 2, Baridhara, and Mohakhali DOHS.',
  },
  {
    zoneId: 4,
    name: 'Chattogram GEC & Nasirabad Zone',
    shapeType: 'circle',
    color: '#EC4899',
    centerCoordinates: { latitude: 22.3587, longitude: 91.8215 },
    radiusKm: 6.0,
    city: 'Chattogram',
    division: 'Chattogram',
    district: 'Chattogram',
    upazila: 'Panchlaish',
    maxDeliveryRadiusKm: 7.0,
    baseDeliveryFee: 35,
    perKmDeliveryFee: 12,
    estimatedBaseDeliveryMinutes: 28,
    isActive: true,
    description: 'Serving GEC Circle, Sholashahar, Nasirabad, Dampara, and Khulshi.',
  },
  {
    zoneId: 5,
    name: 'Feni Sadar Food Hub',
    shapeType: 'circle',
    color: '#10B981',
    centerCoordinates: { latitude: 23.0159, longitude: 91.3976 },
    radiusKm: 6.5,
    city: 'Feni',
    division: 'Chattogram',
    district: 'Feni',
    upazila: 'Feni Sadar',
    maxDeliveryRadiusKm: 7.5,
    baseDeliveryFee: 30,
    perKmDeliveryFee: 10,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: 'Serving Feni Sadar, Trunk Road, Masterpara, and College Road.',
  },
  {
    zoneId: 6,
    name: 'Sylhet Sadar & Tilaghor Hub',
    shapeType: 'circle',
    color: '#8B5CF6',
    centerCoordinates: { latitude: 24.8949, longitude: 91.8687 },
    radiusKm: 6.0,
    city: 'Sylhet',
    division: 'Sylhet',
    district: 'Sylhet',
    upazila: 'Sylhet Sadar',
    maxDeliveryRadiusKm: 7.0,
    baseDeliveryFee: 30,
    perKmDeliveryFee: 10,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: 'Serving Zindabazar, Tilaghor, Amberkhana, Shibganj, and Upashahar.',
  },
  {
    zoneId: 7,
    name: 'Moulvibazar & Sreemangal Zone',
    shapeType: 'circle',
    color: '#14B8A6',
    centerCoordinates: { latitude: 24.4829, longitude: 91.7649 },
    radiusKm: 12.0,
    city: 'Moulvibazar',
    division: 'Sylhet',
    district: 'Moulvibazar',
    upazila: 'Moulvibazar Sadar',
    maxDeliveryRadiusKm: 15.0,
    baseDeliveryFee: 30,
    perKmDeliveryFee: 10,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: 'Serving Moulvibazar Sadar, Choumohana Point, Court Road, and Sreemangal.',
  },
];

/**
 * Self-healing routine to ensure all zones have a sequential numeric zoneId
 */
export async function ensureZonesHaveNumericIds() {
  try {
    const unindexedZones = await zoneCollection
      .find({
        $or: [
          { zoneId: { $exists: false } },
          { zoneId: null },
          { zoneId: { $not: { $type: 'number' } } },
        ],
      })
      .toArray();

    if (unindexedZones.length > 0) {
      const maxZoneDoc = await zoneCollection
        .find({ zoneId: { $exists: true, $type: 'number' } })
        .sort({ zoneId: -1 })
        .limit(1)
        .toArray();
      let currentMax = maxZoneDoc?.[0]?.zoneId || 0;

      for (const z of unindexedZones) {
        currentMax++;
        await zoneCollection.updateOne(
          { _id: z._id },
          {
            $set: {
              zoneId: currentMax,
              numericZoneId: currentMax,
              updatedAt: new Date().toISOString(),
            },
          }
        );
      }
    }
  } catch (err) {
    console.error('Error ensuring numeric zone IDs:', err);
  }
}

/**
 * Seed initial zones if collection is empty
 */
export async function seedInitialZones() {
  try {
    const count = await zoneCollection.countDocuments();
    if (count === 0) {
      for (const z of INITIAL_ZONES_SEED) {
        if (!z.name) continue;
        const doc = {
          ...z,
          slug: generateSlug(z.name || 'Zone'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await zoneCollection.insertOne(doc as any);
      }
      console.log('✅ Seeded initial restaurant-backed delivery zones.');
    }
    await ensureZonesHaveNumericIds();
  } catch (err) {
    console.error('Error seeding initial zones:', err);
  }
}

/**
 * Create a new Zone
 */
const createZone = async (payload: Partial<TZone>) => {
  if (!payload.name) {
    throw new Error('Zone Name is required.');
  }

  // Calculate next sequential numeric zoneId
  const maxZoneDoc = await zoneCollection
    .find({ zoneId: { $exists: true, $type: 'number' } })
    .sort({ zoneId: -1 })
    .limit(1)
    .toArray();
  const nextZoneId = (maxZoneDoc?.[0]?.zoneId || 0) + 1;

  const centerLat = Number(payload.centerCoordinates?.latitude || 23.8103);
  const centerLng = Number(payload.centerCoordinates?.longitude || 90.4125);
  const radiusKm = Number(payload.radiusKm) || 5.0;
  const maxDeliveryRadiusKm = Number(payload.maxDeliveryRadiusKm) || radiusKm + 1.0;

  const zoneDoc: Record<string, any> = {
    zoneId: nextZoneId,
    numericZoneId: nextZoneId,
    name: payload.name.trim(),
    slug: payload.slug || generateSlug(payload.name),
    shapeType: payload.shapeType || 'circle',
    color: payload.color || '#FF6B35',
    centerCoordinates: { latitude: centerLat, longitude: centerLng },
    radiusKm,
    polygonCoordinates: Array.isArray(payload.polygonCoordinates)
      ? payload.polygonCoordinates.map((c) => ({
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
        }))
      : [],
    city: payload.city?.trim() || 'Dhaka',
    division: payload.division?.trim() || 'Dhaka',
    district: payload.district?.trim() || payload.city?.trim() || 'Dhaka',
    upazila: payload.upazila?.trim() || '',
    maxDeliveryRadiusKm,
    baseDeliveryFee: Number(payload.baseDeliveryFee) || 30,
    perKmDeliveryFee: Number(payload.perKmDeliveryFee) || 10,
    estimatedBaseDeliveryMinutes: Number(payload.estimatedBaseDeliveryMinutes) || 25,
    isActive: payload.isActive ?? true,
    description: payload.description?.trim() || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await zoneCollection.insertOne(zoneDoc);
  const createdZone = { _id: result.insertedId, ...zoneDoc };

  // Retroactively link any existing restaurants located within this new zone's perimeter
  try {
    const createdZoneObj = {
      _id: result.insertedId.toString(),
      zoneId: nextZoneId,
      ...zoneDoc,
    } as TZone;

    const allRestaurants = await restaurantCollection.find({}).toArray();
    for (const r of allRestaurants) {
      const rLat = Number(
        r.coordinates?.latitude ??
        r.address?.coordinates?.latitude ??
        r.address?.latitude ??
        r.latitude
      );
      const rLng = Number(
        r.coordinates?.longitude ??
        r.address?.coordinates?.longitude ??
        r.address?.longitude ??
        r.longitude
      );

      if (Number.isFinite(rLat) && Number.isFinite(rLng)) {
        if (isPointInZone({ latitude: rLat, longitude: rLng }, createdZoneObj)) {
          const zoneIdStr = String(nextZoneId);
          await restaurantCollection.updateOne(
            { _id: r._id },
            {
              $set: {
                zoneId: zoneIdStr,
                numericZoneId: nextZoneId,
                zoneMongoId: result.insertedId,
                zoneMongoIdStr: result.insertedId.toString(),
                zoneName: zoneDoc.name,
                'address.zoneId': zoneIdStr,
                updatedAt: new Date().toISOString(),
              },
            }
          );

          await foodCollection.updateMany(
            {
              $or: [
                { restaurantId: r._id.toString() },
                { restaurantId: r._id },
              ],
            },
            {
              $set: {
                zoneId: zoneIdStr,
                numericZoneId: nextZoneId,
                zoneMongoId: result.insertedId,
                zoneMongoIdStr: result.insertedId.toString(),
                zoneName: zoneDoc.name,
                updatedAt: new Date().toISOString(),
              },
            }
          );
        }
      }
    }
  } catch (linkErr) {
    console.warn('Error linking restaurants to new zone:', linkErr);
  }

  return createdZone;
};

/**
 * Get All Zones with dynamic restaurant counts
 */
const getAllZones = async (queryParams: TZoneQueryParams = {}) => {
  await seedInitialZones();

  const query: Record<string, any> = {};

  if (queryParams.search) {
    const sRegex = new RegExp(queryParams.search.trim(), 'i');
    query.$or = [
      { name: sRegex },
      { city: sRegex },
      { district: sRegex },
      { division: sRegex },
      { upazila: sRegex },
      { description: sRegex },
    ];
  }

  if (queryParams.city && queryParams.city.toLowerCase() !== 'all') {
    query.city = new RegExp(queryParams.city.trim(), 'i');
  }

  if (queryParams.division && queryParams.division.toLowerCase() !== 'all') {
    query.division = new RegExp(queryParams.division.trim(), 'i');
  }

  if (queryParams.isActive !== undefined && queryParams.isActive !== '') {
    query.isActive = queryParams.isActive === 'true' || queryParams.isActive === true;
  }

  const rawZones = await zoneCollection.find(query).sort({ createdAt: -1 }).toArray();

  // Attach accurate restaurant count for each zone
  const allRestaurants = await restaurantCollection.find({ status: { $nin: ['suspended', 'rejected'] } }).toArray();

  const enrichedZones = rawZones.map((z) => {
    const zoneIdStr = z._id.toString();
    const zoneObj = { ...z, _id: zoneIdStr } as TZone;

    // Count restaurants that match this zone either explicitly by zoneId or geographically
    const matchingCount = allRestaurants.filter((rest) => {
      const restZoneId = rest.zoneId || rest.address?.zoneId;
      if (restZoneId !== undefined && restZoneId !== null) {
        if (z.zoneId && (restZoneId === z.zoneId || String(restZoneId) === String(z.zoneId))) return true;
        if (restZoneId.toString() === zoneIdStr) return true;
      }

      const restLat = Number(rest.address?.coordinates?.latitude || rest.latitude);
      const restLng = Number(rest.address?.coordinates?.longitude || rest.longitude);

      if (Number.isFinite(restLat) && Number.isFinite(restLng)) {
        return isPointInZone({ latitude: restLat, longitude: restLng }, zoneObj);
      }
      return false;
    }).length;

    return {
      ...zoneObj,
      totalRestaurants: matchingCount,
    };
  });

  return enrichedZones;
};

/**
 * Get Single Zone by ID or Slug
 */
const getSingleZone = async (idOrSlug: string) => {
  let query: any;
  if (ObjectId.isValid(idOrSlug)) {
    query = { $or: [{ _id: new ObjectId(idOrSlug) }, { _id: idOrSlug }, { slug: idOrSlug }] };
  } else {
    query = { slug: idOrSlug };
  }

  const zone = await zoneCollection.findOne(query);
  if (!zone) return null;

  return { ...zone, _id: zone._id.toString() };
};

/**
 * Update Zone
 */
const updateZone = async (id: string, payload: Partial<TZone>) => {
  let query: any;
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
  } else {
    query = { slug: id };
  }

  const { _id, ...updatePayload } = payload;
  const updateDoc: Record<string, any> = {
    ...updatePayload,
    updatedAt: new Date().toISOString(),
  };

  if (payload.centerCoordinates) {
    updateDoc.centerCoordinates = {
      latitude: Number(payload.centerCoordinates.latitude),
      longitude: Number(payload.centerCoordinates.longitude),
    };
  }

  if (Array.isArray(payload.polygonCoordinates)) {
    updateDoc.polygonCoordinates = payload.polygonCoordinates.map((c) => ({
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    }));
  }

  const result = await zoneCollection.findOneAndUpdate(
    query,
    { $set: updateDoc },
    { returnDocument: 'after' }
  );

  return result ? { ...result, _id: result._id.toString() } : null;
};

/**
 * Delete Zone
 */
const deleteZone = async (id: string) => {
  let query: any;
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
  } else {
    query = { slug: id };
  }

  const result = await zoneCollection.deleteOne(query);
  return result.deletedCount > 0;
};

/**
 * Toggle Zone Status (Active / Inactive)
 */
const toggleZoneStatus = async (id: string, isActive: boolean) => {
  let query: any;
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
  } else {
    query = { slug: id };
  }

  const result = await zoneCollection.findOneAndUpdate(
    query,
    { $set: { isActive: Boolean(isActive), updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );

  return result ? { ...result, _id: result._id.toString() } : null;
};

/**
 * Detect User Zone and Candidate Adjacent Zones based on GPS Coordinates
 */
const detectUserZone = async (lat: number, lng: number) => {
  await seedInitialZones();

  const allActiveZones = (await zoneCollection.find({ isActive: true }).toArray()).map(
    (z) => ({ ...z, _id: z._id.toString() } as TZone)
  );

  if (allActiveZones.length === 0) {
    return {
      isInsideServiceArea: false,
      primaryZone: null,
      candidateZoneIds: [],
      candidateZones: [],
      message: 'No active delivery zones found in system.',
    };
  }

  const { primaryZone, candidateZones, candidateZoneIds, adjacentZones } = findCandidateZones(
    lat,
    lng,
    allActiveZones
  );

  if (!primaryZone && candidateZones.length === 0) {
    // Find closest zone for distance display
    let nearestZone: TZone = allActiveZones[0];
    let minDistance = Infinity;

    for (const z of allActiveZones) {
      if (z.centerCoordinates) {
        const d = getHaversineDistanceKm(
          lat,
          lng,
          z.centerCoordinates.latitude,
          z.centerCoordinates.longitude
        );
        if (d < minDistance) {
          minDistance = d;
          nearestZone = z;
        }
      }
    }

    return {
      isInsideServiceArea: false,
      primaryZone: null,
      nearestZone,
      distanceToNearestKm: Math.round(minDistance * 10) / 10,
      candidateZoneIds: [],
      candidateZones: [],
      adjacentZones: [],
      message: `You are currently ${Math.round(minDistance)} km away from our nearest delivery zone (${nearestZone.name}).`,
    };
  }

  const effectivePrimaryZone = primaryZone || candidateZones[0];

  return {
    isInsideServiceArea: true,
    primaryZone: effectivePrimaryZone,
    candidateZoneIds:
      candidateZoneIds.length > 0
        ? candidateZoneIds
        : [effectivePrimaryZone.zoneId !== undefined ? String(effectivePrimaryZone.zoneId) : effectivePrimaryZone._id!.toString()],
    candidateZones,
    adjacentZones: adjacentZones || [],
    maxDeliveryRadiusKm: effectivePrimaryZone.maxDeliveryRadiusKm || 5.0,
    baseDeliveryFee: effectivePrimaryZone.baseDeliveryFee || 30,
    perKmDeliveryFee: effectivePrimaryZone.perKmDeliveryFee || 10,
    message: `Delivery available in ${effectivePrimaryZone.name}`,
  };
};

export const ZoneService = {
  createZone,
  getAllZones,
  getSingleZone,
  updateZone,
  deleteZone,
  toggleZoneStatus,
  detectUserZone,
  seedInitialZones,
};
