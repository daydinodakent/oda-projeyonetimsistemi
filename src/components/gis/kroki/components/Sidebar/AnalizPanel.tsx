import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { useStore, uid } from '../../store/useStore.js';
import { Sparkles, Scissors, ShieldAlert } from 'lucide-react';

interface AnalizPanelProps {
  mapRef: React.RefObject<any>;
}

export default function AnalizPanel({ mapRef }: AnalizPanelProps) {
  const features = useStore((s) => s.features);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const { addFeature, showToast, pushHistory, setMode } = useStore();

  const [bufferDistance, setBufferDistance] = useState<number>(50);
  const [selectedFeatIds, setSelectedFeatIds] = useState<string[]>([]);

  const polygonsAndLines = features.filter((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'LineString');
  const polygonsOnly = features.filter((f) => f.geometry.type === 'Polygon');

  function handleToggleSelect(id: string) {
    setSelectedFeatIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)
    );
  }

  // --- 1. Tampon Bölge (Buffer) ---
  function runBuffer() {
    if (!selectedFeatIds.length) { showToast('Lütfen önce en az bir şekil seçin.'); return; }
    const target = features.find((f) => f.id === selectedFeatIds[0]);
    if (!target) return;
    try {
      pushHistory();
      // turf.buffer requires distance in km/miles/etc, we convert meters to km
      const km = bufferDistance / 1000;
      const buffered = turf.buffer(target, km, { units: 'kilometers' });
      if (buffered) {
        addFeature({
          ...buffered,
          id: 'feat-' + uid(),
          properties: {
            layerId: activeLayerId,
            name: `${target.properties?.name || 'Şekil'} (${bufferDistance}m Tampon)`,
            aciklama: `${target.properties?.name || 'Şekil'} etrafında oluşturulan ${bufferDistance}m tampon alan.`
          }
        });
        showToast('Tampon bölge başarıyla oluşturuldu.');
      }
    } catch (e) {
      console.error(e);
      showToast('Tampon bölge oluşturulamadı. Geçersiz geometri.');
    }
  }

  // --- 2. Kesişim (Intersection) ---
  function runIntersection() {
    if (selectedFeatIds.length < 2) { showToast('Kesişim analizi için en az 2 şekil seçmelisiniz.'); return; }
    const f1 = features.find((f) => f.id === selectedFeatIds[0]);
    const f2 = features.find((f) => f.id === selectedFeatIds[1]);
    if (!f1 || !f2) return;
    if (f1.geometry.type !== 'Polygon' || f2.geometry.type !== 'Polygon') {
      showToast('Kesişim analizi yalnızca poligonlar arasında yapılabilir.');
      return;
    }
    try {
      pushHistory();
      const intersect = turf.intersect(turf.featureCollection([f1, f2]));
      if (intersect) {
        addFeature({
          ...intersect,
          id: 'feat-' + uid(),
          properties: {
            layerId: activeLayerId,
            name: `Kesişim (${f1.properties?.name || 'P1'} & ${f2.properties?.name || 'P2'})`,
            aciklama: `${f1.properties?.name || 'P1'} ile ${f2.properties?.name || 'P2'} poligonlarının kesişim alanı.`
          }
        });
        showToast('Kesişim alanı oluşturuldu.');
      } else {
        showToast('İki poligon arasında kesişim bulunamadı.');
      }
    } catch (e) {
      console.error(e);
      showToast('Kesişim hesaplanamadı. Geometrileri kontrol edin.');
    }
  }

  // --- 3. Birleştirme (Union) ---
  function runUnion() {
    if (selectedFeatIds.length < 2) { showToast('Birleştirme analizi için en az 2 şekil seçmelisiniz.'); return; }
    const f1 = features.find((f) => f.id === selectedFeatIds[0]);
    const f2 = features.find((f) => f.id === selectedFeatIds[1]);
    if (!f1 || !f2) return;
    if (f1.geometry.type !== 'Polygon' || f2.geometry.type !== 'Polygon') {
      showToast('Birleştirme yalnızca poligonlar arasında yapılabilir.');
      return;
    }
    try {
      pushHistory();
      const union = turf.union(turf.featureCollection([f1, f2]));
      if (union) {
        addFeature({
          ...union,
          id: 'feat-' + uid(),
          properties: {
            layerId: activeLayerId,
            name: `Birleşim (${f1.properties?.name || 'P1'} + ${f2.properties?.name || 'P2'})`,
            aciklama: `${f1.properties?.name || 'P1'} ile ${f2.properties?.name || 'P2'} poligonlarının birleşimi.`
          }
        });
        showToast('Poligonlar başarıyla birleştirildi.');
      }
    } catch (e) {
      console.error(e);
      showToast('Birleştirme başarısız oldu. Geometriler çakışmıyor olabilir.');
    }
  }

  // --- 4. Bölme (Split) ---
  function runSplit() {
    if (selectedFeatIds.length < 2) {
      showToast('Bölme analizi için bir Poligon ve bir kesen Çizgi seçmelisiniz.');
      return;
    }
    const f1 = features.find((f) => f.id === selectedFeatIds[0]);
    const f2 = features.find((f) => f.id === selectedFeatIds[1]);
    if (!f1 || !f2) return;

    const poly = f1.geometry.type === 'Polygon' ? f1 : f2.geometry.type === 'Polygon' ? f2 : null;
    const line = f1.geometry.type === 'LineString' ? f1 : f2.geometry.type === 'LineString' ? f2 : null;

    if (!poly || !line) {
      showToast('Lütfen tam olarak 1 Poligon ve 1 Çizgi seçin.');
      return;
    }

    try {
      pushHistory();
      // lineSplit splits poly's outer boundary, resulting in segments. We can use difference to partition.
      // A robust alternative: create a tiny buffer of the line and subtract it from the polygon!
      const lineBuffer = turf.buffer(line, 0.0001, { units: 'kilometers' }); // 0.1 meter buffer
      if (!lineBuffer) throw new Error('Çizgi tamponu oluşturulamadı.');

      const diff = turf.difference(turf.featureCollection([poly, lineBuffer]));
      if (diff) {
        // turf.difference will output a MultiPolygon where each polygon part represents a split part!
        if (diff.geometry.type === 'MultiPolygon') {
          const coords = diff.geometry.coordinates;
          coords.forEach((polygonCoords: any, index: number) => {
            const singlePoly = turf.polygon(polygonCoords);
            addFeature({
              ...singlePoly,
              id: 'feat-' + uid(),
              properties: {
                layerId: activeLayerId,
                name: `${poly.properties?.name || 'Poligon'} Bölüm ${index + 1}`,
                aciklama: `${poly.properties?.name || 'Poligon'} şeklinin ${line.properties?.name || 'çizgi'} ile kesilmesinden doğan parça.`
              }
            });
          });
          showToast(`Poligon başarıyla ${coords.length} parçaya bölündü.`);
        } else {
          showToast('Bölme işlemi gerçekleşmedi. Çizgi poligonu tamamen kesmiyor olabilir.');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Bölme başarısız oldu. Çizginin poligonu tam olarak kestiğinden emin olun.');
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h2>CBS Coğrafi Analizler</h2>
      </div>

      <div className="panel-body scrollable">
        {/* Seçim Listesi */}
        <div className="mb-4">
          <h3 className="section-title">Şekil Seçimi</h3>
          <p className="text-xs text-zinc-500 mb-2">Analiz yapmak istediğiniz şekilleri listeden seçin (En fazla 2 adet):</p>
          <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-md p-1 bg-white">
            {polygonsAndLines.length === 0 ? (
              <div className="text-xs text-zinc-400 p-2 text-center">Seçilebilir poligon veya çizgi bulunamadı.</div>
            ) : (
              polygonsAndLines.map((f) => {
                const isSelected = selectedFeatIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleSelect(f.id)}
                    className={'flex items-center justify-between p-1.5 rounded text-xs cursor-pointer mb-0.5 ' + (isSelected ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'hover:bg-zinc-50 text-zinc-700')}
                  >
                    <span className="truncate max-w-[150px] font-medium">{f.properties?.name || 'İsimsiz Şekil'}</span>
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{f.geometry.type === 'Polygon' ? 'Poligon' : 'Çizgi'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 1. Tampon Bölge (Buffer) */}
        <div className="mb-5 border-t border-zinc-200 pt-3">
          <h3 className="text-sm font-semibold text-zinc-800 mb-2 flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-500" /> Tampon Bölge (Buffer)
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Mesafe</span>
              <span className="font-bold">{bufferDistance} metre</span>
            </div>
            <input
              type="range"
              min="5"
              max="1000"
              step="5"
              value={bufferDistance}
              onChange={(e) => setBufferDistance(Number(e.target.value))}
              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2"
            />
            <button
              onClick={runBuffer}
              className="btn btn-secondary w-full text-xs font-medium py-1.5"
              disabled={selectedFeatIds.length === 0}
            >
              Tampon Alan Oluştur
            </button>
          </div>
        </div>

        {/* 2. Kesişim & Birleştirme */}
        <div className="mb-5 border-t border-zinc-200 pt-3">
          <h3 className="text-sm font-semibold text-zinc-800 mb-2 flex items-center gap-1.5">
            <Sparkles size={15} className="text-teal-600" /> Küme İşlemleri (Poligon)
          </h3>
          <p className="text-[11px] text-zinc-400 mb-2">Bu araçlar iki poligon seçildiğinde aktif olur.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={runIntersection}
              className="btn btn-secondary text-xs font-medium py-1.5"
              disabled={selectedFeatIds.length < 2}
            >
              Kesişimi Al (Intersection)
            </button>
            <button
              onClick={runUnion}
              className="btn btn-secondary text-xs font-medium py-1.5"
              disabled={selectedFeatIds.length < 2}
            >
              Birleştir (Union)
            </button>
          </div>
        </div>

        {/* 3. Bölme (Split) */}
        <div className="border-t border-zinc-200 pt-3">
          <h3 className="text-sm font-semibold text-zinc-800 mb-2 flex items-center gap-1.5">
            <Scissors size={15} className="text-rose-500" /> Poligon Kesme / Bölme (Split)
          </h3>
          <p className="text-[11px] text-zinc-400 mb-2">1 Poligon ve poligonu tamamen kesen 1 Çizgi seçerek kesme işlemi yapabilirsiniz.</p>
          <button
            onClick={runSplit}
            className="btn btn-secondary w-full text-xs font-medium py-1.5 flex items-center justify-center gap-1.5"
            disabled={selectedFeatIds.length < 2}
          >
            <Scissors size={13} /> Poligonu Çizgiyle Böl
          </button>
        </div>
      </div>
    </div>
  );
}
