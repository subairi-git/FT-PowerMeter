import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Bell,
  Database,
  Radio,
  Sun,
  Moon,
} from 'lucide-react';
import { ConnectionStatus } from '../services/mqttService';

interface NavbarProps {
  activeTab: 'realtime' | 'chart' | 'history' | 'alarms';
  setActiveTab: (tab: 'realtime' | 'chart' | 'history' | 'alarms') => void;
  mqttStatus: ConnectionStatus;
  activeAlarmsCount: number;
  onOpenMqttModal: () => void;
  onOpenMongoModal: () => void;
  packetCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  mqttStatus,
  activeAlarmsCount,
  onOpenMqttModal,
  onOpenMongoModal,
  packetCount,
}) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('powmon_theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('powmon_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const getStatusBadge = () => {
    switch (mqttStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MQTT Terhubung
          </span>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Koneksi...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Koneksi Gagal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Offline
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">PowMon</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  MDP-01
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Power Management Gedung Fakultas Teknik
              </p>
            </div>
          </div>

          {/* Quick status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setDarkMode(v => !v)} title={darkMode ? 'Gunakan background putih' : 'Gunakan background hitam'} className="pow-btn pow-btn-soft">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden md:inline">{darkMode ? 'Terang' : 'Gelap'}</span>
            </button>
            {/* MQTT Badge button */}
            <button
              onClick={onOpenMqttModal}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              title="Atur koneksi MQTT HiveMQ"
            >
              {getStatusBadge()}
            </button>

            {/* MongoDB Atlas Info Button */}
            <button
              onClick={onOpenMongoModal}
              title="Konfigurasi Database MongoDB Atlas"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Connect</span>
            </button>

            {/* Packet counter pill */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100/70 px-2 py-1 rounded-md">
              <Radio className="w-3 h-3 text-slate-400" />
              <span>{packetCount} pkt</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-100 py-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('realtime')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'realtime'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Real-time 3-Fasa</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'chart'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Monitoring Grafik</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Histori Data</span>
          </button>

          <button
            onClick={() => setActiveTab('alarms')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'alarms'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alarm & Batas Parameter</span>
            {activeAlarmsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                {activeAlarmsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
