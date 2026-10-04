import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, RefreshCw, Zap, BarChart3 } from 'lucide-react';
import { PowerMeterData } from '../types/powermeter';

type MongoPoint = PowerMeterData & { savedAt: string; receivedAt?: string; energyTodayKWh?: number; energyTodayRKWh?: number; energyTodaySKWh?: number; energyTodayTKWh?: number };
type DailyRow = {
  date: string; samples: number; energyKWh: number; peakPowerW: number;
  peakTime: string; avgPowerFactor: number; phaseA: number; phaseB: number; phaseC: number; costRp: number;
};

const pad=(n:number)=>String(n).padStart(2,'0');
const localDate=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmt=(n:number,d=2)=>n.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});

export const MonthlyHistory: React.FC<{ratePerKWh:number}> = ({ratePerKWh}) => {
  const now=new Date();
  const ago=new Date(now); ago.setDate(ago.getDate()-30);
  const [start,setStart]=useState(localDate(ago));
  const [end,setEnd]=useState(localDate(now));
  const [points,setPoints]=useState<MongoPoint[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function load(){
    setLoading(true); setError('');
    try{
      const from=new Date(start+'T00:00:00');
      const to=new Date(end+'T23:59:59.999');
      const qs=new URLSearchParams({start:from.toISOString(),end:to.toISOString(),limit:'10000'});
      const res=await fetch('/api/history?'+qs);
      const json=await res.json();
      if(!res.ok||!json.success) throw new Error(json.message||'Gagal mengambil histori MongoDB');
      setPoints((json.data||[]).filter((p:any)=>p.savedAt&&typeof p.activePower==='number'));
    }catch(e:any){setError(e.message||'Gagal mengambil histori MongoDB')}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  const rows=useMemo<DailyRow[]>(()=>{
    const groups=new Map<string,MongoPoint[]>();
    points.forEach(p=>{
      const key=localDate(new Date(p.savedAt));
      const arr=groups.get(key)||[]; arr.push(p); groups.set(key,arr);
    });
    return Array.from(groups.entries()).map(([date,arr])=>{
      arr.sort((a,b)=>+new Date(a.savedAt)-+new Date(b.savedAt));
      let energy=0,aKwh=0,bKwh=0,cKwh=0;
      for(let i=0;i<arr.length;i++){
        const dt=i<arr.length-1 ? Math.min((+new Date(arr[i+1].savedAt)-+new Date(arr[i].savedAt))/3600000,0.25) : 0;
        energy+=(arr[i].activePower||0)/1000*dt;
        aKwh+=(arr[i].activePowerA||0)/1000*dt;
        bKwh+=(arr[i].activePowerB||0)/1000*dt;
        cKwh+=(arr[i].activePowerC||0)/1000*dt;
      }
      const lastPoint=arr[arr.length-1];
      if(typeof lastPoint.energyTodayKWh==='number'){
        energy=lastPoint.energyTodayKWh;
        aKwh=Number(lastPoint.energyTodayRKWh||0);
        bKwh=Number(lastPoint.energyTodaySKWh||0);
        cKwh=Number(lastPoint.energyTodayTKWh||0);
      }
      const peak=arr.reduce((m,p)=>(p.activePower||0)>(m.activePower||0)?p:m,arr[0]);
      const pf=arr.reduce((sum,p)=>sum+(p.powerFactor||0),0)/arr.length;
      return {date,samples:arr.length,energyKWh:energy,peakPowerW:peak?.activePower||0,
        peakTime:peak?new Date(peak.savedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-',
        avgPowerFactor:pf,phaseA:aKwh,phaseB:bKwh,phaseC:cKwh,costRp:energy*ratePerKWh};
    }).sort((a,b)=>b.date.localeCompare(a.date));
  },[points,ratePerKWh]);

  const total=rows.reduce((sum,r)=>sum+r.energyKWh,0);
  const totalCost=rows.reduce((sum,r)=>sum+r.costRp,0);
  const first=points.length?new Date(points[0].savedAt):null;
  const last=points.length?new Date(points[points.length-1].savedAt):null;

  function HistoryComboChart(){
    const data=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
    if(!data.length) return null;
    const W=900,H=300,L=58,R=78,T=28,B=52,plotW=W-L-R,plotH=H-T-B;
    const maxK=Math.max(...data.map(d=>d.energyKWh),1);
    const maxRp=Math.max(...data.map(d=>d.costRp),1);
    const step=plotW/data.length, barW=Math.max(5,Math.min(30,step*0.55));
    const pts=data.map((d,i)=>({x:L+step*i+step/2,y:T+plotH-(d.costRp/maxRp)*plotH}));
    const path=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
    return <div className="w-full overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px] h-auto" role="img" aria-label="Grafik kWh harian dan estimasi biaya rupiah">
      {[0,0.25,0.5,0.75,1].map(v=><g key={v}><line x1={L} x2={W-R} y1={T+plotH*(1-v)} y2={T+plotH*(1-v)} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="1"/><text x={L-8} y={T+plotH*(1-v)+4} textAnchor="end" fontSize="10" fill="currentColor" className="text-slate-500">{fmt(maxK*v,1)}</text><text x={W-R+8} y={T+plotH*(1-v)+4} fontSize="10" fill="currentColor" className="text-slate-500">{Math.round(maxRp*v/1000)}k</text></g>)}
      {data.map((d,i)=>{const x=L+step*i+step/2;const h=(d.energyKWh/maxK)*plotH;return <g key={d.date}><rect x={x-barW/2} y={T+plotH-h} width={barW} height={h} rx="3" className="fill-emerald-500 opacity-80"><title>{d.date}: {fmt(d.energyKWh,3)} kWh</title></rect><text x={x} y={H-25} textAnchor="middle" fontSize="9" fill="currentColor" className="text-slate-500" transform={data.length>12?`rotate(-45 ${x} ${H-25})`:undefined}>{new Date(d.date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}</text></g>})}
      <path d={path} fill="none" className="stroke-amber-500" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" className="fill-amber-500"><title>{data[i].date}: Rp {Math.round(data[i].costRp).toLocaleString('id-ID')}</title></circle>)}
      <text x="12" y="16" fontSize="10" className="fill-emerald-600">kWh</text><text x={W-12} y="16" textAnchor="end" fontSize="10" className="fill-amber-600">Rp</text>
    </svg></div>;
  }

  function downloadCsv(){
    const head=['Tanggal','Jumlah Snapshot','Energi Terhitung (kWh)','Estimasi Biaya (Rp)','Peak Power (W)','Jam Peak','PF Rata-rata','Fasa R (kWh)','Fasa S (kWh)','Fasa T (kWh)'];
    const data=rows.map(r=>[r.date,r.samples,r.energyKWh.toFixed(4),Math.round(r.costRp),r.peakPowerW.toFixed(2),r.peakTime,r.avgPowerFactor.toFixed(4),r.phaseA.toFixed(4),r.phaseB.toFixed(4),r.phaseC.toFixed(4)]);
    const csv='\uFEFF'+[head,...data].map(r=>r.join(',')).join('\\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download=`powmon_histori_${start}_sd_${end}.csv`;a.click();URL.revokeObjectURL(a.href);
  }

  return <div className="space-y-5">
    <section className="pow-card p-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-600"/><h2 className="text-lg font-bold">Histori Data Harian</h2></div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">Dari<input className="pow-input block mt-1" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
          <label className="text-xs">Sampai<input className="pow-input block mt-1" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
          <button className="pow-btn pow-btn-primary" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>{loading?'Memuat':'Tampilkan'}</button>
          <button className="pow-btn bg-emerald-600 text-white disabled:opacity-40" onClick={downloadCsv} disabled={!rows.length}><Download className="w-4 h-4"/>CSV</button>
        </div>
      </div>
      {error&&<p className="mt-3 text-sm text-rose-500">{error}</p>}
    </section>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="pow-card p-4"><div className="text-xs text-slate-500">Total Energi Periode</div><div className="text-2xl font-bold mt-1 text-emerald-600">{fmt(total,3)} <span className="text-xs font-normal">kWh</span></div></div>
      <div className="pow-card p-4"><div className="text-xs text-slate-500">Estimasi Total Biaya</div><div className="text-2xl font-bold mt-1 text-amber-600">Rp {Math.round(totalCost).toLocaleString('id-ID')}</div></div>
      <div className="pow-card p-4"><div className="text-xs text-slate-500">Jumlah Hari</div><div className="text-2xl font-bold mt-1">{rows.length} <span className="text-xs font-normal">hari</span></div></div>
      <div className="pow-card p-4"><div className="text-xs text-slate-500">Rentang Data Nyata</div><div className="text-sm font-bold mt-2">{first?first.toLocaleString('id-ID'):'Belum ada data'}</div><div className="text-xs text-slate-500">{last?'s/d '+last.toLocaleString('id-ID'):''}</div></div>
    </div>

    <section className="pow-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4"><div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600"/><h3 className="font-bold">Konsumsi Energi & Estimasi Biaya Harian</h3></div><div className="flex gap-3 text-xs"><span className="text-emerald-600 font-semibold">■ kWh</span><span className="text-amber-600 font-semibold">● Rupiah</span></div></div>
      <HistoryComboChart/>
    </section>

    <section className="pow-card overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4"/><h3 className="font-bold">Rekap Data Harian Energy</h3></div>
      {!rows.length?<div className="p-12 text-center text-slate-500"><Zap className="w-8 h-8 mx-auto mb-3 opacity-40"/>{loading?'Mengambil data...':'Belum ada data pada rentang tanggal ini.'}</div>:
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/60 text-xs"><tr>
        <th className="p-3 text-left">Tanggal</th><th className="p-3 text-right">Snapshot</th><th className="p-3 text-right">Energi kWh</th><th className="p-3 text-right">Estimasi Rp</th><th className="p-3 text-right">Peak kW</th><th className="p-3 text-right">Jam Peak</th><th className="p-3 text-right">PF Rata-rata</th><th className="p-3 text-right">R / S / T kWh</th>
      </tr></thead><tbody>{rows.map(r=><tr key={r.date} className="border-t border-slate-100 dark:border-slate-800">
        <td className="p-3 font-medium">{new Date(r.date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</td>
        <td className="p-3 text-right">{r.samples}</td><td className="p-3 text-right">{fmt(r.energyKWh,3)}</td><td className="p-3 text-right">Rp {Math.round(r.costRp).toLocaleString('id-ID')}</td><td className="p-3 text-right">{fmt(r.peakPowerW/1000,3)}</td><td className="p-3 text-right">{r.peakTime}</td><td className="p-3 text-right">{fmt(r.avgPowerFactor,3)}</td><td className="p-3 text-right">{fmt(r.phaseA,2)} / {fmt(r.phaseB,2)} / {fmt(r.phaseC,2)}</td>
      </tr>)}</tbody></table></div>}
    </section>
  </div>;
};
