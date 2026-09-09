import React from 'react';
import { useStore } from '../../store/useStore.js';

export default function Toast() {
  const toast = useStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none animate-slide-up">
      <div className="bg-zinc-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-2xl border border-zinc-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span>{toast}</span>
      </div>
    </div>
  );
}
