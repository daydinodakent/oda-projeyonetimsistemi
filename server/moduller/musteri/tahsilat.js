// Tahsilat — Çekirdek `tahsilat` (yön: gelen) üzerine ince Müşteri katmanı:
// aktif plana dağıtım (kapama sırası PARAMETRİK: en eski vadeden) +
// Maliyet Defteri GELİR (kaynak_modul='musteri_tahsilat'; P2 taahhüdü
// kaynak_modul='sozlesme'dir — Maliyet Defteri'nde tek 'GELIR' türü var,
// taahhüt/gerçekleşen ayrımı kaynak_modul ile yapılır). Döviz kuru ve endeks
// farkları AYRI satırlardır (kaynak_id ':kur_farki' / ':endeks_farki').
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as odeme from '../_cekirdek/odeme.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as odemePlani from './odemePlani.js';

const stmtSatis = db.prepare('SELECT * FROM satis WHERE id = ? AND row_status = 1');
const stmtMusteriler = db.prepare('SELECT * FROM satis_musteri WHERE satis_id = ? ORDER BY id LIMIT 1');

/**
 * @param {{satis_id, tutar_kurus, tarih, kur?, kur_tarihi?, yontem?, referans_no?, taksit_id?, endeks_farki_kurus?, notes?}} item
 * tutar_kurus SATIŞIN para biriminde; kur = tahsilat günü TRY kuru (TRY satışta 1).
 */
export function kaydet(item, aktor) {
  const s = stmtSatis.get(item.satis_id);
  if (!s) throw new Error('Satış bulunamadı');
  if (s.durum !== 'onayli') throw new Error('Tahsilat yalnızca ONAYLI satışlar için kaydedilir.');
  const plan = odemePlani.planGetir(item.satis_id);
  if (!plan) throw new Error('Aktif ödeme planı yok.');
  if (!Number.isInteger(item.tutar_kurus) || item.tutar_kurus <= 0) throw new Error('tutar_kurus pozitif tam sayı (kuruş) olmalıdır.');
  const mevcut = odeme.tahsilatIstemciIdIleGetir(item.istemci_kayit_id);
  if (mevcut) return { tahsilat: mevcut, dagilim: odemePlani.tahsilatDagilimi(mevcut.id), tekrarGonderim: true };
  const kur = item.kur ?? (s.para_birimi === 'TRY' ? 1 : s.kur);
  const m = stmtMusteriler.get(item.satis_id);

  db.exec('BEGIN');
  try {
    const t = odeme.tahsilatKaydet({
      proje_id: s.proje_id, kaynak_modul: 'musteri_satis', kaynak_id: item.satis_id, kisi_id: m?.kisi_id, firma_id: m?.firma_id,
      tutar_kurus: item.tutar_kurus, para_birimi: s.para_birimi, kur, kur_tarihi: item.kur_tarihi || item.tarih, tarih: item.tarih,
      yontem: item.yontem, referans_no: item.referans_no, istemci_kayit_id: item.istemci_kayit_id, notes: item.notes,
    }, aktor);
    const dagilim = odemePlani.dagit(t.id, item.tutar_kurus, plan.plan, item.tarih, { taksitId: item.taksit_id });
    maliyetDefteri.yaz({
      proje_id: s.proje_id, tur: 'GELIR', tutar_kurus: item.tutar_kurus, para_birimi: s.para_birimi, kur, kur_tarihi: t.kur_tarihi, tarih: item.tarih,
      kaynak_modul: 'musteri_tahsilat', kaynak_id: String(t.id), notes: `Satış #${s.id} tahsilatı`,
    }, aktor);
    if (s.para_birimi !== 'TRY' && kur !== s.kur) {
      const fark = Math.round(item.tutar_kurus * (kur - s.kur));
      if (fark !== 0) maliyetDefteri.yaz({
        proje_id: s.proje_id, tur: 'GELIR', tutar_kurus: fark, para_birimi: 'TRY', kur: 1, kur_tarihi: t.kur_tarihi, tarih: item.tarih,
        kaynak_modul: 'musteri_tahsilat', kaynak_id: `${t.id}:kur_farki`, notes: `Kur farkı (satış kuru ${s.kur} → tahsilat kuru ${kur})`,
      }, aktor);
    }
    if (item.endeks_farki_kurus) {
      if (!Number.isInteger(item.endeks_farki_kurus)) throw new Error('endeks_farki_kurus tam sayı (kuruş) olmalıdır.');
      maliyetDefteri.yaz({
        proje_id: s.proje_id, tur: 'GELIR', tutar_kurus: item.endeks_farki_kurus, para_birimi: 'TRY', kur: 1, kur_tarihi: t.kur_tarihi, tarih: item.tarih,
        kaynak_modul: 'musteri_tahsilat', kaynak_id: `${t.id}:endeks_farki`, notes: 'Endeks farkı',
      }, aktor);
    }
    audit.kaydet('musteri_tahsilat', t.id, 'OLUSTUR', aktor, { satis_id: s.id, dagilim });
    db.exec('COMMIT');
    return { tahsilat: t, dagilim, tekrarGonderim: false };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function satisIcinListele(satisId) {
  return odeme.tahsilatlariKaynagaGore('musteri_satis', satisId).map((t) => ({ ...t, dagilim: odemePlani.tahsilatDagilimi(t.id) }));
}

/** Toplam tahsil edilen (satış para biriminde) ve % — teslim şartı ve kart için. */
export function odemeOzeti(satisId) {
  const s = stmtSatis.get(satisId);
  if (!s) throw new Error('Satış bulunamadı');
  const toplam = odeme.tahsilatlariKaynagaGore('musteri_satis', satisId).reduce((t, x) => t + x.tutar_kurus, 0);
  return { satis_id: satisId, tutar_kurus: s.tutar_kurus, tahsil_edilen_kurus: toplam, kalan_kurus: s.tutar_kurus - toplam, yuzde: Number(((toplam / s.tutar_kurus) * 100).toFixed(2)) };
}
