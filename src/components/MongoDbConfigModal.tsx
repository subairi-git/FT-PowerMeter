import React, { useEffect, useState } from 'react';
import { X, Database, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface Props { isOpen:boolean; onClose:()=>void; }

export const MongoDbConfigModal: React.FC<Props> = ({isOpen,onClose}) => {
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<{connected:boolean;database?:string;collection?:string;documents?:number;message?:string}|null>(null);

  const check=async()=>{
    setLoading(true);
    try{
      const res=await fetch('/api/db-status');
      const json=await res.json();
      setStatus({connected:Boolean(res.ok&&json.connected),database:json.database,collection:json.collection,documents:json.documents,message:json.message});
    }catch{setStatus({connected:false,message:'Tidak dapat menghubungi server database.'})}
    finally{setLoading(false)}
  };
  useEffect(()=>{if(isOpen) check()},[isOpen]);
  if(!isOpen)return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Database className="w-4 h-4"/></div><h3 className="font-bold text-slate-900 dark:text-white">Status Database</h3></div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4"/></button>
      </div>
      <div className="p-5 space-y-4">
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${status?.connected?'bg-emerald-50 border-emerald-200':'bg-rose-50 border-rose-200'}`}>
          {status?.connected?<CheckCircle2 className="w-7 h-7 text-emerald-600"/>:<XCircle className="w-7 h-7 text-rose-600"/>}
          <div><div className={`font-bold ${status?.connected?'text-emerald-800':'text-rose-800'}`}>{loading?'Memeriksa...':status?.connected?'Database Connect':'Database Disconnect'}</div>{status?.message&&<div className="text-xs text-slate-500 mt-1">{status.message}</div>}</div>
        </div>
        {status?.connected&&<div className="grid grid-cols-2 gap-3 text-xs"><div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><div className="text-slate-500">Database</div><div className="font-semibold mt-1">{status.database||'-'}</div></div><div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><div className="text-slate-500">Data Tersimpan</div><div className="font-semibold mt-1">{status.documents??0}</div></div></div>}
        <button onClick={check} disabled={loading} className="pow-btn pow-btn-soft w-full justify-center"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Periksa Koneksi</button>
      </div>
    </div>
  </div>;
};
