const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log(`[db] Connected to MongoDB at ${env.mongoUri}`);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    console.error('[db] Is MongoDB running? Start it locally, then retry.');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected.');
  });
}

module.exports = connectDB;
