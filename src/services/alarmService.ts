import { AlarmThresholds, AlarmRecord, PowerMeterData } from '../types/powermeter';

export const DEFAULT_THRESHOLDS: AlarmThresholds = {
  voltageMin: 207.0, // Batas bawah tegangan standar PLN (-10% dari 230V)
  voltageMax: 253.0, // Batas atas tegangan standar PLN (+10% dari 230V)
  currentMax: 25.0,  // Arus maksimal per fasa (Ampere)
  activePowerMax: 15000, // Beban daya aktif maksimal (15 kW)
  powerFactorMin: 0.85,  // Batas denda kVARh PLN (cos phi < 0.85)
  frequencyMin: 49.5, // Toleransi frekuensi bawah PLN (Hz)
  frequencyMax: 50.5, // Toleransi frekuensi atas PLN (Hz)
  rssiMin: -85, // Sinyal IoT lemah (dBm)
};

const THRESHOLDS_STORAGE_KEY = 'powermeter_alarm_thresholds';
const ALARMS_STORAGE_KEY = 'powermeter_alarm_records';
const ALARM_SETTINGS_KEY = 'powermeter_alarm_settings';

export interface AlarmSettings {
  soundEnabled: boolean;
  notificationEnabled: boolean;
}

class AlarmService {
  private thresholds: AlarmThresholds = DEFAULT_THRESHOLDS;
  private alarms: AlarmRecord[] = [];
  private settings: AlarmSettings = { soundEnabled: true, notificationEnabled: true };
  private listeners: ((alarms: AlarmRecord[]) => void)[] = [];
  private activeViolations: Set<string> = new Set(); // tracks currently active violations to avoid duplicate spam

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedThresholds = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
      if (savedThresholds) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...JSON.parse(savedThresholds) };
      }
      const savedSettings = localStorage.getItem(ALARM_SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
      const savedAlarms = localStorage.getItem(ALARMS_STORAGE_KEY);
      if (savedAlarms) {
        this.alarms = JSON.parse(savedAlarms);
      } else {
        // Seed a few initial demo alarm logs so user immediately sees what recorded alarms look like
        this.alarms = [
          {
            id: 'alm-1',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            parameter: 'Arus Fasa C',
            value: 26.4,
            threshold: 25.0,
            unit: 'A',
            type: 'max',
            severity: 'warning',
            status: 'acknowledged',
            message: 'Arus Fasa C melebihi batas aman 25.0 A (Terbaca: 26.4 A)',
          },
          {
            id: 'alm-2',
            timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
            parameter: 'Tegangan Fasa A',
            value: 204.2,
            threshold: 207.0,
            unit: 'V',
            type: 'min',
            severity: 'critical',
            status: 'acknowledged',
            message: 'Under-voltage terdeteksi pada Fasa A (Terbaca: 204.2 V, batas min: 207.0 V)',
          },
        ];
      }
    } catch {
      // storage unavailable
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(this.thresholds));
      localStorage.setItem(ALARM_SETTINGS_KEY, JSON.stringify(this.settings));
      // Keep only latest 100 alarms
      localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(this.alarms.slice(0, 100)));
    } catch {
      // ignore
    }
  }

  public getThresholds(): AlarmThresholds {
    return { ...this.thresholds };
  }

  public updateThresholds(newThresholds: Partial<AlarmThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.saveToStorage();
  }

  public getSettings(): AlarmSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AlarmSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToStorage();
  }

  public getAlarms(): AlarmRecord[] {
    return [...this.alarms];
  }

  public getActiveAlarmsCount(): number {
    return this.alarms.filter((a) => a.status === 'active').length;
  }

  public subscribeAlarms(listener: (alarms: AlarmRecord[]) => void) {
    this.listeners.push(listener);
    listener([...this.alarms]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.saveToStorage();
    this.listeners.forEach((l) => l([...this.alarms]));
  }

  public acknowledgeAlarm(id: string) {
    this.alarms = this.alarms.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a));
    this.notifyListeners();
  }

  public acknowledgeAll() {
    this.alarms = this.alarms.map((a) => ({ ...a, status: 'acknowledged' }));
    this.notifyListeners();
  }

  public clearAllAlarms() {
    this.alarms = [];
    this.activeViolations.clear();
    this.notifyListeners();
  }

  public playAlarmSound() {
    if (!this.settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.28);
    } catch {
      // AudioContext not allowed without interaction
    }
  }

  /**
   * Evaluates incoming real-time telemetry against configured min and max limits
   */
  public evaluateTelemetry(data: PowerMeterData) {
    const checks: {
      key: string;
      param: string;
      val: number;
      min?: number;
      max?: number;
      unit: string;
      severity: 'warning' | 'critical';
    }[] = [
      // Voltages
      { key: 'vA_min', param: 'Tegangan Fasa A', val: data.voltageA, min: this.thresholds.voltageMin, unit: 'V', severity: 'critical' },
      { key: 'vA_max', param: 'Tegangan Fasa A', val: data.voltageA, max: this.thresholds.voltageMax, unit: 'V', severity: 'critical' },
      { key: 'vB_min', param: 'Tegangan Fasa B', val: data.voltageB, min: this.thresholds.voltageMin, unit: 'V', severity: 'critical' },
      { key: 'vB_max', param: 'Tegangan Fasa B', val: data.voltageB, max: this.thresholds.voltageMax, unit: 'V', severity: 'critical' },
      { key: 'vC_min', param: 'Tegangan Fasa C', val: data.voltageC, min: this.thresholds.voltageMin, unit: 'V', severity: 'critical' },
      { key: 'vC_max', param: 'Tegangan Fasa C', val: data.voltageC, max: this.thresholds.voltageMax, unit: 'V', severity: 'critical' },

      // Currents
      { key: 'iA_max', param: 'Arus Fasa A', val: data.currentA, max: this.thresholds.currentMax, unit: 'A', severity: 'warning' },
      { key: 'iB_max', param: 'Arus Fasa B', val: data.currentB, max: this.thresholds.currentMax, unit: 'A', severity: 'warning' },
      { key: 'iC_max', param: 'Arus Fasa C', val: data.currentC, max: this.thresholds.currentMax, unit: 'A', severity: 'warning' },

      // Total Active Power
      { key: 'pTot_max', param: 'Daya Aktif Total', val: data.activePower, max: this.thresholds.activePowerMax, unit: 'W', severity: 'critical' },

      // Power Factor
      { key: 'pf_min', param: 'Power Factor Rata-rata', val: data.powerFactor, min: this.thresholds.powerFactorMin, unit: '', severity: 'warning' },

      // Frequency
      { key: 'freq_min', param: 'Frekuensi Listrik', val: data.frequency, min: this.thresholds.frequencyMin, unit: 'Hz', severity: 'warning' },
      { key: 'freq_max', param: 'Frekuensi Listrik', val: data.frequency, max: this.thresholds.frequencyMax, unit: 'Hz', severity: 'warning' },

      // RSSI
      { key: 'rssi_min', param: 'Kualitas Sinyal RSSI', val: data.rssi, min: this.thresholds.rssiMin, unit: 'dBm', severity: 'warning' },
    ];

    let newTriggerOccurred = false;

    checks.forEach((c) => {
      let isViolated = false;
      let limitType: 'min' | 'max' = 'max';
      let thresholdLimit = 0;

      if (c.min !== undefined && c.val < c.min) {
        isViolated = true;
        limitType = 'min';
        thresholdLimit = c.min;
      } else if (c.max !== undefined && c.val > c.max) {
        isViolated = true;
        limitType = 'max';
        thresholdLimit = c.max;
      }

      if (isViolated) {
        // If not already flagged in current session, record alarm event
        if (!this.activeViolations.has(c.key)) {
          this.activeViolations.add(c.key);
          newTriggerOccurred = true;

          const newRecord: AlarmRecord = {
            id: `alm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            parameter: c.param,
            value: c.val,
            threshold: thresholdLimit,
            unit: c.unit,
            type: limitType,
            severity: c.severity,
            status: 'active',
            message:
              limitType === 'min'
                ? `${c.param} berada di bawah batas minimum ${thresholdLimit} ${c.unit} (Terbaca: ${c.val} ${c.unit})`
                : `${c.param} melebihi batas maksimum ${thresholdLimit} ${c.unit} (Terbaca: ${c.val} ${c.unit})`,
          };

          this.alarms.unshift(newRecord);
        }
      } else {
        // Value returned to normal range
        this.activeViolations.delete(c.key);
      }
    });

    if (newTriggerOccurred) {
      this.playAlarmSound();
      this.notifyListeners();
    }
  }
}

export const alarmService = new AlarmService();
