import http from 'http';
import app from './app';
import config from './app/config';
import { connectDB, client, db, restaurantCollection } from './app/config/db';
import { initSocket } from './app/socket';

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
      server.listen(Number(config.port) || 5000, '0.0.0.0', () => {
        console.log(
          `🚀 Food Flow Server (with Socket.IO) is running on port ${config.port} (0.0.0.0)`
        );
      });
    }
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

bootstrap().catch(console.dir);

