export interface TPlatformSettings {
  _id?: string;
  key?: string;
  vatPercentage: number;
  restaurantCommissionPercentage: number;
  deliveryFeeBase: number;
  riderCommissionPercentage: number;
  freeDeliveryThreshold: number;
  updatedAt?: string;
}
