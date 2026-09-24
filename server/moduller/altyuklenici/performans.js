// Performans Kartı — dönemsel puan (zaman, kalite, İSG, belge). Ağırlıklar
// PARAMETRİK (Çekirdek parametre: altyuklenici_performans_agirlik_zaman/
// _kalite/_isg/_belge, toplamı 100 olmalı) — tanımlı değilse eşit ağırlık
// (%25/%25/%25/%25) varsayılana düşer.
//
// NCR (uygunsuzluk) ve İSG ihlal SAYILARI bu geçişte MANUEL girilir —
// otomatik toplama için Kalite Kontrol/İSG modülü (kapsam dışı) gerekir.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';

const VARSAYILAN_AGIRLIKLAR = { zaman: 25, kalite: 25, isg: 25, belge: 25 };
const AGIRLIK_PARAMETRE_KODLARI = { zaman: 'altyuklenici_performans_agirlik_zaman', kalite: 'altyuklenici_performans_agirlik_kalite', isg: 'altyuklenici_performans_agirlik_isg', belge: 'altyuklenici_performans_agirlik_belge' };

const stmtUpsert = db.prepare(
  `INSERT INTO performans_karti (sozlesme_id, donem, zaman_puani, kalite_puani, isg_puani, belge_puani, ncr_acik_sayisi, ncr_ortalama_kapanma_gun, isg_ihlal_sayisi, toplam_puan, notes, olusturan)
   VALUES (@sozlesme_id, @donem, @zaman_puani, @kalite_puani, @isg_puani, @belge_puani, @ncr_acik_sayisi, @ncr_ortalama_kapanma_gun, @isg_ihlal_sayisi, @toplam_puan, @notes, @olusturan)
   ON CONFLICT(sozlesme_id, donem) DO UPDATE SET zaman_puani=excluded.zaman_puani, kalite_puani=excluded.kalite_puani,
     isg_puani=excluded.isg_puani, belge_puani=excluded.belge_puani, ncr_acik_sayisi=excluded.ncr_acik_sayisi,
     ncr_ortalama_kapanma_gun=excluded.ncr_ortalama_kapanma_gun, isg_ihlal_sayisi=excluded.isg_ihlal_sayisi,
     toplam_puan=excluded.toplam_puan, notes=excluded.notes`
);
const stmtListele = db.prepare('SELECT * FROM performans_karti WHERE sozlesme_id = ? ORDER BY donem DESC');

function agirlikOku(anahtar) {
  const p = parametre.degerAl(AGIRLIK_PARAMETRE_KODLARI[anahtar]);
  return p ? p.deger : VARSAYILAN_AGIRLIKLAR[anahtar];
}

/** @param {{donem, zaman_puani, kalite_puani, isg_puani, belge_puani, ncr_acik_sayisi?, ncr_ortalama_kapanma_gun?, isg_ihlal_sayisi?, notes?}} item Puanlar 0-100 aralığında. */
export function hesaplaVeKaydet(sozlesmeId, item, aktor) {
  const agirliklar = { zaman: agirlikOku('zaman'), kalite: agirlikOku('kalite'), isg: agirlikOku('isg'), belge: agirlikOku('belge') };
  const agirlikToplami = agirliklar.zaman + agirliklar.kalite + agirliklar.isg + agirliklar.belge;
  const toplamPuan = (
    item.zaman_puani * agirliklar.zaman + item.kalite_puani * agirliklar.kalite +
    item.isg_puani * agirliklar.isg + item.belge_puani * agirliklar.belge
  ) / agirlikToplami;

  const row = {
    sozlesme_id: sozlesmeId, donem: item.donem, zaman_puani: item.zaman_puani, kalite_puani: item.kalite_puani,
    isg_puani: item.isg_puani, belge_puani: item.belge_puani, ncr_acik_sayisi: item.ncr_acik_sayisi ?? 0,
    ncr_ortalama_kapanma_gun: item.ncr_ortalama_kapanma_gun ?? null, isg_ihlal_sayisi: item.isg_ihlal_sayisi ?? 0,
    toplam_puan: Number(toplamPuan.toFixed(1)), notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  stmtUpsert.run(row);
  audit.kaydet('performans_karti', `${sozlesmeId}:${item.donem}`, 'GUNCELLE', aktor, { yeni: row, kullanilanAgirliklar: agirliklar });
  return row;
}

export function listele(sozlesmeId) {
  return stmtListele.all(sozlesmeId);
}

const stmtOlayInsert = db.prepare('INSERT OR IGNORE INTO performans_olay (sozlesme_id, tur, kaynak_modul, kaynak_id, tarih, aciklama) VALUES (?, ?, ?, ?, ?, ?)');
const stmtOlayListe = db.prepare('SELECT * FROM performans_olay WHERE sozlesme_id = ? ORDER BY tarih DESC');

/** P8'den çağrılır — aynı kaynak kayıt için tekrar çağrı mükerrer olay AÇMAZ. */
export function olayGonder(sozlesmeId, tur, kaynakModul, kaynakId, tarih, aciklama) {
  const info = stmtOlayInsert.run(sozlesmeId, tur, kaynakModul, String(kaynakId), tarih, aciklama ?? null);
  return { eklendi: info.changes > 0 };
}
export function olaylariListele(sozlesmeId) {
  return stmtOlayListe.all(sozlesmeId);
}
