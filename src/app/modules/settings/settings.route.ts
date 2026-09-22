import express, { Router } from 'express';
import { SettingsController } from './settings.controller';

const router: Router = express.Router();

router.get('/', SettingsController.getSettings);
router.put('/', SettingsController.updateSettings);

export const SettingsRoutes = router;
