import express, { Router } from 'express';
import { AiController } from './ai.controller';

const router: Router = express.Router();

router.post('/chat', AiController.chat);
router.get('/settings', AiController.getSettings);
router.put('/settings', AiController.updateSettings);
router.post('/test-key', AiController.testKey);

export const AiRoutes = router;
