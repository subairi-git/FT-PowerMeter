import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Radio, Search, Zap } from 'lucide-react';
import { PowerMeterData, AlarmThresholds } from '../types/powermeter';
import { realtimeBuffer } from '../services/realtimeBuffer';

type Point = PowerMeterData & { at: string };
type Series = { key: keyof PowerMeterData; label: string; color: string; divisor?: number };

const colors = ['#22c55e','#f43f5e','#f59e0b','#3b82f6'];
const pad = (n:number) => String(n).padStart(2,'0');
const localInput = (d:Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function LineChart({title, unit, data, series}:{title:string;unit:string;data:Point[];series:Series[]}) {
  const width=760, height=220, left=52, right=16, top=18, bottom=38;
  const vals=data.flatMap(p=>series.map(s=>Number(p[s.key]||0)/(s.divisor||1)));
  let min=Math.min(...vals,0), max=Math.max(...vals,1);
  if(title.includes('Tegangan') && vals.length){ min=Math.floor(Math.min(...vals)-5); max=Math.ceil(Math.max(...vals)+5); }
  if(title.includes('Cos')) { min=Math.min(.75,Math.min(...vals)); max=1.02; }
  const range=max-min||1;
  const x=(i:number)=>left+(i/Math.max(data.length-1,1))*(width-left-right);
  const y=(v:number)=>top+(max-v)/range*(height-top-bottom);
  return <div className="pow-card p-4">
    <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">{title}</h3><span className="text-[11px] text-slate-400">{unit}</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52">
      {[0,.25,.5,.75,1].map((q,i)=>{const yy=top+q*(height-top-bottom);const v=max-q*range;return <g key={i}><line x1={left} y1={yy} x2={width-right} y2={yy} stroke="currentColor" opacity=".09"/><text x={left-7} y={yy+4} textAnchor="end" fontSize="10" fill="currentColor" opacity=".55">{v.toFixed(unit==='kW'?1:unit==='Cos φ'?2:0)}</text></g>})}
      {series.map((s)=>{const pts=data.map((p,i)=>`${x(i)},${y(Number(p[s.key]||0)/(s.divisor||1))}`).join(' ');return <polyline key={s.label} points={pts} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>})}
      {data.length>0 && <><text x={left} y={height-10} fontSize="10" fill="currentColor" opacity=".55">{new Date(data[0].at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</text><text x={width-right} y={height-10} textAnchor="end" fontSize="10" fill="currentColor" opacity=".55">{new Date(data[data.length-1].at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</text></>}
    </svg>
    <div className="flex flex-wrap justify-center gap-4 text-[11px]">{series.map(s=><span key={s.label} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{background:s.color}}/>{s.label}</span>)}</div>
  </div>
}

function GaugeMetric({label,value,unit,statusColor,featured=false}:{label:string;value:string;unit:string;statusColor:string;featured?:boolean}) {
  const numeric=Number(value)||0;
  const ranges = label.includes('Tegangan') ? [180,260] : label.includes('Arus') ? [0,50] : label.includes('Cos') ? [0,1] : [0,20];
  const pct=Math.max(0,Math.min(1,(numeric-ranges[0])/(ranges[1]-ranges[0])));
  const startX=18,startY=78,endX=102,endY=78,cx=60,cy=78,r=42;
  const angle=Math.PI*(1-pct);
  const nx=cx+r*Math.cos(angle), ny=cy-r*Math.sin(angle);
  const arc=`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
  const active=`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${nx.toFixed(2)} ${ny.toFixed(2)}`;
  return <div className={`pow-card text-center flex flex-col justify-center min-w-0 ${featured ? 'p-5 lg:row-span-2' : 'p-3'}`}>
    <svg viewBox="0 0 120 88" className={`w-full mx-auto ${featured ? 'max-w-[270px]' : 'max-w-[135px]'}`}>
      <path d={arc} fill="none" stroke="currentColor" opacity=".10" strokeWidth="9" strokeLinecap="round"/>
      <path d={active} fill="none" stroke={statusColor} strokeWidth="9" strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="4" fill="currentColor"/>
      <text x="60" y="61" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">{value}</text>
      <text x="60" y="73" textAnchor="middle" fontSize="7" fill="currentColor" opacity=".55">{unit}</text>
    </svg>
    <div className={`font-medium text-slate-500 dark:text-slate-400 -mt-1 ${featured ? 'text-sm' : 'text-[10px] sm:text-[11px]'}`}>{label}</div>
  </div>
}

export function MonitoringCharts({liveData,thresholds}:{liveData:PowerMeterData;thresholds:AlarmThresholds}) {
  const now=new Date(); const startDefault=new Date(now); startDefault.setHours(0,0,0,0);
  const [mode,setMode]=useState<'realtime'|'history'>('realtime');
  const [live,setLive]=useState<Point[]>(() => realtimeBuffer.getAll());
  const [history,setHistory]=useState<Point[]>([]);
  const [start,setStart]=useState(localInput(startDefault));
  const [end,setEnd]=useState(localInput(now));
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{setLive(realtimeBuffer.getAll())},[liveData]);
  const data=mode==='realtime'?live:history;

  async function loadHistory(){
    setLoading(true);setError('');
    try{
      const qs=new URLSearchParams({start:new Date(start).toISOString(),end:new Date(end).toISOString(),limit:'10000'});
      const res=await fetch('/api/history?'+qs); const json=await res.json();
      if(!res.ok||!json.success) throw new Error(json.message||'Gagal mengambil histori');
      setHistory(json.data.map((p:any)=>({...p,at:p.savedAt||p.receivedAt}))); setMode('history');
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  }
  function downloadCsv(){
    const headers=['Waktu','Daya Total (kW)','Daya R (kW)','Daya S (kW)','Daya T (kW)','Arus R (A)','Arus S (A)','Arus T (A)','Tegangan R (V)','Tegangan S (V)','Tegangan T (V)','CosPhi Total','CosPhi R','CosPhi S','CosPhi T','Frekuensi (Hz)'];
    const rows=history.map(p=>[new Date(p.at).toLocaleString('id-ID'),p.activePower/1000,p.activePowerA/1000,p.activePowerB/1000,p.activePowerC/1000,p.currentA,p.currentB,p.currentC,p.voltageA,p.voltageB,p.voltageC,p.powerFactor,p.powerFactorA,p.powerFactorB,p.powerFactorC,p.frequency]);
    const csv='\uFEFF'+[headers,...rows].map(r=>r.join(',')).join(String.fromCharCode(13,10)); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`powmon_${start.slice(0,10)}_${end.slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  const latest=data[data.length-1]||({...liveData,at:new Date().toISOString()} as Point);
  const gaugeColor=(value:number,min?:number,max?:number)=>{
    const green='#22c55e', orange='#f59e0b', red='#ef4444';
    if(min!==undefined&&value<=min)return red;
    if(max!==undefined&&value>=max)return red;
    if(min!==undefined){
      const safeSpan=max!==undefined?max-min:Math.max(Math.abs(min)*0.2,0.05);
      if(value<=min+safeSpan*0.2)return orange;
    }
    if(max!==undefined){
      const safeSpan=min!==undefined?max-min:Math.max(Math.abs(max)*0.2,1);
      if(value>=max-safeSpan*0.2)return orange;
    }
    return green;
  };
  const phasePowerMax=thresholds.activePowerMax/3;
  const metrics=useMemo(()=>[
    ['Daya Total',(latest.activePower/1000).toFixed(3),'kW',gaugeColor(latest.activePower,undefined,thresholds.activePowerMax)],
    ['Daya R',(latest.activePowerA/1000).toFixed(3),'kW',gaugeColor(latest.activePowerA,undefined,phasePowerMax)],
    ['Daya S',(latest.activePowerB/1000).toFixed(3),'kW',gaugeColor(latest.activePowerB,undefined,phasePowerMax)],
    ['Daya T',(latest.activePowerC/1000).toFixed(3),'kW',gaugeColor(latest.activePowerC,undefined,phasePowerMax)],
    ['Arus R',latest.currentA.toFixed(2),'A',gaugeColor(latest.currentA,undefined,thresholds.currentMax)],
    ['Arus S',latest.currentB.toFixed(2),'A',gaugeColor(latest.currentB,undefined,thresholds.currentMax)],
    ['Arus T',latest.currentC.toFixed(2),'A',gaugeColor(latest.currentC,undefined,thresholds.currentMax)],
    ['Tegangan R',latest.voltageA.toFixed(1),'V',gaugeColor(latest.voltageA,thresholds.voltageMin,thresholds.voltageMax)],
    ['Tegangan S',latest.voltageB.toFixed(1),'V',gaugeColor(latest.voltageB,thresholds.voltageMin,thresholds.voltageMax)],
    ['Tegangan T',latest.voltageC.toFixed(1),'V',gaugeColor(latest.voltageC,thresholds.voltageMin,thresholds.voltageMax)],
    ['Cos φ',latest.powerFactor.toFixed(3),'',gaugeColor(latest.powerFactor,thresholds.powerFactorMin,undefined)]
  ],[latest,thresholds,phasePowerMax]);
  return <div className="space-y-5">
    <section className="pow-card p-4 sm:p-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div><div className="flex items-center gap-2 text-blue-500"><BarChart3 className="w-5 h-5"/><span className="font-bold text-base">Monitoring Grafik</span></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Realtime menampilkan 100 sampel terakhir dari RAM. Histori MongoDB tersimpan setiap 5 menit.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <button onClick={()=>setMode('realtime')} className={`pow-btn ${mode==='realtime'?'pow-btn-primary':'pow-btn-soft'}`}><Radio className="w-4 h-4"/>Realtime</button>
          <label className="text-[11px]">Dari<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} className="pow-input block mt-1"/></label>
          <label className="text-[11px]">Sampai<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} className="pow-input block mt-1"/></label>
          <button onClick={loadHistory} className="pow-btn pow-btn-primary"><Search className="w-4 h-4"/>{loading?'Memuat...':'Tampilkan'}</button>
          <button onClick={downloadCsv} disabled={!history.length} className="pow-btn bg-emerald-600 text-white disabled:opacity-40"><Download className="w-4 h-4"/>Download CSV</button>
        </div>
      </div>{error&&<p className="mt-3 text-sm text-rose-500">{error}</p>}
    </section>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[minmax(240px,2fr)_repeat(5,minmax(120px,1fr))] lg:grid-rows-2 auto-rows-fr gap-3">{metrics.map((m,i)=><GaugeMetric key={m[0]} label={m[0]} value={m[1]} unit={m[2]} statusColor={m[3]} featured={i===0}/>)}</div>
    {!data.length?<div className="pow-card p-12 text-center text-slate-500"><Zap className="w-8 h-8 mx-auto mb-3 opacity-40"/>{mode==='realtime'?'Menunggu data MQTT realtime...':'Pilih rentang tanggal lalu klik Tampilkan.'}</div>:
    <div className="grid xl:grid-cols-2 gap-4">
      <LineChart title="Daya Total" unit="kW" data={data} series={[{key:'activePower',label:'Daya Total',color:colors[0],divisor:1000}]}/>
      <LineChart title="Daya R / S / T" unit="kW" data={data} series={[{key:'activePowerA',label:'R',color:colors[1],divisor:1000},{key:'activePowerB',label:'S',color:colors[2],divisor:1000},{key:'activePowerC',label:'T',color:colors[3],divisor:1000}]}/>
      <LineChart title="Arus R / S / T" unit="A" data={data} series={[{key:'currentA',label:'R',color:colors[1]},{key:'currentB',label:'S',color:colors[2]},{key:'currentC',label:'T',color:colors[3]}]}/>
      <LineChart title="Tegangan R / S / T" unit="V" data={data} series={[{key:'voltageA',label:'R',color:colors[1]},{key:'voltageB',label:'S',color:colors[2]},{key:'voltageC',label:'T',color:colors[3]}]}/>
      <LineChart title="Cos φ" unit="Cos φ" data={data} series={[{key:'powerFactor',label:'Total',color:colors[0]},{key:'powerFactorA',label:'R',color:colors[1]},{key:'powerFactorB',label:'S',color:colors[2]},{key:'powerFactorC',label:'T',color:colors[3]}]}/>
      <LineChart title="Frekuensi" unit="Hz" data={data} series={[{key:'frequency',label:'Frekuensi',color:'#8b5cf6'}]}/>
    </div>}
  </div>
}