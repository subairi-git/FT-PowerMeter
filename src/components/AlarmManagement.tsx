import React, { useState } from 'react';
import {
  Bell,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Download,
  Filter,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { AlarmThresholds, AlarmRecord } from '../types/powermeter';
import { AlarmSettings, DEFAULT_THRESHOLDS } from '../services/alarmService';
import { formatDateIndo, formatTimeIndo, formatNumber } from '../utils/formatters';

interface AlarmManagementProps {
  thresholds: AlarmThresholds;
  settings: AlarmSettings;
  alarms: AlarmRecord[];
  onUpdateThresholds: (thresholds: Partial<AlarmThresholds>) => void;
  onUpdateSettings: (settings: Partial<AlarmSettings>) => void;
  onAcknowledgeAlarm: (id: string) => void;
  onAcknowledgeAll: () => void;
  onClearAll: () => void;
  onPlayTestSound: () => void;
}

export const AlarmManagement: React.FC<AlarmManagementProps> = ({
  thresholds,
  settings,
  alarms,
  onUpdateThresholds,
  onUpdateSettings,
  onAcknowledgeAlarm,
  onAcknowledgeAll,
  onClearAll,
  onPlayTestSound,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'settings'>('records');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'active'>('all');
  const [formData, setFormData] = useState<AlarmThresholds>(thresholds);
  const [isSaved, setIsSaved] = useState(false);

  const activeAlarms = alarms.filter((a) => a.status === 'active');

  const filteredAlarms = alarms.filter((a) => {
    if (filterSeverity === 'critical') return a.severity === 'critical';
    if (filterSeverity === 'warning') return a.severity === 'warning';
    if (filterSeverity === 'active') return a.status === 'active';
    return true;
  });

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateThresholds(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_THRESHOLDS);
    onUpdateThresholds(DEFAULT_THRESHOLDS);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportAlarmsCsv = () => {
    const headers = ['ID', 'Waktu', 'Parameter', 'Nilai Terbaca', 'Batas Ambang', 'Satuan', 'Tipe', 'Tingkat', 'Status', 'Pesan'];
    const rows = alarms.map((a) => [
      a.id,
      `"${a.timestamp}"`,
      `"${a.parameter}"`,
      a.value,
      a.threshold,
      a.unit,
      a.type,
      a.severity,
      a.status,
      `"${a.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_alarm_listrik_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Alarm & Batas Parameter</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau rekaman peristiwa gangguan listrik dan sesuaikan parameter batas minimal & maksimal
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'records'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Rekaman Alarm</span>
            {activeAlarms.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {activeAlarms.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Atur Batas Min / Max</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: REKAMAN ALARM */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setFilterSeverity('all')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  filterSeverity === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua ({alarms.length})
              </button>
              <button
                onClick={() => setFilterSeverity('active')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  filterSeverity === 'active'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                Aktif ({activeAlarms.length})
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  filterSeverity === 'critical'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Kritis ({alarms.filter((a) => a.severity === 'critical').length})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  filterSeverity === 'warning'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Peringatan ({alarms.filter((a) => a.severity === 'warning').length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeAlarms.length > 0 && (
                <button
                  onClick={onAcknowledgeAll}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesaikan Semua</span>
                </button>
              )}

              <button
                onClick={handleExportAlarmsCsv}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor CSV</span>
              </button>

              <button
                onClick={onClearAll}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Hapus semua riwayat log alarm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Log</span>
              </button>
            </div>
          </div>

          {/* Alarm Log List */}
          {filteredAlarms.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Tidak Ada Alarm</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Semua parameter kelistrikan gedung (tegangan, arus, daya, cos phi, dan frekuensi) saat ini dalam kondisi normal dan aman.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAlarms.map((item) => {
                const isCritical = item.severity === 'critical';
                const isActive = item.status === 'active';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? isCritical
                          ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200'
                          : 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200'
                        : 'border-slate-200/80 opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.type === 'min' ? (
                          <ArrowDownCircle className="w-5 h-5" />
                        ) : (
                          <ArrowUpCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{item.parameter}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCritical ? 'Kritis' : 'Peringatan'}
                          </span>
                          {isActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                              AKTIF
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              Diakui / Selesai
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 font-medium">{item.message}</p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Nilai: <strong className="text-slate-800">{item.value} {item.unit}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Ambang Batas: <strong className="text-slate-800">{item.threshold} {item.unit}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            {formatDateIndo(item.timestamp)} &bull; {formatTimeIndo(item.timestamp)} WIB
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="self-end sm:self-center shrink-0">
                      {isActive ? (
                        <button
                          onClick={() => onAcknowledgeAlarm(item.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tandai Selesai</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Terselesaikan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SETTINGS (MIN & MAX THRESHOLDS) */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveThresholds} className="space-y-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Batas Parameter Kelistrikan Gedung</h3>
                <p className="text-xs text-slate-500">
                  Alarm otomatis aktif dan dicatat apabila telemetri MQTT melampaui rentang minimal atau maksimal berikut.
                </p>
              </div>

              {/* Sound alert toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
                    if (!settings.soundEnabled) onPlayTestSound();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    settings.soundEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Suara Alarm Aktif</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Suara Senyap</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Threshold Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Tegangan Minimal & Maksimal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Tegangan Fasa (Volt)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    PLN 230V ±10%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">
                      Min (Under-Volt):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.voltageMin}
                        onChange={(e) =>
                          setFormData({ ...formData, voltageMin: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">V</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">
                      Max (Over-Volt):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.voltageMax}
                        onChange={(e) =>
                          setFormData({ ...formData, voltageMax: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">V</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Memicu alarm bila tegangan di luar rentang aman.</p>
              </div>

              {/* 2. Arus Maksimal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Arus Beban Maksimal (Ampere)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    MCB Breaker
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Batas Arus Fasa A/B/C:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.currentMax}
                      onChange={(e) =>
                        setFormData({ ...formData, currentMax: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">A</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Mencegah trip breaker akibat beban berlebih.</p>
              </div>

              {/* 3. Daya Aktif Maksimal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Daya Aktif Total (Watt)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    Kapasitas Gardu
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Beban Maksimal Gedung:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="100"
                      value={formData.activePowerMax}
                      onChange={(e) =>
                        setFormData({ ...formData, activePowerMax: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">W</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Batas daya tersambung (contoh: 15,000 W = 15 kW).</p>
              </div>

              {/* 4. Power Factor Minimal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Power Factor Minimal (Cos φ)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    Denda PLN 0.85
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Batas Minimal Cos φ:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="1.0"
                      value={formData.powerFactorMin}
                      onChange={(e) =>
                        setFormData({ ...formData, powerFactorMin: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Mencegah denda tagihan kVARh bila kapasitor bank bermasalah.</p>
              </div>

              {/* 5. Frekuensi Listrik */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Frekuensi PLN (Hz)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    50 Hz ±1%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">Min:</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.frequencyMin}
                        onChange={(e) =>
                          setFormData({ ...formData, frequencyMin: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">Hz</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">Max:</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.frequencyMax}
                        onChange={(e) =>
                          setFormData({ ...formData, frequencyMax: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">Hz</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Standar frekuensi jaringan PLN adalah 50.0 Hz.</p>
              </div>

              {/* 6. Kualitas Sinyal RSSI */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Sinyal IoT RSSI (dBm)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    Koneksi Node
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Batas Sinyal Lemah:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={formData.rssiMin}
                      onChange={(e) =>
                        setFormData({ ...formData, rssiMin: parseInt(e.target.value, 10) || -85 })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">dBm</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">Peringatan bila sinyal ESP32/Gateway melemah &lt; -85 dBm.</p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset ke Standar PLN</span>
              </button>

              <button
                type="submit"
                className="text-xs px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                <span>{isSaved ? 'Pengaturan Tersimpan!' : 'Simpan Parameter Batas'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
