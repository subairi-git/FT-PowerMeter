import { DailyPowerRecord, TaripPLN, PowerMeterData } from '../types/powermeter';

export const DEFAULT_TARIFF: TaripPLN = {
  tariffName: 'Golongan B-2 / TR (Bisnis Menengah)',
  ratePerKWh: 1444.70, // Tarif dasar listrik PLN B-2/TR per kWh
  ppnPercent: 0, // Opsional jika sudah include
  pjuPercent: 0,
};

const TARIFF_KEY = 'powermeter_pln_tariff';
const HISTORY_KEY = 'powermeter_30day_history';

class HistoryService {
  private tariff: TaripPLN = DEFAULT_TARIFF;
  private dailyRecords: DailyPowerRecord[] = [];
  private listeners: ((records: DailyPowerRecord[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedTariff = localStorage.getItem(TARIFF_KEY);
      if (savedTariff) {
        this.tariff = { ...DEFAULT_TARIFF, ...JSON.parse(savedTariff) };
      }

      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        this.dailyRecords = JSON.parse(savedHistory);
      } else {
        this.generateDefault30DayHistory();
      }
    } catch {
      this.generateDefault30DayHistory();
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(TARIFF_KEY, JSON.stringify(this.tariff));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.dailyRecords));
    } catch {
      // ignore
    }
  }

  public getTariff(): TaripPLN {
    return { ...this.tariff };
  }

  public updateTariff(newTariff: Partial<TaripPLN>) {
    this.tariff = { ...this.tariff, ...newTariff };
    // Recalculate costs in history with new tariff
    this.dailyRecords = this.dailyRecords.map((rec) => {
      const effectiveRate = this.getEffectiveKWhRate();
      return {
        ...rec,
        costRp: Math.round(rec.energyKWh * effectiveRate),
        hourlyBreakdown: rec.hourlyBreakdown?.map((h) => ({
          ...h,
          costRp: Math.round(h.kwh * effectiveRate),
        })),
      };
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  public getEffectiveKWhRate(): number {
    const base = this.tariff.ratePerKWh;
    const taxMultiplier = 1 + (this.tariff.ppnPercent + this.tariff.pjuPercent) / 100;
    return base * taxMultiplier;
  }

  public calculateCost(kwh: number): number {
    return Math.round(kwh * this.getEffectiveKWhRate());
  }

  /**
   * Generates a realistic 90-day building consumption profile to support PLN billing cycles (20th to 20th)
   */
  private generateDefault30DayHistory() {
    const records: DailyPowerRecord[] = [];
    const today = new Date();
    const effectiveRate = this.getEffectiveKWhRate();

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      // Base daily consumption: Office building ~10kW load running ~8-10h + baseline ~2-3kW night
      // Weekdays: ~140 - 180 kWh/day, Weekends: ~60 - 90 kWh/day
      const baseKWh = isWeekend
        ? 65 + Math.random() * 25
        : 145 + Math.random() * 35;
      const energyKWh = +baseKWh.toFixed(2);
      const costRp = Math.round(energyKWh * effectiveRate);

      // Phase breakdown (similar to user's real-time ratio: Phase C highest ~48%, Phase B ~35%, Phase A ~17%)
      const phaseA = +(energyKWh * 0.17).toFixed(2);
      const phaseB = +(energyKWh * 0.35).toFixed(2);
      const phaseC = +(energyKWh - phaseA - phaseB).toFixed(2);

      const peakWatts = isWeekend
        ? Math.round(4500 + Math.random() * 1500)
        : Math.round(10200 + Math.random() * 2200);

      const peakHour = 10 + Math.floor(Math.random() * 5); // between 10:00 and 15:00
      const peakTime = `${String(peakHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;

      // Generate 24 hourly buckets
      const hourlyBreakdown = [];
      for (let h = 0; h < 24; h++) {
        let weight = 0.02; // night baseline
        if (h >= 7 && h <= 18) {
          // business operating hours
          weight = isWeekend ? 0.045 : 0.07;
          if (h >= 11 && h <= 14) weight += 0.02; // peak lunch/ac
        }
        const hourKWh = +(energyKWh * weight).toFixed(2);
        const hourCost = Math.round(hourKWh * effectiveRate);
        const hourWatts = Math.round(hourKWh * 1000);
        hourlyBreakdown.push({
          hour: h,
          kwh: hourKWh,
          watts: hourWatts,
          costRp: hourCost,
        });
      }

      const isoDate = d.toISOString().split('T')[0];
      records.push({
        id: `rec-${isoDate}`,
        date: isoDate,
        displayDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        energyKWh,
        costRp,
        peakPowerW: peakWatts,
        peakTime,
        avgPowerFactor: +(0.97 + Math.random() * 0.025).toFixed(3),
        energyPhaseA: phaseA,
        energyPhaseB: phaseB,
        energyPhaseC: phaseC,
        hourlyBreakdown,
      });
    }

    this.dailyRecords = records;
    this.saveToStorage();
  }

  public getHistory(): DailyPowerRecord[] {
    return [...this.dailyRecords];
  }

  public subscribeHistory(listener: (records: DailyPowerRecord[]) => void) {
    this.listeners.push(listener);
    listener([...this.dailyRecords]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.saveToStorage();
    this.listeners.forEach((l) => l([...this.dailyRecords]));
  }

  /**
   * Called on incoming real-time telemetry to incrementally update today's hourly & daily bucket
   */
  public recordIncomingTelemetry(data: PowerMeterData) {
    if (!this.dailyRecords.length) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    let todayRecord = this.dailyRecords.find((r) => r.date === todayStr);

    if (!todayRecord) {
      const d = new Date();
      todayRecord = {
        id: `rec-${todayStr}`,
        date: todayStr,
        displayDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        energyKWh: 0,
        costRp: 0,
        peakPowerW: Math.round(data.activePower),
        peakTime: `${String(currentHour).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        avgPowerFactor: data.powerFactor,
        energyPhaseA: 0,
        energyPhaseB: 0,
        energyPhaseC: 0,
        hourlyBreakdown: Array.from({ length: 24 }).map((_, h) => ({
          hour: h,
          kwh: 0,
          watts: 0,
          costRp: 0,
        })),
      };
      this.dailyRecords.push(todayRecord);
      // Trim if more than 90 days
      if (this.dailyRecords.length > 90) {
        this.dailyRecords.shift();
      }
    }

    // Update peak if current active power is higher
    if (data.activePower > todayRecord.peakPowerW) {
      todayRecord.peakPowerW = Math.round(data.activePower);
      todayRecord.peakTime = `${String(currentHour).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    }

    // Increment today's energy slightly based on interval (assuming ~3s tick = 3/3600 h)
    const hoursElapsed = 3 / 3600;
    const addedKWh = (data.activePower * hoursElapsed) / 1000;
    todayRecord.energyKWh = +(todayRecord.energyKWh + addedKWh).toFixed(3);
    todayRecord.costRp = this.calculateCost(todayRecord.energyKWh);

    if (todayRecord.hourlyBreakdown && todayRecord.hourlyBreakdown[currentHour]) {
      const bucket = todayRecord.hourlyBreakdown[currentHour];
      bucket.kwh = +(bucket.kwh + addedKWh).toFixed(3);
      bucket.watts = Math.round(data.activePower);
      bucket.costRp = this.calculateCost(bucket.kwh);
    }

    this.notifyListeners();
  }

  public exportCsv(customRecords?: DailyPowerRecord[]): string {
    const recordsToExport = customRecords || this.dailyRecords;
    const headers = [
      'Tanggal',
      'Total Energi (kWh)',
      'Estimasi Biaya (Rp)',
      'Beban Puncak (Watt)',
      'Jam Beban Puncak',
      'Power Factor Rata-rata',
      'Fasa A (kWh)',
      'Fasa B (kWh)',
      'Fasa C (kWh)',
    ];

    const rows = recordsToExport.map((r) => [
      r.date,
      r.energyKWh,
      r.costRp,
      r.peakPowerW,
      r.peakTime,
      r.avgPowerFactor,
      r.energyPhaseA,
      r.energyPhaseB,
      r.energyPhaseC,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    return csvContent;
  }
}

export const historyService = new HistoryService();
