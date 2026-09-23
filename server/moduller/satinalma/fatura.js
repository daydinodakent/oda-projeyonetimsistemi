// Fatura — kaydedilince MALİYET KURALI uygulanır (bkz. db.js başı):
// stoklu OLMAYAN kalemler için GERÇEKLEŞEN burada yazılır; stoklu kalemler
// için YAZILMAZ (P4 Depo çıkışında yazacak — mükerrer sayım burada
// bilinçli olarak ÖNLENİR). Ardından 3'lü eşleştirme (eslestir) ve
// eşleşince Çekirdek'in Ödeme Talimatı servisi çağrılır.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as odeme from '../_cekirdek/odeme.js';
import * as siparis from './siparis.js';
import * as malzeme from '../depo/malzeme.js';

const VARSAYILAN_TOLERANS_YUZDE = 2;

const stmtInsert = db.prepare(
  `INSERT INTO satinalma_fatura (siparis_id, firma_id, fatura_no, fatura_tarihi, vade_tarihi, para_birimi, kur, kur_tarihi, tutar_kurus, kdv_tutari_kurus, tevkifat_orani, tevkifat_tutari_kurus, genel_toplam_kurus, notes, olusturan)
   VALUES (@siparis_id, @firma_id, @fatura_no, @fatura_tarihi, @vade_tarihi, @para_birimi, @kur, @kur_tarihi, @tutar_kurus, @kdv_tutari_kurus, @tevkifat_orani, @tevkifat_tutari_kurus, @genel_toplam_kurus, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satinalma_fatura WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM satinalma_fatura WHERE siparis_id = ? AND row_status = 1 ORDER BY fatura_tarihi DESC');
const stmtDurumGuncelle = db.prepare("UPDATE satinalma_fatura SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const stmtKalemInsert = db.prepare(
  `INSERT INTO satinalma_fatura_kalem (fatura_id, siparis_kalem_id, aciklama, miktar, birim_fiyat_kurus, kdv_orani, olusturan)
   VALUES (@fatura_id, @siparis_kalem_id, @aciklama, @miktar, @birim_fiyat_kurus, @kdv_orani, @olusturan)`
);
const stmtKalemListele = db.prepare('SELECT * FROM satinalma_fatura_kalem WHERE fatura_id = ? AND row_status = 1');
const stmtSiparisKalemFaturaEkle = db.prepare('UPDATE satinalma_siparis_kalem SET faturalanan_miktar = faturalanan_miktar + ? WHERE id = ?');

const stmtIstisnaSil = db.prepare('DELETE FROM satinalma_eslesme_istisna WHERE fatura_id = ?');
const stmtIstisnaEkle = db.prepare('INSERT INTO satinalma_eslesme_istisna (fatura_id, fatura_kalem_id, tur, detay) VALUES (?, ?, ?, ?)');
const stmtIstisnaListele = db.prepare('SELECT * FROM satinalma_eslesme_istisna WHERE fatura_id = ? ORDER BY id');

export function getir(id) {
  return stmtGet.get(id);
}

export function siparisIcinListele(siparisId) {
  return stmtList.all(siparisId);
}

export function kalemleriGetir(faturaId) {
  return stmtKalemListele.all(faturaId);
}

/**
 * @param {{siparis_id, firma_id, fatura_no, fatura_tarihi, vade_tarihi, para_birimi?, kur?, kur_tarihi?, tevkifat_orani?, kalemler: {siparis_kalem_id?, aciklama?, miktar, birim_fiyat_kurus, kdv_orani?}[]}} item
 * tevkifat_orani ÇAĞIRANDAN gelir — parametre tablosundan (Çekirdek) okunmuş
 * olmalıdır; burada koda GÖMÜLMEZ (ÇALIŞMA KURALLARI).
 */
export function kaydet(item, aktor) {
  const siparisKaydi = siparis.getir(item.siparis_id);
  if (!siparisKaydi) throw new Error('Sipariş bulunamadı');
  if (!cariFirma.getir(item.firma_id)) throw new Error(`Firma bulunamadı: ${item.firma_id}`);
  if (!item.kalemler || !item.kalemler.length) throw new Error('En az bir fatura kalemi gereklidir.');
  for (const k of item.kalemler) {
    if (!Number.isInteger(k.birim_fiyat_kurus)) throw new Error('birim_fiyat_kurus tam sayı (kuruş) olmalıdır.');
  }

  const tutarKurus = item.kalemler.reduce((t, k) => t + Math.round(k.birim_fiyat_kurus * k.miktar), 0);
  const kdvTutariKurus = item.kalemler.reduce((t, k) => t + Math.round(k.birim_fiyat_kurus * k.miktar * (k.kdv_orani ?? 20) / 100), 0);
  const tevkifatOrani = item.tevkifat_orani ?? 0;
  const tevkifatTutariKurus = Math.round(kdvTutariKurus * tevkifatOrani / 100);
  const genelToplamKurus = tutarKurus + kdvTutariKurus - tevkifatTutariKurus;

  const row = {
    siparis_id: item.siparis_id, firma_id: item.firma_id, fatura_no: item.fatura_no, fatura_tarihi: item.fatura_tarihi,
    vade_tarihi: item.vade_tarihi, para_birimi: item.para_birimi || siparisKaydi.para_birimi, kur: item.kur ?? siparisKaydi.kur,
    kur_tarihi: item.kur_tarihi ?? item.fatura_tarihi, tutar_kurus: tutarKurus, kdv_tutari_kurus: kdvTutariKurus,
    tevkifat_orani: tevkifatOrani, tevkifat_tutari_kurus: tevkifatTutariKurus, genel_toplam_kurus: genelToplamKurus,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error(`Bu firmadan bu fatura numarası (${item.fatura_no}) zaten kayıtlı — mükerrer fatura girişi engellendi.`);
    throw err;
  }
  const faturaId = info.lastInsertRowid;

  for (const k of item.kalemler) {
    const kalemRow = { fatura_id: faturaId, siparis_kalem_id: k.siparis_kalem_id ?? null, aciklama: k.aciklama ?? null, miktar: k.miktar, birim_fiyat_kurus: k.birim_fiyat_kurus, kdv_orani: k.kdv_orani ?? 20, olusturan: aktor ?? null };
    const kalemInfo = stmtKalemInsert.run(kalemRow);

    if (k.siparis_kalem_id) {
      stmtSiparisKalemFaturaEkle.run(k.miktar, k.siparis_kalem_id);
      const siparisKalemi = siparis.kalemGetir(k.siparis_kalem_id);
      const malzemeKaydi = siparisKalemi.malzeme_id ? malzeme.getir(siparisKalemi.malzeme_id) : null;
      const stoklu = malzemeKaydi ? malzemeKaydi.stoklu_mu === 1 : false; // malzeme_id yoksa (hizmet/nakliye) stoklu SAYILMAZ — GERÇEKLEŞEN burada yazılır
      if (!stoklu) {
        maliyetDefteri.yaz({
          proje_id: siparisKaydi.proje_id, maliyet_kodu_id: siparisKaydi.maliyet_kodu_id ?? undefined, tur: 'GERCEKLESEN',
          tutar_kurus: Math.round(k.birim_fiyat_kurus * k.miktar), para_birimi: row.para_birimi, kur: row.kur, kur_tarihi: row.kur_tarihi,
          tarih: item.fatura_tarihi, kaynak_modul: 'satinalma_fatura', kaynak_id: `${faturaId}:kalem-${kalemInfo.lastInsertRowid}`,
          notes: `Fatura ${item.fatura_no} — ${stoklu ? 'stoklu (YAZILMADI)' : 'doğrudan sarf/hizmet'}`,
        }, aktor);
      }
      // stoklu === true: BİLİNÇLİ OLARAK YAZILMAZ — bkz. db.js başı MALİYET KURALI (P4 Depo çıkışında yazacak).
    }
  }

  audit.kaydet('satinalma_fatura', faturaId, 'OLUSTUR', aktor, { yeni: row, kalemSayisi: item.kalemler.length });
  return stmtGet.get(faturaId);
}

/**
 * 3'lü eşleştirme (sipariş ↔ mal kabul/teslim edilen miktar ↔ fatura).
 * Tolerans PARAMETRİK (Çekirdek 'satinalma_eslesme_tolerans_yuzde'),
 * tanımlı değilse %2 varsayılana düşer. Yeniden-çalıştırılabilir: önceki
 * istisna kayıtları silinip taze hesaplanır (bunlar bir muhasebe kaydı
 * DEĞİL, yeniden hesaplanabilir bir tanı/uyarı listesidir).
 */
export function eslestir(faturaId, aktor) {
  const fatura = stmtGet.get(faturaId);
  if (!fatura) throw new Error('Fatura bulunamadı');
  const tolerans = parametre.degerAl('satinalma_eslesme_tolerans_yuzde')?.deger ?? VARSAYILAN_TOLERANS_YUZDE;

  stmtIstisnaSil.run(faturaId);
  const istisnalar = [];
  for (const fk of stmtKalemListele.all(faturaId)) {
    if (!fk.siparis_kalem_id) {
      istisnalar.push({ fatura_kalem_id: fk.id, tur: 'siparis_bulunamadi', detay: {} });
      continue;
    }
    const sk = siparis.kalemGetir(fk.siparis_kalem_id);
    const fiyatSapmaYuzde = sk.birim_fiyat_kurus ? Math.abs(fk.birim_fiyat_kurus - sk.birim_fiyat_kurus) / sk.birim_fiyat_kurus * 100 : 0;
    if (fiyatSapmaYuzde > tolerans) {
      istisnalar.push({ fatura_kalem_id: fk.id, tur: 'fiyat_sapmasi', detay: { siparisBirimFiyatKurus: sk.birim_fiyat_kurus, faturaBirimFiyatKurus: fk.birim_fiyat_kurus, sapmaYuzdesi: Number(fiyatSapmaYuzde.toFixed(2)), toleransYuzdesi: tolerans } });
    }
    if (sk.faturalanan_miktar > sk.teslim_edilen_miktar) {
      istisnalar.push({ fatura_kalem_id: fk.id, tur: 'miktar_asimi', detay: { faturalananMiktar: sk.faturalanan_miktar, teslimAlinanMiktar: sk.teslim_edilen_miktar } });
    } else if (sk.teslim_edilen_miktar === 0) {
      istisnalar.push({ fatura_kalem_id: fk.id, tur: 'teslim_alinmamis', detay: { siparisMiktar: sk.miktar } });
    }
  }
  for (const i of istisnalar) stmtIstisnaEkle.run(faturaId, i.fatura_kalem_id, i.tur, JSON.stringify(i.detay));

  const yeniDurum = istisnalar.length ? 'eslesme_istisna' : 'eslestirildi';
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, faturaId);
  audit.kaydet('satinalma_fatura', faturaId, 'GUNCELLE', aktor, { durum: yeniDurum, istisnaSayisi: istisnalar.length });
  return { durum: yeniDurum, istisnalar: stmtIstisnaListele.all(faturaId).map((i) => ({ ...i, detay: i.detay ? JSON.parse(i.detay) : null })) };
}

export function istisnalariGetir(faturaId) {
  return stmtIstisnaListele.all(faturaId).map((i) => ({ ...i, detay: i.detay ? JSON.parse(i.detay) : null }));
}

/** Yalnızca istisnasız ("eslestirildi") bir fatura için Çekirdek'in Ödeme Talimatı servisi çağrılır. */
export function odemeTalimatiOlustur(faturaId, aktor) {
  const fatura = stmtGet.get(faturaId);
  if (!fatura) throw new Error('Fatura bulunamadı');
  if (fatura.durum !== 'eslestirildi') throw new Error(`Ödeme talimatı yalnızca "eslestirildi" durumundaki faturalar için oluşturulabilir (şu an: ${fatura.durum}). Önce eslestir() çalıştırın.`);
  const siparisKaydi = siparis.getir(fatura.siparis_id);
  const talimat = odeme.talimatOlustur({
    proje_id: siparisKaydi.proje_id, firma_id: fatura.firma_id, aciklama: `Satın alma faturası ${fatura.fatura_no}`,
    kaynak_belge_modul: 'satinalma_fatura', kaynak_belge_id: String(faturaId), vade_tarihi: fatura.vade_tarihi,
    tutar_kurus: fatura.genel_toplam_kurus, para_birimi: fatura.para_birimi,
    kesintiler_kurus: fatura.tevkifat_tutari_kurus,
    kesintiler: fatura.tevkifat_tutari_kurus ? [{ parametre_kodu: 'tevkifat', tutar_kurus: fatura.tevkifat_tutari_kurus }] : null,
  }, aktor);
  stmtDurumGuncelle.run('odeme_talimati_olusturuldu', aktor ?? null, faturaId);
  audit.kaydet('satinalma_fatura', faturaId, 'GUNCELLE', aktor, { durum: 'odeme_talimati_olusturuldu', odeme_talimati_id: talimat.id });
  return talimat;
}
