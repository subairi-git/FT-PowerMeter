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

const numericFields = [
  'voltageA','voltageB','voltageC',
  'currentA','currentB','currentC',
  'activePower','reactivePower','powerFactor','frequency',
  'activePowerA','activePowerB','activePowerC',
  'powerFactorA','powerFactorB','powerFactorC','rssi'
] as const;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};

    for (const field of numericFields) {
      if (typeof body[field] !== 'number' || !Number.isFinite(body[field])) {
        return res.status(400).json({
          success: false,
          message: `Field ${field} tidak valid`,
        });
      }
    }

    const client = await clientPromise;
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

    const sourceTimestamp =
      typeof body.timestamp === 'number' && Number.isFinite(body.timestamp)
        ? new Date(body.timestamp)
        : new Date();

    const document = {
      ...Object.fromEntries(numericFields.map((field) => [field, body[field]])),
      sourceTimestamp,
      receivedAt: new Date(),
      source: 'mqtt-dashboard',
    };

    const result = await collection.insertOne(document);

    return res.status(201).json({
      success: true,
      message: 'Telemetry berhasil disimpan',
      insertedId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Telemetry insert error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Gagal menyimpan telemetry',
    });
  }
}
