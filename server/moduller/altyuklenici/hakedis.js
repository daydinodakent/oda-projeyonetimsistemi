// Hakediş — Alt Yüklenici'nin KESİN sahipliği. Sözleşme kalemine, WBS'e,
// Firma'ya YALNIZCA ID ile REFERANS verir; bunları KOPYALAMAZ, varlık
// doğrulamasını sahibinin KENDİ servisini çağırarak yapar (sozlesme.js,
// cariFirma.js) — RAW tabloya erişmez.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as odeme from '../_cekirdek/odeme.js';
import * as evrak from './evrak.js';
import * as kesinti from './kesinti.js';
import * as stok from '../depo/stok.js';

const AKIS = {
  taslak: ['alt_yuklenici_beyani'],
  alt_yuklenici_beyani: ['santiye_onayi'],
  santiye_onayi: ['teknik_ofis'],
  teknik_ofis: ['onayli', 'reddedildi'],
};

const stmtInsert = db.prepare(
  `INSERT INTO hakedis (numara, sozlesme_id, proje_id, hakedis_no, donem_baslangic, donem_bitis, son_hakedis_mi, notes, olusturan)
   VALUES (@numara, @sozlesme_id, @proje_id, @hakedis_no, @donem_baslangic, @donem_bitis, @son_hakedis_mi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM hakedis WHERE id = ? AND row_status = 1');
const stmtListeleSozlesme = db.prepare('SELECT * FROM hakedis WHERE sozlesme_id = ? AND row_status = 1 ORDER BY hakedis_no DESC');
const stmtSonHakedisNo = db.prepare('SELECT MAX(hakedis_no) AS son FROM hakedis WHERE sozlesme_id = ?');
const stmtDurumGuncelle = db.prepare("UPDATE hakedis SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtBlokajUygula = db.prepare("UPDATE hakedis SET blokaj_mi = 1, blokaj_nedeni = ? WHERE id = ?");
const stmtBlokajAs = db.prepare("UPDATE hakedis SET blokaj_asildi_mi = 1, blokaj_asan_aktor = ?, blokaj_asma_gerekcesi = ? WHERE id = ?");
const stmtTutarlariGuncelle = db.prepare('UPDATE hakedis SET brut_tutar_kurus = ?, kesintiler_toplam_kurus = ?, net_tutar_kurus = ? WHERE id = ?');
const stmtTaahhutIsaretle = db.prepare('UPDATE hakedis SET taahhut_dusuldu_mu = 1 WHERE id = ?');
const stmtOdemeTalimatiIsaretle = db.prepare('UPDATE hakedis SET odeme_talimati_olusturuldu_mu = 1 WHERE id = ?');

/** @param {{sozlesme_id, donem_baslangic, donem_bitis, son_hakedis_mi?, notes?}} item */
export function olustur(item, aktor) {
  const sozlesmeKaydi = sozlesme.getir(item.sozlesme_id);
  if (!sozlesmeKaydi) throw new Error('Sözleşme bulunamadı');
  if (sozlesmeKaydi.tip !== 'alt_yuklenici') {
    throw new Error(`Hakediş yalnızca "alt_yuklenici" tipi sözleşmeler için açılabilir (bu sözleşme: "${sozlesmeKaydi.tip}" — bkz. CAKISMA_HARITASI.md TANIM AYRIMI: taşeron sözleşmeleri P6'nın işi).`);
  }
  const hakedisNo = (stmtSonHakedisNo.get(item.sozlesme_id).son || 0) + 1;
  const numara = sonraki('HAK');
  const row = {
    numara, sozlesme_id: item.sozlesme_id, proje_id: sozlesmeKaydi.proje_id, hakedis_no: hakedisNo,
    donem_baslangic: item.donem_baslangic, donem_bitis: item.donem_bitis, son_hakedis_mi: item.son_hakedis_mi ? 1 : 0,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('hakedis', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

export function sozlesmeIcinListele(sozlesmeId) {
  return stmtListeleSozlesme.all(sozlesmeId);
}

export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Hakediş bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);

  if (yeniDurum === 'onayli') {
    const blokaj = evrak.blokajKontrolu(mevcut.sozlesme_id, mevcut.son_hakedis_mi === 1);
    if (blokaj.blokajVar && !mevcut.blokaj_asildi_mi) {
      const nedenMetni = blokaj.eksikEvraklar.map((e) => `${e.tur} (${e.durum})`).join(', ');
      stmtBlokajUygula.run(nedenMetni, id);
      throw new Error(`Ödeme blokajı: eksik/süresi geçmiş evrak var — ${nedenMetni}. Aşmak için blokajiAsarakOnayla() kullanın (gerekçe zorunlu).`);
    }
  }

  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('hakedis', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });

  if (yeniDurum === 'onayli') taahhutuIsle(stmtGet.get(id), aktor);
  return stmtGet.get(id);
}

/** "Yetkili aşabilir, gerekçe audit'e yazılır" — blokajı bilinçli olarak aşıp onaylar. */
export function blokajiAsarakOnayla(id, gerekce, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Hakediş bulunamadı');
  if (mevcut.durum !== 'teknik_ofis') throw new Error(`Yalnızca "teknik_ofis" durumundaki bir hakediş için blokaj aşılabilir (şu an: ${mevcut.durum}).`);
  if (!gerekce) throw new Error('Blokajı aşma gerekçesi zorunludur.');
  stmtBlokajAs.run(aktor ?? null, gerekce, id);
  stmtDurumGuncelle.run('onayli', aktor ?? null, id);
  audit.kaydet('hakedis', id, 'GUNCELLE', aktor, { durum: ['teknik_ofis', 'onayli'], blokajAsildi: true, gerekce });
  taahhutuIsle(stmtGet.get(id), aktor);
  return stmtGet.get(id);
}

/** Onaylanınca: her kalem KENDİ WBS'i için (alt_yuklenici kaynak tipli) maliyet koduna GERÇEKLEŞEN yazar. Tek seferlik (idempotent). */
function taahhutuIsle(hakedisKaydi, aktor) {
  if (hakedisKaydi.taahhut_dusuldu_mu) return;
  for (const kalem of stmtKalemListele.all(hakedisKaydi.id)) {
    if (!kalem.tutar_kurus) continue;
    const sozlesmeKalemi = sozlesme.kalemGetir(kalem.sozlesme_kalem_id);
    if (!sozlesmeKalemi?.wbs_gorev_id) continue; // WBS'siz kalem maliyet koduna bağlanamaz — atlanır
    let mk = maliyetKodu.wbsIcinListele(sozlesmeKalemi.wbs_gorev_id).find((x) => x.kaynak_tipi === 'alt_yuklenici');
    if (!mk) mk = maliyetKodu.olustur({ proje_id: hakedisKaydi.proje_id, wbs_gorev_id: sozlesmeKalemi.wbs_gorev_id, kaynak_tipi: 'alt_yuklenici' }, aktor);
    maliyetDefteri.yaz({
      proje_id: hakedisKaydi.proje_id, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: kalem.tutar_kurus,
      tarih: hakedisKaydi.donem_bitis, kaynak_modul: 'altyuklenici_hakedis', kaynak_id: `${hakedisKaydi.id}:kalem-${kalem.id}`,
      notes: `Hakediş ${hakedisKaydi.numara}`,
    }, aktor);
  }
  malzemeKesintileriniDus(hakedisKaydi, aktor);
  stmtTaahhutIsaretle.run(hakedisKaydi.id);
}

/** P11 bulgusu (çift sayım) — bkz. taseron/odemeDonemi.js#malzemeKesintileriniDus: hakedişten kesilen depo malzemesi TERS GERÇEKLEŞEN ile geri alınır. */
function malzemeKesintileriniDus(hakedisKaydi, aktor) {
  const hareketler = new Map(stok.kesintiAdaylariniListele().map((h) => [String(h.id), h]));
  for (const k of kesinti.listele(hakedisKaydi.id)) {
    if (k.kaynak_modul !== 'depo_stok_hareketi') continue;
    const h = hareketler.get(String(k.kaynak_id));
    if (!h || !h.maliyet_kodu_id) continue;
    maliyetDefteri.yaz({
      proje_id: hakedisKaydi.proje_id, maliyet_kodu_id: h.maliyet_kodu_id, tur: 'GERCEKLESEN', tutar_kurus: -k.tutar_kurus, tarih: hakedisKaydi.donem_bitis,
      kaynak_modul: 'altyuklenici_hakedis', kaynak_id: `${hakedisKaydi.id}:malzeme-kesinti-${k.id}`, notes: `Hakediş ${hakedisKaydi.numara}: depo malzemesi geri kesildi (çift sayım önlemi)`,
    }, aktor);
  }
}


/** Onaylı hakediş için net tutar üzerinden Çekirdek Ödeme Talimatı oluşturur (kesinti dökümüyle). */
export function odemeTalimatiOlustur(id, vadeTarihi, aktor) {
  const h = stmtGet.get(id);
  if (!h) throw new Error('Hakediş bulunamadı');
  if (h.durum !== 'onayli') throw new Error(`Ödeme talimatı yalnızca "onayli" durumundaki hakedişler için oluşturulabilir (şu an: ${h.durum}).`);
  if (h.odeme_talimati_olusturuldu_mu) throw new Error('Bu hakediş için zaten bir ödeme talimatı oluşturulmuş.');
  const sozlesmeKaydi = sozlesme.getir(h.sozlesme_id);
  const kesintiler = kesinti.listele(id);
  const talimat = odeme.talimatOlustur({
    proje_id: h.proje_id, firma_id: sozlesmeKaydi.taraf_firma_id, aciklama: `Hakediş ${h.numara} (${sozlesmeKaydi.numara})`,
    kaynak_belge_modul: 'altyuklenici_hakedis', kaynak_belge_id: String(id), vade_tarihi: vadeTarihi,
    tutar_kurus: h.net_tutar_kurus, para_birimi: h.para_birimi, kesintiler_kurus: h.kesintiler_toplam_kurus,
    kesintiler: kesintiler.map((k) => ({ parametre_kodu: k.parametre_kodu || k.tur, tutar_kurus: k.tutar_kurus })),
  }, aktor);
  stmtOdemeTalimatiIsaretle.run(id);
  audit.kaydet('hakedis', id, 'GUNCELLE', aktor, { odeme_talimati_id: talimat.id });
  return talimat;
}

// ---------- Kalem ----------
const stmtKalemInsert = db.prepare(
  `INSERT INTO hakedis_kalem (hakedis_id, sozlesme_kalem_id, birim_fiyat_kurus, onceki_kumulatif_miktar, kumulatif_miktar, olusturan)
   VALUES (@hakedis_id, @sozlesme_kalem_id, @birim_fiyat_kurus, @onceki_kumulatif_miktar, @onceki_kumulatif_miktar, @olusturan)`
);
const stmtKalemListele = db.prepare('SELECT * FROM hakedis_kalem WHERE hakedis_id = ? AND row_status = 1 ORDER BY id');
const stmtKalemGet = db.prepare('SELECT * FROM hakedis_kalem WHERE id = ? AND row_status = 1');
const stmtKalemBeyanGuncelle = db.prepare('UPDATE hakedis_kalem SET bu_donem_beyan_miktar = ? WHERE id = ?');
const stmtKalemOnayGuncelle = db.prepare('UPDATE hakedis_kalem SET bu_donem_onay_miktar = ?, kumulatif_miktar = ?, tutar_kurus = ? WHERE id = ?');
// Bu sözleşme kaleminin EN SON ONAYLANMIŞ hakedişteki kümülatif miktarı — yeni hakedişin başlangıç noktası.
const stmtOncekiKumulatif = db.prepare(
  `SELECT hk.kumulatif_miktar FROM hakedis_kalem hk JOIN hakedis h ON h.id = hk.hakedis_id
   WHERE hk.sozlesme_kalem_id = ? AND h.durum = 'onayli' AND h.row_status = 1
   ORDER BY h.hakedis_no DESC LIMIT 1`
);

function oncekiKumulatifGetir(sozlesmeKalemId) {
  const row = stmtOncekiKumulatif.get(sozlesmeKalemId);
  return row ? row.kumulatif_miktar : 0;
}

export function kalemEkle(hakedisId, sozlesmeKalemId, aktor) {
  const h = stmtGet.get(hakedisId);
  if (!h) throw new Error('Hakediş bulunamadı');
  if (h.durum !== 'taslak') throw new Error('Yalnızca "taslak" durumundaki hakedişe kalem eklenebilir.');
  const sozlesmeKalemi = sozlesme.kalemGetir(sozlesmeKalemId);
  if (!sozlesmeKalemi) throw new Error('Sözleşme kalemi bulunamadı');
  const row = {
    hakedis_id: hakedisId, sozlesme_kalem_id: sozlesmeKalemId, birim_fiyat_kurus: sozlesmeKalemi.birim_fiyat_kurus,
    onceki_kumulatif_miktar: oncekiKumulatifGetir(sozlesmeKalemId), olusturan: aktor ?? null,
  };
  const info = stmtKalemInsert.run(row);
  audit.kaydet('hakedis_kalem', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtKalemGet.get(info.lastInsertRowid);
}

export function kalemleriGetir(hakedisId) {
  return stmtKalemListele.all(hakedisId);
}

export function beyanGir(hakedisKalemId, miktar, aktor) {
  const kalem = stmtKalemGet.get(hakedisKalemId);
  if (!kalem) throw new Error('Hakediş kalemi bulunamadı');
  const h = stmtGet.get(kalem.hakedis_id);
  if (h.durum !== 'alt_yuklenici_beyani') throw new Error(`Beyan yalnızca "alt_yuklenici_beyani" durumunda girilebilir (şu an: ${h.durum}).`);
  stmtKalemBeyanGuncelle.run(miktar, hakedisKalemId);
  audit.kaydet('hakedis_kalem', hakedisKalemId, 'GUNCELLE', aktor, { bu_donem_beyan_miktar: miktar });
  return stmtKalemGet.get(hakedisKalemId);
}

/**
 * Şantiye şefinin ONAYLADIĞI miktar — beyandan FARKLI olabilir (görev
 * metni: "alt yüklenicinin beyan ettiği metraj ile şantiye şefinin
 * onayladığı ayrı tutulmalı"). Kümülatif miktar, sözleşme kalemi miktarını
 * AŞARSA İŞLEM ENGELLENMEZ — bir UYARI nesnesiyle birlikte döner (görev
 * metni: "uyarı + zeyilname gerekliliği").
 */
export function onayGir(hakedisKalemId, miktar, aktor) {
  const kalem = stmtKalemGet.get(hakedisKalemId);
  if (!kalem) throw new Error('Hakediş kalemi bulunamadı');
  const h = stmtGet.get(kalem.hakedis_id);
  if (h.durum !== 'santiye_onayi') throw new Error(`Onay yalnızca "santiye_onayi" durumunda girilebilir (şu an: ${h.durum}).`);

  const kumulatif = kalem.onceki_kumulatif_miktar + miktar;
  const tutar = Math.round(miktar * kalem.birim_fiyat_kurus);
  stmtKalemOnayGuncelle.run(miktar, kumulatif, tutar, hakedisKalemId);
  audit.kaydet('hakedis_kalem', hakedisKalemId, 'GUNCELLE', aktor, { bu_donem_onay_miktar: miktar, kumulatif_miktar: kumulatif });
  toplamlariYenidenHesapla(kalem.hakedis_id);

  const sozlesmeKalemi = sozlesme.kalemGetir(kalem.sozlesme_kalem_id);
  const uyari = sozlesmeKalemi && kumulatif > sozlesmeKalemi.miktar
    ? { asimMiktari: Number((kumulatif - sozlesmeKalemi.miktar).toFixed(4)), mesaj: 'Kümülatif miktar sözleşme kalemi miktarını aşıyor — zeyilname gerekebilir (bkz. Sözleşme modülü).' }
    : null;
  return { kalem: stmtKalemGet.get(hakedisKalemId), uyari };
}

function toplamlariYenidenHesapla(hakedisId) {
  const kalemler = stmtKalemListele.all(hakedisId);
  const brut = kalemler.reduce((t, k) => t + (k.tutar_kurus || 0), 0);
  const kesintilerToplami = kesinti.listele(hakedisId).reduce((t, k) => t + k.tutar_kurus, 0);
  stmtTutarlariGuncelle.run(brut, kesintilerToplami, brut - kesintilerToplami, hakedisId);
}

/** Kesinti eklendikten/değiştirildikten sonra dışarıdan (routes.js) çağrılır — net tutarı günceller. */
export function tutarlariYenidenHesapla(hakedisId) {
  toplamlariYenidenHesapla(hakedisId);
  return stmtGet.get(hakedisId);
}
