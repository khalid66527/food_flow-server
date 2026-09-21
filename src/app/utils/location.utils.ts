/**
 * Coordinates lookup table for major cities and areas in Bangladesh
 */
export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Chattogram / Chittagong Areas
  gec: { lat: 22.3587, lng: 91.8215 },
  sholashahar: { lat: 22.3653, lng: 91.8236 },
  '2 no gate': { lat: 22.3653, lng: 91.8236 },
  agrabad: { lat: 22.3274, lng: 91.8122 },
  halishahar: { lat: 22.3167, lng: 91.7833 },
  panchlaish: { lat: 22.3644, lng: 91.8285 },
  jamalkhan: { lat: 22.3486, lng: 91.834 },
  muradpur: { lat: 22.3688, lng: 91.826 },
  chattogram: { lat: 22.3569, lng: 91.7832 },
  chittagong: { lat: 22.3569, lng: 91.7832 },

  // Dhaka Areas
  gulshan: { lat: 23.7925, lng: 90.4078 },
  banani: { lat: 23.7937, lng: 90.4047 },
  dhanmondi: { lat: 23.7461, lng: 90.3742 },
  uttara: { lat: 23.8759, lng: 90.3795 },
  mirpur: { lat: 23.8069, lng: 90.3687 },
  motijheel: { lat: 23.733, lng: 90.417 },
  mohammadpur: { lat: 23.7658, lng: 90.3584 },
  dhaka: { lat: 23.8103, lng: 90.4125 },

  // Other Major Cities
  sylhet: { lat: 24.8949, lng: 91.8687 },
  rajshahi: { lat: 24.3636, lng: 88.6241 },
  khulna: { lat: 22.8456, lng: 89.5403 },
  barishal: { lat: 22.701, lng: 90.3535 },
  barisal: { lat: 22.701, lng: 90.3535 },
  rangpur: { lat: 25.7439, lng: 89.2752 },
  comilla: { lat: 23.4607, lng: 91.1809 },
  cumilla: { lat: 23.4607, lng: 91.1809 },
  mymensingh: { lat: 24.7471, lng: 90.4203 },
};

/**
 * Extract latitude and longitude from a restaurant document or fallback to area mapping
 */
export function getRestaurantCoordinates(doc: any): { lat: number; lng: number } {
  if (!doc) return AREA_COORDINATES.chattogram;

  // 1. Check explicit coordinates object
  if (doc?.address?.coordinates?.latitude && doc?.address?.coordinates?.longitude) {
    return {
      lat: Number(doc.address.coordinates.latitude),
      lng: Number(doc.address.coordinates.longitude),
    };
  }
  if (doc?.location?.coordinates && Array.isArray(doc.location.coordinates)) {
    return {
      lat: Number(doc.location.coordinates[1]),
      lng: Number(doc.location.coordinates[0]),
    };
  }
  if (doc?.latitude && doc?.longitude) {
    return {
      lat: Number(doc.latitude),
      lng: Number(doc.longitude),
    };
  }

  // 2. Text matching on area & city
  const areaStr = (doc?.address?.area || doc?.address?.street || '').toLowerCase();
  const cityStr = (doc?.address?.city || doc?.city || '').toLowerCase();
  const combinedStr = `${areaStr} ${cityStr}`;

  for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
    if (combinedStr.includes(key)) {
      return coords;
    }
  }

  return AREA_COORDINATES.chattogram;
}

/**
 * Haversine formula to compute distance in kilometers between two GPS points
 */
export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 2.5; // fallback average distance
  }
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate distance from user location to restaurant
 */
export function calculateRestaurantDistance(
  restaurantDoc: any,
  userLat?: number,
  userLng?: number
): { distanceKm: number; distanceText: string } {
  if (userLat === undefined || userLng === undefined || !Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    const defaultDist = Number(restaurantDoc?.distanceKm) || 1.8;
    return {
      distanceKm: defaultDist,
      distanceText: `${defaultDist} km away`,
    };
  }

  const restCoords = getRestaurantCoordinates(restaurantDoc);
  const distanceKm = getDistanceInKm(userLat, userLng, restCoords.lat, restCoords.lng);

  return {
    distanceKm,
    distanceText: `${distanceKm} km away`,
  };
}
