import mongoose from 'mongoose';
import { loadEnv } from '../config/env.js';

export async function connectToMongoDB() {
  const env = loadEnv();
  
  try {
    await mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
    throw error;
  }
}
