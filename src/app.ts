// Optional: uncomment if you face network/DNS issues with MongoDB Atlas
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import router from './app/routes';

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Root & Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Food Flow Server API 🚀',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// Application API Routes (/api/restaurants, /api/v1/restaurants, /api/admin, etc.)
app.use('/api', router);
app.use('/api/v1', router);

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
