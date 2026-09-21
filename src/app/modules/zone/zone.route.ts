import express, { Router } from 'express';
import { ZoneController } from './zone.controller';

const router: Router = express.Router();

/**
 * Delivery Zone Routes (/api/zones)
 */

// 1. Detect User Zone from Lat/Lng Coordinates
router.get('/detect', ZoneController.detectUserZone);

// 2. Get All Zones
router.get('/', ZoneController.getAllZones);

// 3. Get Single Zone by ID or Slug
router.get('/:id', ZoneController.getSingleZone);

// 4. Create New Zone
router.post('/', ZoneController.createZone);

// 5. Update Existing Zone
router.patch('/:id', ZoneController.updateZone);

// 6. Toggle Zone Active / Inactive Status
router.patch('/:id/status', ZoneController.toggleZoneStatus);

// 7. Delete Zone
router.delete('/:id', ZoneController.deleteZone);

export const ZoneRoutes = router;
