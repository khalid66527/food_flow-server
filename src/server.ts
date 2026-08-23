import { MongoClient, ServerApiVersion } from 'mongodb';
import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not defined in .env file.');
  process.exit(1);
}

// Create a MongoClient
export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database & Restaurant Collection
export const db = client.db(process.env.DB_NAME || 'food-delivery-platform');
export const restaurantCollection = db.collection('restaurant');






async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    await db.command({ ping: 1 });
    console.log('🌿 Successfully connected to MongoDB Database!');

    if (process.env.VERCEL !== '1') {
      app.listen(port, () => {
        console.log(`🚀 Food Flow Server is running on http://localhost:${port}`);
      });
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

run().catch(console.dir);
