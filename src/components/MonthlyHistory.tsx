import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Download,
  Coins,
  TrendingUp,
  FileSpreadsheet,
  Settings2,
  Check,
  Search,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Filter,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import { DailyPowerRecord, TaripPLN } from '../types/powermeter';
import { formatRupiah, formatNumber, formatKWh, formatDateIndo, formatWatts } from '../utils/formatters';

interface MonthlyHistoryProps {
  records: DailyPowerRecord[];
  tariff: TaripPLN;
  onUpdateTariff: (tariff: Partial<TaripPLN>) => void;
  onExportCsv: (customRecords?: DailyPowerRecord[], filename?: string) => void;
}

type PeriodPreset = 'pln-current' | 'pln-previous' | 'last30' | 'calendar-month' | 'custom';

export const MonthlyHistory: React.FC<MonthlyHistoryProps> = ({
  records,
  tariff,
  onUpdateTariff,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'energyKWh' | 'costRp' | 'peakPowerW'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [showTariffSettings, setShowTariffSettings] = useState(false);
  const [tempTariffRate, setTempTariffRate] = useState(tariff.ratePerKWh.toString());
  const [tempTariffName, setTempTariffName] = useState(tariff.tariffName);
  const [isSaved, setIsSaved] = useState(false);

  // Period / Date Range states
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('pln-current');
  const [plnCutoffDay, setPlnCutoffDay] = useState<number>(20); // Default tanggal 20 PLN

  // Custom date pickers (default to 20th of last month to 20th of this month)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const d = new Date(now);
    if (currentDay < 20) {
      d.setMonth(d.getMonth() - 1);
    }
    d.setDate(20);
    return d.toISOString().split('T')[0];
  });

  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const d = new Date(now);
    if (currentDay >= 20) {
      d.setMonth(d.getMonth() + 1);
    }
    d.setDate(20);
    return d.toISOString().split('T')[0];
  });

  // Calculate Start & End Date based on selected preset
  const { effectiveStartDate, effectiveEndDate, periodLabel } = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const todayStr = today.toISOString().split('T')[0];

    if (periodPreset === 'pln-current') {
      // Current PLN Cycle: Tgl 20 bulan lalu s/d tgl 20 bulan ini (atau tgl 20 bulan ini s/d tgl 20 bulan depan)
      const start = new Date(today);
      if (currentDay < plnCutoffDay) {
        start.setMonth(start.getMonth() - 1);
      }
      start.setDate(plnCutoffDay);

      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(plnCutoffDay);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodLabel: `Siklus PLN Berjalan (${formatDateIndo(startStr)} - ${formatDateIndo(endStr)})`,
      };
    }

    if (periodPreset === 'pln-previous') {
      // Previous PLN Cycle: 2 bulan lalu ke 1 bulan lalu
      const start = new Date(today);
      if (currentDay < plnCutoffDay) {
        start.setMonth(start.getMonth() - 2);
      } else {
        start.setMonth(start.getMonth() - 1);
      }
      start.setDate(plnCutoffDay);

      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(plnCutoffDay);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodLabel: `Siklus PLN Sebelumnya (${formatDateIndo(startStr)} - ${formatDateIndo(endStr)})`,
      };
    }

    if (periodPreset === 'last30') {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      const startStr = start.toISOString().split('T')[0];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: todayStr,
        periodLabel: `30 Hari Kalender Terakhir (${formatDateIndo(startStr)} - ${formatDateIndo(todayStr)})`,
      };
    }

    if (periodPreset === 'calendar-month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodLabel: `Bulan Kalender Ini (${formatDateIndo(startStr)} - ${formatDateIndo(endStr)})`,
      };
    }

    // Custom
    return {
      effectiveStartDate: customStartDate,
      effectiveEndDate: customEndDate,
      periodLabel: `Kustom Periode (${formatDateIndo(customStartDate)} - ${formatDateIndo(customEndDate)})`,
    };
  }, [periodPreset, plnCutoffDay, customStartDate, customEndDate]);

  // Filter records within effective date range
  const periodRecords = useMemo(() => {
    return records.filter(
      (r) => r.date >= effectiveStartDate && r.date <= effectiveEndDate
    );
  }, [records, effectiveStartDate, effectiveEndDate]);

  // Aggregates for the selected period
  const totalKWhPeriod = periodRecords.reduce((acc, cur) => acc + cur.energyKWh, 0);
  const totalCostPeriod = periodRecords.reduce((acc, cur) => acc + cur.costRp, 0);
  const avgKWhPerDay = periodRecords.length ? totalKWhPeriod / periodRecords.length : 0;
  const avgCostPerDay = periodRecords.length ? totalCostPeriod / periodRecords.length : 0;

  // Find Peak Day in Period
  let peakRecord = periodRecords[0];
  periodRecords.forEach((r) => {
    if (peakRecord && r.peakPowerW > peakRecord.peakPowerW) {
      peakRecord = r;
    }
  });

  // Filtered and Sorted records for table view
  const displayRecords = useMemo(() => {
    return periodRecords
      .filter((r) => r.date.includes(searchTerm) || r.displayDate.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'date') comp = a.date.localeCompare(b.date);
        if (sortField === 'energyKWh') comp = a.energyKWh - b.energyKWh;
        if (sortField === 'costRp') comp = a.costRp - b.costRp;
        if (sortField === 'peakPowerW') comp = a.peakPowerW - b.peakPowerW;
        return sortAsc ? comp : -comp;
      });
  }, [periodRecords, searchTerm, sortField, sortAsc]);

  const handleSaveTariff = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(tempTariffRate);
    if (!isNaN(rate) && rate > 0) {
      onUpdateTariff({
        tariffName: tempTariffName,
        ratePerKWh: rate,
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setShowTariffSettings(false);
      }, 1000);
    }
  };

  const handleExportFilteredCsv = () => {
    const filename = `rekap_tagihan_PLN_${effectiveStartDate}_sd_${effectiveEndDate}.csv`;
    onExportCsv(periodRecords, filename);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Date Filter Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Histori Penggunaan Energi & Tagihan Listrik</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rekapitulasi beban daya, pemakaian akumulasi kWh, dan audit estimasi biaya rekening listrik gedung dengan penyesuaian siklus penagihan PLN (Tanggal 20 - 20)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => setShowTariffSettings(!showTariffSettings)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Atur Tarif Listrik ({formatRupiah(tariff.ratePerKWh)}/kWh)</span>
            </button>

            <button
              onClick={handleExportFilteredCsv}
              className="text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Rekap CSV Periode Ini</span>
            </button>
          </div>
        </div>

        {/* PLN Billing Cycle Selector Bar */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Pilihan Siklus & Rentang Tanggal:
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                PLN Cutoff: Tgl {plnCutoffDay}
              </span>
            </div>

            {/* Change Cutoff day optionally */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-[11px] text-slate-500">Tanggal Cutoff PLN:</span>
              <select
                value={plnCutoffDay}
                onChange={(e) => setPlnCutoffDay(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={15}>Tanggal 15</option>
                <option value={20}>Tanggal 20 (Standar PLN)</option>
                <option value={25}>Tanggal 25</option>
                <option value={1}>Tanggal 1</option>
              </select>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPeriodPreset('pln-current')}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                periodPreset === 'pln-current'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⭐ Siklus PLN Berjalan (Tgl {plnCutoffDay} s/d {plnCutoffDay})
            </button>

            <button
              onClick={() => setPeriodPreset('pln-previous')}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                periodPreset === 'pln-previous'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Siklus PLN Bulan Lalu
            </button>

            <button
              onClick={() => setPeriodPreset('last30')}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                periodPreset === 'last30'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              30 Hari Terakhir
            </button>

            <button
              onClick={() => setPeriodPreset('calendar-month')}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                periodPreset === 'calendar-month'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Bulan Kalender Ini
            </button>

            <button
              onClick={() => setPeriodPreset('custom')}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                periodPreset === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Kustom Tanggal
            </button>
          </div>

          {/* Custom Date Inputs if Custom selected */}
          {periodPreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-150">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Atur Rentang Tanggal Kustom:
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Active Period Label Badge */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Periode Aktif:</strong> {periodLabel} &bull; ({periodRecords.length} hari tercatat)
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">
              Sesuai pola pencatatan meter tagihan bulanan PLN
            </span>
          </div>
        </div>

        {/* Quick Tariff Settings Drawer / Accordion */}
        {showTariffSettings && (
          <form
            onSubmit={handleSaveTariff}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150"
          >
            <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              Konfigurasi Tarif PLN & Biaya Per kWh
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nama Tarif / Golongan:</label>
                <input
                  type="text"
                  value={tempTariffName}
                  onChange={(e) => setTempTariffName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Contoh: B-2 / TR Bisnis Menengah"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tarif Dasar per kWh (Rp):</label>
                <input
                  type="number"
                  step="0.01"
                  value={tempTariffRate}
                  onChange={(e) => setTempTariffRate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="1444.70"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowTariffSettings(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{isSaved ? 'Tersimpan!' : 'Simpan & Hitung Ulang Biaya'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 4 Summary Highlight Cards for Selected Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Pemakaian Periode Ini
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatNumber(totalKWhPeriod, 1)}{' '}
              <span className="text-xs font-normal text-slate-500">kWh</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Rata-rata: {formatNumber(avgKWhPerDay, 1)} kWh / hari
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Estimasi Tagihan Rekening PLN
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {formatRupiah(totalCostPeriod)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Rata-rata: {formatRupiah(avgCostPerDay)} / hari
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Hari Beban Tertinggi (Peak)
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {formatWatts(peakRecord ? peakRecord.peakPowerW : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {peakRecord ? `${peakRecord.displayDate} (Pukul ${peakRecord.peakTime})` : '-'}
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Proyeksi Tagihan Siklus Penuh
            </span>
            <div className="text-2xl font-bold text-indigo-700 mt-1">
              {formatRupiah(avgCostPerDay * 30)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Estimasi 30 Hari Tagihan Berjalan
            </div>
          </div>
        </div>
      </div>

      {/* Selected Period Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari tanggal..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              ({displayRecords.length} hari dari {periodRecords.length} hari dalam periode)
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Rentang data: {formatDateIndo(effectiveStartDate)} s/d {formatDateIndo(effectiveEndDate)}
          </div>
        </div>

        {/* Table Body */}
        {displayRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Tidak ada data untuk rentang tanggal yang dipilih.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan sesuaikan tanggal mulai dan tanggal selesai di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => {
                      setSortField('date');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tanggal</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      setSortField('energyKWh');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Konsumsi Energi</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      setSortField('costRp');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Estimasi Biaya</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      setSortField('peakPowerW');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Beban Puncak</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Jam Peak</th>
                  <th className="py-3 px-4">Distribusi 3-Fasa (A / B / C)</th>
                  <th className="py-3 px-4">Power Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {formatDateIndo(item.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {formatNumber(item.energyKWh, 1)} kWh
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                      {formatRupiah(item.costRp)}
                    </td>
                    <td className="py-3 px-4 font-medium text-amber-700 whitespace-nowrap">
                      {formatWatts(item.peakPowerW)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {item.peakTime} WIB
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-rose-600 font-medium">{item.energyPhaseA}</span> /
                        <span className="text-amber-600 font-medium">{item.energyPhaseB}</span> /
                        <span className="text-sky-600 font-medium">{item.energyPhaseC}</span>
                        <span className="text-slate-400 text-[10px]">kWh</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.avgPowerFactor >= 0.85
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {formatNumber(item.avgPowerFactor, 3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
