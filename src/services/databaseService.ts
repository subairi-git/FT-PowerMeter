import { PowerMeterData } from '../types/powermeter';

export interface DatabaseStatus {
  success: boolean;
  connected: boolean;
  message: string;
  database?: string;
  collection?: string;
  timestamp?: string;
}

export interface SaveTelemetryResult {
  success: boolean;
  message: string;
  insertedId?: string;
}

class DatabaseService {
  private lastSaveTime = 0;
  private saveInterval = 5000;

  async getStatus(): Promise<DatabaseStatus> {
    const response = await fetch('/api/db-status', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'MongoDB tidak terhubung');
    return result;
  }

  async saveTelemetry(data: PowerMeterData): Promise<SaveTelemetryResult> {
    const response = await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal menyimpan telemetry');
    return result;
  }

  async saveTelemetryThrottled(
    data: PowerMeterData
  ): Promise<SaveTelemetryResult | null> {
    const now = Date.now();
    if (now - this.lastSaveTime < this.saveInterval) return null;

    // Set sebelum await agar burst MQTT tidak menghasilkan insert paralel.
    this.lastSaveTime = now;
    return this.saveTelemetry(data);
  }

  setSaveInterval(milliseconds: number) {
    if (milliseconds < 1000) throw new Error('Interval minimum 1000 ms');
    this.saveInterval = milliseconds;
  }

  async getRawHistory(limit = 100) {
    const response = await fetch(`/api/history?limit=${limit}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal mengambil history');
    return result;
  }
}

export const databaseService = new DatabaseService();
