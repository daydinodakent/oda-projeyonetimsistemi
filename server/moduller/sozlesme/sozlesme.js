// Sözleşme — TÜM sözleşmelerin TEK kaynağı. Diğer modüller (Alt Yüklenici,
// Satın Alma, Müşteri, Taşeron) kendi sözleşme tablosu AÇMAZ; sozlesme.id'yi
// referans alır ve bu servisi (özellikle kalemleriGetir/kalanBedel) çağırır.
//
// Firma/Kişi doğrulaması RAW TABLOYA DEĞİL, sahibinin servisine yapılır
// (cariFirma.getir/kisi.getir) — bkz. ÇALIŞMA KURALLARI sahiplik kuralı:
// "sahibin servisini çağırır".
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as kisi from '../_cekirdek/kisi.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as parametre from '../_cekirdek/parametre.js';
import { getRecord } from '../../db.js';

const TIPLER = ['musteri_satis', 'alt_yuklenici', 'taseron', 'tedarikci_cerceve', 'kira', 'hizmet', 'arsa_sahibi'];
// Bir sözleşme tipinin Maliyet Defteri'nde GELİR mi yoksa TAAHHÜT mü
// yazacağını belirler. Yalnızca müşteriye satış GELİR'dir; arsa sahibi
// sözleşmesi (kat karşılığı) nakit değil ayni bir yükümlülük olduğundan
// TAAHHUT tarafında ele alınır (basitleştirme — bkz. P2 Uygulama Durumu notu).
const GELIR_TIPLERI = ['musteri_satis'];
// Yürürlükteki bir sözleşmenin kalemi/maddesi artık DEĞİŞEMEZ — yalnızca
// zeyilname ile (görev metni kuralı).
const KALEM_KILITLI_DURUMLAR = ['yururlukte', 'askida', 'tamamlandi', 'feshedildi'];
const TERMINAL_DURUMLAR = ['feshedildi', 'tamamlandi'];
const KDV_DURUMLARI = ['dahil', 'haric', 'istisna'];
const MADDE_TURLERI = ['ceza', 'teminat', 'avans', 'fiyat_farki', 'sigorta', 'isg', 'gizlilik', 'diger'];
const SORUMLU_TARAFLAR = ['yuklenici', 'isveren', 'her_iki_taraf'];
const TEMINAT_TURLERI = ['nakit', 'teminat_mektubu', 'cek_senet'];
const IADE_DURUMLARI = ['serbest', 'iade_edildi', 'irat_kaydedildi'];

const AKIS = {
  taslak: ['onayda'],
  onayda: ['imzali', 'taslak'],
  imzali: ['yururlukte'],
  yururlukte: ['askida', 'tamamlandi', 'feshedildi'],
  askida: ['yururlukte', 'feshedildi'],
};

function taahhutTuru(sozlesme) {
  return GELIR_TIPLERI.includes(sozlesme.tip) ? 'GELIR' : 'TAAHHUT';
}

const stmtInsert = db.prepare(
  `INSERT INTO sozlesme (numara, tip, alt_tip, proje_id, konu, taraf_firma_id, taraf_kisi_id, bedel_kurus, para_birimi, kur, kur_tarihi, kdv_durumu, baslangic_tarihi, bitis_tarihi, odeme_sartlari, notes, olusturan)
   VALUES (@numara, @tip, @alt_tip, @proje_id, @konu, @taraf_firma_id, @taraf_kisi_id, @bedel_kurus, @para_birimi, @kur, @kur_tarihi, @kdv_durumu, @baslangic_tarihi, @bitis_tarihi, @odeme_sartlari, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM sozlesme WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM sozlesme WHERE proje_id = ? AND row_status = 1 ORDER BY olusturma_zamani DESC');
const stmtDurumGuncelle = db.prepare("UPDATE sozlesme SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtTaahhutIsaretle = db.prepare('UPDATE sozlesme SET taahhut_yazildi = 1 WHERE id = ?');
const stmtBedelGuncelle = db.prepare("UPDATE sozlesme SET bedel_kurus = ?, bitis_tarihi = COALESCE(?, bitis_tarihi), write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

export function listele(projeId) {
  return stmtList.all(projeId);
}

export function getir(id) {
  return stmtGet.get(id);
}

/** @param {{tip, proje_id, konu, bedel_kurus, baslangic_tarihi, taraf_firma_id?, taraf_kisi_id?, ...}} item */
export function olustur(item, aktor) {
  if (!TIPLER.includes(item.tip)) throw new Error(`Geçersiz sözleşme tipi: ${item.tip}`);
  if (!item.taraf_firma_id && !item.taraf_kisi_id) throw new Error('Sözleşmenin bir tarafı (taraf_firma_id veya taraf_kisi_id) belirtilmelidir.');
  if (!Number.isInteger(item.bedel_kurus)) throw new Error('bedel_kurus tam sayı (kuruş) olmalıdır.');
  if (item.kdv_durumu && !KDV_DURUMLARI.includes(item.kdv_durumu)) throw new Error(`Geçersiz KDV durumu: ${item.kdv_durumu}`);
  // Sahiplik: firma/kişi RAW tabloya değil, Çekirdek'in KENDİ servisine
  // sorularak doğrulanır (referans veren taraf kontrol eder).
  if (item.taraf_firma_id && !cariFirma.getir(item.taraf_firma_id)) throw new Error(`Firma bulunamadı: ${item.taraf_firma_id}`);
  if (item.taraf_kisi_id && !kisi.getir(item.taraf_kisi_id)) throw new Error(`Kişi bulunamadı: ${item.taraf_kisi_id}`);

  const numara = sonraki('SOZ');
  const row = {
    numara, tip: item.tip, alt_tip: item.alt_tip ?? null, proje_id: item.proje_id, konu: item.konu,
    taraf_firma_id: item.taraf_firma_id ?? null, taraf_kisi_id: item.taraf_kisi_id ?? null,
    bedel_kurus: item.bedel_kurus, para_birimi: item.para_birimi || 'TRY', kur: item.kur ?? 1,
    kur_tarihi: item.kur_tarihi ?? null, kdv_durumu: item.kdv_durumu || 'haric',
    baslangic_tarihi: item.baslangic_tarihi, bitis_tarihi: item.bitis_tarihi ?? null,
    odeme_sartlari: item.odeme_sartlari ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  db.prepare(
    `INSERT INTO sozlesme_versiyon (sozlesme_id, versiyon_no, tur, bedel_farki_kurus, aciklama, olusturan)
     VALUES (?, 1, 'orijinal', ?, 'Orijinal sözleşme', ?)`
  ).run(id, item.bedel_kurus, aktor ?? null);
  audit.kaydet('sozlesme', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

// Sözleşme tipi → maliyet kodu kaynak tipi. P11 entegrasyon bulgusu: taahhüt
// tek satır ve maliyet kodsuz yazılınca WBS raporunda taahhüt 0 görünüyor ve
// "bütçe aşımı taahhütte yakalanır" kuralı çalışmıyordu. Artık WBS'li KALEMLER
// kendi maliyet koduna yazılır; kalemlerin karşılamadığı kısım (bedel −
// Σ kalem tutarı) kodsuz kalır.
const TIP_KAYNAK_TIPI = { alt_yuklenici: 'alt_yuklenici', taseron: 'iscilik_taseron', kira: 'makine_ekipman', tedarikci_cerceve: 'malzeme' };

function taahhutuYaz(guncel, aktor) {
  const kaynakTipi = TIP_KAYNAK_TIPI[guncel.tip];
  const ortak = {
    proje_id: guncel.proje_id, tur: taahhutTuru(guncel), para_birimi: guncel.para_birimi, kur: guncel.kur,
    kur_tarihi: guncel.kur_tarihi || guncel.baslangic_tarihi, tarih: guncel.baslangic_tarihi, kaynak_modul: 'sozlesme',
  };
  let yeniYazildi = false; let dagitilan = 0;
  const kalemler = kaynakTipi ? stmtKalemListele.all(guncel.id).filter((k) => k.wbs_gorev_id) : [];
  for (const k of kalemler) {
    const tutar = Math.round(k.miktar * k.birim_fiyat_kurus);
    if (!tutar) continue;
    let mk;
    try {
      mk = maliyetKodu.wbsIcinListele(k.wbs_gorev_id).find((x) => x.kaynak_tipi === kaynakTipi)
        || maliyetKodu.olustur({ proje_id: guncel.proje_id, wbs_gorev_id: k.wbs_gorev_id, kaynak_tipi: kaynakTipi }, aktor);
    } catch { continue; } // WBS kaydı artık yoksa kalem kodsuz kalan kısma düşer
    const { tekrarGonderim } = maliyetDefteri.yaz({ ...ortak, maliyet_kodu_id: mk.id, tutar_kurus: tutar, kaynak_id: `${guncel.id}:kalem-${k.id}`, notes: `Sözleşme ${guncel.numara} imza taahhüdü — kalem #${k.id}` }, aktor);
    if (!tekrarGonderim) yeniYazildi = true;
    dagitilan += tutar;
  }
  const kalan = guncel.bedel_kurus - dagitilan;
  if (kalan !== 0 || dagitilan === 0) {
    const { tekrarGonderim } = maliyetDefteri.yaz({ ...ortak, tutar_kurus: kalan, kaynak_id: String(guncel.id), notes: `Sözleşme ${guncel.numara} imza taahhüdü${dagitilan ? ' (kalemlere dağıtılmayan kısım)' : ''}` }, aktor);
    if (!tekrarGonderim) yeniYazildi = true;
  }
  return yeniYazildi;
}

/**
 * Durum makinesi: taslak→onayda→imzali→yururlukte→(askida)→tamamlandi/feshedildi.
 * "imzali"ya geçişte (sözleşme onaylanıp imzalanınca) Maliyet Defteri'ne
 * TEK SEFERLİK bir TAAHHUT/GELİR kaydı yazılır (görev metni: "Sözleşme
 * bedeli onaylanınca Maliyet Defteri'ne TAAHHÜT yazılır") — akışta ayrı bir
 * "onaylandı" durumu olmadığından, en yakın karşılığı olan "imzali" durumu
 * tetikleyici seçildi (bkz. P2 Uygulama Durumu notu).
 */
export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Sözleşme bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('sozlesme', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  if (yeniDurum === 'imzali' && !mevcut.taahhut_yazildi) {
    if (taahhutuYaz(stmtGet.get(id), aktor)) stmtTaahhutIsaretle.run(id);
  }
  return stmtGet.get(id);
}

// ---------- Kalem ----------
const stmtKalemInsert = db.prepare(
  `INSERT INTO sozlesme_kalem (sozlesme_id, wbs_gorev_id, aciklama, birim, miktar, birim_fiyat_kurus, olusturan)
   VALUES (@sozlesme_id, @wbs_gorev_id, @aciklama, @birim, @miktar, @birim_fiyat_kurus, @olusturan)`
);
const stmtKalemListele = db.prepare('SELECT * FROM sozlesme_kalem WHERE sozlesme_id = ? AND row_status = 1 ORDER BY id');
const stmtKalemGet = db.prepare('SELECT * FROM sozlesme_kalem WHERE id = ? AND row_status = 1');
const stmtKalemSil = db.prepare('UPDATE sozlesme_kalem SET row_status = 0 WHERE id = ?');

function kilitKontrol(sozlesme) {
  if (KALEM_KILITLI_DURUMLAR.includes(sozlesme.durum)) {
    throw new Error(`"${sozlesme.durum}" durumundaki bir sözleşmenin kalemi doğrudan değiştirilemez — zeyilnameOlustur() kullanın.`);
  }
}

/** @param {{wbs_gorev_id?, aciklama, birim, miktar, birim_fiyat_kurus}} item */
export function kalemEkle(sozlesmeId, item, aktor) {
  const sozlesme = stmtGet.get(sozlesmeId);
  if (!sozlesme) throw new Error('Sözleşme bulunamadı');
  kilitKontrol(sozlesme);
  if (!Number.isInteger(item.birim_fiyat_kurus)) throw new Error('birim_fiyat_kurus tam sayı (kuruş) olmalıdır.');
  if (item.wbs_gorev_id && !getRecord('tb_wbs_gorevler', item.wbs_gorev_id)) {
    throw new Error(`WBS görevi bulunamadı: ${item.wbs_gorev_id}`);
  }
  const row = {
    sozlesme_id: sozlesmeId, wbs_gorev_id: item.wbs_gorev_id ? String(item.wbs_gorev_id) : null,
    aciklama: item.aciklama, birim: item.birim, miktar: item.miktar, birim_fiyat_kurus: item.birim_fiyat_kurus,
    olusturan: aktor ?? null,
  };
  const info = stmtKalemInsert.run(row);
  audit.kaydet('sozlesme_kalem', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, row_status: 1, ...row };
}

/** Görev metnindeki sözleşme: `sozlesme.kalemleriGetir(id)`. */
export function kalemleriGetir(sozlesmeId) {
  return stmtKalemListele.all(sozlesmeId);
}

/** Diğer modüllerin (ör. P5 Alt Yüklenici Hakediş) tek bir sözleşme kalemine sahiplik kuralına uygun erişimi — RAW tabloya değil buna. */
export function kalemGetir(kalemId) {
  return stmtKalemGet.get(kalemId);
}

export function kalemSil(kalemId, aktor) {
  const kalem = db.prepare('SELECT * FROM sozlesme_kalem WHERE id = ?').get(kalemId);
  if (!kalem) throw new Error('Kalem bulunamadı');
  kilitKontrol(stmtGet.get(kalem.sozlesme_id));
  stmtKalemSil.run(kalemId);
  audit.kaydet('sozlesme_kalem', kalemId, 'IPTAL', aktor, null);
}

// ---------- Versiyon / Zeyilname ----------
const stmtVersiyonSonNo = db.prepare('SELECT MAX(versiyon_no) AS son FROM sozlesme_versiyon WHERE sozlesme_id = ?');
const stmtVersiyonInsert = db.prepare(
  `INSERT INTO sozlesme_versiyon (sozlesme_id, versiyon_no, tur, bedel_farki_kurus, sure_uzatimi_gun, yeni_bitis_tarihi, aciklama, degisiklik, olusturan)
   VALUES (@sozlesme_id, @versiyon_no, 'zeyilname', @bedel_farki_kurus, @sure_uzatimi_gun, @yeni_bitis_tarihi, @aciklama, @degisiklik, @olusturan)`
);
const stmtVersiyonListele = db.prepare('SELECT * FROM sozlesme_versiyon WHERE sozlesme_id = ? ORDER BY versiyon_no');

export function versiyonlariGetir(sozlesmeId) {
  return stmtVersiyonListele.all(sozlesmeId);
}

/**
 * Zeyilname (ek protokol) — iş artışı/eksilişi, süre uzatımı, fiyat
 * revizyonu. ORİJİNAL SATIR ASLA EZİLMEZ; bu, sozlesme_versiyon'a YENİ bir
 * satır ekler ve sozlesme.bedel_kurus'u (güncel toplam) günceller.
 * @param {{bedel_farki_kurus?, sure_uzatimi_gun?, yeni_bitis_tarihi?, aciklama, degisiklik?}} item
 */
export function zeyilnameOlustur(sozlesmeId, item, aktor) {
  const sozlesme = stmtGet.get(sozlesmeId);
  if (!sozlesme) throw new Error('Sözleşme bulunamadı');
  if (TERMINAL_DURUMLAR.includes(sozlesme.durum)) throw new Error(`Sonlanmış ("${sozlesme.durum}") bir sözleşmeye zeyilname eklenemez.`);
  if (!item.aciklama) throw new Error('Zeyilname açıklaması zorunludur.');
  const bedelFarki = item.bedel_farki_kurus ?? 0;
  if (!Number.isInteger(bedelFarki)) throw new Error('bedel_farki_kurus tam sayı (kuruş) olmalıdır.');

  const versiyonNo = (stmtVersiyonSonNo.get(sozlesmeId).son || 0) + 1;
  const row = {
    sozlesme_id: sozlesmeId, versiyon_no: versiyonNo, bedel_farki_kurus: bedelFarki,
    sure_uzatimi_gun: item.sure_uzatimi_gun ?? 0, yeni_bitis_tarihi: item.yeni_bitis_tarihi ?? null,
    aciklama: item.aciklama, degisiklik: item.degisiklik ? JSON.stringify(item.degisiklik) : null, olusturan: aktor ?? null,
  };
  stmtVersiyonInsert.run(row);
  stmtBedelGuncelle.run(sozlesme.bedel_kurus + bedelFarki, item.yeni_bitis_tarihi ?? null, sozlesmeId);
  audit.kaydet('sozlesme', sozlesmeId, 'GUNCELLE', aktor, { zeyilname: row });

  if (sozlesme.taahhut_yazildi && bedelFarki !== 0) {
    // Taahhüt zaten yazılmışsa (sözleşme imzalı/yürürlükte), zeyilname farkı
    // AYRI bir olay olarak deftere işlenir — orijinal taahhüt kaydı
    // DEĞİŞTİRİLMEZ (bkz. maliyetDefteri.yaz idempotency sözleşmesi).
    maliyetDefteri.yaz({
      proje_id: sozlesme.proje_id, tur: taahhutTuru(sozlesme), tutar_kurus: bedelFarki,
      para_birimi: sozlesme.para_birimi, kur: sozlesme.kur, kur_tarihi: sozlesme.kur_tarihi || item.aciklama,
      tarih: new Date().toISOString().slice(0, 10), kaynak_modul: 'sozlesme', kaynak_id: `${sozlesmeId}:v${versiyonNo}`,
      notes: `Sözleşme ${sozlesme.numara} zeyilname #${versiyonNo}: ${item.aciklama}`,
    }, aktor);
  }
  return { sozlesme: stmtGet.get(sozlesmeId), versiyon: stmtVersiyonListele.all(sozlesmeId).find((v) => v.versiyon_no === versiyonNo) };
}

/**
 * Kalan bedel = orijinal bedel + tüm zeyilname farkları (yani sozlesme.bedel_kurus,
 * zaten güncel tutulur). NOT: Bu modülde henüz Hakediş/kullanım düşümü YOK
 * (kapsam dışı — görev metni yalnızca Sözleşme'yi kapsıyor); "kalan bedel"
 * bu geçişte "güncel toplam sözleşme bedeli"yle eşdeğerdir. İleride Hakediş
 * modülü GERÇEKLEŞEN kayıtlarını kaynak_modul='sozlesme' ile yazarsa, bu
 * fonksiyon o kayıtları da düşecek şekilde genişletilebilir.
 */
export function kalanBedel(id) {
  const sozlesme = stmtGet.get(id);
  if (!sozlesme) throw new Error('Sözleşme bulunamadı');
  const versiyonlar = stmtVersiyonListele.all(id);
  const orijinal = versiyonlar.find((v) => v.tur === 'orijinal');
  const zeyilnameToplami = versiyonlar.filter((v) => v.tur === 'zeyilname').reduce((t, v) => t + v.bedel_farki_kurus, 0);
  return {
    orijinalBedelKurus: orijinal ? orijinal.bedel_farki_kurus : sozlesme.bedel_kurus,
    zeyilnameToplamFarkKurus: zeyilnameToplami,
    guncelToplamBedelKurus: sozlesme.bedel_kurus,
    kalanBedelKurus: sozlesme.bedel_kurus,
  };
}

// ---------- Madde ----------
const stmtMaddeInsert = db.prepare(
  `INSERT INTO sozlesme_madde (sozlesme_id, tur, parametreler, sorumlu_taraf, kontrol_tarihi, aciklama, olusturan)
   VALUES (@sozlesme_id, @tur, @parametreler, @sorumlu_taraf, @kontrol_tarihi, @aciklama, @olusturan)`
);
const stmtMaddeListele = db.prepare('SELECT * FROM sozlesme_madde WHERE sozlesme_id = ? AND row_status = 1 ORDER BY kontrol_tarihi');

export function maddeEkle(sozlesmeId, item, aktor) {
  if (!stmtGet.get(sozlesmeId)) throw new Error('Sözleşme bulunamadı');
  if (!MADDE_TURLERI.includes(item.tur)) throw new Error(`Geçersiz madde türü: ${item.tur}`);
  if (item.sorumlu_taraf && !SORUMLU_TARAFLAR.includes(item.sorumlu_taraf)) throw new Error(`Geçersiz sorumlu taraf: ${item.sorumlu_taraf}`);
  const row = {
    sozlesme_id: sozlesmeId, tur: item.tur, parametreler: item.parametreler ? JSON.stringify(item.parametreler) : null,
    sorumlu_taraf: item.sorumlu_taraf || 'yuklenici', kontrol_tarihi: item.kontrol_tarihi ?? null,
    aciklama: item.aciklama ?? null, olusturan: aktor ?? null,
  };
  const info = stmtMaddeInsert.run(row);
  audit.kaydet('sozlesme_madde', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, row_status: 1, ...row };
}

export function maddeleriGetir(sozlesmeId) {
  return stmtMaddeListele.all(sozlesmeId);
}

// ---------- Teminat ----------
const stmtTeminatInsert = db.prepare(
  `INSERT INTO sozlesme_teminat (sozlesme_id, tur, banka, tutar_kurus, para_birimi, bitis_tarihi, notes, olusturan)
   VALUES (@sozlesme_id, @tur, @banka, @tutar_kurus, @para_birimi, @bitis_tarihi, @notes, @olusturan)`
);
const stmtTeminatListele = db.prepare('SELECT * FROM sozlesme_teminat WHERE sozlesme_id = ? AND row_status = 1 ORDER BY bitis_tarihi');
const stmtTeminatIade = db.prepare('UPDATE sozlesme_teminat SET iade_durumu = ? WHERE id = ?');

export function teminatEkle(sozlesmeId, item, aktor) {
  if (!stmtGet.get(sozlesmeId)) throw new Error('Sözleşme bulunamadı');
  if (!TEMINAT_TURLERI.includes(item.tur)) throw new Error(`Geçersiz teminat türü: ${item.tur}`);
  if (!Number.isInteger(item.tutar_kurus)) throw new Error('tutar_kurus tam sayı (kuruş) olmalıdır.');
  const row = {
    sozlesme_id: sozlesmeId, tur: item.tur, banka: item.banka ?? null, tutar_kurus: item.tutar_kurus,
    para_birimi: item.para_birimi || 'TRY', bitis_tarihi: item.bitis_tarihi ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtTeminatInsert.run(row);
  audit.kaydet('sozlesme_teminat', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, row_status: 1, iade_durumu: 'serbest', ...row };
}

export function teminatlariGetir(sozlesmeId) {
  return stmtTeminatListele.all(sozlesmeId);
}

export function teminatIadeIsaretle(teminatId, durum, aktor) {
  if (!IADE_DURUMLARI.includes(durum)) throw new Error(`Geçersiz iade durumu: ${durum}`);
  stmtTeminatIade.run(durum, teminatId);
  audit.kaydet('sozlesme_teminat', teminatId, 'GUNCELLE', aktor, { iade_durumu: durum });
}

// ---------- Belge (mevcut tb_dokumanlar'a REFERANS — kopyalanmaz) ----------
const stmtBelgeInsert = db.prepare('INSERT INTO sozlesme_belge (sozlesme_id, dokuman_id, rol, olusturan) VALUES (?, ?, ?, ?)');
const stmtBelgeListele = db.prepare('SELECT * FROM sozlesme_belge WHERE sozlesme_id = ? ORDER BY olusturma_zamani DESC');

export function belgeBagla(sozlesmeId, dokumanId, rol, aktor) {
  if (!stmtGet.get(sozlesmeId)) throw new Error('Sözleşme bulunamadı');
  if (!getRecord('tb_dokumanlar', dokumanId)) throw new Error(`Doküman bulunamadı: ${dokumanId}`);
  try {
    const info = stmtBelgeInsert.run(sozlesmeId, String(dokumanId), rol || 'ek', aktor ?? null);
    audit.kaydet('sozlesme_belge', info.lastInsertRowid, 'OLUSTUR', aktor, { sozlesme_id: sozlesmeId, dokuman_id: dokumanId });
    return { id: info.lastInsertRowid, sozlesme_id: sozlesmeId, dokuman_id: String(dokumanId), rol: rol || 'ek' };
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu doküman bu sözleşmeye zaten bağlı.');
    throw err;
  }
}

export function belgeleriGetir(sozlesmeId) {
  return stmtBelgeListele.all(sozlesmeId);
}

// ---------- Kritik Tarihler ----------
const VARSAYILAN_ESIKLER_GUN = [30, 15, 7];
const ESIK_PARAMETRE_KODLARI = ['sozlesme_kritik_esik_30', 'sozlesme_kritik_esik_15', 'sozlesme_kritik_esik_7'];

function esikleriOku() {
  const esikler = ESIK_PARAMETRE_KODLARI.map((kod, i) => {
    const p = parametre.degerAl(kod);
    return p ? p.deger : VARSAYILAN_ESIKLER_GUN[i];
  });
  return esikler.sort((a, b) => a - b);
}

function aciliyetSinifi(kalanGun, esikler) {
  if (kalanGun < 0) return 'gecikti';
  if (kalanGun <= esikler[0]) return 'kritik';
  if (kalanGun <= esikler[1]) return 'yakin';
  return 'bilgi';
}

/**
 * Sözleşme bitiş tarihleri + teminat bitiş tarihleri + madde kontrol
 * tarihlerinin (opsiyon süresi, fiyat farkı dönemi, sigorta poliçe bitişi...)
 * TEK bir listede, aciliyet sınıfıyla birleşimi. Eşikler (30/15/7 gün)
 * PARAMETRE tablosundan okunur — koda gömülü değer yalnızca hiç
 * tanımlanmamışsa devreye giren varsayılandır (ÇALIŞMA KURALLARI).
 *
 * NOT: Bu yalnızca EKRANIN veri kaynağıdır — gerçek bir bildirim (push/eposta)
 * GÖNDERİMİ yapılmaz; Bildirim ortak servisi henüz yazılmadı (bkz. P1
 * ertelenenler listesi).
 */
export function kritikTarihler(projeId) {
  const esikler = esikleriOku();
  const maxEsik = esikler[esikler.length - 1];
  const bugun = new Date();
  const gunFarki = (tarihStr) => Math.round((new Date(tarihStr) - bugun) / 86400000);

  const sonuc = [];
  for (const s of stmtList.all(projeId)) {
    if (s.bitis_tarihi) {
      const kalan = gunFarki(s.bitis_tarihi);
      if (kalan <= maxEsik) sonuc.push({ kaynak: 'sozlesme_bitis', sozlesme_id: s.id, sozlesme_numara: s.numara, tarih: s.bitis_tarihi, kalanGun: kalan, aciliyet: aciliyetSinifi(kalan, esikler) });
    }
    for (const t of stmtTeminatListele.all(s.id)) {
      if (!t.bitis_tarihi || t.iade_durumu !== 'serbest') continue;
      const kalan = gunFarki(t.bitis_tarihi);
      if (kalan <= maxEsik) sonuc.push({ kaynak: 'teminat_bitis', sozlesme_id: s.id, sozlesme_numara: s.numara, teminat_id: t.id, tarih: t.bitis_tarihi, kalanGun: kalan, aciliyet: aciliyetSinifi(kalan, esikler) });
    }
    for (const m of stmtMaddeListele.all(s.id)) {
      if (!m.kontrol_tarihi) continue;
      const kalan = gunFarki(m.kontrol_tarihi);
      if (kalan <= maxEsik) sonuc.push({ kaynak: 'madde_kontrol', sozlesme_id: s.id, sozlesme_numara: s.numara, madde_id: m.id, madde_turu: m.tur, tarih: m.kontrol_tarihi, kalanGun: kalan, aciliyet: aciliyetSinifi(kalan, esikler) });
    }
  }
  return sonuc.sort((a, b) => a.kalanGun - b.kalanGun);
}
