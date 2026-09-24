// İzin — Yıllık İzin Hakkı Tablosu (kıdem/yaş bazlı, yürürlük tarihli) +
// Bakiye (devreder) + Talep/Onay. Mazeret/ücretsiz/rapor izinleri AYRI
// türlerdir; yalnızca 'yillik' türü bakiyeyi DÜŞÜRÜR.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as personel from './personel.js';

const TURLER = ['yillik', 'mazeret', 'ucretsiz', 'rapor'];

// ---------- İzin Hakkı Tablosu (kıdem bazlı taban) ----------
const stmtHakkiInsert = db.prepare(
  `INSERT INTO ik_izin_hakki_tablosu (kidem_yil_min, kidem_yil_max, yillik_izin_gun, gecerli_baslangic, gecerli_bitis, notes, olusturan)
   VALUES (@kidem_yil_min, @kidem_yil_max, @yillik_izin_gun, @gecerli_baslangic, @gecerli_bitis, @notes, @olusturan)`
);
const stmtHakkiListele = db.prepare('SELECT * FROM ik_izin_hakki_tablosu WHERE row_status = 1 ORDER BY kidem_yil_min');
const stmtHakkiGecerli = db.prepare(
  `SELECT * FROM ik_izin_hakki_tablosu WHERE row_status = 1 AND kidem_yil_min <= ? AND (kidem_yil_max IS NULL OR kidem_yil_max >= ?)
     AND gecerli_baslangic <= ? AND (gecerli_bitis IS NULL OR gecerli_bitis >= ?) ORDER BY kidem_yil_min DESC LIMIT 1`
);

export function hakkiTanimla(item, aktor) {
  const row = {
    kidem_yil_min: item.kidem_yil_min, kidem_yil_max: item.kidem_yil_max ?? null, yillik_izin_gun: item.yillik_izin_gun,
    gecerli_baslangic: item.gecerli_baslangic, gecerli_bitis: item.gecerli_bitis ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtHakkiInsert.run(row);
  audit.kaydet('ik_izin_hakki_tablosu', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}
export function hakTablosunuListele() { return stmtHakkiListele.all(); }

/**
 * Bir kıdem yılına göre taban izin gününü + (varsa) yaş grubu ASGARİ
 * gününü döner. Yaş<18 veya yaş>=50 için İş Kanunu m.53 gereği asgari gün
 * parametresi ('ik_izin_asgari_gun_yas_grubu') tabandan yüksekse onu
 * kullanır — sabit "20 gün" koda GÖMÜLMEDİ, parametrik.
 */
export function gunHakkiHesapla(kidemYil, yas, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const satir = stmtHakkiGecerli.get(kidemYil, kidemYil, t, t);
  if (!satir) throw new Error(`${kidemYil} yıl kıdem için ${t} tarihinde GEÇERLİ bir izin hakkı tanımı yok — İzin Hakkı Tablosu eksik.`);
  let gun = satir.yillik_izin_gun;
  if (yas != null && (yas < 18 || yas >= 50)) {
    const asgari = parametre.degerAl('ik_izin_asgari_gun_yas_grubu', t);
    if (asgari && asgari.deger > gun) gun = asgari.deger;
  }
  return gun;
}

// ---------- Bakiye (yıl bazlı, devreder) ----------
const stmtBakiyeGet = db.prepare('SELECT * FROM ik_izin_bakiye WHERE personel_id = ? AND yil = ?');
const stmtBakiyeInsert = db.prepare('INSERT INTO ik_izin_bakiye (personel_id, yil, hak_edilen_gun, devreden_gun, kullanilan_gun) VALUES (?, ?, ?, ?, 0)');
const stmtBakiyeKullanimGuncelle = db.prepare('UPDATE ik_izin_bakiye SET kullanilan_gun = kullanilan_gun + ? WHERE personel_id = ? AND yil = ?');

/** Bir yıl için bakiye AÇAR (yoksa) — önceki yılın KULLANILMAYAN bakiyesi devreder. */
export function bakiyeyiAcYadaGetir(personelId, yil, kidemYil, yas, aktor) {
  const mevcut = stmtBakiyeGet.get(personelId, yil);
  if (mevcut) return mevcut;
  if (!personel.getir(personelId)) throw new Error('Personel bulunamadı');
  const hakEdilen = gunHakkiHesapla(kidemYil, yas, `${yil}-01-01`);
  const oncekiYil = stmtBakiyeGet.get(personelId, yil - 1);
  const devreden = oncekiYil ? Math.max(0, oncekiYil.hak_edilen_gun + oncekiYil.devreden_gun - oncekiYil.kullanilan_gun) : 0;
  stmtBakiyeInsert.run(personelId, yil, hakEdilen, devreden);
  audit.kaydet('ik_izin_bakiye', `${personelId}:${yil}`, 'OLUSTUR', aktor, { hak_edilen_gun: hakEdilen, devreden_gun: devreden });
  return stmtBakiyeGet.get(personelId, yil);
}
export function bakiyeGetir(personelId, yil) { return stmtBakiyeGet.get(personelId, yil) || null; }

// ---------- Talep / Onay ----------
const stmtTalepInsert = db.prepare(
  `INSERT INTO ik_izin_talebi (personel_id, tur, baslangic_tarihi, bitis_tarihi, gun_sayisi, aciklama, olusturan)
   VALUES (@personel_id, @tur, @baslangic_tarihi, @bitis_tarihi, @gun_sayisi, @aciklama, @olusturan)`
);
const stmtTalepGet = db.prepare('SELECT * FROM ik_izin_talebi WHERE id = ?');
const stmtTalepListelePersonel = db.prepare('SELECT * FROM ik_izin_talebi WHERE personel_id = ? ORDER BY baslangic_tarihi DESC');
const stmtTalepListeleAralik = db.prepare('SELECT * FROM ik_izin_talebi WHERE personel_id = ? AND baslangic_tarihi <= ? AND bitis_tarihi >= ?');
const stmtTalepDurumGuncelle = db.prepare("UPDATE ik_izin_talebi SET durum = ?, onaylayan = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

export function talepEt(item, aktor) {
  if (!TURLER.includes(item.tur)) throw new Error(`Geçersiz izin türü: ${item.tur}`);
  if (!personel.getir(item.personel_id)) throw new Error('Personel bulunamadı');
  const row = {
    personel_id: item.personel_id, tur: item.tur, baslangic_tarihi: item.baslangic_tarihi, bitis_tarihi: item.bitis_tarihi,
    gun_sayisi: item.gun_sayisi, aciklama: item.aciklama ?? null, olusturan: aktor ?? null,
  };
  const info = stmtTalepInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('ik_izin_talebi', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtTalepGet.get(id);
}

export function personelIcinListele(personelId) { return stmtTalepListelePersonel.all(personelId); }
/** Bordro ön hazırlığı için — bir dönem aralığıyla KESİŞEN izin talepleri. */
export function donemIzinleriniGetir(personelId, baslangic, bitis) { return stmtTalepListeleAralik.all(personelId, bitis, baslangic); }

/** Onaylanınca: yalnızca tur='yillik' ise İLGİLİ YILIN bakiyesinden DÜŞER; bakiye YETERSİZSE hata (negatif bakiye YOK). */
export function onayla(id, onaylayan, aktor) {
  const talep = stmtTalepGet.get(id);
  if (!talep) throw new Error('İzin talebi bulunamadı');
  if (talep.durum !== 'talep_edildi') throw new Error(`İzin talebi "talep_edildi" durumunda değil (şu an: ${talep.durum})`);
  if (talep.tur === 'yillik') {
    const yil = Number(talep.baslangic_tarihi.slice(0, 4));
    const bakiye = stmtBakiyeGet.get(talep.personel_id, yil);
    if (!bakiye) throw new Error(`Personel #${talep.personel_id} için ${yil} yılı izin bakiyesi henüz açılmamış.`);
    const kalan = bakiye.hak_edilen_gun + bakiye.devreden_gun - bakiye.kullanilan_gun;
    if (talep.gun_sayisi > kalan) throw new Error(`Yetersiz izin bakiyesi (kalan: ${kalan} gün, talep: ${talep.gun_sayisi} gün).`);
    stmtBakiyeKullanimGuncelle.run(talep.gun_sayisi, talep.personel_id, yil);
  }
  stmtTalepDurumGuncelle.run('onaylandi', onaylayan ?? null, aktor ?? null, id);
  audit.kaydet('ik_izin_talebi', id, 'GUNCELLE', aktor, { durum: 'onaylandi', onaylayan });
  return stmtTalepGet.get(id);
}

export function reddet(id, aktor) {
  if (!stmtTalepGet.get(id)) throw new Error('İzin talebi bulunamadı');
  stmtTalepDurumGuncelle.run('reddedildi', aktor ?? null, aktor ?? null, id);
  audit.kaydet('ik_izin_talebi', id, 'GUNCELLE', aktor, { durum: 'reddedildi' });
  return stmtTalepGet.get(id);
}
