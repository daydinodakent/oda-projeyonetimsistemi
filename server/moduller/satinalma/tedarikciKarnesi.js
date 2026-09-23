// Tedarikçi Değerlendirme — görev metni: "P4 mal kabul verisinden otomatik
// [hesaplanır]". Bu servis AYRI bir "değerlendirme" tablosu TUTMAZ; mevcut
// sipariş verisi + Depo'nun Mal Kabul servisinden (server/moduller/depo/
// malKabul.js#kalemIcinListele) SORGU ZAMANINDA hesaplanır. Depo'nun
// mal_kabul tablosuna DOĞRUDAN SQL erişimi YOK — sahiplik kuralı gereği
// yalnızca Depo'nun KENDİ servis fonksiyonu çağrılır.
import { db } from './db.js';
import * as siparis from './siparis.js';
import * as malKabul from '../depo/malKabul.js';

const stmtSiparisler = db.prepare("SELECT * FROM satinalma_siparis WHERE firma_id = ? AND row_status = 1 AND durum IN ('tamamlandi','kismi_teslim','onaylandi')");

function siparisIcinMalKabulleri(siparisId) {
  return siparis.kalemleriGetir(siparisId).flatMap((k) => malKabul.kalemIcinListele(k.id));
}

/**
 * @returns {{firma_id, siparisSayisi, toplamTutarKurus, zamanindaTeslimYuzdesi: number|null, kaliteRedOrani: number|null, degerlendirilebilirSiparisSayisi}}
 */
export function karnesi(firmaId) {
  const siparisler = stmtSiparisler.all(firmaId);
  let degerlendirilebilir = 0;
  let zamaninda = 0;
  let toplamTutar = 0;
  let toplamGelenMiktar = 0;
  let toplamRedMiktar = 0;

  for (const s of siparisler) {
    toplamTutar += s.toplam_tutar_kurus;
    const malKabuller = siparisIcinMalKabulleri(s.id);
    for (const mk of malKabuller) {
      toplamGelenMiktar += mk.gelen_miktar;
      toplamRedMiktar += mk.red_miktar;
    }
    if (s.durum === 'tamamlandi' && s.teslim_tarihi && malKabuller.length) {
      const sonTarih = malKabuller.reduce((en, mk) => (mk.tarih > en ? mk.tarih : en), malKabuller[0].tarih);
      degerlendirilebilir += 1;
      if (sonTarih <= s.teslim_tarihi) zamaninda += 1;
    }
  }

  return {
    firma_id: Number(firmaId),
    siparisSayisi: siparisler.length,
    toplamTutarKurus: toplamTutar,
    degerlendirilebilirSiparisSayisi: degerlendirilebilir,
    zamanindaTeslimYuzdesi: degerlendirilebilir > 0 ? Number(((zamaninda / degerlendirilebilir) * 100).toFixed(1)) : null,
    kaliteRedOrani: toplamGelenMiktar > 0 ? Number(((toplamRedMiktar / toplamGelenMiktar) * 100).toFixed(1)) : null,
  };
}
