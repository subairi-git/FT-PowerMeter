import React from 'react';
import {
  Zap,
  TrendingUp,
  Gauge,
  Wifi,
  Coins,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { PowerMeterData, TaripPLN } from '../types/powermeter';
import { formatRupiah, formatNumber, formatWatts } from '../utils/formatters';

interface RealtimeDashboardProps {
  data: PowerMeterData;
  tariff: TaripPLN;
  todayKWh: number;
  todayCost: number;
  onInjectTestValue?: (partial: Partial<PowerMeterData>) => void;
  onResetToDefault?: () => void;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({
  data,
  tariff,
  todayKWh,
  todayCost,
  onInjectTestValue,
  onResetToDefault,
}) => {
  // Real-time run rate per hour in Rupiah
  const hourlyRunRateRp = Math.round((data.activePower / 1000) * tariff.ratePerKWh);

  // Apparent Power S in VA: S = sqrt(P^2 + Q^2)
  const apparentPowerVA = Math.round(
    Math.sqrt(Math.pow(data.activePower, 2) + Math.pow(data.reactivePower, 2))
  );

  // Phase current balance calculation
  const totalCurrent = data.currentA + data.currentB + data.currentC;
  const avgCurrent = totalCurrent / 3;
  const maxCurrentDeviation = Math.max(
    Math.abs(data.currentA - avgCurrent),
    Math.abs(data.currentB - avgCurrent),
    Math.abs(data.currentC - avgCurrent)
  );
  const unbalancePercent = avgCurrent > 0 ? (maxCurrentDeviation / avgCurrent) * 100 : 0;

  // Signal strength text
  const getSignalQuality = (rssi: number) => {
    if (rssi >= -65) return { label: 'Sangat Baik', color: 'text-emerald-600', bars: 4 };
    if (rssi >= -75) return { label: 'Baik', color: 'text-teal-600', bars: 3 };
    if (rssi >= -85) return { label: 'Sedang', color: 'text-amber-600', bars: 2 };
    return { label: 'Lemah', color: 'text-rose-600', bars: 1 };
  };

  const signal = getSignalQuality(data.rssi);

  // Power factor assessment
  const isPfGood = data.powerFactor >= 0.85;

  return (
    <div className="space-y-6">
      {/* Top Banner with Run-rate and Quick Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Live Telemetri Gedung
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Power Management Gedung Fakultas Teknik
            </h1>
            <p className="text-sm text-slate-300">
              Panel MDP Utama &bull; Beban Terpasang Gedung &bull; Tarif {tariff.tariffName} (Rp {formatNumber(tariff.ratePerKWh, 0)}/kWh)
            </p>
          </div>

          {/* Real-time Hourly Cost Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl">
              <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>Estimasi Biaya / Jam</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-300">
                {formatRupiah(hourlyRunRateRp)}
                <span className="text-xs font-normal text-slate-300">/jam</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl">
              <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>Akumulasi Hari Ini</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-300">
                {formatRupiah(todayCost)}
                <span className="text-xs font-normal text-slate-300"> ({formatNumber(todayKWh, 1)} kWh)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Power */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Daya Aktif Total (P)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatWatts(data.activePower)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{formatNumber(data.activePower, 2)} W</span>
              <span className="text-emerald-600 font-medium">Beban Realtime</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Daya Semu (S)</span>
            <span className="font-semibold text-slate-700">{(apparentPowerVA / 1000).toFixed(2)} kVA</span>
          </div>
        </div>

        {/* Card 2: Total Current & Unbalance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Arus & Keseimbangan
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatNumber(totalCurrent, 2)} <span className="text-lg font-semibold text-slate-500">A</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Ketidakseimbangan</span>
              <span
                className={`font-semibold ${
                  unbalancePercent <= 10
                    ? 'text-emerald-600'
                    : unbalancePercent <= 20
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {unbalancePercent.toFixed(1)}% ({unbalancePercent <= 10 ? 'Ideal' : 'Perlu Cek'})
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Rata-rata Arus/Fasa</span>
            <span className="font-semibold text-slate-700">{formatNumber(avgCurrent, 2)} A</span>
          </div>
        </div>

        {/* Card 3: Power Factor & PLN Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Faktor Daya (Cos φ)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isPfGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatNumber(data.powerFactor, 3)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Denda PLN (&lt;0.85)</span>
              <span className={`font-semibold ${isPfGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPfGood ? 'Bebas Denda' : 'Kena Denda KVARh!'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Daya Reaktif (Q)</span>
            <span className="font-semibold text-slate-700">{formatNumber(data.reactivePower, 1)} VAR</span>
          </div>
        </div>

        {/* Card 4: Frequency & RSSI */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Frekuensi & Sinyal
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatNumber(data.frequency, 2)}{' '}
              <span className="text-lg font-semibold text-slate-500">Hz</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Sinyal IoT: {data.rssi} dBm</span>
              <span className={`font-medium ${signal.color}`}>{signal.label}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Batas Standar PLN</span>
            <span className="font-semibold text-slate-700">49.5 - 50.5 Hz</span>
          </div>
        </div>
      </div>

      {/* 3-Phase Deep Dive Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Rincian Kelistrikan 3-Fasa (R - S - T)</h2>
            <p className="text-xs text-slate-500">
              Parameter komprehensif tegangan, arus, daya, dan power factor tiap fasa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phase A (R) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-200">
                  A
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fasa A (R)</h3>
                  <p className="text-[11px] text-slate-500">Line to Neutral</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                {((data.activePowerA / (data.activePower || 1)) * 100).toFixed(0)}% Beban
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Tegangan (V)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.voltageA, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">V</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Arus Beban (I)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.currentA, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">A</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Daya Aktif (P)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatWatts(data.activePowerA)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Power Factor</span>
                <span
                  className={`text-base font-bold ${
                    data.powerFactorA >= 0.85 ? 'text-slate-800' : 'text-rose-600'
                  }`}
                >
                  {formatNumber(data.powerFactorA, 3)}
                </span>
              </div>
            </div>

            {/* Load bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (data.currentA / 25) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 A</span>
                <span>Kapasitas Breaker 25 A</span>
              </div>
            </div>
          </div>

          {/* Phase B (S) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center border border-amber-200">
                  B
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fasa B (S)</h3>
                  <p className="text-[11px] text-slate-500">Line to Neutral</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
                {((data.activePowerB / (data.activePower || 1)) * 100).toFixed(0)}% Beban
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Tegangan (V)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.voltageB, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">V</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Arus Beban (I)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.currentB, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">A</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Daya Aktif (P)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatWatts(data.activePowerB)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Power Factor</span>
                <span
                  className={`text-base font-bold ${
                    data.powerFactorB >= 0.85 ? 'text-slate-800' : 'text-amber-700'
                  }`}
                >
                  {formatNumber(data.powerFactorB, 3)}
                </span>
              </div>
            </div>

            {/* Load bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (data.currentB / 25) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 A</span>
                <span>Kapasitas Breaker 25 A</span>
              </div>
            </div>
          </div>

          {/* Phase C (T) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 font-bold text-xs flex items-center justify-center border border-sky-200">
                  C
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fasa C (T)</h3>
                  <p className="text-[11px] text-slate-500">Line to Neutral</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                {((data.activePowerC / (data.activePower || 1)) * 100).toFixed(0)}% Beban
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Tegangan (V)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.voltageC, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">V</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Arus Beban (I)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatNumber(data.currentC, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500">A</span>
                </span>
              </div>

              <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">Daya Aktif (P)</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatWatts(data.activePowerC)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500">Power Factor</span>
                <span
                  className={`text-base font-bold ${
                    data.powerFactorC >= 0.85 ? 'text-slate-800' : 'text-sky-700'
                  }`}
                >
                  {formatNumber(data.powerFactorC, 3)}
                </span>
              </div>
            </div>

            {/* Load bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (data.currentC / 25) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 A</span>
                <span>Kapasitas Breaker 25 A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test / Injection Bar */}
      <div className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Uji Trigger Alarm & Simulasi Nilai Ekstrem:</span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              (Uji sistem alarm tanpa menunggu gangguan listrik riil)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onInjectTestValue?.({ voltageA: 202.4 })}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
            >
              Tegangan Drop 202V
            </button>
            <button
              onClick={() => onInjectTestValue?.({ currentC: 27.8 })}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 font-medium transition-colors cursor-pointer"
            >
              Over-Current 27.8A
            </button>
            <button
              onClick={() => onInjectTestValue?.({ powerFactor: 0.81, powerFactorA: 0.78 })}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 font-medium transition-colors cursor-pointer"
            >
              Drop PF 0.81
            </button>
            <button
              onClick={onResetToDefault}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Reset ke data normal default"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Normal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
