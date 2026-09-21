import { settingsCollection } from '../../config/db';
import { TPlatformSettings } from './settings.interface';

const DEFAULT_SETTINGS: TPlatformSettings = {
  key: 'global_settings',
  vatPercentage: 5,
  restaurantCommissionPercentage: 15,
  deliveryFeeBase: 40,
  riderCommissionPercentage: 100,
  freeDeliveryThreshold: 500,
  updatedAt: new Date().toISOString(),
};

export class SettingsService {
  static async getPlatformSettings(): Promise<TPlatformSettings> {
    let settings = await settingsCollection.findOne({ key: 'global_settings' });

    if (!settings) {
      await settingsCollection.insertOne(DEFAULT_SETTINGS as any);
      settings = await settingsCollection.findOne({ key: 'global_settings' });
    }

    return {
      vatPercentage: Number(settings?.vatPercentage ?? 5),
      restaurantCommissionPercentage: Number(settings?.restaurantCommissionPercentage ?? 15),
      deliveryFeeBase: Number(settings?.deliveryFeeBase ?? 40),
      riderCommissionPercentage: Number(settings?.riderCommissionPercentage ?? 100),
      freeDeliveryThreshold: Number(settings?.freeDeliveryThreshold ?? 500),
      updatedAt: settings?.updatedAt || new Date().toISOString(),
    };
  }

  static async updatePlatformSettings(payload: Partial<TPlatformSettings>): Promise<TPlatformSettings> {
    const updateDoc: any = {
      updatedAt: new Date().toISOString(),
    };

    if (payload.vatPercentage !== undefined) {
      updateDoc.vatPercentage = Math.max(0, Number(payload.vatPercentage));
    }
    if (payload.restaurantCommissionPercentage !== undefined) {
      updateDoc.restaurantCommissionPercentage = Math.max(0, Number(payload.restaurantCommissionPercentage));
    }
    if (payload.deliveryFeeBase !== undefined) {
      updateDoc.deliveryFeeBase = Math.max(0, Number(payload.deliveryFeeBase));
    }
    if (payload.riderCommissionPercentage !== undefined) {
      updateDoc.riderCommissionPercentage = Math.max(0, Math.min(100, Number(payload.riderCommissionPercentage)));
    }
    if (payload.freeDeliveryThreshold !== undefined) {
      updateDoc.freeDeliveryThreshold = Math.max(0, Number(payload.freeDeliveryThreshold));
    }

    await settingsCollection.updateOne(
      { key: 'global_settings' },
      { $set: updateDoc },
      { upsert: true }
    );

    return this.getPlatformSettings();
  }
}
