import React, { useState } from 'react';
import { Calendar, CheckCircle2, PlayCircle, Clock, Pencil, X } from 'lucide-react';
import { Project } from '../types';

interface InsaatLeftPanelProps {
  project: Project;
  timelineDate: string; // Format: '2026-08-XX'
}

export default function InsaatLeftPanel({ project, timelineDate }: InsaatLeftPanelProps) {
  // Extract day from the selected date string
  const currentDay = parseInt(timelineDate.split('-')[2] || '27');

  // Dynamic Gantt calculations
  const calculateProgress = (start: number, end: number, pctOverride?: number) => {
    if (pctOverride !== undefined) return pctOverride;
    if (currentDay < start) return 0;
    if (currentDay > end) return 100;
    const progress = Math.round(((currentDay - start) / (end - start)) * 100);
    return Math.min(100, Math.max(0, progress));
  };

  // State for Gantt Phases to allow superuser editing
  const [phases, setPhases] = useState([
    {
      id: 'temel',
      name: 'Temel & Bodrum Hafriyatı',
      start: 1,
      end: 8,
      responsible: 'Anadolu Yapı A.Ş.',
      progressOverride: undefined as number | undefined
    },
    {
      id: 'kabayapi',
      name: 'Kaba Yapı (Betonarme/Karkas)',
      start: 8,
      end: 20,
      responsible: 'Özsoy Kalıp & Demir',
      progressOverride: undefined as number | undefined
    },
    {
      id: 'inceyapi',
      name: 'İnce İşler (Tuğla/Alçı/Boya)',
      start: 18,
      end: 28,
      responsible: 'Ege Dekorasyon',
      progressOverride: undefined as number | undefined
    },
    {
      id: 'tesisat',
      name: 'Mekanik & Elektrik Tesisatı',
      start: 22,
      end: 31,
      responsible: 'Siemens Altyapı',
      progressOverride: undefined as number | undefined
    },
  ]);

  const [isEditingPhases, setIsEditingPhases] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-3 relative">
      {/* ŞANTİYE GANTT PROGRAMI */}
      <div className="card p-0 pt-1.5 rounded-none bg-transparent border-0 shadow-none">
        <div className="flex items-center justify-between mb-2.5 border-b border-[var(--border)] pb-2 pr-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)]">
              4D Şantiye İş Programı (Gantt)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-blue-600/15 text-blue-500 text-[8px] font-black rounded uppercase">
              Ağustos 2026
            </span>
            <button
              onClick={() => setIsEditingPhases(true)}
              className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              title="İş Programını Düzenle (SpU)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {phases.map((phase) => {
            const pct = calculateProgress(phase.start, phase.end, phase.progressOverride);
            const isCompleted = pct === 100;
            const isActive = pct > 0 && pct < 100;

            return (
              <div key={phase.id} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <h4 className="font-extrabold text-[var(--text-primary)] text-xs leading-tight">{phase.name}</h4>
                    <span className="text-[9px] text-[var(--text-secondary)]">Taşeron: {phase.responsible}</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : isActive 
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                        : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {isCompleted ? 'Tamamlandı' : isActive ? 'Devam Ediyor' : 'Planlandı'}
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="space-y-1">
                  <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : isActive ? 'bg-amber-500' : 'bg-slate-600'
                      }`} 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-[var(--text-secondary)] font-bold">
                    <span>Ağu {phase.start}</span>
                    <span className={pct > 0 ? 'text-[var(--text-primary)]' : ''}>%{pct}</span>
                    <span>Ağu {phase.end}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Local FeedBack Toast Banner */}
      {toastMessage && (
        <div className="p-1.5 bg-slate-950 text-white text-[9px] rounded border border-slate-800 animate-fade-in flex justify-between items-center z-[99]">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white font-bold ml-1">✕</button>
        </div>
      )}

      {/* Phases Edit Modal (Süper Kullanıcı) */}
      {isEditingPhases && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">İş Programı Gantt Düzenleme</h3>
              </div>
              <button onClick={() => setIsEditingPhases(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-left">
              Süper kullanıcı yetkisiyle tüm Gantt şeması iş kalemlerinin adını, sorumlu taşeronunu, başlangıç/bitiş günlerini ve manuel ilerleme değerini düzenleyebilirsiniz.
            </p>

            <div className="space-y-3 pt-2 text-left">
              {phases.map((phase, idx) => (
                <div key={phase.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 font-bold uppercase">AŞAMA / İŞ ADI</label>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => {
                        const updated = [...phases];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setPhases(updated);
                      }}
                      className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] text-slate-400 font-bold uppercase">SORUMLU TAŞERON</label>
                    <input
                      type="text"
                      value={phase.responsible}
                      onChange={(e) => {
                        const updated = [...phases];
                        updated[idx] = { ...updated[idx], responsible: e.target.value };
                        setPhases(updated);
                      }}
                      className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[8px] text-slate-400 font-bold uppercase">BAŞL. GÜN</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={phase.start}
                        onChange={(e) => {
                          const updated = [...phases];
                          updated[idx] = { ...updated[idx], start: parseInt(e.target.value) || 1 };
                          setPhases(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] text-slate-400 font-bold uppercase">BİTİŞ GÜN</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={phase.end}
                        onChange={(e) => {
                          const updated = [...phases];
                          updated[idx] = { ...updated[idx], end: parseInt(e.target.value) || 1 };
                          setPhases(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] text-slate-400 font-bold uppercase">MANUEL %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Otomatik"
                        value={phase.progressOverride !== undefined ? phase.progressOverride : ''}
                        onChange={(e) => {
                          const updated = [...phases];
                          const val = e.target.value === '' ? undefined : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          updated[idx] = { ...updated[idx], progressOverride: val };
                          setPhases(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsEditingPhases(false);
                showFeedbackToast('💾 Şantiye Gantt iş programı detayları güncellendi.');
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
