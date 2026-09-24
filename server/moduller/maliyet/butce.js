// Bütçe — versiyonlu (İlk Bütçe, Revize-1, ...). Bütçe keşif/metrajdan çıkar
// (WBS × maliyet kodu) ve yüksek enflasyonda sık revize edilir; her rapor
// hangi versiyona göre olduğunu gösterir. ONAYLANAN versiyon Maliyet
// Defteri'ne BUTCE olarak yazılır — yalnızca bir önceki onaylı versiyona
// göre FARK (delta) yazılır; böylece defterdeki BUTCE toplamı her zaman
// GÜNCEL bütçeye eşittir (mutabakat bunu denetler).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import { listRecords } from '../../db.js';
import { csvSatirlari, xlsxSatirlari, sayiCoz } from './tabloOku.js';

const stmtVerInsert = db.prepare('INSERT INTO butce_versiyon (proje_id, versiyon_no, ad, notes, olusturan) VALUES (?, ?, ?, ?, ?)');
const stmtVerGet = db.prepare('SELECT * FROM butce_versiyon WHERE id = ?');
const stmtVerListe = db.prepare('SELECT * FROM butce_versiyon WHERE proje_id = ? ORDER BY versiyon_no');
const stmtMaxNo = db.prepare('SELECT COALESCE(MAX(versiyon_no), 0) AS n FROM butce_versiyon WHERE proje_id = ?');
const stmtTaslak = db.prepare("SELECT * FROM butce_versiyon WHERE proje_id = ? AND durum = 'taslak'");
const stmtOnayli = db.prepare("SELECT * FROM butce_versiyon WHERE proje_id = ? AND durum = 'onayli' ORDER BY versiyon_no DESC LIMIT 1");
const stmtDurum = db.prepare('UPDATE butce_versiyon SET durum = ?, onaylayan = ?, onay_tarihi = ? WHERE id = ?');
const stmtSatirUpsert = db.prepare(
  `INSERT INTO butce_satir (versiyon_id, maliyet_kodu_id, tutar_kurus, para_birimi, kur, kalan_tahmin_kurus, notes)
   VALUES (@versiyon_id, @maliyet_kodu_id, @tutar_kurus, @para_birimi, @kur, @kalan_tahmin_kurus, @notes)
   ON CONFLICT(versiyon_id, maliyet_kodu_id) DO UPDATE SET tutar_kurus=excluded.tutar_kurus, para_birimi=excluded.para_birimi, kur=excluded.kur,
     kalan_tahmin_kurus=excluded.kalan_tahmin_kurus, notes=excluded.notes`
);
const stmtSatirlar = db.prepare('SELECT * FROM butce_satir WHERE versiyon_id = ? ORDER BY maliyet_kodu_id');
const stmtSatirSil = db.prepare('DELETE FROM butce_satir WHERE versiyon_id = ? AND maliyet_kodu_id = ?');

export const tlDegeri = (s) => Math.round(s.tutar_kurus * (s.kur || 1));

export function versiyonlariListele(projeId) { return stmtVerListe.all(projeId); }
export function versiyonGetir(id) { return stmtVerGet.get(id); }
export function guncelVersiyon(projeId) { return stmtOnayli.get(projeId) || null; }
export function satirlariGetir(versiyonId) { return stmtSatirlar.all(versiyonId); }

/** Yeni taslak versiyon. Onaylı bir versiyon varsa satırları ondan KOPYALANIR (revize akışı). Aynı anda tek taslak. */
export function versiyonOlustur(projeId, { ad, notes, kopyala = true } = {}, aktor) {
  if (stmtTaslak.get(projeId)) throw new Error('Bu proje için zaten açık bir taslak bütçe versiyonu var — onaylayın veya satırlarını düzenleyin.');
  const no = stmtMaxNo.get(projeId).n + 1;
  const info = stmtVerInsert.run(projeId, no, ad || (no === 1 ? 'İlk Bütçe' : `Revize-${no - 1}`), notes ?? null, aktor ?? null);
  const id = info.lastInsertRowid;
  const onceki = stmtOnayli.get(projeId);
  if (kopyala && onceki) for (const s of stmtSatirlar.all(onceki.id)) { const { id: _i, ...kopya } = s; stmtSatirUpsert.run({ ...kopya, versiyon_id: id }); }
  audit.kaydet('butce_versiyon', id, 'OLUSTUR', aktor, { proje_id: projeId, versiyon_no: no, kaynak: onceki?.id ?? null });
  return stmtVerGet.get(id);
}

function taslakKontrol(versiyonId) {
  const v = stmtVerGet.get(versiyonId);
  if (!v) throw new Error('Bütçe versiyonu bulunamadı');
  if (v.durum !== 'taslak') throw new Error(`Yalnızca "taslak" versiyon düzenlenir (şu an: ${v.durum}) — değişiklik için yeni revizyon açın.`);
  return v;
}

/** @param {{maliyet_kodu_id, tutar_kurus, para_birimi?, kur?, kalan_tahmin_kurus?, notes?}} s */
export function satirKaydet(versiyonId, s, aktor) {
  const v = taslakKontrol(versiyonId);
  if (!maliyetKodu.listele(v.proje_id).some((k) => k.id === Number(s.maliyet_kodu_id))) throw new Error('Maliyet kodu bu projeye ait değil.');
  if (!Number.isInteger(s.tutar_kurus) || s.tutar_kurus < 0) throw new Error('tutar_kurus negatif olmayan tam sayı (kuruş) olmalıdır.');
  const row = {
    versiyon_id: versiyonId, maliyet_kodu_id: Number(s.maliyet_kodu_id), tutar_kurus: s.tutar_kurus, para_birimi: s.para_birimi || 'TRY',
    kur: s.kur ?? 1, kalan_tahmin_kurus: s.kalan_tahmin_kurus ?? null, notes: s.notes ?? null,
  };
  if (row.para_birimi === 'TRY') row.kur = 1;
  stmtSatirUpsert.run(row);
  audit.kaydet('butce_satir', `${versiyonId}:${row.maliyet_kodu_id}`, 'GUNCELLE', aktor, { yeni: row });
  return row;
}
export function satirSil(versiyonId, maliyetKoduId, aktor) {
  taslakKontrol(versiyonId);
  stmtSatirSil.run(versiyonId, Number(maliyetKoduId));
  audit.kaydet('butce_satir', `${versiyonId}:${maliyetKoduId}`, 'IPTAL', aktor, null);
}

/** Onay: önceki onaylı arşivlenir; BUTCE deftere FARK olarak yazılır. */
export function onayla(versiyonId, onaylayan, aktor) {
  const v = taslakKontrol(versiyonId);
  if (!onaylayan) throw new Error('Bütçe onayı için onaylayan zorunludur.');
  const yeni = new Map(stmtSatirlar.all(versiyonId).map((s) => [s.maliyet_kodu_id, tlDegeri(s)]));
  if (yeni.size === 0) throw new Error('Satırsız bütçe onaylanamaz.');
  const onceki = stmtOnayli.get(v.proje_id);
  const eski = new Map(onceki ? stmtSatirlar.all(onceki.id).map((s) => [s.maliyet_kodu_id, tlDegeri(s)]) : []);
  const tarih = new Date().toISOString().slice(0, 10);
  db.exec('BEGIN');
  try {
    for (const kod of new Set([...yeni.keys(), ...eski.keys()])) {
      const fark = (yeni.get(kod) ?? 0) - (eski.get(kod) ?? 0);
      if (fark === 0) continue;
      maliyetDefteri.yaz({
        proje_id: v.proje_id, maliyet_kodu_id: kod, tur: 'BUTCE', tutar_kurus: fark, para_birimi: 'TRY', kur: 1, tarih,
        kaynak_modul: 'butce_versiyon', kaynak_id: `${versiyonId}:${kod}`, notes: `${v.ad} (v${v.versiyon_no})${onceki ? ` — v${onceki.versiyon_no}'e göre fark` : ''}`,
      }, aktor);
    }
    if (onceki) stmtDurum.run('arsivlendi', onceki.onaylayan, onceki.onay_tarihi, onceki.id);
    stmtDurum.run('onayli', onaylayan, tarih, versiyonId);
    audit.kaydet('butce_versiyon', versiyonId, 'GUNCELLE', aktor, { durum: ['taslak', 'onayli'], onaylayan });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return stmtVerGet.get(versiyonId);
}

// ---------- İçe aktarım (CSV / Excel) ----------
const BASLIK_ESLEME = {
  kod: 'kod', maliyet_kodu: 'kod', wbs: 'wbs', wbs_kodu: 'wbs', wbs_code: 'wbs', kaynak: 'kaynak', kaynak_tipi: 'kaynak',
  tutar: 'tutar', butce: 'tutar', tutar_tl: 'tutar', para_birimi: 'pb', pb: 'pb', kur: 'kur', kalan_tahmin: 'tahmin', kalan_tahmin_tl: 'tahmin',
};
const norm = (s) => String(s).toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function satirlariIsle(versiyonId, tablo, aktor) {
  const v = taslakKontrol(versiyonId);
  if (tablo.length < 2) throw new Error('Başlık satırı ve en az bir veri satırı gereklidir.');
  const kolon = {};
  tablo[0].forEach((b, i) => { const k = BASLIK_ESLEME[norm(b)]; if (k) kolon[k] = i; });
  if (kolon.tutar === undefined || (kolon.kod === undefined && (kolon.wbs === undefined || kolon.kaynak === undefined))) {
    throw new Error('Başlıklar: "kod" (veya "wbs" + "kaynak_tipi") ve "tutar" zorunludur; ops.: para_birimi, kur, kalan_tahmin.');
  }
  const kodlar = maliyetKodu.listele(v.proje_id);
  const wbsKayitlari = listRecords('tb_wbs_gorevler');
  let eklenen = 0; const hatalar = [];
  tablo.slice(1).forEach((h, i) => {
    const satirNo = i + 2;
    try {
      let mk;
      if (kolon.kod !== undefined && h[kolon.kod]) mk = kodlar.find((k) => k.kod === String(h[kolon.kod]).trim());
      else {
        const wbs = wbsKayitlari.find((w) => String(w.wbs_code) === String(h[kolon.wbs]).trim());
        const kaynak = norm(h[kolon.kaynak]);
        if (wbs) {
          mk = kodlar.find((k) => k.wbs_gorev_id === String(wbs.id) && k.kaynak_tipi === kaynak);
          if (!mk) { mk = maliyetKodu.olustur({ proje_id: v.proje_id, wbs_gorev_id: wbs.id, kaynak_tipi: kaynak }, aktor); kodlar.push(mk); }
        }
      }
      if (!mk) throw new Error('Maliyet kodu/WBS bulunamadı');
      const tutar = sayiCoz(h[kolon.tutar]);
      if (!Number.isFinite(tutar) || tutar < 0) throw new Error('Tutar geçersiz');
      const pb = (kolon.pb !== undefined && h[kolon.pb] ? String(h[kolon.pb]).trim().toUpperCase() : 'TRY');
      const kur = kolon.kur !== undefined && h[kolon.kur] ? sayiCoz(h[kolon.kur]) : 1;
      if (!Number.isFinite(kur) || kur <= 0) throw new Error('Kur geçersiz');
      const tahmin = kolon.tahmin !== undefined && h[kolon.tahmin] ? Math.round(sayiCoz(h[kolon.tahmin]) * 100) : undefined;
      satirKaydet(versiyonId, { maliyet_kodu_id: mk.id, tutar_kurus: Math.round(tutar * 100), para_birimi: pb, kur, kalan_tahmin_kurus: tahmin }, aktor);
      eklenen += 1;
    } catch (err) { hatalar.push({ satir: satirNo, hata: String(err.message || err) }); }
  });
  return { eklenen, hatalar };
}
export const csvIceAktar = (versiyonId, metin, aktor) => satirlariIsle(versiyonId, csvSatirlari(metin), aktor);
export async function xlsxIceAktar(versiyonId, base64, aktor) { return satirlariIsle(versiyonId, await xlsxSatirlari(base64), aktor); }
