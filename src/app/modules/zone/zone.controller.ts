import { Request, Response } from 'express';
import { ZoneService } from './zone.service';

export class ZoneController {
  static async createZone(req: Request, res: Response) {
    try {
      const result = await ZoneService.createZone(req.body);
      return res.status(201).json({
        success: true,
        message: 'Delivery Zone created successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create delivery zone.',
      });
    }
  }

  static async getAllZones(req: Request, res: Response) {
    try {
      const result = await ZoneService.getAllZones(req.query);
      return res.status(200).json({
        success: true,
        message: 'Delivery Zones retrieved successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve delivery zones.',
      });
    }
  }

  static async getSingleZone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ZoneService.getSingleZone(id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Delivery Zone not found.',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Delivery Zone retrieved successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve delivery zone.',
      });
    }
  }

  static async updateZone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ZoneService.updateZone(id, req.body);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Delivery Zone not found to update.',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Delivery Zone updated successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update delivery zone.',
      });
    }
  }

  static async deleteZone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const isDeleted = await ZoneService.deleteZone(id);
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Delivery Zone not found to delete.',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Delivery Zone deleted successfully.',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete delivery zone.',
      });
    }
  }

  static async toggleZoneStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const result = await ZoneService.toggleZoneStatus(id, isActive);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Delivery Zone not found.',
        });
      }
      return res.status(200).json({
        success: true,
        message: `Delivery Zone status changed to ${isActive ? 'Active' : 'Inactive'}.`,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle delivery zone status.',
      });
    }
  }

  static async detectUserZone(req: Request, res: Response) {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({
          success: false,
          message: 'Valid latitude (lat) and longitude (lng) query parameters are required.',
        });
      }

      const result = await ZoneService.detectUserZone(lat, lng);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to detect user delivery zone.',
      });
    }
  }
}
