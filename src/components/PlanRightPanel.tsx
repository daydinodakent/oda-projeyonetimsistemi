import React, { useState, useEffect } from 'react';
import { DollarSign, FileCheck, CheckCircle2, AlertTriangle, Clock, Percent, Activity, Box, Ruler, Pencil, X } from 'lucide-react';
import { Project } from '../types';
import { Badge } from '../design-system';
import type { Tone } from '../design-system';

// Custom lightweight shoelace calculation to find polygon area in square meters without Turf
const calculatePolygonArea = (coords: [number, number][]) => {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];
    const x1 = p1[0] * 85000;
    const y1 = p1[1] * 111000;
    const x2 = p2[0] * 85000;
    const y2 = p2[1] * 111000;
    area += (x1 * y2) - (x2 * y1);
  }
  return Math.abs(area / 2);
};

interface PlanRightPanelProps {
  project: Project;
}

export default function PlanRightPanel({ project }: PlanRightPanelProps) {
  // Dynamic state for active map buildings
  const [buildings, setBuildings] = useState<any[]>(() => {
    const saved = localStorage.getItem('iga_added_buildings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse buildings', e);
      }
    }
    return [];
  });

  // Average floor height state (adjustable)
  const [avgFloorHeight, setAvgFloorHeight] = useState<number>(3.0);

  // Superuser Edit States
  const [permits, setPermits] = useState(project.permits);
  const [isEditingPermits, setIsEditingPermits] = useState(false);
  
  const [subcontractorCap, setSubcontractorCap] = useState(85);
  const [plannedCost, setPlannedCost] = useState("₺142.50M");
  const [actualCost, setActualCost] = useState("₺149.20M");
  const [isEditingResources, setIsEditingResources] = useState(false);

  useEffect(() => {
    setPermits(project.permits);
  }, [project]);

  // Synchronize buildings dynamically
  useEffect(() => {
    const syncData = () => {
      const saved = localStorage.getItem('iga_added_buildings');
      if (saved) {
        try {
          setBuildings(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse buildings', e);
        }
      }
    };
    
    syncData();
    window.addEventListener('storage', syncData);
    window.addEventListener('iga_added_buildings_changed', syncData);
    const interval = setInterval(syncData, 1500);
    
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('iga_added_buildings_changed', syncData);
      clearInterval(interval);
    };
  }, []);

  // Map out permits for display with clean styling. Mirrored in
  // InsaatView.tsx (same Permit['status'] enum) — keep both in sync.
  const permitStatusTones: Record<string, Tone> = {
    'Alındı': 'success',
    'Bekliyor': 'warning',
    'Süresi Doluyor': 'warning',
    'Süresi Doldu': 'danger',
  };

  // Local EVM map layer toggle state
  const [mapColorMode, setMapColorMode] = useState<'progress' | 'cost'>('progress');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter buildings by current active project
  const currentProjectBuildings = buildings.filter(b => b.projectId === project.id);

  let totalArea = 0;
  let totalVolume = 0;

  currentProjectBuildings.forEach(b => {
    if (b.coordinates && b.coordinates.length >= 3) {
      try {
        const areaM2 = calculatePolygonArea(b.coordinates);
        const floors = b.floors || 8;
        const volumeM3 = areaM2 * floors * avgFloorHeight;
        
        totalArea += areaM2;
        totalVolume += volumeM3;
      } catch (err) {
        console.error("Volume calculation failed:", err);
      }
    }
  });

  return (
    <div className="space-y-2.5">
      {/* 1. PROJE GENEL METRİKLERİ */}
      <div className="card py-1.5 rounded-none bg-transparent border-0 shadow-none px-0">
        <span className="section-eyebrow block mb-2">
          Proje Fizibilite Göstergeleri
        </span>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none">
            <span className="micro-label block leading-none mb-1">Toplam Alan</span>
            <strong className="text-[11px] text-[var(--text-primary)] font-black">{project.area}</strong>
          </div>
          <div className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none">
            <span className="micro-label block leading-none mb-1">Bütçe (BAC)</span>
            <strong className="text-[11px] text-emerald-500 font-black">₺{project.budget}M</strong>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--text-secondary)] font-bold">Planlanan Harcama:</span>
            <span className="font-extrabold text-[var(--text-primary)]">₺{project.plannedSpent}M</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--text-secondary)] font-bold">Fiziki Hazırlık Oranı:</span>
            <div className="flex items-center gap-1 font-extrabold text-blue-500">
              <Percent className="w-3 h-3" />
              <span>%{project.overallProgress}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--text-secondary)] font-bold">Risk Profil Derecesi:</span>
            <Badge
              tone={project.riskLevel === 'Düşük' ? 'success' : project.riskLevel === 'Orta' ? 'warning' : 'danger'}
              size="sm"
              className={project.riskLevel !== 'Düşük' && project.riskLevel !== 'Orta' ? 'animate-pulse' : ''}
            >
              {project.riskLevel} RİSK
            </Badge>
          </div>
        </div>
      </div>

      {/* CANLI CBS POLİGON İNŞAAT HACMİ METRİK KARTI */}
      <div className="bg-slate-900/60 border border-amber-500/30 p-3 rounded-none space-y-2.5 relative overflow-hidden backdrop-blur-sm shadow-lg">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Box className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">Tahmini İnşaat Hacmi</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
            CANLI SYNC
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Toplam Kübik Hacim</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString('tr-TR') : '0'}
            </span>
            <span className="text-xs font-black text-amber-500 font-mono">m³</span>
          </div>
        </div>

        {/* Ortalama Kat Yüksekliği Parametresi Kontrolü */}
        <div className="bg-slate-950/50 p-2 border border-slate-800/80 rounded space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Ruler className="w-2.5 h-2.5 text-slate-500" /> Ort. Kat Yüksekliği:
            </span>
            <span className="text-amber-400 font-black">{avgFloorHeight.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="4.5"
            step="0.1"
            value={avgFloorHeight}
            onChange={(e) => setAvgFloorHeight(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>2.5m</span>
            <span>3.5m (Standart)</span>
            <span>4.5m</span>
          </div>
        </div>

        {/* Poligon Taban Detay Özetleri */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="p-1.5 bg-slate-950/40 rounded border border-slate-800/50 flex flex-col">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Çizilen Poligon</span>
            <span className="text-slate-200 font-extrabold mt-0.5">{currentProjectBuildings.length} Adet</span>
          </div>
          <div className="p-1.5 bg-slate-950/40 rounded border border-slate-800/50 flex flex-col">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Toplam Taban Alanı</span>
            <span className="text-slate-200 font-extrabold mt-0.5">
              {totalArea > 0 ? Math.round(totalArea).toLocaleString('tr-TR') : '0'} m²
            </span>
          </div>
        </div>
      </div>

      {/* 2. RUHSAT & İZİNLER TABLOSU */}
      <div className="card py-1.5 rounded-none bg-transparent border-0 shadow-none px-0 border-t border-[var(--border)] pt-2.5">
        <div className="flex justify-between items-center mb-2">
          <span className="section-eyebrow flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            Yasal İzinler & Ruhsatlar
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-blue-500 font-bold">({permits.length} Evrak)</span>
            <button
              onClick={() => setIsEditingPermits(true)}
              className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              title="İzinleri Düzenle (SpU)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
          {permits.map((permit) => (
            <div key={permit.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none text-[10px] space-y-1">
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold text-[var(--text-primary)] leading-normal truncate block w-[120px]" title={permit.name}>
                  {permit.name}
                </span>
                <Badge tone={permitStatusTones[permit.status]} size="sm">
                  {permit.status}
                </Badge>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] pt-0.5">
                <span>Kurum: <strong>{permit.authority}</strong></span>
                <span>Bitiş: <strong className="text-red-400 font-mono">{permit.expiryDate}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. KAYNAK & BÜTÇE GRUBU */}
      <div className="card py-1.5 rounded-none bg-transparent border-0 shadow-none px-0 border-t border-[var(--border)] pt-2.5">
        <div className="flex justify-between items-center mb-2">
          <span className="section-eyebrow flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            Kaynak & Bütçe Yönetimi
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-500 font-black bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
              Çakışma Var (%{subcontractorCap})
            </span>
            <button
              onClick={() => setIsEditingResources(true)}
              className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              title="Kaynak ve Bütçe Düzenle (SpU)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
            Şantiyede görevli alt yüklenici, makine-ekipman ve birim fiyat planlaması.
          </p>

          {/* Alt Yüklenici Detayı */}
          <div className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-none space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-[var(--text-primary)]">Kalyon Altyapı A.Ş.</span>
              <span className="text-amber-500 font-extrabold">Kapasite: %{subcontractorCap}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${subcontractorCap}%` }} />
            </div>
          </div>

          {/* Kaynak Çakışma Alert */}
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-[var(--text-primary)] rounded-none space-y-0.5">
            <div className="flex items-center gap-1 text-amber-500 font-extrabold text-[10px] uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>KAYNAK ÇAKIŞMA ALARMI</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
              <strong>CAT-390 Ağır Ekskavatör</strong>, kümülatif olarak Sektör-A ve Sektör-B kazılarına ortak atanmış durumda.
            </p>
          </div>

          {/* Maliyet Özetleri */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="p-2 bg-[var(--bg-primary)] rounded-none border border-[var(--border)]">
              <span className="micro-label block">PLANLANAN MALİYET</span>
              <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">{plannedCost}</span>
            </div>
            <div className="p-2 bg-[var(--bg-primary)] rounded-none border border-[var(--border)]">
              <span className="micro-label block">GERÇEKLEŞEN BÜTÇE</span>
              <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">{actualCost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. EVM & SAPMA RAPORU */}
      <div className="card py-1.5 rounded-none bg-transparent border-0 shadow-none px-0 border-t border-[var(--border)] pt-2.5">
        <div className="flex justify-between items-center mb-2">
          <span className="section-eyebrow flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            EVM & Sapma Raporu
          </span>
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
            CPI: 1.05 | SPI: 0.98
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
            Kazanılmış Değer Analizi (Earned Value Management) kümülatif SAPMA özetleri.
          </p>

          {/* EVM Metrics PV, EV, AC */}
          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
            <div className="p-1.5 bg-[var(--bg-primary)] rounded-none border border-[var(--border)]">
              <span className="micro-label block">PV</span>
              <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">₺{project.plannedSpent}M</span>
            </div>
            <div className="p-1.5 bg-[var(--bg-primary)] rounded-none border border-[var(--border)]">
              <span className="micro-label block">EV</span>
              <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">₺{project.earnedValue}M</span>
            </div>
            <div className="p-1.5 bg-[var(--bg-primary)] rounded-none border border-[var(--border)]">
              <span className="micro-label block">AC</span>
              <span className="font-mono font-black text-[var(--text-primary)] text-[10px]">₺{project.spent}M</span>
            </div>
          </div>

          {/* SPI & CPI Micro cards */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 bg-gradient-to-r from-red-500/10 to-transparent rounded-none border border-red-500/20">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold">SPI (Süreç)</span>
                <span className="text-[10px] font-black text-red-500 uppercase">Gecikme</span>
              </div>
              <span className="text-[11px] font-black text-red-500">0.98</span>
            </div>

            <div className="p-2 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-none border border-emerald-500/20">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold">CPI (Maliyet)</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase">Karda</span>
              </div>
              <span className="text-[11px] font-black text-emerald-500">1.05</span>
            </div>
          </div>

          {/* Map Color Mode Selector */}
          <div className="space-y-1.5 border-t border-[var(--border)] pt-2.5">
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase block tracking-wider">HARİTA TEMATİK ISI KATMANI</span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setMapColorMode('progress');
                  showFeedbackToast('🌡️ Haritada imalat ilerleme yüzdesi tematik renk modu (Isı Haritası) uygulandı.');
                }}
                className={`w-full py-1 px-2.5 rounded-none border text-left transition flex justify-between items-center cursor-pointer ${
                  mapColorMode === 'progress'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-extrabold shadow-sm'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-[10px]">İlerleme Yüzdesi Isı Haritası</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </button>
              <button
                onClick={() => {
                  setMapColorMode('cost');
                  showFeedbackToast('🌡️ Haritada maliyet sapma bütçe durum tematik renk modu uygulandı.');
                }}
                className={`w-full py-1 px-2.5 rounded-none border text-left transition flex justify-between items-center cursor-pointer ${
                  mapColorMode === 'cost'
                    ? 'bg-amber-600/15 border-amber-500 text-amber-400 font-extrabold shadow-sm'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="text-[10px]">Maliyet Sapması Isı Haritası</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>
            </div>
          </div>

          {/* Local FeedBack Toast Banner */}
          {toastMessage && (
            <div className="p-1.5 bg-slate-950 text-white text-[10px] rounded border border-slate-800 animate-fade-in flex justify-between items-center">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white font-bold ml-1">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Permits Edit Modal (Süper Kullanıcı) */}
      {isEditingPermits && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">Yasal İzinler & Ruhsatlar Düzenleme</h3>
              </div>
              <button onClick={() => setIsEditingPermits(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-left">
              Süper kullanıcı yetkisiyle yasal izinlerin ve ruhsatların isim, merci ve durum bilgisini güncelleyebilirsiniz.
            </p>

            <div className="space-y-3 pt-2 text-left">
              {permits.map((p, idx) => (
                <div key={p.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">EVRAK / İZİN ADI</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...permits];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setPermits(updated);
                      }}
                      className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase">KURUM / MERCİ</label>
                      <input
                        type="text"
                        value={p.authority}
                        onChange={(e) => {
                          const updated = [...permits];
                          updated[idx] = { ...updated[idx], authority: e.target.value };
                          setPermits(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase">DURUM</label>
                      <select
                        value={p.status}
                        onChange={(e) => {
                          const updated = [...permits];
                          updated[idx] = { ...updated[idx], status: e.target.value };
                          setPermits(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Alındı">Alındı (Yeşil)</option>
                        <option value="Bekliyor">Bekliyor (Sarı)</option>
                        <option value="Süresi Doluyor">Süresi Doluyor (Mavi)</option>
                        <option value="Süresi Doldu">Süresi Doldu (Kırmızı)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsEditingPermits(false);
                showFeedbackToast('💾 Yasal izinler ve ruhsat bilgileri güncellendi.');
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
            >
              KAYDET VE KAPAT
            </button>
          </div>
        </div>
      )}

      {/* Resources Edit Modal (Süper Kullanıcı) */}
      {isEditingResources && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">Kaynak & Bütçe Düzenleme</h3>
              </div>
              <button onClick={() => setIsEditingResources(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-left">
              Süper kullanıcı yetkisiyle kaynak çakışma kapasitelerini ve maliyet bütçe bilgilerini güncelleyebilirsiniz.
            </p>

            <div className="space-y-3 pt-2 text-left">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase">ALT YÜKLENİCİ KAPASİTE ORANI (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={subcontractorCap}
                  onChange={(e) => setSubcontractorCap(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase">PLANLANAN MALİYET</label>
                  <input
                    type="text"
                    value={plannedCost}
                    onChange={(e) => setPlannedCost(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase">GERÇEKLEŞEN BÜTÇE</label>
                  <input
                    type="text"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsEditingResources(false);
                showFeedbackToast('💾 Kaynak kapasitesi ve bütçe detayları güncellendi.');
              }}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
            >
              KAYDET VE KAPAT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
