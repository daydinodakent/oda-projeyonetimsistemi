import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldCheck, CalendarRange, Thermometer, Zap, AlertTriangle, Cpu, Pencil, X } from 'lucide-react';
import { Project, Asset } from '../types';

interface IsletmeRightPanelProps {
  project: Project;
  assets: Asset[];
  selectedAssetId: string | null;
}

interface LiveDataPoint {
  time: string;
  energy: number;
}

export default function IsletmeRightPanel({ project, assets, selectedAssetId }: IsletmeRightPanelProps) {
  // Find current selected asset
  const asset = assets.find(a => a.id === selectedAssetId) || assets[0];

  // Superuser Edit States
  const [assetWarranty, setAssetWarranty] = useState('');
  const [assetLastMaintenance, setAssetLastMaintenance] = useState('');
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    if (asset) {
      setAssetWarranty(asset.warrantyStatus);
      setAssetLastMaintenance(asset.lastMaintenanceDate || '2026-08-15');
    }
  }, [asset?.id, asset?.warrantyStatus, asset?.lastMaintenanceDate]);

  // Live Scrolling IoT Energy Data State
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([
    { time: '10:00', energy: 42 },
    { time: '10:05', energy: 45 },
    { time: '10:10', energy: 43 },
    { time: '10:15', energy: 48 },
    { time: '10:20', energy: 44 },
    { time: '10:25', energy: 50 },
    { time: '10:30', energy: 46 },
    { time: '10:35', energy: 52 },
  ]);

  // Live Temperature readout
  const [liveTemp, setLiveTemp] = useState<number>(23.4);

  useEffect(() => {
    // Scroll tick every 2.5 seconds
    const interval = setInterval(() => {
      // Fluctuate temperature slightly
      setLiveTemp(prev => {
        const delta = (Math.random() - 0.5) * 0.4;
        return parseFloat((prev + delta).toFixed(1));
      });

      // Append new energy data point
      setLiveData(prev => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Base energy consumption depending on asset state
        const baseEnergy = asset?.status === 'Arızalı' ? 10 : asset?.status === 'Bakım Bekliyor' ? 65 : 45;
        const noise = (Math.random() - 0.5) * 12;
        const newVal = Math.round(Math.max(5, baseEnergy + noise));

        const nextData = [...prev.slice(1), { time: timeStr, energy: newVal }];
        return nextData;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [asset?.id, asset?.status]);

  if (!asset) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-none text-center text-xs text-slate-500 italic">
        Bilgi kartını görmek için soldan bir varlık seçin.
      </div>
    );
  }

  const isFaulty = asset.status === 'Arızalı';

  return (
    <div className="space-y-2.5">
      {/* 1. SEÇİLİ VARLIK BİLGİ KARTI */}
      <div className="card p-0 pt-1.5 rounded-none bg-transparent border-0 shadow-none px-0">
        <div className="flex justify-between items-center mb-2 border-b border-[var(--border)] pb-2 -mt-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            Varlık Kimlik Kartı
          </span>
          <button
            onClick={() => setIsEditingAsset(true)}
            className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
            title="Varlık Bilgilerini Düzenle (SpU)"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        <h4 className="text-xs font-black text-[var(--text-primary)] mb-1 leading-normal pt-1.5 text-left">
          {asset.name}
        </h4>
        <div className="text-left">
          <span className={`px-2 py-0.5 rounded-none text-[9px] font-black inline-block mb-2 ${
            isFaulty 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' 
              : asset.status === 'Bakım Bekliyor' 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                : 'bg-emerald-500/15 text-emerald-500'
          }`}>
            {asset.status}
          </span>
        </div>

        <div className="space-y-1.5 text-xs pt-1.5 border-t border-[var(--border)]">
          <div className="flex justify-between items-center pb-0.5">
            <span className="text-[var(--text-secondary)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              Garanti Durumu:
            </span>
            <strong className="text-blue-500 text-[11px]">{assetWarranty}</strong>
          </div>

          <div className="flex justify-between items-center pb-0.5">
            <span className="text-[var(--text-secondary)] flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-amber-500" />
              Son Bakım Tarihi:
            </span>
            <strong className="text-[var(--text-primary)] font-mono">{assetLastMaintenance}</strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">Kümülatif Bakım:</span>
            <strong className="text-amber-500 font-mono">₺{asset.maintenanceCost}M</strong>
          </div>
        </div>
      </div>

      {/* 2. CANLI SCADA / SENSÖR TELEMETRİ ALANI */}
      <div className="card p-0 rounded-none bg-transparent border-0 shadow-none px-0 space-y-2 border-t border-[var(--border)] pt-2.5">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            IoT Canlı SCADA Telemetrisi
          </span>
          <span className="px-1.5 py-0.2 bg-red-600/15 text-red-500 text-[8px] font-extrabold rounded animate-pulse">
            LIVE
          </span>
        </div>

        {/* Readout stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Sıcaklık</span>
              <strong className="text-xs text-[var(--text-primary)] transition-all duration-300">{liveTemp}°C</strong>
            </div>
          </div>
          <div className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="text-[8px] text-[var(--text-secondary)] block uppercase">Anlık Güç</span>
              <strong className="text-xs text-[var(--text-primary)]">
                {liveData[liveData.length - 1]?.energy || 45} kW
              </strong>
            </div>
          </div>
        </div>

        {/* Rolling Live Chart */}
        <div className="space-y-1">
          <span className="text-[9px] text-[var(--text-secondary)] font-bold block">
            Reel-Time Enerji Akış Hızı (kW)
          </span>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnergyLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={7} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={7} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155',
                    fontSize: '8px',
                    color: '#f8fafc'
                  }} 
                />
                <Area type="monotone" dataKey="energy" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergyLive)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isFaulty && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-none text-[9px] text-red-400 flex gap-1.5 leading-normal">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Varlık kritik arıza modunda! Enerji tüketiminin düşmesi kompresör durmasına işaret ediyor. Acil müdahale ekibi yönlendirildi.</span>
          </div>
        )}

        {/* Local FeedBack Toast Banner */}
        {toastMessage && (
          <div className="p-1.5 bg-slate-950 text-white text-[9px] rounded border border-slate-800 animate-fade-in flex justify-between items-center z-[99] mt-2">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white font-bold ml-1">✕</button>
          </div>
        )}
      </div>

      {/* Asset Edit Modal (Süper Kullanıcı) */}
      {isEditingAsset && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm text-left">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">Varlık Düzenleme (SpU)</h3>
              </div>
              <button onClick={() => setIsEditingAsset(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Süper kullanıcı yetkisiyle seçili işletme varlığının garanti süresini ve son bakım tarihini güncelleyebilirsiniz.
            </p>

            <div className="space-y-3 pt-1 text-left">
              <div className="space-y-1">
                <label className="block text-[8px] text-slate-400 font-bold uppercase">VARLIK ADI</label>
                <div className="text-xs text-white font-bold bg-[#1c1c1e] p-2 rounded-lg border border-[#2c2c2e]">
                  {asset.name}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] text-slate-400 font-bold uppercase">GARANTİ DURUMU</label>
                <input
                  type="text"
                  value={assetWarranty}
                  onChange={(e) => setAssetWarranty(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] text-slate-400 font-bold uppercase">SON BAKIM TARİHİ</label>
                <input
                  type="text"
                  value={assetLastMaintenance}
                  onChange={(e) => setAssetLastMaintenance(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setIsEditingAsset(false);
                showFeedbackToast('💾 İşletme varlığı garanti ve bakım detayları güncellendi.');
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
            >
              KAYDET VE KAPAT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
