import React from 'react';
import { useStore } from '../../store/useStore.js';
import { Layers, Settings2, Activity, Menu } from 'lucide-react';

export default function ModuleNav() {
  const activeModule = useStore((s) => s.activeModule);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const { setActiveModule, setSidebarOpen } = useStore();

  const items = [
    { id: 'harita', label: 'Katmanlar', icon: Layers },
    { id: 'editor', label: 'Çizim / Düzenle', icon: Settings2 },
    { id: 'analiz', label: 'CBS Analizleri', icon: Activity }
  ];

  return (
    <div className="module-nav">
      <button
        className="nav-btn menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Paneli Daralt' : 'Paneli Genişlet'}
      >
        <Menu size={19} />
      </button>

      {items.map((it) => {
        const Icon = it.icon;
        const active = activeModule === it.id && sidebarOpen;
        return (
          <button
            key={it.id}
            className={'nav-btn' + (active ? ' active' : '')}
            onClick={() => {
              if (activeModule === it.id && sidebarOpen) {
                setSidebarOpen(false);
              } else {
                setActiveModule(it.id);
                setSidebarOpen(true);
              }
            }}
            title={it.label}
          >
            <Icon size={19} />
            <span className="nav-label">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
