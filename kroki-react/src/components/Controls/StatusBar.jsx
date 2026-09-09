import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';

export default function StatusBar({ mapRef }) {
  const { mode, features } = useStore((s) => ({ mode: s.mode, features: s.features }));
  const [coord, setCoord] = useState('—');
  const [zoom, setZoom] = useState('—');

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onMove = (e) => setCoord(`${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`);
    const onZoom = () => setZoom(map.getZoom().toFixed(2));
    map.on('mousemove', onMove);
    map.on('zoom', onZoom);
    onZoom();
    return () => { map.off('mousemove', onMove); map.off('zoom', onZoom); };
  }, [mapRef.current]);

  return (
    <div id="statusbar">
      <span>koordinat <b style={{ color: 'var(--teal)' }}>{coord}</b></span>
      <div className="div" />
      <span>yakınlaştırma <b>{zoom}</b></span>
      <div className="div" />
      <span>şekil sayısı <b>{features.length}</b></span>
      <div className="div" />
      <span>mod <b style={{ color: 'var(--amber)' }}>{mode}</b></span>
    </div>
  );
}
