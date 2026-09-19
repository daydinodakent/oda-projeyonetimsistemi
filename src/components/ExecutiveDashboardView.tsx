import React, { useState } from 'react';
import { Project, Notification } from '../types';
import { Badge } from '../design-system';
import { 
  DollarSign, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle, 
  Layers, MapPin, Briefcase, ChevronRight, BarChart3, LineChart, 
  ArrowUpRight, ArrowDownRight, Award, Activity, X
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

interface ExecutiveDashboardViewProps {
  projects: Project[];
  notifications: Notification[];
  theme: 'dark' | 'light';
  onClose: () => void;
}

export default function ExecutiveDashboardView({ projects, notifications, theme, onClose }: ExecutiveDashboardViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [metricCardHover, setMetricCardHover] = useState<string | null>(null);

  // Aggregates
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const totalPlannedSpent = projects.reduce((sum, p) => sum + p.plannedSpent, 0);
  const totalEarnedValue = projects.reduce((sum, p) => sum + p.earnedValue, 0);

  // CPI & SPI Calculations
  const averageCpi = totalSpent > 0 ? totalEarnedValue / totalSpent : 1.0;
  const averageSpi = totalPlannedSpent > 0 ? totalEarnedValue / totalPlannedSpent : 1.0;

  // Filtered projects
  const filteredProjects = selectedRegion === 'all' 
    ? projects 
    : projects.filter(p => p.id.includes(selectedRegion));

  // Regional breakdown
  const regions = [
    { id: 'all', name: 'Tüm Sahalar' }
  ];

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative select-none text-[var(--text-primary)] transition-all duration-300">
      
      {/* Absolute Close X-Button */}
      <button 
        onClick={onClose}
        className="native-btn absolute top-4 right-4 p-2 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/50 transition duration-200 cursor-pointer z-50 flex items-center justify-center shadow-lg hover:shadow-red-500/15"
        style={{ position: 'absolute' }}
        title="Kapat ve Haritaya Dön"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border)] mb-6 gap-4 pr-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">PORTFÖY ANALİZİ</span>
            <span className="text-xs text-[var(--text-secondary)]">one map • one timeline • one truth</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <span>PROJELER GENEL GÖRÜNÜM</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Region Filters */}
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border)] p-1 rounded-xl">
            {regions.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer ${
                  selectedRegion === r.id 
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Aggregated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Portfolio Value */}
        <div 
          className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-indigo-500/40 transition duration-300 relative group overflow-hidden tilt-card-3d shadow-lg"
          onMouseEnter={() => setMetricCardHover('budget')}
          onMouseLeave={() => setMetricCardHover(null)}
        >
          <div className="absolute right-4 top-4 text-indigo-500/20 group-hover:text-indigo-500/35 transition duration-300">
            <DollarSign className="w-10 h-10" />
          </div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">KONSOLİDE PORTFÖY DEĞERİ</span>
          <span className="text-2xl font-black tracking-tight text-[var(--text-primary)] drop-shadow-[0_0_10px_rgba(99,102,241,0.25)]">₺{(totalBudget / 1000).toFixed(2)}B</span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">4 Ana Havalimanı Kompleks Etabı</span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-80" />
        </div>

        {/* Cost Performance Index (CPI) */}
        <div 
          className={`p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl transition duration-300 relative group overflow-hidden tilt-card-3d shadow-lg ${
            averageCpi >= 1.00 ? 'hover:border-emerald-500/40' : 'hover:border-red-500/40 border-red-500/30'
          }`}
          onMouseEnter={() => setMetricCardHover('cpi')}
          onMouseLeave={() => setMetricCardHover(null)}
        >
          <div className="absolute right-4 top-4 text-emerald-500/20 group-hover:text-emerald-500/35 transition duration-300">
            <TrendingUp className="w-10 h-10" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">MALİYET PERFORMANS (CPI)</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">Hedef: 1.00</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight font-mono ${
              averageCpi >= 1.00 
                ? 'text-[#10b981] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
            }`}>
              {averageCpi.toFixed(2)}
            </span>
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
              averageCpi >= 1.00 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-500'
            }`}>
              {averageCpi >= 1.00 ? 'Hedefte' : 'Eşik Altı'}
            </span>
          </div>
          <span className={`text-[10px] font-bold block mt-1 flex items-center gap-1 ${
            averageCpi >= 1.00 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <ArrowUpRight className="w-3.5 h-3.5" /> 
            {averageCpi >= 1.00 ? 'Bütçe Altında Güvenli Seviye' : '⚠️ Bütçe Aşımı Riski (Eşik Altı)'}
          </span>
          <div className={`absolute bottom-0 inset-x-0 h-1 opacity-80 ${
            averageCpi >= 1.00 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`} />
        </div>

        {/* Schedule Performance Index (SPI) */}
        <div 
          className={`p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl transition duration-300 relative group overflow-hidden tilt-card-3d shadow-lg ${
            averageSpi >= 1.00 ? 'hover:border-blue-500/40' : 'hover:border-red-500/40 border-red-500/30'
          }`}
          onMouseEnter={() => setMetricCardHover('spi')}
          onMouseLeave={() => setMetricCardHover(null)}
        >
          <div className="absolute right-4 top-4 text-blue-500/20 group-hover:text-blue-500/35 transition duration-300">
            <Activity className="w-10 h-10" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">PROGRAM PERFORMANS (SPI)</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">Hedef: 1.00</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight font-mono ${
              averageSpi >= 1.00 
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]' 
                : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
            }`}>
              {averageSpi.toFixed(2)}
            </span>
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
              averageSpi >= 1.00 ? 'bg-cyan-500/15 text-cyan-400' : 'bg-red-500/15 text-red-500'
            }`}>
              {averageSpi >= 1.00 ? 'Hedefte' : 'Eşik Altı'}
            </span>
          </div>
          <span className={`text-[10px] font-bold block mt-1 flex items-center gap-1 ${
            averageSpi >= 1.00 ? 'text-[var(--text-secondary)]' : 'text-red-400'
          }`}>
            <Activity className="w-3.5 h-3.5" />
            {averageSpi >= 1.00 ? 'Süreç ve İlerleme Koordinasyonu' : '⚠️ Program Gerisinde (Gecikme Riski)'}
          </span>
          <div className={`absolute bottom-0 inset-x-0 h-1 opacity-80 ${
            averageSpi >= 1.00 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`} />
        </div>

        {/* Aggregated Safety Threshold */}
        <div 
          className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-amber-500/40 transition duration-300 relative group overflow-hidden tilt-card-3d shadow-lg"
          onMouseEnter={() => setMetricCardHover('safety')}
          onMouseLeave={() => setMetricCardHover(null)}
        >
          <div className="absolute right-4 top-4 text-amber-500/20 group-hover:text-amber-500/35 transition duration-300">
            <CheckCircle className="w-10 h-10" />
          </div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">SAHA RİSK & UYGUNLUK TAAHHÜDÜ</span>
          <span className="text-2xl font-black tracking-tight text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">98.4%</span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">İş Gücü Güvenliği & ÇSG Tam Puan</span>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600 opacity-80" />
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Recharts Consolidated Portfolio Curve */}
        <div className="lg:col-span-8 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-4 uppercase tracking-widest">MALİYET VE FİZİKİ İLERLEME FİDAN ANALİZİ (EVM)</span>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredProjects} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="execBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="execSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="execEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#cbd5e1' : '#1e293b'} opacity={0.3} />
                <XAxis dataKey="code" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', borderColor: theme === 'light' ? '#cbd5e1' : '#334155', fontSize: '11px', borderRadius: '8px', color: theme === 'light' ? '#0f172a' : '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="budget" name="Toplam Bütçe (Milyon ₺)" stroke="#4f46e5" fillOpacity={1} fill="url(#execBudget)" />
                <Area type="monotone" dataKey="spent" name="Ödenen Hakediş (AC)" stroke="#ef4444" fillOpacity={1} fill="url(#execSpent)" />
                <Area type="monotone" dataKey="earnedValue" name="Kazanılan Değer (EV)" stroke="#10b981" fillOpacity={1} fill="url(#execEarned)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status Summary Panel */}
        <div className="lg:col-span-4 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-3 uppercase tracking-widest">LİSTELENEN PROJE DURUMLARI</span>
            <div className="space-y-3">
              {filteredProjects.map(p => {
                const isUnder = p.spent < p.budget;
                return (
                  <div key={p.id} className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[var(--text-primary)] font-mono">{p.code}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] block">{p.name.substring(0, 30)}...</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-blue-400 block">%{p.overallProgress}</span>
                      <Badge tone={isUnder ? 'success' : 'danger'} size="sm">
                        {isUnder ? 'GÜVENLİ' : 'BÜTÇE AŞIMI'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] mt-4 text-[10px] text-[var(--text-secondary)] flex items-center gap-1 justify-center">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500/60" />
            <span>Tüm veriler saniyede bir güncellenmektedir.</span>
          </div>
        </div>

      </div>

      {/* Project details list matrix */}
      <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
        <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-3 uppercase tracking-widest">PROJE VERİ MATRİSİ</span>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] uppercase font-black tracking-widest text-[10px]">
                <th className="pb-2">PROJE TANIMI</th>
                <th className="pb-2">TOPLAM BÜTÇE</th>
                <th className="pb-2">ÖDENEN HAKEDİŞ</th>
                <th className="pb-2">KAZANILAN DEĞER</th>
                <th className="pb-2">HEDEF TAMAMLAMA</th>
                <th className="pb-2 text-right">DURUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredProjects.map(p => (
                <tr key={p.id} className="hover:bg-[var(--bg-secondary)]/50 transition">
                  <td className="py-2.5 font-bold text-[var(--text-primary)]">
                    <div>{p.name}</div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono tracking-wider bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded">{p.id}</span>
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">₺{p.budget} Milyon</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">₺{p.spent} Milyon</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">₺{p.earnedValue} Milyon</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">Ağustos 2026</td>
                  <td className="py-2.5 text-right">
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">AKTİF</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
