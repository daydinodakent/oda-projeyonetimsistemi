// Evrak Kontrol Listesi — SGK işyeri sicili, sigorta, İSG uzmanı ataması,
// çalışan listesi (+ son hakedişte ilişiksizlik belgesi). Çekirdek "Belge"
// servisi henüz yazılmadığından (bkz. db.js başı), dokuman_id yalnızca
// mevcut tb_dokumanlar'a opsiyonel bir referanstır — yeni bir belge deposu
// AÇILMADI.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const ZORUNLU_TURLER = ['sgk_isyeri_sicili', 'sigorta', 'isg_uzmani_atamasi', 'calisan_listesi'];
const TUM_TURLER = [...ZORUNLU_TURLER, 'iliskiksizlik_belgesi'];

const stmtUpsert = db.prepare(
  `INSERT INTO evrak_kontrol (sozlesme_id, tur, gecerlilik_baslangic, gecerlilik_bitis, dokuman_id, notes, olusturan)
   VALUES (@sozlesme_id, @tur, @gecerlilik_baslangic, @gecerlilik_bitis, @dokuman_id, @notes, @olusturan)
   ON CONFLICT(sozlesme_id, tur) DO UPDATE SET gecerlilik_baslangic = excluded.gecerlilik_baslangic,
     gecerlilik_bitis = excluded.gecerlilik_bitis, dokuman_id = excluded.dokuman_id, notes = excluded.notes,
     write_uid = excluded.olusturan, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
);
const stmtGet = db.prepare('SELECT * FROM evrak_kontrol WHERE sozlesme_id = ? AND tur = ? AND row_status = 1');
const stmtListele = db.prepare('SELECT * FROM evrak_kontrol WHERE sozlesme_id = ? AND row_status = 1');

/** @param {{gecerlilik_baslangic?, gecerlilik_bitis?, dokuman_id?, notes?}} item */
export function ekleVeyaGuncelle(sozlesmeId, tur, item, aktor) {
  if (!TUM_TURLER.includes(tur)) throw new Error(`Geçersiz evrak türü: ${tur}`);
  const row = {
    sozlesme_id: sozlesmeId, tur, gecerlilik_baslangic: item.gecerlilik_baslangic ?? null,
    gecerlilik_bitis: item.gecerlilik_bitis ?? null, dokuman_id: item.dokuman_id ?? null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  stmtUpsert.run(row);
  audit.kaydet('evrak_kontrol', `${sozlesmeId}:${tur}`, 'GUNCELLE', aktor, { yeni: row });
  return stmtGet.get(sozlesmeId, tur);
}

function durumHesapla(kayit) {
  if (!kayit) return 'eksik';
  if (kayit.gecerlilik_bitis && kayit.gecerlilik_bitis < new Date().toISOString().slice(0, 10)) return 'suresi_gecmis';
  return 'tamam';
}

/** @param {boolean} [sonHakedisMi] true ise 'iliskiksizlik_belgesi' de listeye eklenir. */
export function listele(sozlesmeId, sonHakedisMi) {
  const kayitlar = stmtListele.all(sozlesmeId);
  const turler = sonHakedisMi ? TUM_TURLER : ZORUNLU_TURLER;
  return turler.map((tur) => {
    const kayit = kayitlar.find((k) => k.tur === tur) ?? null;
    return { tur, kayit, durum: durumHesapla(kayit) };
  });
}

/**
 * "Evrakı eksik/süresi geçmiş alt yüklenicinin hakedişi 'ödeme blokajı'
 * durumuna düşer" — bu fonksiyon yalnızca KONTROL eder, engellemez;
 * engelleme kararı hakedis.js#durumDegistir'de verilir.
 */
export function blokajKontrolu(sozlesmeId, sonHakedisMi) {
  const durumlar = listele(sozlesmeId, sonHakedisMi);
  const eksikler = durumlar.filter((d) => d.durum !== 'tamam');
  return { blokajVar: eksikler.length > 0, eksikEvraklar: eksikler.map((d) => ({ tur: d.tur, durum: d.durum })) };
}
