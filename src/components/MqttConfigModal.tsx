import React, { useState } from 'react';
import {
  X,
  Radio,
  Server,
  Send,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { MqttConnectionConfig, PowerMeterData } from '../types/powermeter';
import { mqttService, ConnectionStatus } from '../services/mqttService';

interface MqttConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  config: MqttConnectionConfig;
  onSaveConfig: (config: Partial<MqttConnectionConfig>) => void;
  onTestPublish: (payload: Partial<PowerMeterData>) => void;
}

export const MqttConfigModal: React.FC<MqttConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  config,
  onSaveConfig,
  onTestPublish,
}) => {
  const [brokerUrl, setBrokerUrl] = useState(config.brokerUrl);
  const [topic, setTopic] = useState(config.topic);
  const [clientId, setClientId] = useState(config.clientId);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndReconnect = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ brokerUrl, topic, clientId });
    mqttService.connect({ brokerUrl, topic, clientId });
    onClose();
  };

  const handlePublishTestPacket = () => {
    setIsPublishing(true);
    try {
      onTestPublish({
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
      });
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 2000);
    } catch (err: any) {
      alert(`Gagal publish: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Konfigurasi MQTT Broker</h3>
              <p className="text-xs text-slate-500">HiveMQ Public Broker & Topik IoT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Note on Port 1883 vs WebSockets */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <div className="font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Catatan Port IoT (1883) vs Browser WebSockets:
          </div>
          <p className="text-[11px] leading-relaxed">
            Perangkat mikrokontroler (ESP32/Gateway) mengirim data ke <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">broker.hivemq.com:1883</code> via TCP MQTT murni.
            Di peramban web (browser), koneksi otomatis menggunakan WebSocket aman <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">wss://broker.hivemq.com:8884/mqtt</code> yang tersinkronisasi ke broker HiveMQ yang sama.
          </p>
        </div>

        <form onSubmit={handleSaveAndReconnect} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Broker URL (WebSocket HiveMQ):
            </label>
            <input
              type="text"
              value={brokerUrl}
              onChange={(e) => setBrokerUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="wss://broker.hivemq.com:8884/mqtt"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Topik MQTT (Topic):</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="andrian/powermeter/data"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Client ID:</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Test Publish Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Uji Publish Paket JSON:</span>
                <p className="text-[11px] text-slate-500">
                  Kirim paket JSON spesifikasi user ke topik <strong>{topic}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublishTestPacket}
                disabled={status !== 'connected' || isPublishing}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {publishSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{publishSuccess ? 'Terkirim!' : 'Publish Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 shadow-xs"
            >
              Simpan & Hubungkan Ulang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
