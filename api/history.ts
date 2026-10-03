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
    const raw = Array.isArray(req.query?.limit) ? req.query?.limit[0] : req.query?.limit;
    const requested = Number(raw ?? 100);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 100, 1), 5000);

    const client = await clientPromise;
    const records = await client
      .db(DB_NAME)
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ receivedAt: -1 })
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      count: records.length,
      database: DB_NAME,
      collection: COLLECTION_NAME,
      data: records,
    });
  } catch (error) {
    console.error('History API error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Gagal membaca history',
    });
  }
}
