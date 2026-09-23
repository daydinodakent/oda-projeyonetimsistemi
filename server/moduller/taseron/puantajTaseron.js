// Taşeron Puantajı — AYRI bir puantaj tablosu/sistemi DEĞİL: Çekirdek
// puantaj.js'in (server/moduller/_cekirdek/puantaj.js) İNCE bir sarmalayıcısı.
// Buradaki tek iş: (1) SGK işe giriş bildirgesi + İSG eğitimi kontrolü
// (KAYIT DIŞI İŞÇİ RİSKİ — görev metni), (2) kapanmış ödeme dönemi kilidi,
// (3) "ekip listesinden tek dokunuşla hepsi tam gün" toplu giriş.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as kisi from '../_cekirdek/kisi.js';
import * as ekip from './ekip.js';

const stmtKapaliDonem = db.prepare(
  `SELECT * FROM odeme_donemi WHERE ekip_id = ? AND durum = 'kapandi' AND ? >= donem_baslangic AND ? <= donem_bitis LIMIT 1`
);

function kapaliDonemKontrolu(ekipId, tarih) {
  const donem = stmtKapaliDonem.get(ekipId, tarih, tarih);
  if (donem) throw new Error(`${tarih} tarihi, KAPANMIŞ bir ödeme dönemine ait (${donem.numara}) — puantaj değiştirilemez. Düzeltme, sonraki dönemde bir fark satırı olarak yapılmalıdır.`);
}

/**
 * SGK işe giriş bildirgesi ve İSG eğitimi kontrolü. Eksikse/süresi
 * geçmişse UYGUN DEĞİL döner — kaydet() bunu YETKİLİ ONAYI olmadan
 * REDDEDER (görev metni: "kontrol edilmeden puantaja yazılamamalı —
 * uyarı + yetkili aşımı, audit").
 */
export function sgkIsgKontrolu(ekipUye, tarih) {
  const nedenler = [];
  if (!ekipUye.sgk_giris_bildirge_tarihi || ekipUye.sgk_giris_bildirge_tarihi > tarih) nedenler.push('SGK işe giriş bildirgesi eksik/henüz girmemiş');
  const kisiKaydi = kisi.getir(ekipUye.kisi_id);
  if (!kisiKaydi?.isg_egitim_gecerlilik_tarihi || kisiKaydi.isg_egitim_gecerlilik_tarihi < tarih) nedenler.push('İSG işe başlama eğitimi eksik/süresi geçmiş');
  return { uygun: nedenler.length === 0, nedenler };
}

/**
 * @param {{ekip_uye_id, tarih, gun_degeri, gun_tipi?, bayram_pazar_mi?, maliyet_kodu_id?, fazla_mesai_saat?, kaynak?, istemci_kayit_id?, yetkiliOnayi?, gerekce?}} item
 */
export function kaydet(item, aktor) {
  const ekipUye = ekip.uyeGetir(item.ekip_uye_id);
  if (!ekipUye) throw new Error('Ekip üyesi bulunamadı');
  const ekipKaydi = ekip.getir(ekipUye.ekip_id);
  if (!ekipKaydi) throw new Error('Ekip bulunamadı');
  // Maliyet kodu (WBS) burada, TAŞERON kuralı olarak ZORUNLU kılınır — bu
  // Çekirdek'in genel puantaj.kaydet()'inde İSTEĞE BAĞLI kalır (İK henüz
  // kurulmadı, oradaki gereksinim farklı olabilir; bu yüzden zorunluluk
  // ÇEKİRDEK seviyesinde DEĞİL, burada uygulanır).
  if (!item.maliyet_kodu_id) throw new Error('Taşeron puantajında maliyet_kodu_id (WBS) zorunludur.');

  kapaliDonemKontrolu(ekipKaydi.id, item.tarih);

  const kontrol = sgkIsgKontrolu(ekipUye, item.tarih);
  if (!kontrol.uygun) {
    if (!item.yetkiliOnayi) {
      throw new Error(`Puantaj engellendi — ${kontrol.nedenler.join('; ')}. Yetkili gerekçeyle aşabilir (yetkiliOnayi + gerekce).`);
    }
    if (!item.gerekce) throw new Error('Yetkili onayı ile puantaj girerken gerekçe zorunludur.');
    audit.kaydet('ekip_uye', item.ekip_uye_id, 'GUNCELLE', aktor, { sgkIsgIstisnasi: kontrol.nedenler, gerekce: item.gerekce, tarih: item.tarih });
  }

  return cekirdekPuantaj.kaydet({
    proje_id: ekipKaydi.proje_id, kisi_id: ekipUye.kisi_id, tarih: item.tarih, gun_degeri: item.gun_degeri,
    gun_tipi: item.gun_tipi, bayram_pazar_mi: item.bayram_pazar_mi, maliyet_kodu_id: item.maliyet_kodu_id,
    fazla_mesai_saat: item.fazla_mesai_saat, kaynak: item.kaynak, istemci_kayit_id: item.istemci_kayit_id,
  }, aktor);
}

/**
 * "Ekip listesinden tek dokunuşla hepsi tam gün + istisnaları düzenleme"
 * (görev metni). Bir üyenin SGK/İSG engeliyle karşılaşması DİĞERLERİNİ
 * durdurmaz — sonuç başarılı/başarısız listesi olarak döner, istisnalar
 * daha sonra tek tek (yetkiliOnayi ile) düzeltilebilir.
 */
export function tumEkibeUygula(ekipId, tarih, gunDegeri, maliyetKoduId, aktor) {
  const basarili = [];
  const basarisiz = [];
  for (const uye of ekip.ekipUyeleriGetir(ekipId)) {
    try {
      basarili.push(kaydet({ ekip_uye_id: uye.id, tarih, gun_degeri: gunDegeri, maliyet_kodu_id: maliyetKoduId }, aktor).kayit);
    } catch (err) {
      basarisiz.push({ ekip_uye_id: uye.id, hata: String(err.message || err) });
    }
  }
  return { basarili, basarisiz };
}

export function kisiGunGetir(kisiId, tarih) {
  return cekirdekPuantaj.kisiGunGetir(kisiId, tarih);
}

export function kisiAraligiListele(kisiId, baslangic, bitis) {
  return cekirdekPuantaj.kisiAraligiListele(kisiId, baslangic, bitis);
}

/** Görev metni: "eksik evraklı işçi uyarıları" ekranının veri kaynağı. */
export function eksikEvrakliUyeleriGetir(ekipId, tarih) {
  const bugun = tarih || new Date().toISOString().slice(0, 10);
  return ekip.ekipUyeleriGetir(ekipId)
    .map((uye) => ({ uye, kontrol: sgkIsgKontrolu(uye, bugun) }))
    .filter((x) => !x.kontrol.uygun);
}
