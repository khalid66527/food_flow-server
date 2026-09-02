import app from "./app";
import config from "./app/config";
import { connectDB, client, db, restaurantCollection } from "./app/config/db";

// Re-exporting for backward compatibility if needed
export { client, db, restaurantCollection };

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Server (avoid double listening in Vercel serverless environment)
    if (!config.is_vercel) {
      app.listen(config.port, () => {
        console.log(
          `🚀 Food Flow Server is running on http://localhost:${config.port}`,
        );
      });
    }
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

bootstrap().catch(console.dir);
