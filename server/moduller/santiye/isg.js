// İSG (6331) — Eğitim Kaydı'nın SAHİBİ bu modüldür. Risk, İş İzni, Denetim
// Kontrol Listesi, Ramak Kala, Olay/Kaza, Düzeltici Faaliyet. KKD zimmeti
// Depo'dan (P4) OKUNUR; SGK bilgisi Taşeron (P6) / İK (P7) servislerinden.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as zimmetSrv from '../depo/zimmet.js';
import * as taseronEkip from '../taseron/ekip.js';
import * as ikPersonel from '../ik/personel.js';
import * as performans from '../altyuklenici/performans.js';

const BUGUN = () => new Date().toISOString().slice(0, 10);

// ---------- Eğitim Kaydı (SAHİBİ burası) ----------
const stmtEgitimInsert = db.prepare('INSERT INTO isg_egitim (kisi_id, egitim_tipi, tarih, gecerlilik_bitis, egitmen, olusturan) VALUES (?, ?, ?, ?, ?, ?)');
const stmtEgitimKisi = db.prepare('SELECT * FROM isg_egitim WHERE kisi_id = ? AND row_status = 1 ORDER BY gecerlilik_bitis DESC');
const stmtEgitimTumu = db.prepare('SELECT * FROM isg_egitim WHERE row_status = 1');

/**
 * Eğitim eklenince Çekirdek Kişi.isg_egitim_* önbelleği (işe başlama eğitimi
 * için) güncellenir — P6'nın SGK/İSG kontrolü bu alanı okuduğundan çalışmaya
 * devam eder; SAHİPLİK yine isg_egitim tablosundadır.
 */
export function egitimEkle(item, aktor) {
  if (!kisiSrv.getir(item.kisi_id)) throw new Error('Kişi bulunamadı');
  const tip = item.egitim_tipi || 'ise_baslama';
  const info = stmtEgitimInsert.run(item.kisi_id, tip, item.tarih, item.gecerlilik_bitis, item.egitmen ?? null, aktor ?? null);
  audit.kaydet('isg_egitim', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  if (tip === 'ise_baslama') kisiSrv.guncelle(item.kisi_id, { isg_egitim_tarihi: item.tarih, isg_egitim_gecerlilik_tarihi: item.gecerlilik_bitis }, aktor);
  return { id: info.lastInsertRowid, kisi_id: item.kisi_id, egitim_tipi: tip, tarih: item.tarih, gecerlilik_bitis: item.gecerlilik_bitis };
}
export function egitimleriGetir(kisiId) { return stmtEgitimKisi.all(kisiId); }

/** Süresi dolmuş/`gunOncesi` içinde dolacak eğitimler (kişi başına en güncel işe başlama eğitimi esas). */
export function suresiDolanEgitimler(tarih, gunOncesi = 0) {
  const t = tarih || BUGUN();
  const esik = new Date(t); esik.setDate(esik.getDate() + gunOncesi);
  const esikStr = esik.toISOString().slice(0, 10);
  const enGuncel = new Map();
  for (const e of stmtEgitimTumu.all()) {
    if (e.egitim_tipi !== 'ise_baslama') continue;
    const m = enGuncel.get(e.kisi_id);
    if (!m || m.gecerlilik_bitis < e.gecerlilik_bitis) enGuncel.set(e.kisi_id, e);
  }
  return [...enGuncel.values()].filter((e) => e.gecerlilik_bitis <= esikStr);
}

// ---------- Şantiye girişi kontrolü ----------
const stmtGirisInsert = db.prepare('INSERT INTO santiye_giris (proje_id, kisi_id, tarih, uygun_mu, uyarilar, yetkili_onayi_mi, gerekce, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const stmtGirisListe = db.prepare('SELECT * FROM santiye_giris WHERE proje_id = ? AND tarih = ? ORDER BY id DESC');

/** Görev metni: "Kişi'nin İSG eğitimi yoksa/süresi dolmuşsa veya SGK girişi yoksa UYARI." */
export function girisKontrolu(kisiId, tarih) {
  const t = tarih || BUGUN();
  const k = kisiSrv.getir(kisiId);
  if (!k) throw new Error('Kişi bulunamadı');
  const uyarilar = [];
  const gecerliEgitim = stmtEgitimKisi.all(kisiId).some((e) => e.egitim_tipi === 'ise_baslama' && e.gecerlilik_bitis >= t)
    || (k.isg_egitim_gecerlilik_tarihi && k.isg_egitim_gecerlilik_tarihi >= t);
  if (!gecerliEgitim) uyarilar.push('İSG işe başlama eğitimi yok veya süresi dolmuş');
  if (k.rol === 'taseron_iscisi') {
    const uyelikler = taseronEkip.kisiUyelikleri(kisiId);
    if (!uyelikler.some((u) => u.sgk_giris_bildirge_tarihi && u.sgk_giris_bildirge_tarihi <= t)) uyarilar.push('SGK işe giriş bildirgesi yok (taşeron ekibinde kayıtlı SGK tarihi bulunamadı)');
  } else if (k.rol === 'personel') {
    const p = ikPersonel.kisiIcinGetir(kisiId);
    if (!p || p.ise_giris_tarihi > t) uyarilar.push('İK personel/işe giriş kaydı yok (SGK girişi doğrulanamadı)');
  }
  return { kisi_id: kisiId, ad_soyad: k.ad_soyad, rol: k.rol, tarih: t, uygun: uyarilar.length === 0, uyarilar };
}

/** Turnike/manuel giriş denemesi — uygunsuzsa yetkili onayı olmadan izin VERİLMEZ; her deneme kaydedilir. */
export function girisKaydet(projeId, kisiId, tarih, { yetkiliOnayi, gerekce } = {}, aktor) {
  const k = girisKontrolu(kisiId, tarih);
  const gecildi = k.uygun || (yetkiliOnayi === true && !!gerekce);
  stmtGirisInsert.run(projeId, kisiId, k.tarih, k.uygun ? 1 : 0, JSON.stringify(k.uyarilar), !k.uygun && gecildi ? 1 : 0, gerekce ?? null, aktor ?? null);
  return { ...k, giris_izni: gecildi };
}
export function girisleriGetir(projeId, tarih) {
  return stmtGirisListe.all(projeId, tarih).map((g) => ({ ...g, uyarilar: JSON.parse(g.uyarilar || '[]') }));
}

/** KKD durumu: kişiye verilmiş (kkd_mi) ve iade/kayıp OLMAMIŞ zimmetler — Depo'dan OKUNUR. */
export function kkdDurumu(kisiId) {
  return zimmetSrv.listele(true).filter((z) => z.kkd_mi && z.zimmet_alan_kisi_id === Number(kisiId));
}

// ---------- Risk Değerlendirmesi ----------
const stmtRiskInsert = db.prepare('INSERT INTO isg_risk (proje_id, tehlike, risk, olasilik, siddet, risk_skoru, onlem, sorumlu_kisi_id, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stmtRiskListe = db.prepare('SELECT * FROM isg_risk WHERE proje_id = ? AND row_status = 1 ORDER BY risk_skoru DESC');
export function riskEkle(item, aktor) {
  const skor = item.olasilik * item.siddet;
  const info = stmtRiskInsert.run(item.proje_id, item.tehlike, item.risk ?? null, item.olasilik, item.siddet, skor, item.onlem ?? null, item.sorumlu_kisi_id ?? null, aktor ?? null);
  audit.kaydet('isg_risk', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return { id: info.lastInsertRowid, ...item, risk_skoru: skor };
}
export function riskleriGetir(projeId) { return stmtRiskListe.all(projeId); }

// ---------- İş İzni ----------
const IZIN_AKIS = { talep: ['onayli', 'iptal'], onayli: ['kapali', 'iptal'] };
const stmtIzinInsert = db.prepare('INSERT INTO isg_is_izni (proje_id, tur, aciklama, konum, talep_eden_kisi_id, baslangic, bitis, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const stmtIzinGet = db.prepare('SELECT * FROM isg_is_izni WHERE id = ?');
const stmtIzinListe = db.prepare('SELECT * FROM isg_is_izni WHERE proje_id = ? AND row_status = 1 ORDER BY baslangic DESC');
const stmtIzinDurum = db.prepare('UPDATE isg_is_izni SET durum = ?, onaylayan = COALESCE(?, onaylayan) WHERE id = ?');
export function isIzniTalepEt(item, aktor) {
  const info = stmtIzinInsert.run(item.proje_id, item.tur, item.aciklama ?? null, item.konum ?? null, item.talep_eden_kisi_id ?? null, item.baslangic, item.bitis, aktor ?? null);
  audit.kaydet('isg_is_izni', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtIzinGet.get(info.lastInsertRowid);
}
export function isIzniDurumDegistir(id, yeniDurum, onaylayan, aktor) {
  const m = stmtIzinGet.get(id);
  if (!m) throw new Error('İş izni bulunamadı');
  if (!(IZIN_AKIS[m.durum] || []).includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${m.durum} -> ${yeniDurum}`);
  if (yeniDurum === 'onayli' && !onaylayan) throw new Error('İş izni onayı için onaylayan zorunludur.');
  stmtIzinDurum.run(yeniDurum, onaylayan ?? null, id);
  audit.kaydet('isg_is_izni', id, 'GUNCELLE', aktor, { durum: [m.durum, yeniDurum] });
  return stmtIzinGet.get(id);
}
export function isIzinleriGetir(projeId) { return stmtIzinListe.all(projeId); }

// ---------- Düzeltici Faaliyet ----------
const stmtDzInsert = db.prepare('INSERT INTO isg_duzeltici_faaliyet (proje_id, kaynak_tipi, kaynak_id, aciklama, sorumlu_kisi_id, son_tarih, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?)');
const stmtDzGet = db.prepare('SELECT * FROM isg_duzeltici_faaliyet WHERE id = ?');
const stmtDzListe = db.prepare('SELECT * FROM isg_duzeltici_faaliyet WHERE proje_id = ? AND row_status = 1 ORDER BY durum, son_tarih');
const stmtDzKapat = db.prepare("UPDATE isg_duzeltici_faaliyet SET durum = 'tamamlandi', kapanis_notu = ? WHERE id = ?");
export function duzelticiEkle(item, aktor) {
  const info = stmtDzInsert.run(item.proje_id, item.kaynak_tipi || 'diger', item.kaynak_id ?? null, item.aciklama, item.sorumlu_kisi_id ?? null, item.son_tarih ?? null, aktor ?? null);
  audit.kaydet('isg_duzeltici_faaliyet', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtDzGet.get(info.lastInsertRowid);
}
export function duzelticiKapat(id, kapanisNotu, aktor) {
  const m = stmtDzGet.get(id);
  if (!m) throw new Error('Düzeltici faaliyet bulunamadı');
  if (!kapanisNotu) throw new Error('Kapanış notu zorunludur.');
  stmtDzKapat.run(kapanisNotu, id);
  audit.kaydet('isg_duzeltici_faaliyet', id, 'GUNCELLE', aktor, { durum: 'tamamlandi' });
  return stmtDzGet.get(id);
}
export function duzelticileriGetir(projeId) { return stmtDzListe.all(projeId); }

// ---------- Denetim Kontrol Listesi (şablon + yanıt) ----------
const stmtSablonInsert = db.prepare('INSERT INTO isg_denetim_sablon (ad, periyot, maddeler) VALUES (?, ?, ?)');
const stmtSablonListe = db.prepare('SELECT * FROM isg_denetim_sablon WHERE row_status = 1');
const stmtSablonGet = db.prepare('SELECT * FROM isg_denetim_sablon WHERE id = ?');
const stmtYanitInsert = db.prepare('INSERT INTO isg_denetim_yanit (sablon_id, proje_id, tarih, yanitlar, uygunsuz_sayisi, denetleyen) VALUES (?, ?, ?, ?, ?, ?)');
const stmtYanitListe = db.prepare('SELECT * FROM isg_denetim_yanit WHERE proje_id = ? ORDER BY tarih DESC, id DESC');
export function sablonEkle(item) {
  const info = stmtSablonInsert.run(item.ad, item.periyot, JSON.stringify(item.maddeler));
  return { id: info.lastInsertRowid, ...item };
}
export function sablonlariGetir() { return stmtSablonListe.all().map((s) => ({ ...s, maddeler: JSON.parse(s.maddeler) })); }
/** Uygunsuz her madde için OTOMATİK düzeltici faaliyet açılır. */
export function denetimYanitla(item, aktor) {
  if (!stmtSablonGet.get(item.sablon_id)) throw new Error('Denetim şablonu bulunamadı');
  const uygunsuz = item.yanitlar.filter((y) => y.uygun === false);
  const info = stmtYanitInsert.run(item.sablon_id, item.proje_id, item.tarih, JSON.stringify(item.yanitlar), uygunsuz.length, item.denetleyen ?? null);
  const acilanlar = uygunsuz.map((y) => duzelticiEkle({ proje_id: item.proje_id, kaynak_tipi: 'denetim', kaynak_id: String(info.lastInsertRowid), aciklama: `Denetim uygunsuzluğu: ${y.madde}${y.not ? ' — ' + y.not : ''}` }, aktor));
  return { id: info.lastInsertRowid, uygunsuz_sayisi: uygunsuz.length, duzeltici_faaliyetler: acilanlar };
}
export function denetimleriGetir(projeId) { return stmtYanitListe.all(projeId).map((y) => ({ ...y, yanitlar: JSON.parse(y.yanitlar) })); }

// ---------- Ramak Kala (anonim seçenekli) ----------
const stmtRamakInsert = db.prepare('INSERT INTO isg_ramak_kala (proje_id, tarih, aciklama, anonim_mi, bildiren_kisi_id, lat, lon) VALUES (?, ?, ?, ?, ?, ?, ?)');
const stmtRamakListe = db.prepare('SELECT * FROM isg_ramak_kala WHERE proje_id = ? ORDER BY tarih DESC');
/** anonim=true ise bildiren kimliği HİÇ yazılmaz (audit aktörü de). */
export function ramakKalaBildir(item, aktor) {
  const anonim = !!item.anonim;
  const info = stmtRamakInsert.run(item.proje_id, item.tarih, item.aciklama, anonim ? 1 : 0, anonim ? null : (item.bildiren_kisi_id ?? null), item.lat ?? null, item.lon ?? null);
  audit.kaydet('isg_ramak_kala', info.lastInsertRowid, 'OLUSTUR', anonim ? null : aktor, { aciklama: item.aciklama, anonim });
  return { id: info.lastInsertRowid, anonim_mi: anonim ? 1 : 0 };
}
export function ramakKalalariGetir(projeId) { return stmtRamakListe.all(projeId); }

// ---------- Olay / Kaza (yasal bildirim hatırlatması) ----------
const stmtOlayInsert = db.prepare('INSERT INTO isg_olay (proje_id, tur, tarih, aciklama, kisi_id, ilgili_alt_yuklenici_sozlesme_id, lat, lon, yasal_bildirim_son_tarih, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stmtOlayGet = db.prepare('SELECT * FROM isg_olay WHERE id = ?');
const stmtOlayListe = db.prepare('SELECT * FROM isg_olay WHERE proje_id = ? AND row_status = 1 ORDER BY tarih DESC');
const stmtOlayBildirim = db.prepare('UPDATE isg_olay SET bildirim_yapildi_mi = 1, bildirim_tarihi = ? WHERE id = ?');
/**
 * İş kazası/meslek hastalığı için yasal bildirim SON TARİHİ parametriktir
 * ('isg_kaza_bildirim_gun', yürürlük tarihli) — koda gömülü süre YOK; parametre
 * tanımsızsa son tarih NULL kalır. Alt yüklenici ile ilişkiliyse P5 performans
 * kartına 'isg_ihlali' olayı gider.
 */
export function olayKaydet(item, aktor) {
  let sonTarih = null;
  if (item.tur !== 'yaralanmasiz_olay') {
    const p = parametre.degerAl('isg_kaza_bildirim_gun', item.tarih);
    if (p) { const d = new Date(item.tarih); d.setDate(d.getDate() + p.deger); sonTarih = d.toISOString().slice(0, 10); }
  }
  const info = stmtOlayInsert.run(item.proje_id, item.tur, item.tarih, item.aciklama, item.kisi_id ?? null, item.ilgili_alt_yuklenici_sozlesme_id ?? null, item.lat ?? null, item.lon ?? null, sonTarih, aktor ?? null);
  const id = info.lastInsertRowid;
  audit.kaydet('isg_olay', id, 'OLUSTUR', aktor, { yeni: item });
  if (item.ilgili_alt_yuklenici_sozlesme_id) performans.olayGonder(item.ilgili_alt_yuklenici_sozlesme_id, 'isg_ihlali', 'santiye_isg_olay', id, item.tarih, item.aciklama);
  return stmtOlayGet.get(id);
}
export function olayBildirimYapildi(id, tarih, aktor) {
  if (!stmtOlayGet.get(id)) throw new Error('Olay bulunamadı');
  stmtOlayBildirim.run(tarih, id);
  audit.kaydet('isg_olay', id, 'GUNCELLE', aktor, { bildirim_tarihi: tarih });
  return stmtOlayGet.get(id);
}
export function olaylariGetir(projeId) { return stmtOlayListe.all(projeId); }

// ---------- İSG uyarıları (pano) ----------
export function isgUyarilari(projeId, tarih) {
  const t = tarih || BUGUN();
  const uyarilar = [];
  const dolan = suresiDolanEgitimler(t, 0);
  if (dolan.length) uyarilar.push({ tur: 'egitim_suresi_dolmus', sayi: dolan.length, mesaj: `${dolan.length} kişinin İSG eğitimi süresi dolmuş` });
  for (const o of stmtOlayListe.all(projeId).filter((x) => x.yasal_bildirim_son_tarih && !x.bildirim_yapildi_mi)) {
    const gecti = o.yasal_bildirim_son_tarih < t;
    uyarilar.push({ tur: 'yasal_bildirim', olay_id: o.id, son_tarih: o.yasal_bildirim_son_tarih, gecikti: gecti, mesaj: `Olay #${o.id} yasal bildirim son tarihi ${o.yasal_bildirim_son_tarih}${gecti ? ' — GEÇTİ' : ''}` });
  }
  const gecikmis = stmtDzListe.all(projeId).filter((d) => d.durum === 'acik' && d.son_tarih && d.son_tarih < t);
  if (gecikmis.length) uyarilar.push({ tur: 'duzeltici_gecikmis', sayi: gecikmis.length, mesaj: `${gecikmis.length} düzeltici faaliyetin süresi geçti` });
  return uyarilar;
}
