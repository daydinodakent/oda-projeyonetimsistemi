// İş Programı — Excel/MS Project'ten içe aktarım (CSV) + plan vs gerçekleşen.
// "Tek doğru: şantiye onaylı ilerleme" — P5 alt yüklenici ilerleme kayıtlarıyla
// çelişki UYARI olarak raporlanır; P5 verisi buradan DEĞİŞTİRİLMEZ.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as ilerleme from '../altyuklenici/ilerleme.js';

const stmtInsert = db.prepare('INSERT INTO is_programi_aktivite (proje_id, wbs_gorev_id, ad, plan_baslangic, plan_bitis, gerceklesen_yuzde, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?)');
const stmtListe = db.prepare('SELECT * FROM is_programi_aktivite WHERE proje_id = ? AND row_status = 1 ORDER BY plan_baslangic, id');
const stmtGet = db.prepare('SELECT * FROM is_programi_aktivite WHERE id = ? AND row_status = 1');
const stmtYuzde = db.prepare('UPDATE is_programi_aktivite SET gerceklesen_yuzde = ? WHERE id = ?');

export function aktiviteEkle(item, aktor) {
  if (item.plan_bitis < item.plan_baslangic) throw new Error('Plan bitiş, başlangıçtan önce olamaz.');
  const info = stmtInsert.run(item.proje_id, item.wbs_gorev_id ? String(item.wbs_gorev_id) : null, item.ad, item.plan_baslangic, item.plan_bitis, item.gerceklesen_yuzde ?? 0, aktor ?? null);
  audit.kaydet('is_programi_aktivite', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtGet.get(info.lastInsertRowid);
}
export function listele(projeId) { return stmtListe.all(projeId); }
export function yuzdeGuncelle(id, yuzde, aktor) {
  if (!stmtGet.get(id)) throw new Error('Aktivite bulunamadı');
  if (yuzde < 0 || yuzde > 100) throw new Error('Yüzde 0-100 arasında olmalıdır.');
  stmtYuzde.run(yuzde, id);
  audit.kaydet('is_programi_aktivite', id, 'GUNCELLE', aktor, { gerceklesen_yuzde: yuzde });
  return stmtGet.get(id);
}

/**
 * CSV içe aktarım (Excel/MS Project "Farklı kaydet → CSV"). Ayırıcı ';' veya
 * ','; sütunlar: ad;plan_baslangic;plan_bitis;gerceklesen_yuzde;wbs_gorev_id
 * (son ikisi opsiyonel). Tarih YYYY-MM-DD veya GG.AA.YYYY. Başlık satırı otomatik atlanır.
 * Hatalı satırlar TÜM içe aktarımı durdurmaz — hata listesiyle döner.
 */
export function csvIceAktar(projeId, csv, aktor) {
  const tarihNorm = (s) => {
    const t = String(s).trim();
    const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : t;
  };
  const eklenen = []; const hatalar = [];
  csv.split(/\r?\n/).filter((l) => l.trim()).forEach((satir, i) => {
    const h = satir.split(satir.includes(';') ? ';' : ',').map((x) => x.trim());
    if (i === 0 && !/^\d{4}-|^\d{1,2}[./]/.test(h[1] || '')) return;
    try {
      const bas = tarihNorm(h[1]); const bit = tarihNorm(h[2]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bas) || !/^\d{4}-\d{2}-\d{2}$/.test(bit)) throw new Error('Tarih biçimi geçersiz');
      eklenen.push(aktiviteEkle({ proje_id: projeId, ad: h[0], plan_baslangic: bas, plan_bitis: bit, gerceklesen_yuzde: h[3] ? Number(h[3]) : 0, wbs_gorev_id: h[4] || null }, aktor));
    } catch (err) { hatalar.push({ satir: i + 1, hata: String(err.message || err) }); }
  });
  return { eklenen: eklenen.length, hatalar };
}

/** Doğrusal beklenen ilerleme (%) — plan aralığında tarihe göre. */
export function beklenenYuzde(a, tarih) {
  if (tarih <= a.plan_baslangic) return 0;
  if (tarih >= a.plan_bitis) return 100;
  const toplam = (new Date(a.plan_bitis) - new Date(a.plan_baslangic)) / 86400000 || 1;
  const gecen = (new Date(tarih) - new Date(a.plan_baslangic)) / 86400000;
  return Number(((gecen / toplam) * 100).toFixed(1));
}

/** Plan vs gerçekleşen + P5 ilerleme çelişki uyarıları (eşik parametrik: santiye_ilerleme_celiski_esik, varsayılan 10 puan). */
export function planGerceklesen(projeId, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const esik = parametre.degerAl('santiye_ilerleme_celiski_esik', t)?.deger ?? 10;
  const p5 = new Map();
  for (const s of sozlesme.listele(projeId).filter((x) => x.tip === 'alt_yuklenici')) {
    for (const k of ilerleme.listele(s.id)) { // tarih DESC — ilk görülen en güncel
      const anahtar = k.wbs_gorev_id;
      if (!p5.has(anahtar)) p5.set(anahtar, { sozlesme_id: s.id, gerceklesen_yuzde: k.gerceklesen_yuzde, tarih: k.tarih });
    }
  }
  const satirlar = stmtListe.all(projeId).map((a) => {
    const beklenen = beklenenYuzde(a, t);
    const r = { ...a, beklenen_yuzde: beklenen, sapma: Number((a.gerceklesen_yuzde - beklenen).toFixed(1)), geride_mi: a.gerceklesen_yuzde < beklenen, celiski: null };
    const alt = a.wbs_gorev_id ? p5.get(String(a.wbs_gorev_id)) : null;
    if (alt && Math.abs(alt.gerceklesen_yuzde - a.gerceklesen_yuzde) > esik) {
      r.celiski = {
        mesaj: `Şantiye onaylı ilerleme %${a.gerceklesen_yuzde} ile P5 alt yüklenici kaydı %${alt.gerceklesen_yuzde} çelişiyor (fark > ${esik} puan). Tek doğru: şantiye onaylı ilerleme.`,
        alt_yuklenici_yuzde: alt.gerceklesen_yuzde, sozlesme_id: alt.sozlesme_id,
      };
    }
    return r;
  });
  return { tarih: t, esik, satirlar, celiski_sayisi: satirlar.filter((s) => s.celiski).length };
}
