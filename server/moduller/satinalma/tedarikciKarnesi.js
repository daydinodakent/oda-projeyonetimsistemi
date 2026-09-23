// Tedarikçi Değerlendirme — görev metni: "P4 mal kabul verisinden otomatik
// [hesaplanır]". P4 (Depo/Kalite) henüz yok; bu yüzden bu servis AYRI bir
// "değerlendirme" tablosu TUTMAZ, mevcut sipariş + (geçici) mal kabul
// verisinden SORGU ZAMANINDA hesaplar. Kalite red oranı P4/Kalite Kontrol
// modülü kurulmadan hesaplanamaz — null döner (bkz. alan açıklaması).
import { db } from './db.js';

const stmtSiparisler = db.prepare("SELECT * FROM satinalma_siparis WHERE firma_id = ? AND row_status = 1 AND durum IN ('tamamlandi','kismi_teslim','onaylandi')");
const stmtSonMalKabulTarihi = db.prepare(
  `SELECT MAX(mk.tarih) AS son_tarih FROM satinalma_mal_kabul mk
   JOIN satinalma_siparis_kalem sk ON sk.id = mk.siparis_kalem_id
   WHERE sk.siparis_id = ?`
);

/**
 * @returns {{firma_id, siparisSayisi, toplamTutarKurus, zamanindaTeslimYuzdesi: number|null, kaliteRedOrani: null, degerlendirilebilirSiparisSayisi}}
 */
export function karnesi(firmaId) {
  const siparisler = stmtSiparisler.all(firmaId);
  let degerlendirilebilir = 0;
  let zamaninda = 0;
  let toplamTutar = 0;
  for (const s of siparisler) {
    toplamTutar += s.toplam_tutar_kurus;
    if (s.durum === 'tamamlandi' && s.teslim_tarihi) {
      const sonMalKabul = stmtSonMalKabulTarihi.get(s.id).son_tarih;
      if (sonMalKabul) {
        degerlendirilebilir += 1;
        if (sonMalKabul <= s.teslim_tarihi) zamaninda += 1;
      }
    }
  }
  return {
    firma_id: Number(firmaId),
    siparisSayisi: siparisler.length,
    toplamTutarKurus: toplamTutar,
    degerlendirilebilirSiparisSayisi: degerlendirilebilir,
    zamanindaTeslimYuzdesi: degerlendirilebilir > 0 ? Number(((zamaninda / degerlendirilebilir) * 100).toFixed(1)) : null,
    // P4 (Depo/Kalite Kontrol) kurulmadan mal kabul reddi verisi yok.
    kaliteRedOrani: null,
  };
}
