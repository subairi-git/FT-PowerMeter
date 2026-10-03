import 'dotenv/config';
import express from 'express';
import mqtt from 'mqtt';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 10000);
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'powermeter_db';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'power_readings';
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'andrian/powermeter/data';
const SAVE_INTERVAL_MS = Number(process.env.SAVE_INTERVAL_MS || 60000);

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI belum diatur.');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

let mongoClient = null;
let readingsCollection = null;
let mongoConnected = false;
let mqttClient = null;
let latestData = null;
let lastMqttAt = null;
let lastSavedAt = null;
let lastSaveError = null;
let packetCount = 0;
let saveCount = 0;

function sanitizeTelemetry(parsed) {
  const number = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    voltageA: number(parsed.voltageA, 220),
    voltageB: number(parsed.voltageB, 220),
    voltageC: number(parsed.voltageC, 220),
    currentA: number(parsed.currentA),
    currentB: number(parsed.currentB),
    currentC: number(parsed.currentC),
    activePower: number(parsed.activePower),
    reactivePower: number(parsed.reactivePower),
    powerFactor: number(parsed.powerFactor, 0.98),
    frequency: number(parsed.frequency, 50),
    activePowerA: number(parsed.activePowerA),
    activePowerB: number(parsed.activePowerB),
    activePowerC: number(parsed.activePowerC),
    powerFactorA: number(parsed.powerFactorA, 0.95),
    powerFactorB: number(parsed.powerFactorB, 0.95),
    powerFactorC: number(parsed.powerFactorC, 0.95),
    rssi: number(parsed.rssi, -70),
    mqttTimestamp: parsed.timestamp ?? null,
  };
}

async function connectMongo() {
  try {
    mongoClient = new MongoClient(MONGODB_URI, { maxPoolSize: 10 });
    await mongoClient.connect();
    await mongoClient.db('admin').command({ ping: 1 });

    const db = mongoClient.db(DB_NAME);
    readingsCollection = db.collection(COLLECTION_NAME);

    // Membuat collection/index secara nyata tanpa menunggu insert pertama.
    try {
      await db.createCollection(COLLECTION_NAME);
    } catch (error) {
      if (error?.codeName !== 'NamespaceExists' && error?.code !== 48) throw error;
    }

    await readingsCollection.createIndex({ savedAt: -1 });
    await readingsCollection.createIndex({ receivedAt: -1 });

    mongoConnected = true;
    console.log(`[MongoDB] Connected: ${DB_NAME}.${COLLECTION_NAME}`);
  } catch (error) {
    mongoConnected = false;
    console.error('[MongoDB] Connection failed:', error);
    throw error;
  }
}

function connectMqtt() {
  const clientId = `ft_powermeter_render_${Math.random().toString(16).slice(2, 10)}`;
  mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId,
    clean: true,
    keepalive: 60,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
  });

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected: ${MQTT_BROKER_URL}`);
    mqttClient.subscribe(MQTT_TOPIC, { qos: 0 }, (error) => {
      if (error) console.error('[MQTT] Subscribe failed:', error);
      else console.log(`[MQTT] Subscribed: ${MQTT_TOPIC}`);
    });
  });

  mqttClient.on('message', (topic, payload) => {
    if (topic !== MQTT_TOPIC) return;
    try {
      const parsed = JSON.parse(payload.toString());
      latestData = sanitizeTelemetry(parsed);
      lastMqttAt = new Date();
      packetCount += 1;
    } catch (error) {
      console.error('[MQTT] Invalid JSON:', error);
    }
  });

  mqttClient.on('reconnect', () => console.log('[MQTT] Reconnecting...'));
  mqttClient.on('close', () => console.log('[MQTT] Connection closed'));
  mqttClient.on('error', (error) => console.error('[MQTT] Error:', error.message));
}

async function saveLatestTelemetry() {
  if (!latestData || !readingsCollection || !mongoConnected) return;

  try {
    const now = new Date();
    const document = {
      ...latestData,
      receivedAt: lastMqttAt || now,
      savedAt: now,
      source: 'render-mqtt-collector',
      mqttTopic: MQTT_TOPIC,
    };

    const result = await readingsCollection.insertOne(document);
    lastSavedAt = now;
    lastSaveError = null;
    saveCount += 1;
    console.log(`[MongoDB] Saved ${result.insertedId} at ${now.toISOString()}`);
  } catch (error) {
    lastSaveError = error instanceof Error ? error.message : String(error);
    console.error('[MongoDB] Save failed:', error);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    mqtt: {
      connected: Boolean(mqttClient?.connected),
      broker: MQTT_BROKER_URL,
      topic: MQTT_TOPIC,
      packetCount,
      lastMessageAt: lastMqttAt,
    },
    mongodb: {
      connected: mongoConnected,
      database: DB_NAME,
      collection: COLLECTION_NAME,
      lastSavedAt,
      saveCount,
      lastSaveError,
      saveIntervalSeconds: SAVE_INTERVAL_MS / 1000,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db-status', async (_req, res) => {
  try {
    if (!mongoClient) throw new Error('MongoDB client belum tersedia');
    await mongoClient.db('admin').command({ ping: 1 });
    const count = readingsCollection ? await readingsCollection.estimatedDocumentCount() : 0;
    res.json({ success: true, connected: true, database: DB_NAME, collection: COLLECTION_NAME, documents: count });
  } catch (error) {
    res.status(500).json({ success: false, connected: false, message: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/latest', (_req, res) => {
  if (!latestData) {
    return res.status(503).json({ success: false, message: 'Belum ada data MQTT diterima' });
  }
  res.json({ success: true, receivedAt: lastMqttAt, data: latestData });
});

app.get('/api/history', async (req, res) => {
  try {
    if (!readingsCollection) throw new Error('MongoDB belum terhubung');
    const requested = Number(req.query.limit || 1000);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 1000, 1), 10000);
    const query = {};
    const start = req.query.start ? new Date(String(req.query.start)) : null;
    const end = req.query.end ? new Date(String(req.query.end)) : null;
    if ((start && !Number.isNaN(start.getTime())) || (end && !Number.isNaN(end.getTime()))) {
      query.savedAt = {};
      if (start && !Number.isNaN(start.getTime())) query.savedAt.$gte = start;
      if (end && !Number.isNaN(end.getTime())) query.savedAt.$lte = end;
    }
    const data = await readingsCollection.find(query).sort({ savedAt: 1 }).limit(limit).toArray();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : String(error) });
  }
});

// Endpoint manual untuk memastikan database/collection benar-benar menerima write.
app.post('/api/test-write', async (_req, res) => {
  try {
    if (!readingsCollection) throw new Error('MongoDB belum terhubung');
    const result = await readingsCollection.insertOne({ type: 'connection-test', savedAt: new Date(), source: 'manual-test' });
    res.status(201).json({ success: true, insertedId: result.insertedId, database: DB_NAME, collection: COLLECTION_NAME });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : String(error) });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

async function start() {
  await connectMongo();
  connectMqtt();

  setInterval(() => {
    saveLatestTelemetry().catch((error) => console.error('[Collector] Interval error:', error));
  }, SAVE_INTERVAL_MS);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] FT-PowerMeter running on port ${PORT}`);
    console.log(`[Collector] Save interval: ${SAVE_INTERVAL_MS / 1000} seconds`);
  });
}

async function shutdown(signal) {
  console.log(`[System] ${signal} received, shutting down...`);
  try { mqttClient?.end(true); } catch {}
  try { await mongoClient?.close(); } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  console.error('[System] Startup failed:', error);
  process.exit(1);
});
