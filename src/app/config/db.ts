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
// Better Auth typically uses 'user' (singular), we also support collection fallback
export const usersCollection: Collection = db.collection('user');
export const restaurantCollection: Collection = db.collection('restaurant');
export const riderCollection: Collection = db.collection('rider');
export const foodCollection: Collection = db.collection('food');
export const cartCollection: Collection = db.collection('cart');
export const contactCollection: Collection = db.collection('contacts');
export const addressCollection: Collection = db.collection('address');
export const ordersCollection: Collection = db.collection('orders');
export const categoryCollection: Collection = db.collection('category');
export const settingsCollection: Collection = db.collection('platform_settings');
export const couponsCollection: Collection = db.collection('coupons');
export const successOrdersCollection: Collection = db.collection('successorders');
export const reviewCollection: Collection = db.collection('reviews');
export const favoritesCollection: Collection = db.collection('favorites');
export const zoneCollection: Collection = db.collection('zones');

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