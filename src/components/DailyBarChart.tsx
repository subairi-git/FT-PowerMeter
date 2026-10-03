import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  Coins,
  Zap,
  TrendingUp,
  Filter,
  Info,
} from 'lucide-react';
import { DailyPowerRecord, TaripPLN } from '../types/powermeter';
import { formatRupiah, formatNumber, formatKWh, formatDateIndo, formatWatts } from '../utils/formatters';

interface DailyBarChartProps {
  records: DailyPowerRecord[];
  tariff: TaripPLN;
}

type TimeRangePreset = 'today' | '7days' | '14days' | '30days' | 'custom';
type MetricView = 'kwh' | 'cost' | 'peak' | 'phases';

export const DailyBarChart: React.FC<DailyBarChartProps> = ({ records, tariff }) => {
  const [rangePreset, setRangePreset] = useState<TimeRangePreset>('7days');
  const [metricView, setMetricView] = useState<MetricView>('kwh');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter records based on selected time range
  const filteredData = useMemo(() => {
    if (!records.length) return [];

    if (rangePreset === 'today') {
      // Find today's record and return its hourly breakdown as chart items
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = records.find((r) => r.date === todayStr) || records[records.length - 1];
      if (todayRecord && todayRecord.hourlyBreakdown) {
        return todayRecord.hourlyBreakdown.map((h) => ({
          label: `${String(h.hour).padStart(2, '0')}:00`,
          subLabel: `Pukul ${h.hour}:00`,
          energyKWh: h.kwh,
          costRp: h.costRp,
          peakPowerW: h.watts,
          energyPhaseA: +(h.kwh * 0.17).toFixed(2),
          energyPhaseB: +(h.kwh * 0.35).toFixed(2),
          energyPhaseC: +(h.kwh * 0.48).toFixed(2),
          avgPowerFactor: todayRecord.avgPowerFactor,
          dateText: todayRecord.displayDate,
          peakTime: `${String(h.hour).padStart(2, '0')}:30`,
        }));
      }
      return [];
    }

    let subset: DailyPowerRecord[] = [];
    if (rangePreset === '7days') {
      subset = records.slice(-7);
    } else if (rangePreset === '14days') {
      subset = records.slice(-14);
    } else if (rangePreset === '30days') {
      subset = records.slice(-30);
    } else if (rangePreset === 'custom') {
      subset = records.filter(
        (r) => r.date >= customStartDate && r.date <= customEndDate
      );
    }

    return subset.map((r) => ({
      label: r.displayDate,
      subLabel: formatDateIndo(r.date),
      energyKWh: r.energyKWh,
      costRp: r.costRp,
      peakPowerW: r.peakPowerW,
      energyPhaseA: r.energyPhaseA,
      energyPhaseB: r.energyPhaseB,
      energyPhaseC: r.energyPhaseC,
      avgPowerFactor: r.avgPowerFactor,
      dateText: formatDateIndo(r.date),
      peakTime: r.peakTime,
    }));
  }, [records, rangePreset, customStartDate, customEndDate]);

  // Aggregate statistics for selected range
  const summary = useMemo(() => {
    if (!filteredData.length) {
      return { totalKWh: 0, totalCost: 0, avgKWh: 0, peakW: 0, peakLabel: '-' };
    }
    const totalKWh = filteredData.reduce((acc, cur) => acc + cur.energyKWh, 0);
    const totalCost = filteredData.reduce((acc, cur) => acc + cur.costRp, 0);
    const avgKWh = totalKWh / filteredData.length;

    let peakW = 0;
    let peakLabel = '-';
    filteredData.forEach((d) => {
      if (d.peakPowerW > peakW) {
        peakW = d.peakPowerW;
        peakLabel = d.label;
      }
    });

    return { totalKWh, totalCost, avgKWh, peakW, peakLabel };
  }, [filteredData]);

  // Maximum value for SVG scaling
  const maxValue = useMemo(() => {
    if (!filteredData.length) return 100;
    if (metricView === 'kwh') {
      const maxKwh = Math.max(...filteredData.map((d) => d.energyKWh));
      return maxKwh > 0 ? maxKwh * 1.15 : 100;
    }
    if (metricView === 'cost') {
      const maxCost = Math.max(...filteredData.map((d) => d.costRp));
      return maxCost > 0 ? maxCost * 1.15 : 100000;
    }
    if (metricView === 'peak') {
      const maxPeak = Math.max(...filteredData.map((d) => d.peakPowerW));
      return maxPeak > 0 ? maxPeak * 1.15 : 15000;
    }
    if (metricView === 'phases') {
      const maxKwh = Math.max(...filteredData.map((d) => d.energyKWh));
      return maxKwh > 0 ? maxKwh * 1.15 : 100;
    }
    return 100;
  }, [filteredData, metricView]);

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Grafik Konsumsi Daya & Energi</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualisasi bar chart dinamis konsumsi listrik harian dengan rentang waktu fleksibel
            </p>
          </div>

          {/* Metric View Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setMetricView('kwh')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricView === 'kwh'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Energi (kWh)
            </button>
            <button
              onClick={() => setMetricView('cost')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricView === 'cost'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biaya (Rupiah)
            </button>
            <button
              onClick={() => setMetricView('phases')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricView === 'phases'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Breakdown 3-Fasa
            </button>
            <button
              onClick={() => setMetricView('peak')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                metricView === 'peak'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Beban Puncak (kW)
            </button>
          </div>
        </div>

        {/* Time Range Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Rentang Waktu:
            </span>
            <button
              onClick={() => setRangePreset('today')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                rangePreset === 'today'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Hari Ini (24 Jam)
            </button>
            <button
              onClick={() => setRangePreset('7days')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                rangePreset === '7days'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setRangePreset('14days')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                rangePreset === '14days'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              14 Hari Terakhir
            </button>
            <button
              onClick={() => setRangePreset('30days')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                rangePreset === '30days'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              30 Hari Terakhir
            </button>
            <button
              onClick={() => setRangePreset('custom')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                rangePreset === 'custom'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Kustom Tanggal
            </button>
          </div>

          {/* Custom Date Pickers */}
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 font-medium">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards for Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Energi Periode
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
            {formatNumber(summary.totalKWh, 1)}{' '}
            <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Rata-rata: {formatNumber(summary.avgKWh, 1)} kWh/periode
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Biaya Listrik
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-700">
            {formatRupiah(summary.totalCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Tarif: {formatRupiah(tariff.ratePerKWh)}/kWh
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Beban Puncak (Peak)
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-amber-700">
            {formatWatts(summary.peakW)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Terjadi pada: {summary.peakLabel}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Jumlah Titik Data
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-indigo-700">
            {filteredData.length}{' '}
            <span className="text-xs font-normal text-slate-500">interval</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {rangePreset === 'today' ? 'Interval per jam' : 'Interval harian'}
          </div>
        </div>
      </div>

      {/* Main Interactive Bar Chart Canvas */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {metricView === 'kwh' && 'Konsumsi Energi Listrik (kWh)'}
              {metricView === 'cost' && 'Estimasi Biaya Pemakaian (Rupiah)'}
              {metricView === 'peak' && 'Daya Listrik Puncak (Watt / kW)'}
              {metricView === 'phases' && 'Distribusi Energi Tiap Fasa (A - B - C)'}
            </span>
          </div>

          {/* Legend for 3 phases if active */}
          {metricView === 'phases' && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Fasa A
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Fasa B
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Fasa C
              </span>
            </div>
          )}
        </div>

        {/* Bar Chart Container */}
        {filteredData.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Tidak ada data untuk rentang waktu yang dipilih.</p>
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-slate-300 w-full"></div>
              <div className="border-b border-slate-300 w-full"></div>
              <div className="border-b border-slate-300 w-full"></div>
              <div className="border-b border-slate-300 w-full"></div>
            </div>

            {/* Bars Flex Box */}
            <div className="h-64 sm:h-72 flex items-end justify-between gap-1 sm:gap-2 px-1 relative z-10">
              {filteredData.map((item, idx) => {
                let heightPercent = 0;
                if (metricView === 'kwh' || metricView === 'phases') {
                  heightPercent = Math.min(100, Math.max(4, (item.energyKWh / maxValue) * 100));
                } else if (metricView === 'cost') {
                  heightPercent = Math.min(100, Math.max(4, (item.costRp / maxValue) * 100));
                } else if (metricView === 'peak') {
                  heightPercent = Math.min(100, Math.max(4, (item.peakPowerW / maxValue) * 100));
                }

                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Hover Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-24 sm:-top-28 z-30 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-lg pointer-events-none whitespace-nowrap min-w-[150px] border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                        <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex justify-between gap-2">
                          <span>{item.subLabel || item.label}</span>
                          {item.peakTime && <span className="text-amber-400 text-[10px]">Peak {item.peakTime}</span>}
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-400">Total Energi:</span>
                            <span className="font-bold text-emerald-400">{formatKWh(item.energyKWh)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-400">Estimasi Biaya:</span>
                            <span className="font-bold text-amber-300">{formatRupiah(item.costRp)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-400">Beban Puncak:</span>
                            <span className="font-semibold text-slate-200">{formatWatts(item.peakPowerW)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-400">Power Factor:</span>
                            <span className="font-semibold text-slate-200">{formatNumber(item.avgPowerFactor, 3)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bar graphic */}
                    <div className="w-full max-w-[48px] flex flex-col justify-end h-full">
                      {metricView === 'phases' ? (
                        // Stacked 3-Phase Bar
                        <div
                          className={`w-full rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 ${
                            isHovered ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-90'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div
                            className="bg-sky-500 w-full"
                            style={{
                              height: `${(item.energyPhaseC / (item.energyKWh || 1)) * 100}%`,
                            }}
                            title={`Fasa C: ${item.energyPhaseC} kWh`}
                          ></div>
                          <div
                            className="bg-amber-500 w-full"
                            style={{
                              height: `${(item.energyPhaseB / (item.energyKWh || 1)) * 100}%`,
                            }}
                            title={`Fasa B: ${item.energyPhaseB} kWh`}
                          ></div>
                          <div
                            className="bg-rose-500 w-full"
                            style={{
                              height: `${(item.energyPhaseA / (item.energyKWh || 1)) * 100}%`,
                            }}
                            title={`Fasa A: ${item.energyPhaseA} kWh`}
                          ></div>
                        </div>
                      ) : (
                        // Solid Bar
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            metricView === 'cost'
                              ? isHovered
                                ? 'bg-amber-600 ring-2 ring-amber-400 shadow-md'
                                : 'bg-gradient-to-t from-amber-500 to-amber-400'
                              : metricView === 'peak'
                              ? isHovered
                                ? 'bg-orange-600 ring-2 ring-orange-400 shadow-md'
                                : 'bg-gradient-to-t from-orange-500 to-amber-500'
                              : isHovered
                              ? 'bg-emerald-600 ring-2 ring-emerald-400 shadow-md'
                              : 'bg-gradient-to-t from-emerald-600 to-teal-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      )}
                    </div>

                    {/* Bottom Label */}
                    <div className="mt-2 text-center w-full">
                      <span
                        className={`text-[10px] sm:text-xs block truncate ${
                          isHovered ? 'font-bold text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>* Klik atau arahkan kursor ke tiap bar untuk rincian detail per jam / per hari.</span>
          <span>Berdasarkan pembacaan MQTT broker</span>
        </div>
      </div>
    </div>
  );
};
