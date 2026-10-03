type ApiRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

import clientPromise, { DB_NAME, COLLECTION_NAME } from '../lib/mongodb.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });

    return res.status(200).json({
      success: true,
      connected: true,
      message: 'MongoDB Atlas terhubung',
      database: DB_NAME,
      collection: COLLECTION_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MongoDB status error:', error);
    return res.status(500).json({
      success: false,
      connected: false,
      message: error instanceof Error ? error.message : 'Gagal terhubung ke MongoDB',
    });
  }
}
