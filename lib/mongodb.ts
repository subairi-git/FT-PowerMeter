import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    'MONGODB_URI belum diatur. Tambahkan MONGODB_URI pada Environment Variables Vercel.'
  );
}

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo._mongoClientPromise ??
  new MongoClient(uri, { maxPoolSize: 10 }).connect();

if (process.env.NODE_ENV !== 'production') {
  globalForMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;
export const DB_NAME = process.env.MONGODB_DB || 'powermeter_db';
export const COLLECTION_NAME =
  process.env.MONGODB_COLLECTION || 'power_readings';
