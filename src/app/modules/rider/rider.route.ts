import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// Placeholder route for Rider
router.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Rider API route placeholder',
  });
});

export const RiderRoutes = router;
