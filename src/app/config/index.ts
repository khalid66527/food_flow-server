import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodb_uri: process.env.MONGODB_URI,
  db_name: process.env.DB_NAME || 'food-delivery-platform',
  is_vercel: process.env.VERCEL === '1',
};
