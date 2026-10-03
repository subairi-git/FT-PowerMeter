import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  Layers,
  FileCode2,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface MongoDbConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MongoDbConfigModal: React.FC<MongoDbConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedVar, setCopiedVar] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  if (!isOpen) return null;

  const envSample = `# Tambahkan di file .env atau Secrets Environment:
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="powermeter_db"
MONGODB_COLLECTION="power_readings"`;

  const schemaSample = `// Format Dokumen MongoDB Atlas (Collection: power_readings)
{
  "_id": ObjectId("..."),
  "buildingId": "GEDUNG-UTAMA-MDP-01",
  "voltageA": 231.95,
  "voltageB": 231.48,
  "voltageC": 235.17,
  "currentA": 9.48,
  "currentB": 15.58,
  "currentC": 21.15,
  "activePower": 10117.36,
  "reactivePower": -576.35,
  "powerFactor": 0.998,
  "frequency": 49.98,
  "activePowerA": 1655.04,
  "activePowerB": 3535.47,
  "activePowerC": 4926.85,
  "powerFactorA": 0.893,
  "powerFactorB": 0.997,
  "powerFactorC": 1.0,
  "rssi": -71,
  "timestamp": ISODate("2026-10-01T22:58:47.000Z")
}`;

  const copyToClipboard = (text: string, type: 'var' | 'schema') => {
    navigator.clipboard.writeText(text);
    if (type === 'var') {
      setCopiedVar(true);
      setTimeout(() => setCopiedVar(false), 2000);
    } else {
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Integrasi MongoDB Atlas</h3>
              <p className="text-xs text-slate-500">Penyimpanan & Pencatatan Telemetri Daya Listrik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notice */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800">
              Kesiapan Penyimpanan MongoDB Atlas
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Struktur data telah disesuaikan persis dengan skema JSON IoT meteran listrik gedung Anda. Saat Anda telah mengisikan variabel lingkungan (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[11px]">MONGODB_URI</code>) nanti, database dapat langsung menyimpan setiap paket data yang diterima dari broker MQTT secara otomatis.
            </p>
          </div>
        </div>

        {/* Environment Variables Guide */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              1. Konfigurasi Variabel Lingkungan (.env):
            </span>
            <button
              onClick={() => copyToClipboard(envSample, 'var')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
            >
              {copiedVar ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedVar ? 'Tersalin' : 'Salin Konfigurasi'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
            {envSample}
          </pre>
        </div>

        {/* JSON Schema */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              2. Skema Dokumen Collection (power_readings):
            </span>
            <button
              onClick={() => copyToClipboard(schemaSample, 'schema')}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
            >
              {copiedSchema ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSchema ? 'Tersalin' : 'Salin Skema'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
            {schemaSample}
          </pre>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800"
          >
            Selesai / Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
