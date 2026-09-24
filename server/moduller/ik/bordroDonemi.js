// Bordro Dönemi — ÖN HAZIRLIK. GÖREV METNİ: "Bordroyu tam hesaplamak
// yerine önce bordro ön hazırlık + dış bordro programına aktarım
// yaklaşımı değerlendir; tam hesaplama motoru yazılacaksa ayrı faz olarak
// işaretle." Bu servis SGK primi/gelir vergisi/damga vergisi/kümülatif
// vergi matrahı HESAPLAMAZ — yalnızca dönem başına personel bazlı
// çalışılan gün/fazla mesai(bilgi)/izin/avans kesintisini TOPLAR, brüt
// hak edişi (gün oranlı) çıkarır, PUANTAJ oranına göre proje dağıtımını
// hesaplar ve dönem onaylanınca Maliyet Defteri GERÇEKLEŞEN
// (işçilik-kadro) yazar. TAM BORDRO MOTORU — SGK/vergi kesintileri dahil —
// AYRI BİR GEÇİŞ GEREKTİRİR (bkz. CAKISMA_HARITASI.md P7 notu).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as personel from './personel.js';
import * as izin from './izin.js';
import * as avans from './avans.js';

const AKIS = { acik: ['onaylandi'], onaylandi: ['disa_aktarildi'] };

const stmtInsert = db.prepare('INSERT INTO ik_bordro_donemi (numara, donem_yil, donem_ay, notes, olusturan) VALUES (@numara, @donem_yil, @donem_ay, @notes, @olusturan)');
const stmtGet = db.prepare('SELECT * FROM ik_bordro_donemi WHERE id = ? AND row_status = 1');
const stmtListele = db.prepare('SELECT * FROM ik_bordro_donemi WHERE row_status = 1 ORDER BY donem_yil DESC, donem_ay DESC');
const stmtDurumGuncelle = db.prepare("UPDATE ik_bordro_donemi SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const stmtSatirUpsert = db.prepare(
  `INSERT INTO ik_bordro_satiri (bordro_donemi_id, personel_id, brut_maas_kurus, calisilan_gun, fazla_mesai_saat, izinli_gun, ucretsiz_izin_gun, avans_kesinti_kurus, notes)
   VALUES (@bordro_donemi_id, @personel_id, @brut_maas_kurus, @calisilan_gun, @fazla_mesai_saat, @izinli_gun, @ucretsiz_izin_gun, @avans_kesinti_kurus, @notes)
   ON CONFLICT(bordro_donemi_id, personel_id) DO UPDATE SET
     brut_maas_kurus=excluded.brut_maas_kurus, calisilan_gun=excluded.calisilan_gun, fazla_mesai_saat=excluded.fazla_mesai_saat,
     izinli_gun=excluded.izinli_gun, ucretsiz_izin_gun=excluded.ucretsiz_izin_gun, avans_kesinti_kurus=excluded.avans_kesinti_kurus, notes=excluded.notes`
);
const stmtSatirGet = db.prepare('SELECT * FROM ik_bordro_satiri WHERE bordro_donemi_id = ? AND personel_id = ?');
const stmtSatirListele = db.prepare('SELECT * FROM ik_bordro_satiri WHERE bordro_donemi_id = ?');
const stmtDagitimSil = db.prepare('DELETE FROM ik_bordro_dagitim WHERE bordro_satiri_id = ?');
const stmtDagitimEkle = db.prepare('INSERT INTO ik_bordro_dagitim (bordro_satiri_id, proje_id, maliyet_kodu_id, gun_sayisi, tutar_kurus) VALUES (?, ?, ?, ?, ?)');
const stmtDagitimListele = db.prepare('SELECT * FROM ik_bordro_dagitim WHERE bordro_satiri_id = ?');
const stmtGercekYazildiIsaretle = db.prepare('UPDATE ik_bordro_satiri SET gerceklesen_yazildi_mi = 1 WHERE id = ?');

function ayAraligi(yil, ay) {
  const baslangic = `${yil}-${String(ay).padStart(2, '0')}-01`;
  const sonGun = new Date(yil, ay, 0).getDate();
  const bitis = `${yil}-${String(ay).padStart(2, '0')}-${String(sonGun).padStart(2, '0')}`;
  return { baslangic, bitis };
}

export function olustur(item, aktor) {
  const numara = sonraki('BRD');
  const row = { numara, donem_yil: item.donem_yil, donem_ay: item.donem_ay, notes: item.notes ?? null, olusturan: aktor ?? null };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error(`${item.donem_yil}-${item.donem_ay} dönemi için zaten bir bordro dönemi açılmış.`);
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('ik_bordro_donemi', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}
export function getir(id) { return stmtGet.get(id); }
export function listele() { return stmtListele.all(); }
export function satirlariGetir(donemId) { return stmtSatirListele.all(donemId).map((s) => ({ ...s, dagitim: stmtDagitimListele.all(s.id) })); }

/**
 * Bir personel için dönem satırını PUANTAJ + İZİN + AVANS'tan yeniden
 * hesaplar (durumu DEĞİŞTİRMEZ, tekrar tekrar çağrılabilir — Taşeron
 * odemeDonemi.js#hesapla ile AYNI idempotent önizleme deseni).
 */
export function personelHesapla(donemId, personelId, aktor) {
  const donem = stmtGet.get(donemId);
  if (!donem) throw new Error('Bordro dönemi bulunamadı');
  const p = personel.getir(personelId);
  if (!p) throw new Error('Personel bulunamadı');
  const { baslangic, bitis } = ayAraligi(donem.donem_yil, donem.donem_ay);
  const ucret = personel.ucretGetir(personelId, bitis);
  if (!ucret) throw new Error(`Personel #${personelId} için ${bitis} tarihinde GEÇERLİ bir ücret tanımlı değil.`);

  const kayitlar = cekirdekPuantaj.kisiAraligiListele(p.kisi_id, baslangic, bitis);
  const calisilanGun = kayitlar.reduce((t, k) => t + k.gun_degeri, 0);
  const fazlaMesai = kayitlar.reduce((t, k) => t + (k.fazla_mesai_saat || 0), 0);

  const izinler = izin.donemIzinleriniGetir(personelId, baslangic, bitis).filter((i) => i.durum === 'onaylandi');
  const izinliGun = izinler.filter((i) => i.tur !== 'ucretsiz').reduce((t, i) => t + i.gun_sayisi, 0);
  const ucretsizGun = izinler.filter((i) => i.tur === 'ucretsiz').reduce((t, i) => t + i.gun_sayisi, 0);

  const gunlukUcret = ucret.brut_maas_kurus / 30; // aylık maaş, 30 gün üzerinden — ÖN HAZIRLIK basitleştirmesi (tam bordro motoru DEĞİL)
  const brutHakEdis = Math.round(gunlukUcret * (calisilanGun + izinliGun)); // ücretsiz izin günü maaştan DÜŞER (hiç eklenmez)

  const avansKesintisi = avans.bekleyenTaksitleriGetir(personelId).slice(0, 1).reduce((t, x) => t + x.tutar_kurus, 0); // dönem başına TEK taksit — SALT OKUNUR, mahsup işareti onayda konur

  const row = {
    bordro_donemi_id: donemId, personel_id: personelId, brut_maas_kurus: brutHakEdis, calisilan_gun: calisilanGun,
    fazla_mesai_saat: fazlaMesai, izinli_gun: izinliGun, ucretsiz_izin_gun: ucretsizGun, avans_kesinti_kurus: avansKesintisi, notes: null,
  };
  stmtSatirUpsert.run(row);
  const satir = stmtSatirGet.get(donemId, personelId);

  // ---- Proje dağıtımı: puantaj kaydının maliyet_kodu_id'sine göre gruplanır
  // (Taşeron odemeDonemi.js#taahhutuIsle'deki "maliyet_kodu_id yoksa
  // atlanır" KURALIYLA BİREBİR TUTARLI). WBS'siz/maliyet kodsuz günler
  // dağıtılamaz — kullanıcı bordro ön hazırlıkta bu payı görür ama o pay
  // Maliyet Defteri'ne YAZILMAZ (bkz. gercekleseniYaz).
  stmtDagitimSil.run(satir.id);
  const gruplar = new Map(); // anahtar: maliyet_kodu_id ?? 'dagitilmamis'
  for (const k of kayitlar) {
    const anahtar = k.maliyet_kodu_id ?? 'dagitilmamis';
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, { proje_id: k.proje_id, maliyet_kodu_id: k.maliyet_kodu_id ?? null, gun: 0 });
    gruplar.get(anahtar).gun += k.gun_degeri;
  }
  for (const g of gruplar.values()) {
    const tutar = Math.round(brutHakEdis * (g.gun / (calisilanGun || 1)));
    stmtDagitimEkle.run(satir.id, g.proje_id, g.maliyet_kodu_id, g.gun, tutar);
  }
  audit.kaydet('ik_bordro_satiri', satir.id, 'GUNCELLE', aktor, { yeni: row });
  return { ...satir, dagitim: stmtDagitimListele.all(satir.id) };
}

export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Bordro dönemi bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('ik_bordro_donemi', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  if (yeniDurum === 'onaylandi') {
    const donemFull = stmtGet.get(id);
    for (const satir of stmtSatirListele.all(id)) {
      const bekleyen = avans.bekleyenTaksitleriGetir(satir.personel_id);
      if (bekleyen[0]) avans.taksitiMahsupEt(bekleyen[0].id, id, aktor);
    }
    gercekleseniYaz(donemFull, aktor);
  }
  return stmtGet.get(id);
}

/** Onaylanınca: HER dağıtım satırı (maliyet_kodu_id'si OLAN) kendi WBS'inin 'iscilik_kadro' maliyet koduna GERÇEKLEŞEN yazar; dağıtılamayan (WBS'siz) tutar için hiçbir yazım YAPILMAZ (Taşeron'daki AYNI kural). */
function gercekleseniYaz(donem, aktor) {
  for (const satir of stmtSatirListele.all(donem.id)) {
    if (satir.gerceklesen_yazildi_mi) continue;
    for (const d of stmtDagitimListele.all(satir.id)) {
      if (!d.maliyet_kodu_id || !d.tutar_kurus) continue;
      maliyetDefteri.yaz({
        proje_id: d.proje_id, maliyet_kodu_id: d.maliyet_kodu_id, tur: 'GERCEKLESEN', tutar_kurus: d.tutar_kurus,
        tarih: `${donem.donem_yil}-${String(donem.donem_ay).padStart(2, '0')}-01`, kaynak_modul: 'ik_bordro_donemi',
        kaynak_id: `${donem.id}:personel-${satir.personel_id}:kod-${d.maliyet_kodu_id}`, notes: `Bordro dönemi ${donem.numara}`,
      }, aktor);
    }
    stmtGercekYazildiIsaretle.run(satir.id);
  }
}

/** "Dış bordro programına aktarım" noktası — SGK/vergi HESAPLAMAZ, yalnızca ön hazırlık verisini (gün/mesai/izin/avans) satır satır döner. */
export function disaAktarimNoktasi(donemId) {
  return satirlariGetir(donemId).map((s) => {
    const p = personel.getir(s.personel_id);
    return {
      sicil_no: p?.sicil_no, personel_id: s.personel_id, brut_kurus: s.brut_maas_kurus, calisilan_gun: s.calisilan_gun,
      fazla_mesai_saat: s.fazla_mesai_saat, izinli_gun: s.izinli_gun, ucretsiz_izin_gun: s.ucretsiz_izin_gun, avans_kesinti_kurus: s.avans_kesinti_kurus,
    };
  });
}
