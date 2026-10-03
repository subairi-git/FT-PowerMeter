import mqtt, { MqttClient } from 'mqtt';
import { PowerMeterData, MqttConnectionConfig } from '../types/powermeter';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

export const DEFAULT_CONFIG: MqttConnectionConfig = {
  brokerUrl: 'wss://broker.hivemq.com:8884/mqtt',
  topic: 'andrian/powermeter/data',
  clientId: `powermeter_dash_${Math.random().toString(16).substring(2, 8)}`,
  keepAlive: 60,
};

// Default initial data matching exact user specification
export const INITIAL_POWER_DATA: PowerMeterData = {
  voltageA: 231.95,
  voltageB: 231.48,
  voltageC: 235.17,
  currentA: 9.48,
  currentB: 15.58,
  currentC: 21.15,
  activePower: 10117.36,
  reactivePower: -576.35,
  powerFactor: 0.998,
  frequency: 49.98,
  activePowerA: 1655.04,
  activePowerB: 3535.47,
  activePowerC: 4926.85,
  powerFactorA: 0.893,
  powerFactorB: 0.997,
  powerFactorC: 1,
  rssi: -71,
  timestamp: Date.now(),
};

class MqttService {
  private client: MqttClient | null = null;
  private status: ConnectionStatus = 'disconnected';
  private config: MqttConnectionConfig = DEFAULT_CONFIG;
  private messageListeners: ((data: PowerMeterData) => void)[] = [];
  private statusListeners: ((status: ConnectionStatus, message?: string) => void)[] = [];
  private packetCount = 0;
  private lastMessageTime: number | null = null;
  private isSimulationActive = false;
  private simulationTimer: number | null = null;
  private lastData: PowerMeterData = { ...INITIAL_POWER_DATA };

  constructor() {
    // Try to load saved config from localStorage
    try {
      const saved = localStorage.getItem('powermeter_mqtt_config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  public getConfig(): MqttConnectionConfig {
    return { ...this.config };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getStats() {
    return {
      packetCount: this.packetCount,
      lastMessageTime: this.lastMessageTime,
      isSimulationActive: this.isSimulationActive,
      topic: this.config.topic,
      brokerUrl: this.config.brokerUrl,
    };
  }

  public subscribeData(listener: (data: PowerMeterData) => void) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    };
  }

  public subscribeStatus(listener: (status: ConnectionStatus, message?: string) => void) {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status, message));
  }

  private notifyData(data: PowerMeterData) {
    this.lastData = data;
    this.lastMessageTime = Date.now();
    this.packetCount++;
    this.messageListeners.forEach((l) => l(data));
  }

  public connect(customConfig?: Partial<MqttConnectionConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
      try {
        localStorage.setItem('powermeter_mqtt_config', JSON.stringify(this.config));
      } catch {
        // ignore
      }
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }

    this.notifyStatus('connecting', `Menghubungkan ke ${this.config.brokerUrl}...`);

    try {
      this.client = mqtt.connect(this.config.brokerUrl, {
        clientId: this.config.clientId || `dash_${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
        keepalive: this.config.keepAlive,
      });

      this.client.on('connect', () => {
        this.notifyStatus('connected', `Terhubung ke broker ${this.config.brokerUrl}`);
        if (this.client) {
          this.client.subscribe(this.config.topic, { qos: 0 }, (err) => {
            if (err) {
              console.error('Subscription error:', err);
              this.notifyStatus('error', `Gagal subscribe topik: ${err.message}`);
            } else {
              console.log(`Subscribed to topic: ${this.config.topic}`);
            }
          });
        }
      });

      this.client.on('message', (_topic, payload) => {
        try {
          const str = payload.toString();
          const parsed = JSON.parse(str);
          
          // Validate and sanitize data
          const powerData: PowerMeterData = {
            voltageA: Number(parsed.voltageA ?? 220),
            voltageB: Number(parsed.voltageB ?? 220),
            voltageC: Number(parsed.voltageC ?? 220),
            currentA: Number(parsed.currentA ?? 0),
            currentB: Number(parsed.currentB ?? 0),
            currentC: Number(parsed.currentC ?? 0),
            activePower: Number(parsed.activePower ?? 0),
            reactivePower: Number(parsed.reactivePower ?? 0),
            powerFactor: Number(parsed.powerFactor ?? 0.98),
            frequency: Number(parsed.frequency ?? 50.0),
            activePowerA: Number(parsed.activePowerA ?? 0),
            activePowerB: Number(parsed.activePowerB ?? 0),
            activePowerC: Number(parsed.activePowerC ?? 0),
            powerFactorA: Number(parsed.powerFactorA ?? 0.95),
            powerFactorB: Number(parsed.powerFactorB ?? 0.95),
            powerFactorC: Number(parsed.powerFactorC ?? 0.95),
            rssi: Number(parsed.rssi ?? -70),
            timestamp: Date.now(),
          };

          this.notifyData(powerData);
        } catch (err) {
          console.error('Failed to parse MQTT message JSON:', err);
        }
      });

      this.client.on('reconnect', () => {
        this.notifyStatus('reconnecting', 'Menghubungkan ulang...');
      });

      this.client.on('close', () => {
        if (this.status !== 'disconnected') {
          this.notifyStatus('disconnected', 'Koneksi terputus');
        }
      });

      this.client.on('error', (err) => {
        console.error('MQTT error:', err);
        this.notifyStatus('error', err.message || 'Kesalahan koneksi broker');
      });
    } catch (err: any) {
      console.error('Failed to initiate MQTT client:', err);
      this.notifyStatus('error', err?.message || 'Gagal inisialisasi koneksi');
    }
  }

  public disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.notifyStatus('disconnected', 'Koneksi dimatikan oleh pengguna');
  }

  public publishData(data: Partial<PowerMeterData>) {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client belum terhubung');
    }
    const payload = JSON.stringify({ ...this.lastData, ...data });
    this.client.publish(this.config.topic, payload, { qos: 0 });
  }

  // Realistic telemetry simulation toggle (when testing offline or no publisher active)
  public toggleSimulation(active?: boolean) {
    this.isSimulationActive = active !== undefined ? active : !this.isSimulationActive;

    if (this.simulationTimer) {
      window.clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.isSimulationActive) {
      this.simulationTimer = window.setInterval(() => {
        // Micro variations based on lastData or base data
        const jitter = (min: number, max: number) => min + Math.random() * (max - min);

        const vA = +(231.5 + jitter(-2.5, 2.5)).toFixed(2);
        const vB = +(231.2 + jitter(-2.0, 2.8)).toFixed(2);
        const vC = +(234.8 + jitter(-2.2, 2.2)).toFixed(2);

        const iA = +(9.5 + jitter(-0.8, 1.2)).toFixed(2);
        const iB = +(15.6 + jitter(-1.2, 1.5)).toFixed(2);
        const iC = +(21.0 + jitter(-1.5, 1.8)).toFixed(2);

        const pfA = +(0.89 + jitter(-0.02, 0.03)).toFixed(3);
        const pfB = +(0.99 + jitter(-0.01, 0.009)).toFixed(3);
        const pfC = 1.0;

        const pA = +(vA * iA * pfA).toFixed(2);
        const pB = +(vB * iB * pfB).toFixed(2);
        const pC = +(vC * iC * pfC).toFixed(2);

        const totalActive = +(pA + pB + pC).toFixed(2);
        const totalReactive = +(-550 + jitter(-60, 40)).toFixed(2);
        const avgPF = +(0.995 + jitter(-0.005, 0.004)).toFixed(3);
        const freq = +(50.0 + jitter(-0.08, 0.07)).toFixed(2);
        const rssi = Math.round(-71 + jitter(-4, 3));

        const simulatedData: PowerMeterData = {
          voltageA: vA,
          voltageB: vB,
          voltageC: vC,
          currentA: iA,
          currentB: iB,
          currentC: iC,
          activePower: totalActive,
          reactivePower: totalReactive,
          powerFactor: avgPF,
          frequency: freq,
          activePowerA: pA,
          activePowerB: pB,
          activePowerC: pC,
          powerFactorA: pfA,
          powerFactorB: pfB,
          powerFactorC: pfC,
          rssi: rssi,
          timestamp: Date.now(),
        };

        this.notifyData(simulatedData);
      }, 3000);
    }

    return this.isSimulationActive;
  }

  public injectCustomData(data: Partial<PowerMeterData>) {
    const updated = {
      ...this.lastData,
      ...data,
      timestamp: Date.now(),
    };
    this.notifyData(updated);
  }
}

export const mqttService = new MqttService();
