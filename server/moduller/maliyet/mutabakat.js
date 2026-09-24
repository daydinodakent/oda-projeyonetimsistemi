// Mutabakat raporu — çift sayım / eksik sayım avcısı. Defter ↔ kaynak modüller:
//  1. defterde_yok   : kaynakta onaylı, defterde karşılığı olmayan kayıt
//  2. kaynak_yok     : defterde olup kaynak belgesi bulunmayan hareket
//  3. kaynak_iptal   : defterde olup kaynak belgesi iptal/reddedilmiş/fesih/pasif (ters kayıt yok)
//  4. cift_sayim     : stoklu malzemenin FATURASI GERÇEKLEŞEN yazmış (Depo çıkışı zaten yazıyor — Maliyet Kuralı)
//  5. tutar_uyumsuz  : defter tutarı kaynak belge tutarından farklı
//  6. butce_uyumsuz  : defterdeki BUTCE toplamı onaylı güncel bütçeye eşit değil
//  7. kodsuz         : maliyet kodsuz GERÇEKLEŞEN (WBS'e dağıtılamıyor) — bilgi/uyarı
// Bu modül HİÇBİR ŞEYİ düzeltmez, yalnızca raporlar.
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as butce from './butce.js';
import * as kaynak from './kaynak.js';

const BUTCE_MODUL = 'butce_versiyon';

/** @param {string|null} projeId null → tüm portföy */
export function mutabakatRaporu(projeId) {
  const projeler = projeId ? [projeId] : maliyetDefteri.projeleriListele();
  let hareketler = [];
  for (const p of projeler) hareketler = hareketler.concat(maliyetDefteri.projeIcinListele(p));
  const bulgular = [];

  // Ters kaydı olan (iptal edilmiş) orijinal satırlar ve ters satırların kendisi bilerek iptal edilmiştir — kaynak_iptal sayılmaz.
  for (const h of hareketler) {
    if (h.kaynak_modul === BUTCE_MODUL) continue;
    if (h.iptal_edildi || h.ters_kayit_id || String(h.kaynak_id).endsWith(':IPTAL')) continue;
    const k = kaynak.coz(h);
    const temel = { hareket_id: h.id, proje_id: h.proje_id, modul: h.kaynak_modul, kaynak_id: h.kaynak_id, tur_hareket: h.tur, tutar_kurus: h.tutar_kurus, etiket: k.etiket };
    if (!k.bulundu) { bulgular.push({ ...temel, tur: 'kaynak_yok', seviye: 'hata', mesaj: 'Defter hareketinin kaynak belgesi bulunamadı' }); continue; }
    if (k.iptal) bulgular.push({ ...temel, tur: 'kaynak_iptal', seviye: 'hata', mesaj: `Kaynak belge iptal/geçersiz (durum: ${k.durum}) ama defterde ters kayıt yok` });
    if (h.kaynak_modul === 'satinalma_fatura' && h.tur === 'GERCEKLESEN' && k.stoklu_fatura_kalemi) {
      bulgular.push({ ...temel, tur: 'cift_sayim', seviye: 'hata', mesaj: 'STOKLU malzemenin faturası GERÇEKLEŞEN yazmış — maliyet Depo çıkışında zaten yazılıyor (çift sayım)' });
    }
    if (k.beklenen_tutar_kurus != null && !String(h.kaynak_id).includes(':') && h.para_birimi === 'TRY' && k.beklenen_tutar_kurus !== h.tutar_kurus) {
      bulgular.push({ ...temel, tur: 'tutar_uyumsuz', seviye: 'hata', mesaj: `Defter tutarı ${h.tutar_kurus} ≠ kaynak belge tutarı ${k.beklenen_tutar_kurus}` });
    }
    if (h.tur === 'GERCEKLESEN' && h.maliyet_kodu_id == null) bulgular.push({ ...temel, tur: 'kodsuz', seviye: 'uyari', mesaj: 'Maliyet kodsuz GERÇEKLEŞEN — WBS bazlı raporlarda görünmez' });
  }

  for (const p of projeler) {
    for (const b of kaynak.defterdeOlmayanlar(p, hareketler.filter((h) => h.proje_id === p))) bulgular.push({ seviye: 'hata', ...b });
    const guncel = butce.guncelVersiyon(p);
    const defterButce = hareketler.filter((h) => h.proje_id === p && h.tur === 'BUTCE').reduce((t, h) => t + h.tutar_kurus, 0);
    const beklenen = guncel ? butce.satirlariGetir(guncel.id).reduce((t, s) => t + butce.tlDegeri(s), 0) : 0;
    if (defterButce !== beklenen) bulgular.push({ tur: 'butce_uyumsuz', seviye: 'hata', proje_id: p, modul: BUTCE_MODUL, kaynak_id: guncel ? String(guncel.id) : '-', etiket: guncel ? `Bütçe v${guncel.versiyon_no}` : 'Bütçe', mesaj: `Defterdeki BUTCE toplamı ${defterButce} ≠ onaylı bütçe ${beklenen}`, tutar_kurus: defterButce - beklenen });
  }
  if (!projeId) for (const b of kaynak.defterdeOlmayanlar(null, hareketler).filter((x) => !x.proje_id)) bulgular.push({ seviye: 'uyari', ...b });

  const sayim = {};
  for (const b of bulgular) sayim[b.tur] = (sayim[b.tur] || 0) + 1;
  return { proje_id: projeId ?? null, taranan_hareket: hareketler.length, bulgu_sayisi: bulgular.length, sayim, temiz: bulgular.filter((b) => b.seviye === 'hata').length === 0, bulgular };
}
