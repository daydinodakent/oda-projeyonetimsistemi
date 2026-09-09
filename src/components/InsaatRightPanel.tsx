import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Check, X, Shield, Activity, HelpCircle, AlertTriangle, Box, Ruler, Layers, Pencil } from 'lucide-react';

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

interface InsaatRightPanelProps {
  project: Project;
  notifications: any[];
}

export default function InsaatRightPanel({ project, notifications }: InsaatRightPanelProps) {
  const [data4D, setData4D] = useState({
    karsat: '205763132',
    katarcatik: '3.14',
    hafriyat: '5.57',
    alinsat: 20000,
    butceKunam: 57581,
    ruhsatVal: 16,
    botgum: 'SIMAM'
  });

  const [isEditingBIM, setIsEditingBIM] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Underground layer toggles inside panel
  const [undergroundUtilities, setUndergroundUtilities] = useState(true);
  const [undergroundSensors, setUndergroundSensors] = useState(true);

  // Dynamic state for active map buildings
  const [buildings, setBuildings] = useState<any[]>(() => {
    const saved = localStorage.getItem('iga_added_buildings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse buildings from local storage', e);
      }
    }
    return [];
  });

  // Average floor height state (adjustable)
  const [avgFloorHeight, setAvgFloorHeight] = useState<number>(3.0);

  // Synchronize buildings dynamically
  useEffect(() => {
    const syncData = () => {
      const saved = localStorage.getItem('iga_added_buildings');
      if (saved) {
        try {
          setBuildings(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse buildings from local storage', e);
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
    <div className="flex flex-col gap-2.5 w-full h-full text-white select-none">
      
      {/* 2. Key-Value Rows (Exactly as in the image) */}
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 pr-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          4D BIM Öznitelik Değerleri
        </span>
        <button
          onClick={() => setIsEditingBIM(true)}
          className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
          title="BIM Özniteliklerini Düzenle (SpU)"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="card p-2 rounded-none bg-transparent border-0 shadow-none px-1.5 text-[10px] space-y-1.5 font-bold font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Element:</span>
          <span className="text-white truncate max-w-[140px]" title={project.name}>{project.name.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Propertiy:</span>
          <span className="text-[#a78bfa]">Block</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Karsat:</span>
          <span className="text-white">{data4D.karsat}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Katarçatık:</span>
          <span className="text-white">{data4D.katarcatik}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Hafriyat Status:</span>
          <span className="text-white">{data4D.hafriyat}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 uppercase tracking-wider">Bütçe:</span>
          <span className="text-[#10b981] font-black bg-[#10b981]/10 px-1.5 py-0.5 rounded uppercase">TAMAM</span>
        </div>
      </div>

      {/* 3. Three Circular Gauges / Dials (Side-by-Side as in the image) */}
      <div className="grid grid-cols-3 gap-2 py-1">
        
        {/* Dial 1: Ruhsat */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* SVG circle track and fill */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="3" fill="transparent" />
              <circle cx="28" cy="28" r="24" className="stroke-cyan-500" strokeWidth="3" fill="transparent" strokeDasharray="150" strokeDashoffset="0" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400">
                <Check className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          </div>
          <span className="text-[8px] font-black uppercase text-slate-300 leading-tight">Ruhsat</span>
          <span className="text-[8px] font-bold text-cyan-400">ALINDI</span>
        </div>

        {/* Dial 2: İlerleme */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="3" fill="transparent" />
              <circle cx="28" cy="28" r="24" className="stroke-yellow-500" strokeWidth="3" fill="transparent" strokeDasharray="150" strokeDashoffset="35" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-yellow-400">
              %78
            </div>
          </div>
          <span className="text-[8px] font-black uppercase text-slate-300 leading-tight">İlerleme</span>
          <span className="text-[8px] font-bold text-yellow-400">%78</span>
        </div>

        {/* Dial 3: Bütçe */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="3" fill="transparent" />
              <circle cx="28" cy="28" r="24" className="stroke-emerald-500" strokeWidth="3" fill="transparent" strokeDasharray="150" strokeDashoffset="10" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          </div>
          <span className="text-[8px] font-black uppercase text-slate-300 leading-tight">Bütçe</span>
          <span className="text-[8px] font-bold text-emerald-400">TAMAM</span>
        </div>

      </div>

      {/* CANLI CBS POLİGON İNŞAAT HACMİ METRİK KARTI */}
      <div className="bg-slate-900/60 border border-amber-500/30 p-3 rounded-none space-y-2.5 relative overflow-hidden backdrop-blur-sm shadow-lg my-1">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Box className="w-3 h-3" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Tahmini İnşaat Hacmi</span>
          </div>
          <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
            CANLI SYNC
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[8.5px] text-slate-400 font-bold block uppercase tracking-wider">Toplam Kübik Hacim</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString('tr-TR') : '0'}
            </span>
            <span className="text-xs font-black text-amber-500 font-mono">m³</span>
          </div>
        </div>

        {/* Ortalama Kat Yüksekliği Parametresi Kontrolü */}
        <div className="bg-slate-950/50 p-2 border border-slate-800/80 rounded space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-[8.5px]">
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
          <div className="flex justify-between text-[7px] text-slate-500">
            <span>2.5m</span>
            <span>3.5m (Standart)</span>
            <span>4.5m</span>
          </div>
        </div>

        {/* Poligon Taban Detay Özetleri */}
        <div className="grid grid-cols-2 gap-2 text-[8.5px] font-mono">
          <div className="p-1.5 bg-slate-950/40 rounded border border-slate-800/50 flex flex-col">
            <span className="text-slate-500 block uppercase font-bold text-[7px]">Çizilen Poligon</span>
            <span className="text-slate-200 font-extrabold mt-0.5">{currentProjectBuildings.length} Adet</span>
          </div>
          <div className="p-1.5 bg-slate-950/40 rounded border border-slate-800/50 flex flex-col">
            <span className="text-slate-500 block uppercase font-bold text-[7px]">Toplam Taban Alanı</span>
            <span className="text-slate-200 font-extrabold mt-0.5">
              {totalArea > 0 ? Math.round(totalArea).toLocaleString('tr-TR') : '0'} m²
            </span>
          </div>
        </div>
      </div>

      {/* 4. 4D/5D Data Sliders list (From Image) */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
          4D/5D Çizelge Parametreleri
        </span>

        {/* Sliders list */}
        <div className="space-y-3.5 font-mono text-[9px]">
          
          {/* Slider 1: Double value simulation */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-bold">4D/5D Data:</span>
              <div className="flex gap-2">
                <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-1 rounded">32.861 M</span>
                <span className="text-slate-400">10.000</span>
              </div>
            </div>
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="absolute left-1/4 right-1/4 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"></div>
            </div>
          </div>

          {/* Slider 2: Progress */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-bold">Progress (Alınsat):</span>
              <span className="text-sky-400 font-extrabold">20.000</span>
            </div>
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="absolute left-0 w-[76%] h-full bg-sky-500 rounded-full"></div>
            </div>
            <div className="flex justify-between text-[8px] text-slate-500 mt-0.5 font-sans">
              <span>%76</span>
              <span>205</span>
            </div>
          </div>

          {/* Slider 3: Bütçe Kunam */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-bold">Bütçe Kunam:</span>
              <span className="text-yellow-400 font-extrabold">57.581</span>
            </div>
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="absolute left-0 w-[68%] h-full bg-yellow-500 rounded-full"></div>
            </div>
            <div className="flex justify-between text-[8px] text-slate-500 mt-0.5 font-sans">
              <span>0</span>
              <span>400</span>
            </div>
          </div>

          {/* Key Value metadata from picture */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
            <div className="p-2 bg-[#121622] rounded-none border border-slate-800 text-center">
              <span className="text-slate-500 block uppercase text-[7px] font-bold">Ruhsat Limit</span>
              <span className="text-white text-xs font-black">{data4D.ruhsatVal}</span>
            </div>
            <div className="p-2 bg-[#121622] rounded-none border border-slate-800 text-center">
              <span className="text-slate-500 block uppercase text-[7px] font-bold">Bötgüm</span>
              <span className="text-[#a78bfa] text-xs font-black">{data4D.botgum}</span>
            </div>
          </div>

          {/* Dynamic Interactive Layer Toggles */}
          <div className="pt-2.5 space-y-2">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Harita Gösterim Ayarları</span>
            <div className="flex flex-col gap-1.5">
              
              <button 
                onClick={() => setUndergroundUtilities(!undergroundUtilities)}
                className={`w-full py-1.5 px-3 rounded-none text-left font-black transition flex items-center justify-between ${
                  undergroundUtilities 
                    ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400' 
                    : 'bg-slate-800/40 border border-slate-800 text-slate-500'
                }`}
              >
                <span>Underground Utilities</span>
                <span className={`w-2.5 h-2.5 rounded-none ${undergroundUtilities ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
              </button>

              <button 
                onClick={() => setUndergroundSensors(!undergroundSensors)}
                className={`w-full py-1.5 px-3 rounded-none text-left font-black transition flex items-center justify-between ${
                  undergroundSensors 
                    ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-800/40 border border-slate-800 text-slate-500'
                }`}
              >
                <span>Underground Sensors: IoT</span>
                <span className={`w-2.5 h-2.5 rounded-none ${undergroundSensors ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
              </button>

            </div>
          </div>

          {/* Local FeedBack Toast Banner */}
          {toastMessage && (
            <div className="mt-3 p-1.5 bg-slate-950 text-white text-[9px] rounded border border-slate-800 animate-fade-in flex justify-between items-center">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white font-bold ml-1">✕</button>
            </div>
          )}

        </div>
      </div>

      {/* BIM Properties Edit Modal (Süper Kullanıcı) */}
      {isEditingBIM && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm text-left">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">4D BIM Öznitelik Düzenleme</h3>
              </div>
              <button onClick={() => setIsEditingBIM(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Süper kullanıcı yetkisiyle 4D BIM nesnelerine ait öznitelikleri, bütçe durumlarını ve parametrelerini değiştirebilirsiniz.
            </p>

            <div className="space-y-3 pt-1 text-left">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[8px] text-slate-400 font-bold uppercase">KARSAT ID</label>
                  <input
                    type="text"
                    value={data4D.karsat}
                    onChange={(e) => setData4D({ ...data4D, karsat: e.target.value })}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] text-slate-400 font-bold uppercase">KATARÇATIK DEĞERİ</label>
                  <input
                    type="text"
                    value={data4D.katarcatik}
                    onChange={(e) => setData4D({ ...data4D, katarcatik: e.target.value })}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[8px] text-slate-400 font-bold uppercase">HAFRİYAT STATÜSÜ</label>
                  <input
                    type="text"
                    value={data4D.hafriyat}
                    onChange={(e) => setData4D({ ...data4D, hafriyat: e.target.value })}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] text-slate-400 font-bold uppercase">BOTGUM KODU</label>
                  <input
                    type="text"
                    value={data4D.botgum}
                    onChange={(e) => setData4D({ ...data4D, botgum: e.target.value })}
                    className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsEditingBIM(false);
                showFeedbackToast('💾 4D BIM öznitelik verileri güncellendi.');
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
            >
              KAYDET VE KAPAT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
