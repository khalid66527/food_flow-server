import { Request, Response } from 'express';
import { SettingsService } from './settings.service';

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    try {
      const data = await SettingsService.getPlatformSettings();
      return res.status(200).json({
        success: true,
        message: 'Platform settings fetched successfully',
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch platform settings',
      });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const updatedData = await SettingsService.updatePlatformSettings(req.body);
      return res.status(200).json({
        success: true,
        message: 'Platform settings updated successfully',
        data: updatedData,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update platform settings',
      });
    }
  }
}
