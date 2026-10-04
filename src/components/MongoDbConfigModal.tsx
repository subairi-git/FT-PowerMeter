import React, { useEffect, useState } from 'react';
import { X, Settings, LockKeyhole, Save, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ratePerKWh: number;
  onSaveTariff: (rate: number) => void;
}

export const MongoDbConfigModal: React.FC<Props> = ({ isOpen, onClose, ratePerKWh, onSaveTariff }) => {
  const [unlocked,setUnlocked]=useState(false);
  const [password,setPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [rate,setRate]=useState(String(ratePerKWh));

  useEffect(()=>{ if(isOpen){ setUnlocked(false); setPassword(''); setError(''); setRate(String(ratePerKWh)); } },[isOpen,ratePerKWh]);
  if(!isOpen) return null;

  const login=(e:React.FormEvent)=>{
    e.preventDefault();
    if(password==='teknik@unmer'){ setUnlocked(true); setError(''); }
    else setError('Password tidak sesuai.');
  };
  const save=()=>{
    const value=Number(rate);
    if(!Number.isFinite(value)||value<=0){ setError('Tarif harus berupa angka lebih dari 0.'); return; }
    onSaveTariff(value); setError(''); onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center"><Settings className="w-4 h-4"/></div><div><h3 className="font-bold text-slate-900 dark:text-white">Pengaturan Sistem</h3>{!unlocked&&<p className="text-xs text-slate-500">Akses administrator</p>}</div></div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4"/></button>
      </div>
      {!unlocked ? <form onSubmit={login} className="p-5 space-y-4">
        <div className="flex justify-center"><div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><LockKeyhole className="w-5 h-5 text-slate-600 dark:text-slate-300"/></div></div>
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password Administrator</label><div className="relative mt-1"><input autoFocus type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="pow-input w-full pr-10" placeholder="Masukkan password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></div>
        {error&&<p className="text-xs text-rose-600">{error}</p>}
        <button type="submit" className="pow-btn pow-btn-primary w-full justify-center">Masuk Pengaturan</button>
      </form>:
      <div className="p-5 space-y-5">
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tarif Energi Listrik</label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Rp</span><input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} className="pow-input w-full pl-10 pr-16 text-lg font-semibold"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">/ kWh</span></div></div>
        {error&&<p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="pow-btn pow-btn-soft">Batal</button><button onClick={save} className="pow-btn pow-btn-primary"><Save className="w-4 h-4"/>Simpan Tarif</button></div>
      </div>}
    </div>
  </div>;
};
