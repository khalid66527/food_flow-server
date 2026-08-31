import http from 'http';
import app from './app';
import config from './app/config';
import { connectDB, client, db, restaurantCollection } from './app/config/db';
import { initSocket, setIoInstance } from './app/sockets';

// Re-exporting for backward compatibility if needed
export { client, db, restaurantCollection };

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    const io = initSocket(httpServer);
    setIoInstance(io);

    // Start Server (avoid double listening in Vercel serverless environment)
    if (!config.is_vercel) {
      httpServer.listen(config.port, () => {
        console.log(`🚀 Food Flow Server is running on http://localhost:${config.port}`);
        console.log(`🔌 Socket.io is ready for connections`);
      });
    }
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

bootstrap().catch(console.dir);
