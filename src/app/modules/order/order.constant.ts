/**
 * Order domain constants.
 *
 * NOTE: This project uses the native MongoDB driver (`ordersCollection`), not a
 * Mongoose model, so the order "schema" is enforced at the application layer.
 * These constants act as the source of truth for the order document shape.
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_VALUES: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

/**
 * riderLocation document shape:
 * {
 *   lat: number,
 *   lng: number,
 *   updatedAt: Date
 * }
 */
export const RIDER_LOCATION_FIELDS = ['lat', 'lng', 'updatedAt'] as const;

/**
 * Allowed next statuses for the "Restaurant Partner" role
 * (kitchen-side advancement: pending -> preparing -> ready_for_pickup).
 */
export const RESTAURANT_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PREPARING],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY_FOR_PICKUP],
  [ORDER_STATUS.READY_FOR_PICKUP]: [],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [],
  [ORDER_STATUS.DELIVERED]: [],
};

/**
 * Allowed next statuses for the "Delivery Partner" role
 * (delivery-side advancement: ready_for_pickup -> out_for_delivery -> delivered).
 */
export const RIDER_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [],
  [ORDER_STATUS.PREPARING]: [],
  [ORDER_STATUS.READY_FOR_PICKUP]: [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
};