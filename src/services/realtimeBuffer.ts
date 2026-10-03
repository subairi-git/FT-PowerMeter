import { PowerMeterData } from '../types/powermeter';

export type RealtimePoint = PowerMeterData & { at: string };

const MAX_POINTS = 100;
const buffer: RealtimePoint[] = [];

export const realtimeBuffer = {
  push(data: PowerMeterData) {
    buffer.push({ ...data, at: new Date().toISOString() });
    if (buffer.length > MAX_POINTS) buffer.splice(0, buffer.length - MAX_POINTS);
  },
  getAll(): RealtimePoint[] {
    return [...buffer];
  },
  size(): number {
    return buffer.length;
  },
};
