import express, { Router } from 'express';
import { AiController } from './ai.controller';

const router: Router = express.Router();

router.post('/chat', AiController.chat);

export const AiRoutes = router;
