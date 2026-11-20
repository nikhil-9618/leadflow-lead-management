const mongoose = require('mongoose');

/**
 * Establishes the MongoDB connection.
 * Throws on failure so the bootstrap can exit with a clear message.
 */
const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Copy server/.env.example to server/.env.');
  }

  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  const { host, name } = connection.connection;
  console.log(`[db] MongoDB connected: ${host}/${name}`);

  mongoose.connection.on('error', (error) => {
    console.error('[db] MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  return connection;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
