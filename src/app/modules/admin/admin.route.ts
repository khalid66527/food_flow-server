import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// Placeholder route for Admin
router.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Admin API route placeholder',
  });
});

export const AdminRoutes = router;
