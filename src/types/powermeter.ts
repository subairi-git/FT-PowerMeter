export interface PowerMeterData {
  voltageA: number;
  voltageB: number;
  voltageC: number;
  currentA: number;
  currentB: number;
  currentC: number;
  activePower: number; // Watts
  reactivePower: number; // VAR
  powerFactor: number;
  frequency: number; // Hz
  activePowerA: number; // Watts
  activePowerB: number;
  activePowerC: number;
  powerFactorA: number;
  powerFactorB: number;
  powerFactorC: number;
  rssi: number; // dBm
  timestamp?: number;
}

export interface AlarmThresholds {
  voltageMin: number; // default 207 V (-10% dari 230V)
  voltageMax: number; // default 253 V (+10% dari 230V)
  currentMax: number; // default 25 A per fasa
  activePowerMax: number; // default 15000 W (15 kW)
  powerFactorMin: number; // default 0.85 (standar penalti PLN)
  frequencyMin: number; // default 49.5 Hz
  frequencyMax: number; // default 50.5 Hz
  rssiMin: number; // default -85 dBm
}

export type AlarmSeverity = 'warning' | 'critical';

export interface AlarmRecord {
  id: string;
  timestamp: string; // ISO string
  parameter: string; // e.g. 'Tegangan Fasa A', 'Daya Aktif Total'
  value: number;
  threshold: number;
  unit: string;
  type: 'min' | 'max';
  severity: AlarmSeverity;
  status: 'active' | 'acknowledged';
  message: string;
}

export interface TaripPLN {
  tariffName: string; // e.g. 'B-2 / TR (Bisnis Menengah)'
  ratePerKWh: number; // e.g. 1444.70
  ppnPercent: number; // 11%
  pjuPercent: number; // Pajak Penerangan Jalan 3%
}

export interface DailyPowerRecord {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string;
  energyKWh: number;
  costRp: number;
  peakPowerW: number;
  peakTime: string;
  avgPowerFactor: number;
  energyPhaseA: number;
  energyPhaseB: number;
  energyPhaseC: number;
  hourlyBreakdown?: {
    hour: number;
    kwh: number;
    watts: number;
    costRp: number;
  }[];
}

export interface MqttConnectionConfig {
  brokerUrl: string; // e.g. 'wss://broker.hivemq.com:8884/mqtt'
  topic: string; // e.g. 'andrian/powermeter/data'
  clientId: string;
  keepAlive: number;
}
