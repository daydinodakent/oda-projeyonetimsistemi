import React from 'react';
// Vite'ın ?raw eki, dosyayı derleme zamanında ham metin (string) olarak içeri alır.
// Böylece legacy-standalone-tools/kroki-harita-cizim-araci.html hiç değiştirilmeden
// (kendi id'leri, script'i, stilleriyle) aynen kullanılır.
// @ts-ignore - .html?raw için tip tanımı gerekmiyor, Vite bunu string olarak çözer.
import krokiHtml from '../../../legacy-standalone-tools/kroki-harita-cizim-araci.html?raw';

/**
 * ODA+ Proje Yönetim Sistemi'nin "harita" sekmesindeki placeholder'ın yerini alır.
 * Kroki, kendi tam sayfa (position:absolute, id tabanlı) yapısına sahip bağımsız
 * bir araç olduğu için ana uygulamayla stil/DOM çakışmasını önlemek amacıyla
 * izole bir iframe içinde çalıştırılır.
 *
 * Not: Bu aşamada Kroki, ana uygulamanın proje verisinden (gisBoundaryRecords vb.)
 * habersizdir — izole bir CBS çizim tuvali olarak çalışır. Proje verisiyle
 * bağlamak (aktif projeye göre katman/sınır aktarımı) sıradaki adımdır; bu,
 * postMessage köprüsü ile bu bileşene eklenecektir.
 */
const KrokiMapModule: React.FC = () => {
  return (
    <iframe
      srcDoc={krokiHtml}
      title="Kroki — Harita Çizim Aracı"
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
    />
  );
};

export default KrokiMapModule;
