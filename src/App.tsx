/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  PowerMeterData,
  AlarmThresholds,
  AlarmRecord,
  TaripPLN,
} from './types/powermeter';
import { INITIAL_POWER_DATA, ConnectionStatus } from './services/mqttService';
import { alarmService, AlarmSettings } from './services/alarmService';
import { realtimeBuffer } from './services/realtimeBuffer';

import { Navbar } from './components/Navbar';
import { RealtimeDashboard } from './components/RealtimeDashboard';
import { MonitoringCharts } from './components/MonitoringCharts';
import { MonthlyHistory } from './components/MonthlyHistory';
import { AlarmManagement } from './components/AlarmManagement';
import { MongoDbConfigModal } from './components/MongoDbConfigModal';
import { AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'realtime' | 'chart' | 'history' | 'alarms'>('realtime');
  const [powerData, setPowerData] = useState<PowerMeterData>(INITIAL_POWER_DATA);
  const [mqttStatus, setMqttStatus] = useState<ConnectionStatus>('disconnected');
  const [packetCount, setPacketCount] = useState<number>(0);

  // Alarm states
  const [thresholds, setThresholds] = useState<AlarmThresholds>(alarmService.getThresholds());
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings>(alarmService.getSettings());
  const [alarms, setAlarms] = useState<AlarmRecord[]>(alarmService.getAlarms());
  const [bannerAlert, setBannerAlert] = useState<AlarmRecord | null>(null);

  // Tarif is kept only for realtime cost display; historical measurements come from MongoDB.
  const [tariff, setTariff] = useState<TaripPLN>(() => ({
    tariffName: 'Golongan B-2 / TR (Bisnis Menengah)',
    ratePerKWh: Number(localStorage.getItem('powmon_tariff')) || 1444.70,
    ppnPercent: 0,
    pjuPercent: 0,
  }));

  // Modals
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);

  const [todayKWh, setTodayKWh] = useState(0);
  const todayCost = Math.round(todayKWh * tariff.ratePerKWh);

  useEffect(() => {
    let active = true;
    const loadEnergy = async () => {
      try {
        const res = await fetch('/api/energy-today');
        const json = await res.json();
        if (active && res.ok && json.success) setTodayKWh(Number(json.kWh || 0));
      } catch {}
    };
    loadEnergy();
    const timer = window.setInterval(loadEnergy, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  // Frontend receives realtime telemetry from the Render server.
  useEffect(() => {
    let active=true;
    let lastReceivedAt:string|null=null;
    const loadRealtime=async()=>{
      try{
        const res=await fetch('/api/realtime',{cache:'no-store'});
        const json=await res.json();
        if(!active)return;
        setMqttStatus(json?.mqtt?.telemetryActive?'connected':'disconnected');
        setPacketCount(Number(json?.mqtt?.packetCount||0));
        if(res.ok&&json.success&&json.data&&json.receivedAt!==lastReceivedAt){
          lastReceivedAt=json.receivedAt;
          const newData:PowerMeterData={...json.data,timestamp:Date.now()};
          setPowerData(newData);
          realtimeBuffer.push(newData);
          alarmService.evaluateTelemetry(newData);
        }
      }catch{
        if(active)setMqttStatus('error');
      }
    };
    const unsubAlarms=alarmService.subscribeAlarms((updatedAlarms)=>{
      setAlarms(updatedAlarms);
      const activeCrit=updatedAlarms.find((a)=>a.status==='active'&&a.severity==='critical');
      if(activeCrit)setBannerAlert(activeCrit);
    });
    setMqttStatus('connecting');
    loadRealtime();
    const timer=window.setInterval(loadRealtime,15000);
    return()=>{active=false;window.clearInterval(timer);unsubAlarms();};
  }, []);

  const handleInjectCustomData = (_partial: Partial<PowerMeterData>) => {};
  const handleResetToDefault = () => {};

  const handleUpdateThresholds = (newThresh: Partial<AlarmThresholds>) => {
    alarmService.updateThresholds(newThresh);
    setThresholds(alarmService.getThresholds());
  };

  const handleUpdateAlarmSettings = (newSettings: Partial<AlarmSettings>) => {
    alarmService.updateSettings(newSettings);
    setAlarmSettings(alarmService.getSettings());
  };

  const handleAcknowledgeAlarm = (id: string) => {
    alarmService.acknowledgeAlarm(id);
    if (bannerAlert?.id === id) {
      setBannerAlert(null);
    }
  };

  const handleAcknowledgeAllAlarms = () => {
    alarmService.acknowledgeAll();
    setBannerAlert(null);
  };

  const handleClearAllAlarms = () => {
    alarmService.clearAllAlarms();
    setBannerAlert(null);
  };

  const activeAlarmsCount = alarms.filter((a) => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mqttStatus={mqttStatus}
        activeAlarmsCount={activeAlarmsCount}
        onOpenMongoModal={() => setIsMongoModalOpen(true)}
        packetCount={packetCount}
      />

      {/* Floating Active Critical Alert Notification Toast */}
      {bannerAlert && (
        <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-rose-700">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
              </span>
              <span>
                <strong>Peringatan Gangguan:</strong> {bannerAlert.message}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('alarms')}
                className="underline hover:text-rose-100 font-semibold cursor-pointer whitespace-nowrap"
              >
                Lihat Tab Alarm
              </button>
              <button
                onClick={() => setBannerAlert(null)}
                className="p-1 rounded hover:bg-rose-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {activeTab === 'realtime' && (
          <RealtimeDashboard
            data={powerData}
            tariff={tariff}
            todayKWh={todayKWh}
            todayCost={todayCost}
            onInjectTestValue={handleInjectCustomData}
            onResetToDefault={handleResetToDefault}
          />
        )}

        {activeTab === 'chart' && (
          <MonitoringCharts liveData={powerData} />
        )}

        {activeTab === 'history' && (
          <MonthlyHistory ratePerKWh={tariff.ratePerKWh} />
        )}

        {activeTab === 'alarms' && (
          <AlarmManagement
            thresholds={thresholds}
            settings={alarmSettings}
            alarms={alarms}
            onUpdateThresholds={handleUpdateThresholds}
            onUpdateSettings={handleUpdateAlarmSettings}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
            onAcknowledgeAll={handleAcknowledgeAllAlarms}
            onClearAll={handleClearAllAlarms}
            onPlayTestSound={() => alarmService.playAlarmSound()}
            ratePerKWh={tariff.ratePerKWh}
            onSaveTariff={(rate) => {
              localStorage.setItem('powmon_tariff', String(rate));
              setTariff(prev => ({ ...prev, ratePerKWh: rate }));
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700">PowMon</span> &bull; Power Management Gedung Fakultas Teknik
          </div>
          <div className="flex items-center gap-3">
            <span>Broker: broker.hivemq.com</span>
            <span>&bull;</span>
            <span>Topik: andrian/powermeter/data</span>
            <span>&bull;</span>
            <button
              onClick={() => setIsMongoModalOpen(true)}
              className="text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              MongoDB Atlas Config
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MongoDbConfigModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
      />
    </div>
  );
}
