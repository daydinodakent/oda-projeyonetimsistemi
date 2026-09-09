import React, { useState } from 'react';
import { Shield, Bell, MessageSquare, Wifi, WifiOff, Smartphone, Send, Play, AlertTriangle, ArrowRight, DollarSign, Calendar, Sliders } from 'lucide-react';
import { Project, Notification } from '../types';

interface CEODashboardProps {
  projects: Project[];
  notifications: Notification[];
  onSelectProject: (projectId: string) => void;
  onSetView: (view: 'plan' | 'insaat' | 'isletme') => void;
  theme: 'dark' | 'light';
}

export default function CEODashboard({ projects, notifications, onSelectProject, onSetView, theme }: CEODashboardProps) {
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [selectedMobileProject, setSelectedMobileProject] = useState<Project | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<number>(10); // alert threshold %
  const [voiceQuery, setVoiceQuery] = useState<string>('');
  const [voiceResponse, setVoiceResponse] = useState<{ text: string; filterProjectId?: string } | null>(null);

  // Calculate company-wide aggregated metrics
  const activeProjectsCount = projects.length;
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const overallBudgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0;
  const criticalDelaysCount = notifications.filter(n => n.type === 'danger').length;
  const openRisksCount = notifications.filter(n => n.type === 'warning').length;

  const handleVoiceQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = voiceQuery.toLowerCase();
    
    if (query.includes('etap 1') || query.includes('terminal') || query.includes('sky tower')) {
      const p = projects.find(proj => proj.id === 'IGA-ETAP-1');
      setVoiceResponse({
        text: "IGA CITY 1. Etap (Terminal & Ticaret Merkezi) %72 fiziki tamamlanmada. Sky Tower 165m 38. kat kompozit döşeme aşamasında. Altyapı ve DHMİ izinleri eksiksiz.",
        filterProjectId: p?.id
      });
      if (p) setSelectedMobileProject(p);
    } else if (query.includes('etap 2') || query.includes('otel') || query.includes('kongre') || query.includes('fuar')) {
      const p = projects.find(proj => proj.id === 'IGA-ETAP-2');
      setVoiceResponse({
        text: "IGA CITY 2. Etap (Oteller & Kongre Kompleksi) %54 ilerlemede. Yağmur suyu drenaj kollektörü İSKİ onay süreci devam ediyor.",
        filterProjectId: p?.id
      });
      if (p) setSelectedMobileProject(p);
    } else if (query.includes('etap 3') || query.includes('kargo') || query.includes('lojistik')) {
      const p = projects.find(proj => proj.id === 'IGA-ETAP-3');
      setVoiceResponse({
        text: "IGA CITY 3. Etap (Lojistik & Kargo Parkı) %88 fiziki ilerleme ile en ileri aşamadaki etabımız. Otomatik robotik konveyör hatları faal.",
        filterProjectId: p?.id
      });
      if (p) setSelectedMobileProject(p);
    } else if (query.includes('etap 4') || query.includes('akademi') || query.includes('teknopark')) {
      const p = projects.find(proj => proj.id === 'IGA-ETAP-4');
      setVoiceResponse({
        text: "IGA CITY 4. Etap (Havacılık Akademisi & Teknopark) %25 ilerlemede. TGB Bakanlık kuruluş belgesi onaylandı, simülatör zemin imalatı başladı.",
        filterProjectId: p?.id
      });
      if (p) setSelectedMobileProject(p);
    } else if (query.includes('bütçe') || query.includes('sapma') || query.includes('finans')) {
      setVoiceResponse({
        text: "İGA Doğu Bölgesi genelinde toplam bütçe ₺17.35 Milyar TL. Gerçekleşen harcama ₺10.03 Milyar TL ile EVM plan bütçe tavanı dahilinde güvenli seyrediyor.",
      });
    } else {
      setVoiceResponse({
        text: "Anlaşılamadı. 'Etap 1', 'Otel', 'Kargo', 'Teknopark' veya 'Bütçe' kelimelerini deneyebilirsiniz. Örn: '1. Etap ne durumda?'",
      });
    }
  };

  return (
    <div className="max-w-[440px] mx-auto bg-[#090d16] text-[#f8fafc] border-[8px] border-[#1e293b] rounded-[42px] overflow-hidden shadow-2xl relative">
      {/* Phone Speaker Notch */}
      <div className="absolute top-0 inset-x-0 h-6 bg-[#1e293b] flex justify-center items-center z-30">
        <div className="w-20 h-3 bg-black rounded-full"></div>
      </div>

      {/* Internal Phone HUD Header */}
      <div className="pt-8 px-5 pb-3 bg-[#0d1527] flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800">
        <div className="flex items-center gap-1">
          <Smartphone className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-bold tracking-wider text-blue-400">CEO CEBİNDE</span>
        </div>
        
        {/* Offline Toggle Simulation */}
        <button 
          onClick={() => setOfflineMode(p => !p)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition ${
            offlineMode ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}
          id="ceo-btn-offline"
        >
          {offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          <span>{offlineMode ? 'Offline Turlar' : 'Online'}</span>
        </button>
      </div>

      {/* Screen Viewport container */}
      <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Offline state header info */}
        {offlineMode && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 text-center animate-pulse">
            İnternet kesildi. Son senkronizasyon: <strong>12 dakika önce</strong> (Saha Verileri Çevrimdışı Bellekten Alınıyor)
          </div>
        )}

        {/* Level 1: CEO High Level KPI Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Aktif Proje</span>
            <span className="text-xl font-extrabold text-blue-400 mt-1">{activeProjectsCount} Adet</span>
          </div>

          <div className="card p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Bütçe Sapması</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1">%-42.1</span>
          </div>

          <div className="card p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Kritik Gecikme</span>
            <span className="text-xl font-extrabold text-red-500 mt-1">{criticalDelaysCount} Şantiye</span>
          </div>

          <div className="card p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Aktif Risk / İhlal</span>
            <span className="text-xl font-extrabold text-amber-500 mt-1">{openRisksCount} Adet</span>
          </div>
        </div>

        {/* Level 2: Mobile Interactive Quick Map Nodes */}
        <div className="card p-3 rounded-xl">
          <span className="text-[10px] font-extrabold text-slate-400 block mb-2 uppercase tracking-wide">CBS Hızlı Proje Haritası</span>
          
          <div className="relative h-[120px] bg-[#090d16] rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Minimal Turkey map visual placeholder */}
            <svg width="100%" height="100%" className="absolute inset-0 opacity-40">
              <path d="M 20 60 Q 80 40 180 50 T 360 40" stroke="#1e293b" strokeWidth="2" fill="none" />
              <path d="M 40 100 Q 140 80 280 90 T 380 80" stroke="#1e293b" strokeWidth="2" fill="none" />
            </svg>

            {/* Project Nodes */}
            {projects.map((p, idx) => {
              const colors = p.id === 'IST-3D-2026' ? 'bg-amber-500' : p.id === 'ANK-3D-2025' ? 'bg-red-500' : 'bg-emerald-500';
              const xPos = p.id === 'IST-3D-2026' ? 'left-1/4' : p.id === 'ANK-3D-2025' ? 'left-1/2' : 'left-3/4';
              const yPos = p.id === 'IST-3D-2026' ? 'top-1/3' : p.id === 'ANK-3D-2025' ? 'top-1/2' : 'top-1/4';

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedMobileProject(p)}
                  className={`absolute ${xPos} ${yPos} -ml-2 -mt-2 w-4.5 h-4.5 rounded-full ${colors} border-2 border-white cursor-pointer hover:scale-125 transition flex items-center justify-center shadow-lg`}
                  title={p.name}
                  id={`ceo-node-${p.id}`}
                >
                  <span className="animate-ping absolute inset-0 rounded-full bg-inherit opacity-75"></span>
                </button>
              );
            })}

            <span className="absolute bottom-1 right-2 text-[8px] text-slate-500 font-bold uppercase tracking-wider">İnteraktif CBS</span>
          </div>

          <div className="flex justify-between mt-2 text-[8px] text-slate-400 font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block"></span> Planlama</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500 inline-block"></span> Riskli Yapı</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block"></span> Gecikmeli</span>
          </div>
        </div>

        {/* Level 3: Project summary drilldown overlay */}
        {selectedMobileProject && (
          <div className="bg-[#18253f] border border-blue-500/30 p-4 rounded-xl space-y-3 shadow-lg relative animate-fade-in">
            <button 
              onClick={() => setSelectedMobileProject(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-white font-extrabold text-xs"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block">{selectedMobileProject.location}</span>
              <h4 className="text-xs font-extrabold text-white">{selectedMobileProject.name}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-700 pt-2.5 text-[10px]">
              <div>
                <span className="text-slate-400">İlerleme Oranı</span>
                <span className="text-xs font-bold text-emerald-400 block">%{selectedMobileProject.overallProgress}</span>
              </div>
              <div>
                <span className="text-slate-400">Tavan Bütçe</span>
                <span className="text-xs font-bold text-white block">₺{selectedMobileProject.budget}M</span>
              </div>
            </div>

            {/* Drilldown action triggers */}
            <div className="flex gap-1.5 pt-2 border-t border-slate-700">
              <button 
                onClick={() => {
                  onSelectProject(selectedMobileProject.id);
                  onSetView('plan');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-1.5 rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1"
                id="ceo-btn-drill-plan"
              >
                <span>Plan WBS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button 
                onClick={() => {
                  onSelectProject(selectedMobileProject.id);
                  onSetView('insaat');
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 py-1.5 rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1"
                id="ceo-btn-drill-insaat"
              >
                <span>4D İnşaat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Akıllı Bildirimler (CEO Exception Alerts) */}
        <div className="card p-3 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Akıllı Sapma Alarmları</span>
            <span className="px-1.5 py-0.2 bg-red-600/20 text-red-400 text-[8px] font-bold rounded">Sapma Limit: %{alertThreshold}</span>
          </div>

          {/* Threshold alert slider */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-500 font-bold">MIN (%5)</span>
            <input 
              type="range" 
              min="5" 
              max="30" 
              value={alertThreshold} 
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            />
            <span className="text-[8px] text-slate-500 font-bold">MAX (%30)</span>
          </div>

          <div className="space-y-2 max-h-[150px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-2 rounded-lg border text-[10px] flex gap-1.5 ${
                  notif.type === 'danger' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p>{notif.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Voice Assistant Prompt Simulator */}
        <div className="card p-3 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              CEO Hızlı Sesli/Yazılı Sorgu
            </span>
            <span className="text-[8px] text-blue-500 font-bold uppercase">Dynamic AI</span>
          </div>

          <form onSubmit={handleVoiceQuerySubmit} className="flex gap-1.5">
            <input 
              type="text" 
              placeholder="'Ankara'daki proje ne durumda?'" 
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
              className="flex-1 bg-[#090d16] border border-slate-800 rounded-lg p-2 text-[10px] focus:outline-none text-white placeholder-slate-500"
            />
            <button 
              type="submit" 
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
              id="ceo-btn-query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {voiceResponse && (
            <div className="p-2.5 bg-[#0d1527] border border-slate-800 rounded-lg text-[10px] text-slate-300 leading-relaxed animate-fade-in">
              <strong className="text-blue-400 block mb-0.5">OdaGIS Yapay Zeka:</strong>
              {voiceResponse.text}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sim Bar */}
      <div className="px-6 py-4 bg-[#0d1527] flex justify-between items-center border-t border-slate-800">
        <button 
          onClick={() => setSelectedMobileProject(projects[0])}
          className="text-[9px] font-bold text-slate-400 hover:text-white flex flex-col items-center gap-1"
        >
          <Smartphone className="w-4 h-4 text-slate-400" />
          <span>Ana Sayfa</span>
        </button>
        <button 
          onClick={() => {
            onSelectProject(projects[0].id);
            onSetView('plan');
          }}
          className="text-[9px] font-bold text-slate-400 hover:text-white flex flex-col items-center gap-1"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>İş Programı</span>
        </button>
        <button 
          onClick={() => {
            onSelectProject(projects[0].id);
            onSetView('insaat');
          }}
          className="text-[9px] font-bold text-slate-400 hover:text-white flex flex-col items-center gap-1"
        >
          <Shield className="w-4 h-4 text-slate-400" />
          <span>Saha Ruhsat</span>
        </button>
      </div>

      {/* Interactive Bottom Accent Button Bar */}
      <div className="absolute bottom-2 inset-x-0 h-1.5 flex justify-center z-30">
        <div className="w-28 h-1 bg-slate-500 rounded-full"></div>
      </div>
    </div>
  );
}
