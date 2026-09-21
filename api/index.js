const app = require('../dist/app').default;
const { connectDB } = require('../dist/app/config/db');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Database connection error in serverless handler:', err);
    }
  }
  return app(req, res);
};
