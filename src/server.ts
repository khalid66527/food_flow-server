
import http from "http";
import app from "./app";
import config from "./app/config";
import { connectDB, client, db, restaurantCollection } from "./app/config/db";
import { initSocket } from "./app/socket";


// Re-exporting for backward compatibility if needed
export { client, db, restaurantCollection };

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(server);

    // Start Server (avoid double listening in Vercel serverless environment)
    if (!config.is_vercel) {
      // Create the HTTP server explicitly so Socket.io can attach to it
      const httpServer = http.createServer(app);

      // Initialize Socket.io (CORS enabled for the client origin)
      initSocketServer(httpServer);

      httpServer.listen(config.port, async () => {
        console.log(`🚀 Food Flow Server is running on http://localhost:${config.port}`);

        // Test socket startup during server initialization
        await testSocketStartup(`http://localhost:${config.port}`);
      server.listen(Number(config.port), '0.0.0.0', () => {
        console.log(
          `🚀 Food Flow Server (with Socket.IO) is running on port ${config.port} (0.0.0.0)`,
        );
      });
    }
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

bootstrap().catch(console.dir);

