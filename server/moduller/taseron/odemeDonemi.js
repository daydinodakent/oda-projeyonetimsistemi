// Ödeme Dönemi — Taşeron'un hesap kapama akışı. "Dönem kapanışı: şef onayı
// → proje müdürü onayı → Maliyet Defteri GERÇEKLEŞEN (işçilik-taşeron) +
// Ödeme Talimatı. Kapanmış dönem puantajı değiştirilemez."
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as odeme from '../_cekirdek/odeme.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as ekip from './ekip.js';
import * as metraj from './metraj.js';
import * as sozlesme from '../sozlesme/sozlesme.js';

const AKIS = { acik: ['sef_onayi'], sef_onayi: ['proje_muduru_onayi'], proje_muduru_onayi: ['kapandi'] };

const stmtInsert = db.prepare(
  `INSERT INTO odeme_donemi (numara, ekip_id, proje_id, donem_baslangic, donem_bitis, notes, olusturan)
   VALUES (@numara, @ekip_id, @proje_id, @donem_baslangic, @donem_bitis, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM odeme_donemi WHERE id = ? AND row_status = 1');
const stmtListeleEkip = db.prepare('SELECT * FROM odeme_donemi WHERE ekip_id = ? AND row_status = 1 ORDER BY donem_baslangic DESC');
const stmtDurumGuncelle = db.prepare("UPDATE odeme_donemi SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtTutarlariGuncelle = db.prepare('UPDATE odeme_donemi SET brut_tutar_kurus = ?, kesintiler_toplam_kurus = ?, net_tutar_kurus = ? WHERE id = ?');
const stmtTaahhutIsaretle = db.prepare('UPDATE odeme_donemi SET taahhut_dusuldu_mu = 1 WHERE id = ?');
const stmtOdemeTalimatiIsaretle = db.prepare('UPDATE odeme_donemi SET odeme_talimati_olusturuldu_mu = 1 WHERE id = ?');
const stmtKesintiListele = db.prepare('SELECT * FROM odeme_donemi_kesinti WHERE odeme_donemi_id = ? ORDER BY id');

/** @param {{ekip_id, donem_baslangic, donem_bitis, notes?}} item */
export function olustur(item, aktor) {
  const ekipKaydi = ekip.getir(item.ekip_id);
  if (!ekipKaydi) throw new Error('Ekip bulunamadı');
  const numara = sonraki('ODD');
  const row = {
    numara, ekip_id: item.ekip_id, proje_id: ekipKaydi.proje_id, donem_baslangic: item.donem_baslangic,
    donem_bitis: item.donem_bitis, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu ekip için AYNI dönem aralığıyla zaten bir ödeme dönemi açılmış.');
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('odeme_donemi', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

export function ekipIcinListele(ekipId) {
  return stmtListeleEkip.all(ekipId);
}

function bayramPazarCarpani() {
  const p = parametre.degerAl('taseron_bayram_pazar_carpani');
  return p ? p.deger : 1; // tanımsızsa EKSTRA ödeme YOK (en güvenli varsayım) — koda gömülü "2x" varsayımı YOK
}

function fazlaMesaiCarpani() {
  const p = parametre.degerAl('taseron_fazla_mesai_carpani');
  return p ? p.deger : 1;
}

/**
 * Brüt tutarı hesaplar (durumu DEĞİŞTİRMEZ, yeniden çağrılabilir):
 *   - odeme_tipi='yevmiye'/'karma': ekip üyelerinin dönem aralığındaki
 *     puantaj kayıtları × o GÜNDE geçerli yevmiye (yürürlük tarihli).
 *     Yevmiyesi TANIMLANMAMIŞ bir gün varsa HATA fırlatır (sessizce 0
 *     sayılmaz — ÇALIŞMA KURALLARI: oranlar koda gömülmez/varsayılmaz).
 *   - odeme_tipi='metraj'/'goturu': şef onaylı metraj kayıtları × sözleşme
 *     kalemi birim fiyatı. Puantaj bu hesaba GİRMEZ (görev metni).
 */
export function hesapla(donemId, aktor) {
  const donem = stmtGet.get(donemId);
  if (!donem) throw new Error('Ödeme dönemi bulunamadı');
  const ekipKaydi = ekip.getir(donem.ekip_id);
  let brut = 0;

  if (ekipKaydi.odeme_tipi === 'yevmiye' || ekipKaydi.odeme_tipi === 'karma') {
    const carpanBayram = bayramPazarCarpani();
    const carpanMesai = fazlaMesaiCarpani();
    for (const uye of ekip.ekipUyeleriGetir(ekipKaydi.id)) {
      for (const kayit of cekirdekPuantaj.kisiAraligiListele(uye.kisi_id, donem.donem_baslangic, donem.donem_bitis)) {
        const yevmiye = ekip.yevmiyeGetir(uye.id, kayit.tarih);
        if (!yevmiye) throw new Error(`${uye.id} numaralı ekip üyesi için ${kayit.tarih} tarihinde GEÇERLİ bir yevmiye tanımlı değil — hesaplama durduruldu.`);
        const gunlukTutar = Math.round(kayit.gun_degeri * yevmiye.yevmiye_kurus * (kayit.bayram_pazar_mi ? carpanBayram : 1));
        const mesaiTutari = Math.round((kayit.fazla_mesai_saat || 0) * (yevmiye.yevmiye_kurus / 8) * carpanMesai);
        brut += gunlukTutar + mesaiTutari;
      }
    }
  }
  if (ekipKaydi.odeme_tipi === 'metraj' || ekipKaydi.odeme_tipi === 'goturu') {
    for (const m of metraj.ekipIcinListele(ekipKaydi.id)) {
      if (!m.sef_onayli_mi || m.tarih < donem.donem_baslangic || m.tarih > donem.donem_bitis) continue;
      const kalem = sozlesme.kalemGetir(m.sozlesme_kalem_id);
      if (kalem) brut += Math.round(m.sef_onay_miktar * kalem.birim_fiyat_kurus);
    }
  }

  const kesintilerToplami = stmtKesintiListele.all(donemId).reduce((t, k) => t + k.tutar_kurus, 0);
  stmtTutarlariGuncelle.run(brut, kesintilerToplami, brut - kesintilerToplami, donemId);
  audit.kaydet('odeme_donemi', donemId, 'GUNCELLE', aktor, { brut_tutar_kurus: brut, kesintiler_toplam_kurus: kesintilerToplami });
  return stmtGet.get(donemId);
}

export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Ödeme dönemi bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('odeme_donemi', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  if (yeniDurum === 'kapandi') taahhutuIsle(stmtGet.get(id), aktor);
  return stmtGet.get(id);
}

/** Kapanınca: yevmiye tipi için HER puantaj kaydı, metraj tipi için HER metraj kaydı kendi WBS'inin 'iscilik_taseron' maliyet koduna GERÇEKLEŞEN yazar. Tek seferlik. */
function taahhutuIsle(donem, aktor) {
  if (donem.taahhut_dusuldu_mu) return;
  const ekipKaydi = ekip.getir(donem.ekip_id);

  function maliyetKoduBulYadaOlustur(wbsGorevId) {
    let mk = maliyetKodu.wbsIcinListele(wbsGorevId).find((x) => x.kaynak_tipi === 'iscilik_taseron');
    if (!mk) mk = maliyetKodu.olustur({ proje_id: donem.proje_id, wbs_gorev_id: wbsGorevId, kaynak_tipi: 'iscilik_taseron' }, aktor);
    return mk;
  }

  if (ekipKaydi.odeme_tipi === 'yevmiye' || ekipKaydi.odeme_tipi === 'karma') {
    const carpanBayram = bayramPazarCarpani();
    const carpanMesai = fazlaMesaiCarpani();
    for (const uye of ekip.ekipUyeleriGetir(ekipKaydi.id)) {
      for (const kayit of cekirdekPuantaj.kisiAraligiListele(uye.kisi_id, donem.donem_baslangic, donem.donem_bitis)) {
        if (!kayit.maliyet_kodu_id) continue; // WBS'siz puantaj maliyete bağlanamaz — atlanır
        const yevmiye = ekip.yevmiyeGetir(uye.id, kayit.tarih);
        if (!yevmiye) continue;
        // hesapla()'daki İLE AYNI formül — GERÇEKLEŞEN, brüt hesaptan SAPMAMALI (fazla mesai dahil).
        const gunlukTutar = Math.round(kayit.gun_degeri * yevmiye.yevmiye_kurus * (kayit.bayram_pazar_mi ? carpanBayram : 1));
        const mesaiTutari = Math.round((kayit.fazla_mesai_saat || 0) * (yevmiye.yevmiye_kurus / 8) * carpanMesai);
        const tutar = gunlukTutar + mesaiTutari;
        if (!tutar) continue;
        maliyetDefteri.yaz({
          proje_id: donem.proje_id, maliyet_kodu_id: kayit.maliyet_kodu_id, tur: 'GERCEKLESEN', tutar_kurus: tutar,
          tarih: kayit.tarih, kaynak_modul: 'taseron_odeme_donemi', kaynak_id: `${donem.id}:puantaj-${kayit.id}`,
          notes: `Ödeme dönemi ${donem.numara}`,
        }, aktor);
      }
    }
  }
  if (ekipKaydi.odeme_tipi === 'metraj' || ekipKaydi.odeme_tipi === 'goturu') {
    for (const m of metraj.ekipIcinListele(ekipKaydi.id)) {
      if (!m.sef_onayli_mi || m.tarih < donem.donem_baslangic || m.tarih > donem.donem_bitis) continue;
      const kalem = sozlesme.kalemGetir(m.sozlesme_kalem_id);
      if (!kalem?.wbs_gorev_id) continue;
      const mk = maliyetKoduBulYadaOlustur(kalem.wbs_gorev_id);
      maliyetDefteri.yaz({
        proje_id: donem.proje_id, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: Math.round(m.sef_onay_miktar * kalem.birim_fiyat_kurus),
        tarih: m.tarih, kaynak_modul: 'taseron_odeme_donemi', kaynak_id: `${donem.id}:metraj-${m.id}`, notes: `Ödeme dönemi ${donem.numara}`,
      }, aktor);
    }
  }
  stmtTaahhutIsaretle.run(donem.id);
}

/**
 * Net tutar üzerinden Çekirdek Ödeme Talimatı oluşturur. SINIRLAMA: Çekirdek
 * odeme_talimati şu an yalnızca firma_id (cari_firma) kabul eder — sözleşme
 * GERÇEK KİŞİ (taraf_kisi_id) ile yapılmışsa (görev metni: "çoğu zaman
 * şahıs") ödeme talimatı OLUŞTURULAMAZ; bu P1'in mevcut bir sınırlamasıdır
 * (bkz. CAKISMA_HARITASI.md P6 Uygulama Durumu).
 */
export function odemeTalimatiOlustur(donemId, vadeTarihi, aktor) {
  const d = stmtGet.get(donemId);
  if (!d) throw new Error('Ödeme dönemi bulunamadı');
  if (d.durum !== 'kapandi') throw new Error(`Ödeme talimatı yalnızca "kapandi" durumundaki dönemler için oluşturulabilir (şu an: ${d.durum}).`);
  if (d.odeme_talimati_olusturuldu_mu) throw new Error('Bu dönem için zaten bir ödeme talimatı oluşturulmuş.');
  const ekipKaydi = ekip.getir(d.ekip_id);
  const sozlesmeKaydi = sozlesme.getir(ekipKaydi.sozlesme_id);
  if (!sozlesmeKaydi.taraf_firma_id) {
    throw new Error('Bu sözleşmenin tarafı bir Firma değil (muhtemelen gerçek kişi) — Çekirdek Ödeme Talimatı şu an yalnızca Firma\'ya (cari_firma) ödeme destekler.');
  }
  const kesintiler = stmtKesintiListele.all(donemId);
  const talimat = odeme.talimatOlustur({
    proje_id: d.proje_id, firma_id: sozlesmeKaydi.taraf_firma_id, aciklama: `Taşeron ödeme dönemi ${d.numara} (${sozlesmeKaydi.numara})`,
    kaynak_belge_modul: 'taseron_odeme_donemi', kaynak_belge_id: String(donemId), vade_tarihi: vadeTarihi,
    tutar_kurus: d.net_tutar_kurus, para_birimi: d.para_birimi, kesintiler_kurus: d.kesintiler_toplam_kurus,
    kesintiler: kesintiler.map((k) => ({ parametre_kodu: k.tur, tutar_kurus: k.tutar_kurus })),
  }, aktor);
  stmtOdemeTalimatiIsaretle.run(donemId);
  audit.kaydet('odeme_donemi', donemId, 'GUNCELLE', aktor, { odeme_talimati_id: talimat.id });
  return talimat;
}

export function tutarlariYenidenHesapla(donemId) {
  return hesapla(donemId);
}
