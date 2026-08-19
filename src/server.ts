import mongoose from 'mongoose';
import app from './app';
import config from './app/config';

async function main() {
  try {
    if (config.database_url && !config.database_url.includes('username:password')) {
      await mongoose.connect(config.database_url as string);
      console.log('Successfully connected to MongoDB Database');
    } else {
      console.warn('MongoDB connection skipped: Please update MONGODB_URI in .env with your real connection string.');
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }

  app.listen(config.port, () => {
    console.log(`Food Flow Server running on port ${config.port}`);
  });
}

main();
