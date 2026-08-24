import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb';
import config from './index';

if (!config.mongodb_uri) {
  console.error('❌ MONGODB_URI is not defined in .env file.');
  process.exit(1);
}

export const client = new MongoClient(config.mongodb_uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const db: Db = client.db(config.db_name);

// Database Collections
export const restaurantCollection: Collection = db.collection('restaurant');
export const foodCollection: Collection = db.collection('food');

export async function connectDB() {
  try {
    await client.connect();
    await db.command({ ping: 1 });
    console.log('🌿 Successfully connected to MongoDB Database!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}
