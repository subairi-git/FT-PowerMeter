/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PowerMeterData,
  AlarmThresholds,
  AlarmRecord,
  DailyPowerRecord,
  TaripPLN,
  MqttConnectionConfig,
} from './types/powermeter';
import {
  mqttService,
  INITIAL_POWER_DATA,
  ConnectionStatus,
} from './services/mqttService';
import { alarmService, AlarmSettings } from './services/alarmService';
import { historyService } from './services/historyService';

import { Navbar } from './components/Navbar';
import { RealtimeDashboard } from './components/RealtimeDashboard';
import { MonitoringCharts } from './components/MonitoringCharts';
import { MonthlyHistory } from './components/MonthlyHistory';
import { AlarmManagement } from './components/AlarmManagement';
import { MqttConfigModal } from './components/MqttConfigModal';
import { MongoDbConfigModal } from './components/MongoDbConfigModal';
import { AlertTriangle, X, Bell } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'realtime' | 'chart' | 'history' | 'alarms'>('realtime');
  const [powerData, setPowerData] = useState<PowerMeterData>(INITIAL_POWER_DATA);
  const [mqttStatus, setMqttStatus] = useState<ConnectionStatus>('disconnected');
  const [packetCount, setPacketCount] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Alarm states
  const [thresholds, setThresholds] = useState<AlarmThresholds>(alarmService.getThresholds());
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings>(alarmService.getSettings());
  const [alarms, setAlarms] = useState<AlarmRecord[]>(alarmService.getAlarms());
  const [bannerAlert, setBannerAlert] = useState<AlarmRecord | null>(null);

  // History & Tariff states
  const [historyRecords, setHistoryRecords] = useState<DailyPowerRecord[]>(historyService.getHistory());
  const [tariff, setTariff] = useState<TaripPLN>(historyService.getTariff());

  // Modals
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [mqttConfig, setMqttConfig] = useState<MqttConnectionConfig>(mqttService.getConfig());

  // Today's summary
  const todayRecord = historyRecords[historyRecords.length - 1] || null;
  const todayKWh = todayRecord ? todayRecord.energyKWh : 0;
  const todayCost = todayRecord ? todayRecord.costRp : 0;

  // Initialize and subscribe to services
  useEffect(() => {
    // 1. Subscribe to MQTT Status
    const unsubStatus = mqttService.subscribeStatus((status) => {
      setMqttStatus(status);
    });

    // 2. Subscribe to MQTT Telemetry Data
    const unsubData = mqttService.subscribeData((newData) => {
      setPowerData(newData);
      setPacketCount((prev) => prev + 1);

      // Check alarms against thresholds
      alarmService.evaluateTelemetry(newData);

      // Record into history
      historyService.recordIncomingTelemetry(newData);
    });

    // 3. Subscribe to Alarm Records
    const unsubAlarms = alarmService.subscribeAlarms((updatedAlarms) => {
      setAlarms(updatedAlarms);
      const activeCrit = updatedAlarms.find((a) => a.status === 'active' && a.severity === 'critical');
      if (activeCrit) {
        setBannerAlert(activeCrit);
      }
    });

    // 4. Subscribe to History Records
    const unsubHistory = historyService.subscribeHistory((updatedHistory) => {
      setHistoryRecords(updatedHistory);
    });

    // Connect to HiveMQ automatically on mount
    mqttService.connect();

    return () => {
      unsubStatus();
      unsubData();
      unsubAlarms();
      unsubHistory();
      mqttService.disconnect();
    };
  }, []);

  const handleToggleSimulation = () => {
    const nextState = mqttService.toggleSimulation();
    setIsSimulating(nextState);
  };

  const handleInjectCustomData = (partial: Partial<PowerMeterData>) => {
    mqttService.injectCustomData(partial);
  };

  const handleResetToDefault = () => {
    mqttService.injectCustomData(INITIAL_POWER_DATA);
  };

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

  const handleUpdateTariff = (newTariff: Partial<TaripPLN>) => {
    historyService.updateTariff(newTariff);
    setTariff(historyService.getTariff());
  };

  const handleExportHistoryCsv = (customRecords?: DailyPowerRecord[], filename?: string) => {
    const csvContent = historyService.exportCsv(customRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `rekap_energi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        onOpenMqttModal={() => setIsMqttModalOpen(true)}
        onOpenMongoModal={() => setIsMongoModalOpen(true)}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
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
          <MonthlyHistory
            records={historyRecords}
            tariff={tariff}
            onUpdateTariff={handleUpdateTariff}
            onExportCsv={handleExportHistoryCsv}
          />
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
      <MqttConfigModal
        isOpen={isMqttModalOpen}
        onClose={() => setIsMqttModalOpen(false)}
        status={mqttStatus}
        config={mqttConfig}
        onSaveConfig={(cfg) => {
          setMqttConfig((prev) => ({ ...prev, ...cfg }));
        }}
        onTestPublish={(payload) => {
          mqttService.publishData(payload);
        }}
      />

      <MongoDbConfigModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
      />
    </div>
  );
}
