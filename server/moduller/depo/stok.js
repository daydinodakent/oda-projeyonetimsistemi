// Stok — giriş/çıkış/transfer/sayım. Maliyetlendirme yöntemi AĞIRLIKLI
// ORTALAMA (görev metni: "ağırlıklı ortalama; FIFO'ya geçilebilir olsun" —
// FIFO'ya geçiş, bu dosyanın yöntemi izole tutan tek giriş noktası
// (#agirlikliOrtalamaGuncelle) sayesinde ileride buraya dokunmadan mümkün;
// FIFO'nun kendisi bu geçişte YAZILMADI, kapsam dışı).
//
// MALİYET KURALI (görev metni + P3'ten devam):
//   - GİRİŞ: yalnızca stok_bakiye (miktar + ağırlıklı ortalama) güncellenir.
//     Maliyet Defteri'ne YAZILMAZ (henüz tüketilmedi).
//   - ÇIKIŞ: emanet_mi=0 ise Maliyet Defteri'ne GERÇEKLEŞEN yazılır (maliyet
//     kodu + tutar = miktar × hareket anındaki ağırlıklı ortalama).
//     emanet_mi=1 ise (müşteri/alt yüklenici malı) HİÇBİR ZAMAN yazılmaz —
//     "emanet stok maliyete girmiyor" (KABUL kriteri).
//   - TRANSFER: ne kaynak ne hedefte Maliyet Defteri'ne yazılır — gerçek bir
//     tüketim değil, yalnızca yer değişikliği.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as malzeme from './malzeme.js';
import * as depo from './depo.js';
import * as talep from '../satinalma/talep.js';

const TESLIM_ALAN_TIPLERI = ['personel', 'taseron_ekibi', 'alt_yuklenici', 'sarf'];

const stmtBakiyeGetir = db.prepare('SELECT * FROM stok_bakiye WHERE depo_id = ? AND malzeme_id = ?');
const stmtBakiyeUpsert = db.prepare(
  `INSERT INTO stok_bakiye (depo_id, malzeme_id, mevcut_miktar, agirlikli_ortalama_maliyet_kurus, guncelleme_zamani)
   VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   ON CONFLICT(depo_id, malzeme_id) DO UPDATE SET mevcut_miktar = excluded.mevcut_miktar, agirlikli_ortalama_maliyet_kurus = excluded.agirlikli_ortalama_maliyet_kurus, guncelleme_zamani = excluded.guncelleme_zamani`
);
const stmtBakiyeListeleDepo = db.prepare('SELECT * FROM stok_bakiye WHERE depo_id = ?');

const stmtHareketInsert = db.prepare(
  `INSERT INTO stok_hareketi (depo_id, malzeme_id, tur, miktar, girilen_birim, girilen_miktar, birim_maliyet_kurus, toplam_maliyet_kurus, proje_id, maliyet_kodu_id, teslim_alan_tipi, teslim_alan_aciklama, teslim_alan_kisi_id, teslim_alan_firma_id, emanet_mi, kesinti_adayi_mi, sozlesme_id, kaynak_belge_modul, kaynak_belge_id, istemci_kayit_id, notes, olusturan)
   VALUES (@depo_id, @malzeme_id, @tur, @miktar, @girilen_birim, @girilen_miktar, @birim_maliyet_kurus, @toplam_maliyet_kurus, @proje_id, @maliyet_kodu_id, @teslim_alan_tipi, @teslim_alan_aciklama, @teslim_alan_kisi_id, @teslim_alan_firma_id, @emanet_mi, @kesinti_adayi_mi, @sozlesme_id, @kaynak_belge_modul, @kaynak_belge_id, @istemci_kayit_id, @notes, @olusturan)`
);
const stmtHareketGet = db.prepare('SELECT * FROM stok_hareketi WHERE id = ?');
const stmtHareketBulIstemciId = db.prepare('SELECT * FROM stok_hareketi WHERE istemci_kayit_id = ?');
const stmtHareketGecmisi = db.prepare('SELECT * FROM stok_hareketi WHERE depo_id = ? AND malzeme_id = ? ORDER BY olusturma_zamani DESC');
const stmtKesintiAdaylari = db.prepare("SELECT * FROM stok_hareketi WHERE kesinti_adayi_mi = 1 ORDER BY olusturma_zamani DESC");

export function bakiyeGetir(depoId, malzemeId) {
  return stmtBakiyeGetir.get(depoId, malzemeId) || { depo_id: Number(depoId), malzeme_id: Number(malzemeId), mevcut_miktar: 0, agirlikli_ortalama_maliyet_kurus: 0 };
}

export function depoStoklariGetir(depoId) {
  return stmtBakiyeListeleDepo.all(depoId);
}

export function hareketGecmisi(depoId, malzemeId) {
  return stmtHareketGecmisi.all(depoId, malzemeId);
}

export function kesintiAdaylariniListele() {
  return stmtKesintiAdaylari.all();
}

/**
 * @param {{depo_id, malzeme_id, miktar, birim, birim_maliyet_kurus, proje_id, kaynak_belge_modul?, kaynak_belge_id?, istemci_kayit_id?, notes?}} item
 * birim_maliyet_kurus: GİRİLEN birim başına maliyet (ör. torba başına), ANA
 * BİRİME çevrilirken orantılanır — malzeme kartına gömülü bir sabit DEĞİLDİR.
 */
export function giris(item, aktor) {
  if (item.istemci_kayit_id) {
    const mevcut = stmtHareketBulIstemciId.get(item.istemci_kayit_id);
    if (mevcut) return { kayit: mevcut, tekrarGonderim: true };
  }
  if (!Number.isInteger(item.birim_maliyet_kurus) && typeof item.birim_maliyet_kurus !== 'number') throw new Error('birim_maliyet_kurus sayısal olmalıdır.');
  const anaBirimMiktar = malzeme.birimeCevir(item.malzeme_id, item.miktar, item.birim);
  const girisToplamMaliyet = item.miktar * item.birim_maliyet_kurus;
  const anaBirimBirimMaliyet = anaBirimMiktar > 0 ? girisToplamMaliyet / anaBirimMiktar : 0;

  const eski = bakiyeGetir(item.depo_id, item.malzeme_id);
  const yeniMiktar = eski.mevcut_miktar + anaBirimMiktar;
  const yeniOrtalama = yeniMiktar > 0
    ? (eski.mevcut_miktar * eski.agirlikli_ortalama_maliyet_kurus + anaBirimMiktar * anaBirimBirimMaliyet) / yeniMiktar
    : 0;
  stmtBakiyeUpsert.run(item.depo_id, item.malzeme_id, yeniMiktar, yeniOrtalama);

  const row = {
    depo_id: item.depo_id, malzeme_id: item.malzeme_id, tur: 'giris', miktar: anaBirimMiktar,
    girilen_birim: item.birim, girilen_miktar: item.miktar, birim_maliyet_kurus: anaBirimBirimMaliyet,
    toplam_maliyet_kurus: Math.round(girisToplamMaliyet), proje_id: item.proje_id, maliyet_kodu_id: item.maliyet_kodu_id ?? null,
    teslim_alan_tipi: null, teslim_alan_aciklama: null, teslim_alan_kisi_id: null, teslim_alan_firma_id: null,
    emanet_mi: item.emanet_mi ? 1 : 0, kesinti_adayi_mi: 0, sozlesme_id: null,
    kaynak_belge_modul: item.kaynak_belge_modul ?? null, kaynak_belge_id: item.kaynak_belge_id ?? null,
    istemci_kayit_id: item.istemci_kayit_id ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtHareketInsert.run(row);
  audit.kaydet('stok_hareketi', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { kayit: stmtHareketGet.get(info.lastInsertRowid), tekrarGonderim: false };
}

/**
 * @param {{depo_id, malzeme_id, miktar, birim, proje_id, maliyet_kodu_id, teslim_alan_tipi, teslim_alan_aciklama?, teslim_alan_kisi_id?, teslim_alan_firma_id?, emanet_mi?, kesinti_adayi_mi?, sozlesme_id?, negatifStokOnayi?, kaynak_belge_modul?, kaynak_belge_id?, istemci_kayit_id?, notes?}} item
 * "Çıkış mutlaka kime/hangi iş için olmalı" (görev metni) — maliyet_kodu_id
 * ve teslim_alan_tipi ZORUNLUDUR. negatifStokOnayi=true VERİLMEDİĞİ sürece
 * stok eksiye düşemez ("yetkili istisnası ile").
 */
export function cikis(item, aktor) {
  if (item.istemci_kayit_id) {
    const mevcut = stmtHareketBulIstemciId.get(item.istemci_kayit_id);
    if (mevcut) return { kayit: mevcut, tekrarGonderim: true };
  }
  if (!item.maliyet_kodu_id) throw new Error('Depo çıkışında maliyet_kodu_id (WBS/maliyet kodu) zorunludur.');
  if (!TESLIM_ALAN_TIPLERI.includes(item.teslim_alan_tipi)) throw new Error(`Geçersiz teslim_alan_tipi: ${item.teslim_alan_tipi} (kime/hangi iş için olduğu zorunludur).`);

  const anaBirimMiktar = malzeme.birimeCevir(item.malzeme_id, item.miktar, item.birim);
  const eski = bakiyeGetir(item.depo_id, item.malzeme_id);
  const yeniMiktar = eski.mevcut_miktar - anaBirimMiktar;
  if (yeniMiktar < 0 && !item.negatifStokOnayi) {
    throw new Error(`Yetersiz stok: mevcut ${eski.mevcut_miktar}, istenen ${anaBirimMiktar} — yetkili onayı olmadan stok eksiye düşürülemez (negatifStokOnayi).`);
  }
  stmtBakiyeUpsert.run(item.depo_id, item.malzeme_id, yeniMiktar, eski.agirlikli_ortalama_maliyet_kurus); // ÇIKIŞTA ortalama DEĞİŞMEZ

  const toplamMaliyet = Math.round(anaBirimMiktar * eski.agirlikli_ortalama_maliyet_kurus);
  const row = {
    depo_id: item.depo_id, malzeme_id: item.malzeme_id, tur: 'cikis', miktar: anaBirimMiktar,
    girilen_birim: item.birim, girilen_miktar: item.miktar, birim_maliyet_kurus: eski.agirlikli_ortalama_maliyet_kurus,
    toplam_maliyet_kurus: toplamMaliyet, proje_id: item.proje_id, maliyet_kodu_id: item.maliyet_kodu_id,
    teslim_alan_tipi: item.teslim_alan_tipi, teslim_alan_aciklama: item.teslim_alan_aciklama ?? null,
    teslim_alan_kisi_id: item.teslim_alan_kisi_id ?? null, teslim_alan_firma_id: item.teslim_alan_firma_id ?? null,
    emanet_mi: item.emanet_mi ? 1 : 0, kesinti_adayi_mi: item.kesinti_adayi_mi ? 1 : 0, sozlesme_id: item.sozlesme_id ?? null,
    kaynak_belge_modul: item.kaynak_belge_modul ?? null, kaynak_belge_id: item.kaynak_belge_id ?? null,
    istemci_kayit_id: item.istemci_kayit_id ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtHareketInsert.run(row);
  const hareketId = info.lastInsertRowid;

  if (!row.emanet_mi) {
    maliyetDefteri.yaz({
      proje_id: item.proje_id, maliyet_kodu_id: item.maliyet_kodu_id, tur: 'GERCEKLESEN', tutar_kurus: toplamMaliyet,
      tarih: new Date().toISOString().slice(0, 10), kaynak_modul: 'depo_stok_hareketi', kaynak_id: String(hareketId),
      notes: `Depo çıkışı — ${item.teslim_alan_tipi}`,
    }, aktor);
  }
  audit.kaydet('stok_hareketi', hareketId, 'OLUSTUR', aktor, { yeni: row });

  const malzemeKaydi = malzeme.getir(item.malzeme_id);
  if (malzemeKaydi && malzemeKaydi.min_stok != null && yeniMiktar < malzemeKaydi.min_stok) {
    otomatikTalepTasla(item.proje_id, malzemeKaydi, aktor);
  }
  return { kayit: stmtHareketGet.get(hareketId), tekrarGonderim: false };
}

/** Min stok altına düşünce Satın Alma'ya otomatik talep taslağı (görev metni) — aynı malzeme için AÇIK bir otomatik talep varsa TEKRAR oluşturulmaz. */
function otomatikTalepTasla(projeId, malzemeKaydi, aktor) {
  if (talep.acikOtomatikTalepVarMi(projeId, malzemeKaydi.id)) return;
  const yeniTalep = talep.olustur({
    proje_id: projeId, ihtiyac_tarihi: new Date().toISOString().slice(0, 10),
    aciklama: `[OTOMATIK-MIN-STOK] ${malzemeKaydi.ad} — stok minimumun altına düştü`,
  }, aktor);
  talep.kalemEkle(yeniTalep.id, { malzeme_id: malzemeKaydi.id, aciklama: malzemeKaydi.ad, miktar: malzemeKaydi.max_stok || malzemeKaydi.min_stok || 1, birim: malzemeKaydi.birim }, aktor);
}

// ---------- Transfer (depolar arası — "yoldaki stok" ayrıca izlenir) ----------
const stmtTransferInsert = db.prepare(
  `INSERT INTO transfer (kaynak_depo_id, hedef_depo_id, malzeme_id, miktar, birim_maliyet_kurus, kaynak_hareket_id, olusturan)
   VALUES (@kaynak_depo_id, @hedef_depo_id, @malzeme_id, @miktar, @birim_maliyet_kurus, @kaynak_hareket_id, @olusturan)`
);
const stmtTransferGet = db.prepare('SELECT * FROM transfer WHERE id = ?');
const stmtTransferListeleDepo = db.prepare('SELECT * FROM transfer WHERE (kaynak_depo_id = ? OR hedef_depo_id = ?) ORDER BY olusturma_zamani DESC');
const stmtTransferTamamla = db.prepare("UPDATE transfer SET durum = 'tamamlandi', hedef_hareket_id = ?, teslim_alma_zamani = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** @param {{kaynak_depo_id, hedef_depo_id, malzeme_id, miktar, birim, proje_id}} item */
export function transferBaslat(item, aktor) {
  if (item.kaynak_depo_id === item.hedef_depo_id) throw new Error('Kaynak ve hedef depo aynı olamaz.');
  const anaBirimMiktar = malzeme.birimeCevir(item.malzeme_id, item.miktar, item.birim);
  const eski = bakiyeGetir(item.kaynak_depo_id, item.malzeme_id);
  const yeniMiktar = eski.mevcut_miktar - anaBirimMiktar;
  if (yeniMiktar < 0) throw new Error(`Yetersiz stok: kaynak depoda ${eski.mevcut_miktar}, transfer edilmek istenen ${anaBirimMiktar}.`);
  stmtBakiyeUpsert.run(item.kaynak_depo_id, item.malzeme_id, yeniMiktar, eski.agirlikli_ortalama_maliyet_kurus);

  const hareketRow = {
    depo_id: item.kaynak_depo_id, malzeme_id: item.malzeme_id, tur: 'transfer_cikis', miktar: anaBirimMiktar,
    girilen_birim: item.birim, girilen_miktar: item.miktar, birim_maliyet_kurus: eski.agirlikli_ortalama_maliyet_kurus,
    toplam_maliyet_kurus: Math.round(anaBirimMiktar * eski.agirlikli_ortalama_maliyet_kurus), proje_id: item.proje_id,
    maliyet_kodu_id: null, teslim_alan_tipi: null, teslim_alan_aciklama: `Transfer → depo #${item.hedef_depo_id}`,
    teslim_alan_kisi_id: null, teslim_alan_firma_id: null, emanet_mi: 0, kesinti_adayi_mi: 0, sozlesme_id: null,
    kaynak_belge_modul: 'depo_transfer', kaynak_belge_id: null, istemci_kayit_id: null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const hareketInfo = stmtHareketInsert.run(hareketRow);

  const transferInfo = stmtTransferInsert.run({
    kaynak_depo_id: item.kaynak_depo_id, hedef_depo_id: item.hedef_depo_id, malzeme_id: item.malzeme_id,
    miktar: anaBirimMiktar, birim_maliyet_kurus: eski.agirlikli_ortalama_maliyet_kurus, kaynak_hareket_id: hareketInfo.lastInsertRowid, olusturan: aktor ?? null,
  });
  audit.kaydet('transfer', transferInfo.lastInsertRowid, 'OLUSTUR', aktor, { yeni: hareketRow });
  return stmtTransferGet.get(transferInfo.lastInsertRowid);
}

export function transferTeslimAl(transferId, aktor) {
  const t = stmtTransferGet.get(transferId);
  if (!t) throw new Error('Transfer bulunamadı');
  if (t.durum !== 'yolda') throw new Error(`Transfer "${t.durum}" durumunda — yalnızca "yolda" olan transferler teslim alınabilir.`);
  const kaynakHareket = stmtHareketGet.get(t.kaynak_hareket_id);

  const eski = bakiyeGetir(t.hedef_depo_id, t.malzeme_id);
  const yeniMiktar = eski.mevcut_miktar + t.miktar;
  const yeniOrtalama = yeniMiktar > 0 ? (eski.mevcut_miktar * eski.agirlikli_ortalama_maliyet_kurus + t.miktar * t.birim_maliyet_kurus) / yeniMiktar : 0;
  stmtBakiyeUpsert.run(t.hedef_depo_id, t.malzeme_id, yeniMiktar, yeniOrtalama);

  const hareketRow = {
    depo_id: t.hedef_depo_id, malzeme_id: t.malzeme_id, tur: 'transfer_giris', miktar: t.miktar,
    girilen_birim: kaynakHareket.girilen_birim, girilen_miktar: kaynakHareket.girilen_miktar, birim_maliyet_kurus: t.birim_maliyet_kurus,
    toplam_maliyet_kurus: Math.round(t.miktar * t.birim_maliyet_kurus), proje_id: kaynakHareket.proje_id,
    maliyet_kodu_id: null, teslim_alan_tipi: null, teslim_alan_aciklama: `Transfer ← depo #${t.kaynak_depo_id}`,
    teslim_alan_kisi_id: null, teslim_alan_firma_id: null, emanet_mi: 0, kesinti_adayi_mi: 0, sozlesme_id: null,
    kaynak_belge_modul: 'depo_transfer', kaynak_belge_id: String(transferId), istemci_kayit_id: null, notes: null, olusturan: aktor ?? null,
  };
  const hareketInfo = stmtHareketInsert.run(hareketRow);
  stmtTransferTamamla.run(hareketInfo.lastInsertRowid, transferId);
  audit.kaydet('transfer', transferId, 'GUNCELLE', aktor, { durum: 'tamamlandi' });
  return stmtTransferGet.get(transferId);
}

export function transferleriListele(depoId) {
  return stmtTransferListeleDepo.all(depoId, depoId);
}

// ---------- Sayım ----------
const stmtSayimInsert = db.prepare('INSERT INTO sayim (depo_id, tarih, olusturan) VALUES (?, ?, ?)');
const stmtSayimGet = db.prepare('SELECT * FROM sayim WHERE id = ?');
const stmtSayimTamamla = db.prepare("UPDATE sayim SET durum = 'tamamlandi' WHERE id = ?");
const stmtSayimKalemUpsert = db.prepare(
  `INSERT INTO sayim_kalem (sayim_id, malzeme_id, sistem_miktar, sayilan_miktar) VALUES (?, ?, ?, ?)
   ON CONFLICT(sayim_id, malzeme_id) DO UPDATE SET sayilan_miktar = excluded.sayilan_miktar`
);
const stmtSayimKalemleri = db.prepare('SELECT * FROM sayim_kalem WHERE sayim_id = ?');

export function sayimBaslat(depoId, tarih, aktor) {
  const info = stmtSayimInsert.run(depoId, tarih, aktor ?? null);
  return stmtSayimGet.get(info.lastInsertRowid);
}

export function sayimKalemGir(sayimId, malzemeId, sayilanMiktar) {
  const sayim = stmtSayimGet.get(sayimId);
  if (!sayim) throw new Error('Sayım bulunamadı');
  if (sayim.durum !== 'acik') throw new Error('Bu sayım tamamlanmış — kalem güncellenemez.');
  const sistemMiktar = bakiyeGetir(sayim.depo_id, malzemeId).mevcut_miktar;
  stmtSayimKalemUpsert.run(sayimId, malzemeId, sistemMiktar, sayilanMiktar);
  return stmtSayimKalemleri.all(sayimId).find((k) => k.malzeme_id === Number(malzemeId));
}

export function sayimKalemleriGetir(sayimId) {
  return stmtSayimKalemleri.all(sayimId);
}

/**
 * Sayımı kapatır: her kalem için fark (sayılan - sistem) varsa stok_bakiye
 * SAYILAN değere göre DÜZELTİLİR (ağırlıklı ortalama DEĞİŞMEZ) ve bir
 * 'sayim_farki' hareketi eklenir. Bu hareketin `miktar` alanı, tek bu türde,
 * İŞARETLİDİR (+fazla / -eksik) — diğer türlerde miktar her zaman pozitiftir.
 * Sayım farkı bilinçli olarak Maliyet Defteri'ne YAZILMAZ (muhasebeleştirme
 * ayrı bir süreç — kapsam dışı, bkz. P4 Uygulama Durumu notu).
 */
export function sayimTamamla(sayimId, aktor) {
  const sayim = stmtSayimGet.get(sayimId);
  if (!sayim) throw new Error('Sayım bulunamadı');
  if (sayim.durum !== 'acik') throw new Error('Bu sayım zaten tamamlanmış.');
  const kalemler = stmtSayimKalemleri.all(sayimId);
  const depoKaydi = depo.getir(sayim.depo_id);
  const farklar = [];
  for (const k of kalemler) {
    if (k.sayilan_miktar == null) continue;
    const fark = k.sayilan_miktar - k.sistem_miktar;
    if (fark === 0) continue;
    const eski = bakiyeGetir(sayim.depo_id, k.malzeme_id);
    stmtBakiyeUpsert.run(sayim.depo_id, k.malzeme_id, k.sayilan_miktar, eski.agirlikli_ortalama_maliyet_kurus);
    const row = {
      depo_id: sayim.depo_id, malzeme_id: k.malzeme_id, tur: 'sayim_farki', miktar: fark,
      girilen_birim: malzeme.getir(k.malzeme_id).birim, girilen_miktar: fark, birim_maliyet_kurus: eski.agirlikli_ortalama_maliyet_kurus,
      toplam_maliyet_kurus: Math.round(fark * eski.agirlikli_ortalama_maliyet_kurus), proje_id: depoKaydi?.proje_id ?? null,
      maliyet_kodu_id: null, teslim_alan_tipi: null, teslim_alan_aciklama: `Sayım #${sayimId}`,
      teslim_alan_kisi_id: null, teslim_alan_firma_id: null, emanet_mi: 0, kesinti_adayi_mi: 0, sozlesme_id: null,
      kaynak_belge_modul: 'depo_sayim', kaynak_belge_id: String(sayimId), istemci_kayit_id: null, notes: null, olusturan: aktor ?? null,
    };
    stmtHareketInsert.run(row);
    farklar.push({ malzeme_id: k.malzeme_id, fark });
  }
  stmtSayimTamamla.run(sayimId);
  audit.kaydet('sayim', sayimId, 'GUNCELLE', aktor, { durum: 'tamamlandi', farklar });
  return { sayim: stmtSayimGet.get(sayimId), farklar };
}
