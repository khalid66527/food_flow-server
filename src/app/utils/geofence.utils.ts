import { ICoordinates, TZone } from '../modules/zone/zone.interface';

/**
 * Haversine formula to compute geodesic distance between two points in Kilometers
 */
export function getHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 2.5; // safe fallback
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
  const dist = R * c;
  return Math.round(dist * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if a point is within a circular radius
 */
export function isPointInCircle(
  point: ICoordinates,
  center: ICoordinates,
  radiusKm: number
): boolean {
  if (!point || !center || radiusKm <= 0) return false;
  const distance = getHaversineDistanceKm(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radiusKm;
}

/**
 * Ray-Casting Algorithm: Check if a point is inside a polygon or rectangle boundary
 */
export function isPointInPolygon(
  point: ICoordinates,
  polygon: ICoordinates[]
): boolean {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  const { latitude: x, longitude: y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Determine if a point lies strictly inside a Zone (dispatch by shapeType)
 */
export function isPointInZone(point: ICoordinates, zone: Partial<TZone>): boolean {
  if (!point || !zone) return false;

  const shapeType = zone.shapeType || 'circle';

  if (shapeType === 'polygon' || shapeType === 'rectangle') {
    if (zone.polygonCoordinates && zone.polygonCoordinates.length >= 3) {
      const inPoly = isPointInPolygon(point, zone.polygonCoordinates);
      if (inPoly) return true;
    }
    // Fallback check center + radius if polygon coordinates unavailable
    if (zone.centerCoordinates && zone.radiusKm) {
      return isPointInCircle(point, zone.centerCoordinates, zone.radiusKm);
    }
    return false;
  }

  if (shapeType === 'polyline' && zone.polygonCoordinates) {
    // For corridor lines, check if distance to any vertex on polyline is within corridor buffer (1.5 km default)
    const corridorBufferKm = zone.radiusKm || 1.5;
    for (const vertex of zone.polygonCoordinates) {
      const dist = getHaversineDistanceKm(
        point.latitude,
        point.longitude,
        vertex.latitude,
        vertex.longitude
      );
      if (dist <= corridorBufferKm) return true;
    }
    return false;
  }

  // Default 'circle'
  if (zone.centerCoordinates && zone.radiusKm) {
    return isPointInCircle(point, zone.centerCoordinates, zone.radiusKm);
  }

  return false;
}

/**
 * Calculate the distance from a coordinate point to the perimeter / boundary of a zone in KM.
 * Returns 0 if point is strictly inside the zone.
 */
export function getDistanceToZoneBorderKm(
  point: ICoordinates,
  zone: Partial<TZone>
): number {
  if (!point || !zone) return Infinity;

  // If strictly inside the zone, distance to border is 0
  if (isPointInZone(point, zone)) {
    return 0;
  }

  const shape = zone.shapeType || 'circle';

  // 1. Circle
  if (shape === 'circle' && zone.centerCoordinates) {
    const distToCenter = getHaversineDistanceKm(
      point.latitude,
      point.longitude,
      zone.centerCoordinates.latitude,
      zone.centerCoordinates.longitude
    );
    const radius = Number(zone.radiusKm) || 5.0;
    return Math.max(0, distToCenter - radius);
  }

  // 2. Polygon or Rectangle
  if (
    (shape === 'polygon' || shape === 'rectangle') &&
    Array.isArray(zone.polygonCoordinates) &&
    zone.polygonCoordinates.length >= 3
  ) {
    let minVertexDist = Infinity;
    for (const vertex of zone.polygonCoordinates) {
      const d = getHaversineDistanceKm(
        point.latitude,
        point.longitude,
        Number(vertex.latitude),
        Number(vertex.longitude)
      );
      if (d < minVertexDist) {
        minVertexDist = d;
      }
    }

    if (zone.centerCoordinates) {
      const distToCenter = getHaversineDistanceKm(
        point.latitude,
        point.longitude,
        zone.centerCoordinates.latitude,
        zone.centerCoordinates.longitude
      );
      const radius = Number(zone.radiusKm) || 5.0;
      const distToEdge = Math.max(0, distToCenter - radius);
      return Math.min(minVertexDist, distToEdge);
    }

    return minVertexDist;
  }

  // 3. Polyline corridor
  if (
    shape === 'polyline' &&
    Array.isArray(zone.polygonCoordinates) &&
    zone.polygonCoordinates.length > 0
  ) {
    let minVertexDist = Infinity;
    const corridorBufferKm = Number(zone.radiusKm) || 1.5;
    for (const vertex of zone.polygonCoordinates) {
      const d = getHaversineDistanceKm(
        point.latitude,
        point.longitude,
        Number(vertex.latitude),
        Number(vertex.longitude)
      );
      if (d < minVertexDist) {
        minVertexDist = d;
      }
    }
    return Math.max(0, minVertexDist - corridorBufferKm);
  }

  // Fallback center coordinates
  if (zone.centerCoordinates) {
    const distToCenter = getHaversineDistanceKm(
      point.latitude,
      point.longitude,
      zone.centerCoordinates.latitude,
      zone.centerCoordinates.longitude
    );
    const radius = Number(zone.radiusKm) || 5.0;
    return Math.max(0, distToCenter - radius);
  }

  return Infinity;
}

export function findCandidateZones(
  userLat: number,
  userLng: number,
  zones: TZone[],
  borderBufferKm: number = 4.0
): {
  primaryZone: TZone | null;
  candidateZones: TZone[];
  candidateZoneIds: string[];
  adjacentZones: TZone[];
} {
  const userPoint: ICoordinates = { latitude: userLat, longitude: userLng };
  let primaryZone: TZone | null = null;
  const candidateSet = new Map<string, TZone>();
  const adjacentZones: TZone[] = [];

  // Pass 1: Strict containment check for Primary Zone
  for (const zone of zones) {
    if (!zone.isActive) continue;

    const isInside = isPointInZone(userPoint, zone);
    const zoneKey = zone.zoneId !== undefined ? String(zone.zoneId) : (zone._id ? zone._id.toString() : '');

    if (isInside) {
      if (!primaryZone) primaryZone = zone;
      if (zoneKey) candidateSet.set(zoneKey, zone);
    }
  }

  // Pass 2: Hybrid Border Buffer Expansion
  // If user is within borderBufferKm (default 4.0 km) of any neighboring zone border,
  // include that zone as a candidate so its nearby restaurants can be pre-filtered from DB!
  for (const zone of zones) {
    if (!zone.isActive) continue;

    const zoneKey = zone.zoneId !== undefined ? String(zone.zoneId) : (zone._id ? zone._id.toString() : '');
    if (!zoneKey || candidateSet.has(zoneKey)) continue;

    const distToBorder = getDistanceToZoneBorderKm(userPoint, zone);
    const maxAllowedBuffer = Math.min(borderBufferKm, Number(zone.maxDeliveryRadiusKm || 4.0));

    if (distToBorder <= maxAllowedBuffer) {
      candidateSet.set(zoneKey, zone);
      adjacentZones.push(zone);
      if (!primaryZone) {
        primaryZone = zone;
      }
    }
  }

  const candidateZones = Array.from(candidateSet.values());
  const candidateZoneIds = Array.from(candidateSet.keys());

  return {
    primaryZone,
    candidateZones,
    candidateZoneIds,
    adjacentZones,
  };
}

/**
 * Compute Dynamic Delivery Fee based on distance and zone pricing rules
 */
export function calculateDynamicDeliveryFee(
  distanceKm: number,
  baseFee = 30,
  perKmFee = 10,
  baseDistKm = 2
): number {
  if (distanceKm <= baseDistKm) {
    return baseFee;
  }
  const extraKm = distanceKm - baseDistKm;
  return Math.round(baseFee + extraKm * perKmFee);
}
