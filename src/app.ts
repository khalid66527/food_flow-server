const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express, { Application, Request, Response } from "express";
import cors from "cors";

const app: Application = express();

// Parsers
app.use(express.json());
app.use(cors());

// Application routes
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Food Flow Server is running successfully!",
  });
});

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

export default app;
