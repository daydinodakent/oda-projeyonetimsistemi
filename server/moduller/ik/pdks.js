// PDKS — Personel Devam Kontrol Sistemi. Çekirdek puantaj_kaydi'nı
// DOĞRUDAN kullanır (Taşeron/P6 ile AYNI desen — AYRI bir puantaj tablosu
// AÇILMAZ); bu modül yalnızca YÖNTEM detayını (kartlı/QR/mobil GPS/manuel
// şef/biyometrik) + geofence/konum meta'sını İK'ya özel ince bir tabloda
// (ik_pdks_meta) SARMALAR — Çekirdek'in kaynak enum'u GENİŞLETİLMEDİ.
//
// PDKS HAM KAYDI DEĞİŞTİRİLEMEZ: Çekirdek puantaj.js'in zaten bir
// "güncelle" fonksiyonu YOK (yalnızca onayla/iptalEt) — duzelt() bu yüzden
// ESKİ kaydı iptalEt() ile pasife alıp YENİ bir kayıt açar; her düzeltme
// ONAYLI (onaylayan zorunlu) ve audit izlidir (görev metni: "PDKS ham
// kaydı değiştirilemez; düzeltme ayrı düzeltme kaydı ile ve onaylı").
import * as audit from '../_cekirdek/audit.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as personel from './personel.js';
import { db } from './db.js';

const YONTEMLER = ['kartli', 'qr', 'mobil_gps', 'manuel_sef', 'biyometrik'];

const stmtMetaInsert = db.prepare('INSERT INTO ik_pdks_meta (puantaj_kaydi_id, yontem, geofence_icinde_mi, konum_lat, konum_lon) VALUES (?, ?, ?, ?, ?)');
const stmtMetaGet = db.prepare('SELECT * FROM ik_pdks_meta WHERE puantaj_kaydi_id = ?');

function kaynakEslestir(yontem) {
  // Çekirdek'in kaynak enum'u ('pdks'|'manuel'|'mobil') İK'nın 5 yöntemini
  // ayrı ayrı taşıyacak kadar GENİŞ DEĞİL — Çekirdek şeması BÜYÜTÜLMEDİ
  // (SAHİPLİK: yöntem detayı İK'nın kendi ik_pdks_meta'sında kalır); burada
  // yalnızca en yakın Çekirdek kaynağına eşlenir.
  if (yontem === 'mobil_gps') return 'mobil';
  if (yontem === 'manuel_sef') return 'manuel';
  return 'pdks'; // kartli, qr, biyometrik
}

/** Bir kişinin İÇİNDE bulunduğu yıl için, ek saat eklendiğinde parametrik yıllık limiti aşıp aşmadığını kontrol eder. Parametre tanımsızsa engellenmez (operasyon durmasın). */
function fazlaMesaiKontrolu(kisiId, tarih, ekstraSaat) {
  if (!ekstraSaat) return { uygun: true };
  const limit = parametre.degerAl('ik_fazla_mesai_yillik_limit_saat', tarih);
  if (!limit) return { uygun: true };
  const yil = tarih.slice(0, 4);
  const toplam = cekirdekPuantaj.kisiAraligiListele(kisiId, `${yil}-01-01`, `${yil}-12-31`).reduce((t, k) => t + (k.fazla_mesai_saat || 0), 0);
  const yeniToplam = toplam + ekstraSaat;
  return { uygun: yeniToplam <= limit.deger, toplam: yeniToplam, limit: limit.deger };
}

/**
 * @param {{personel_id, proje_id, tarih, yontem, giris_saati?, cikis_saati?, gun_degeri?, fazla_mesai_saat?, maliyet_kodu_id?, konum_lat?, konum_lon?, geofence_icinde_mi?, istemci_kayit_id?, yetkiliOnayi?, gerekce?}} item
 * Biyometrik yöntem, kişinin AÇIK RIZASI (personel.biyometrik_riza_verildi_mi)
 * OLMADAN REDDEDİLİR — KVKK'da özel nitelikli veri; Taşeron'daki "yetkili
 * onayıyla aş" istisnası burada YOKTUR (hukuki gereklilik, aşılamaz).
 */
export function kaydet(item, aktor) {
  if (!YONTEMLER.includes(item.yontem)) throw new Error(`Geçersiz PDKS yöntemi: ${item.yontem}`);
  const p = personel.getir(item.personel_id);
  if (!p) throw new Error('Personel bulunamadı');
  if (item.yontem === 'biyometrik' && !p.biyometrik_riza_verildi_mi) {
    throw new Error('Bu personel biyometrik PDKS için AÇIK RIZA vermemiş (KVKK özel nitelikli veri) — alternatif yöntem (kartlı/QR/manuel) kullanılmalı.');
  }
  const kontrol = fazlaMesaiKontrolu(p.kisi_id, item.tarih, item.fazla_mesai_saat || 0);
  if (!kontrol.uygun && !item.yetkiliOnayi) {
    throw new Error(`Yıllık fazla mesai limiti aşılıyor (${kontrol.toplam}/${kontrol.limit} saat) — yetkili onayı (yetkiliOnayi=true + gerekçe) olmadan kaydedilemez.`);
  }
  const { kayit, tekrarGonderim } = cekirdekPuantaj.kaydet({
    proje_id: item.proje_id, kisi_id: p.kisi_id, tarih: item.tarih, giris_saati: item.giris_saati, cikis_saati: item.cikis_saati,
    gun_degeri: item.gun_degeri ?? 1, fazla_mesai_saat: item.fazla_mesai_saat ?? 0, maliyet_kodu_id: item.maliyet_kodu_id,
    kaynak: kaynakEslestir(item.yontem), istemci_kayit_id: item.istemci_kayit_id,
  }, aktor);
  if (!kontrol.uygun && item.yetkiliOnayi) {
    audit.kaydet('puantaj_kaydi', kayit.id, 'GUNCELLE', aktor, { fazla_mesai_limit_asimi_onayi: true, gerekce: item.gerekce, ...kontrol });
  }
  if (tekrarGonderim) return { ...kayit, pdks: stmtMetaGet.get(kayit.id), tekrarGonderim: true };
  const info = stmtMetaInsert.run(kayit.id, item.yontem, item.geofence_icinde_mi != null ? (item.geofence_icinde_mi ? 1 : 0) : null, item.konum_lat ?? null, item.konum_lon ?? null);
  audit.kaydet('ik_pdks_meta', info.lastInsertRowid, 'OLUSTUR', aktor, { puantaj_kaydi_id: kayit.id, yontem: item.yontem });
  return { ...kayit, pdks: stmtMetaGet.get(kayit.id), tekrarGonderim: false };
}

/** "Kim içeride" — o gün giriş saati OLUP çıkış saati OLMAYAN kayıtlar. */
export function projeGunuIcindekiler(projeId, tarih) {
  return cekirdekPuantaj.projeGunuListele(projeId, tarih)
    .filter((k) => k.giris_saati && !k.cikis_saati)
    .map((k) => ({ ...k, pdks: stmtMetaGet.get(k.id) }));
}

/** PDKS ham kaydı DEĞİŞTİRİLEMEZ — düzeltme = eskiyi iptalEt() + yeni onaylı kayıt. onaylayan ZORUNLU. */
export function duzelt(eskiPuantajId, yeniVeri, onaylayan, aktor) {
  if (!onaylayan) throw new Error('PDKS düzeltmesi yetkili onayı olmadan yapılamaz.');
  cekirdekPuantaj.iptalEt(eskiPuantajId, aktor);
  const sonuc = kaydet({ ...yeniVeri, yontem: yeniVeri.yontem || 'manuel_sef' }, aktor);
  audit.kaydet('puantaj_kaydi', sonuc.id, 'GUNCELLE', aktor, { duzeltme: true, eski_kayit_id: eskiPuantajId, onaylayan });
  return sonuc;
}
