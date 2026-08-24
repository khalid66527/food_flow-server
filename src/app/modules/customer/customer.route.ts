import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// Placeholder route for Customer
router.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Customer API route placeholder',
  });
});

export const CustomerRoutes = router;
