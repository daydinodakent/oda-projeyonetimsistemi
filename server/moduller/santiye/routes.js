// Şantiye REST uçları — server/index.js'e app.use('/api/santiye', router)
// ile eklenir (generic '/api/:table'dan ÖNCE). Tüm query-string id'leri
// servis katmanında string gelir — karşılaştırma yapan yerlerde Number()
// zorunludur (bkz. CAKISMA_HARITASI.md P6 "tip coercion" dersi).
import express from 'express';
import * as pano from './pano.js';
import * as gunlukRapor from './gunlukRapor.js';
import * as gorev from './gorev.js';
import * as isProgrami from './isProgrami.js';
import * as isg from './isg.js';
import * as kalite from './kalite.js';
import * as ekipman from './ekipman.js';
import * as geojson from './geojson.js';

export const router = express.Router();

function hata(res, err) {
  console.error('[santiye]', err);
  res.status(400).json({ error: String((err && err.message) || err) });
}
const g = (fn) => (req, res) => { try { res.json(fn(req)); } catch (err) { hata(res, err); } };
const p = (fn) => (req, res) => { try { res.status(201).json(fn(req)); } catch (err) { hata(res, err); } };
const gerek = (req, ...alanlar) => { for (const a of alanlar) if (!req.query[a]) throw new Error(`${a} gereklidir`); };

// --- Pano ---
router.get('/pano', g((req) => { gerek(req, 'proje_id'); return pano.panoGetir(req.query.proje_id, req.query.tarih); }));

// --- Günlük Rapor ---
router.get('/gunluk-raporlar', g((req) => { gerek(req, 'proje_id'); return gunlukRapor.listele(req.query.proje_id); }));
router.get('/gunluk-raporlar/gun', g((req) => { gerek(req, 'proje_id', 'tarih'); return gunlukRapor.gunIcinGetir(req.query.proje_id, req.query.tarih); }));
router.get('/gunluk-raporlar/otomatik-onizleme', g((req) => { gerek(req, 'proje_id', 'tarih'); return gunlukRapor.otomatikBolumler(req.query.proje_id, req.query.tarih); }));
router.get('/gunluk-raporlar/:id', (req, res) => { const r = gunlukRapor.getir(req.params.id); r ? res.json(r) : res.status(404).json({ error: 'Rapor bulunamadı' }); });
router.post('/gunluk-raporlar', p((req) => gunlukRapor.olustur(req.body.proje_id, req.body.tarih, req.body.aktor)));
router.post('/gunluk-raporlar/toplu', p((req) => gunlukRapor.topluKaydet(req.body, req.body.aktor)));
router.put('/gunluk-raporlar/:id', g((req) => gunlukRapor.guncelle(req.params.id, req.body, req.body.aktor)));
router.post('/gunluk-raporlar/:id/otomatik-yenile', g((req) => gunlukRapor.otomatikYenile(req.params.id, req.body.aktor)));
router.post('/gunluk-raporlar/:id/bolumler', p((req) => gunlukRapor.bolumEkle(req.params.id, req.body, req.body.aktor)));
router.post('/gunluk-rapor-bolumleri/:id/duzelt', g((req) => gunlukRapor.sayiDuzelt(req.params.id, req.body.sayi, req.body.aktor)));
router.post('/gunluk-raporlar/:id/onay', g((req) => gunlukRapor.onayla(req.params.id, req.body.aktor)));
router.post('/gunluk-raporlar/:id/resmi-defter-taslagi', g((req) => ({ taslak: gunlukRapor.resmiDefterTaslagiUret(req.params.id, req.body.aktor) })));

// --- Görev ---
router.get('/gorevler', g((req) => { gerek(req, 'proje_id'); return gorev.listele(req.query.proje_id); }));
router.post('/gorevler', p((req) => gorev.olustur(req.body, req.body.aktor)));
router.post('/gorevler/:id/durum', g((req) => gorev.durumDegistir(req.params.id, req.body.durum, req.body.aktor)));
router.post('/gorevler/:id/kapat', g((req) => gorev.kapat(req.params.id, req.body.foto_url, req.body.aktor)));
router.get('/gorevler/:id/yorumlar', g((req) => gorev.yorumlariGetir(req.params.id)));
router.post('/gorevler/:id/yorumlar', p((req) => gorev.yorumEkle(req.params.id, req.body.metin, req.body.foto_url, req.body.aktor)));

// --- İş Programı ---
router.get('/is-programi', g((req) => { gerek(req, 'proje_id'); return isProgrami.listele(req.query.proje_id); }));
router.get('/is-programi/plan-gerceklesen', g((req) => { gerek(req, 'proje_id'); return isProgrami.planGerceklesen(req.query.proje_id, req.query.tarih); }));
router.post('/is-programi', p((req) => isProgrami.aktiviteEkle(req.body, req.body.aktor)));
router.post('/is-programi/csv', p((req) => isProgrami.csvIceAktar(req.body.proje_id, req.body.csv, req.body.aktor)));
router.post('/is-programi/:id/yuzde', g((req) => isProgrami.yuzdeGuncelle(req.params.id, req.body.yuzde, req.body.aktor)));

// --- İSG ---
router.post('/isg/egitimler', p((req) => isg.egitimEkle(req.body, req.body.aktor)));
router.get('/isg/kisiler/:kisiId/egitimler', g((req) => isg.egitimleriGetir(req.params.kisiId)));
router.get('/isg/kisiler/:kisiId/kkd', g((req) => isg.kkdDurumu(req.params.kisiId)));
router.get('/isg/egitimler/suresi-dolanlar', g((req) => isg.suresiDolanEgitimler(req.query.tarih, req.query.gun_oncesi ? Number(req.query.gun_oncesi) : 0)));
router.get('/isg/giris-kontrolu', g((req) => { gerek(req, 'kisi_id'); return isg.girisKontrolu(Number(req.query.kisi_id), req.query.tarih); }));
router.post('/isg/giris', g((req) => isg.girisKaydet(req.body.proje_id, Number(req.body.kisi_id), req.body.tarih, { yetkiliOnayi: req.body.yetkiliOnayi, gerekce: req.body.gerekce }, req.body.aktor)));
router.get('/isg/giris', g((req) => { gerek(req, 'proje_id', 'tarih'); return isg.girisleriGetir(req.query.proje_id, req.query.tarih); }));
router.get('/isg/uyarilar', g((req) => { gerek(req, 'proje_id'); return isg.isgUyarilari(req.query.proje_id, req.query.tarih); }));
router.get('/isg/riskler', g((req) => { gerek(req, 'proje_id'); return isg.riskleriGetir(req.query.proje_id); }));
router.post('/isg/riskler', p((req) => isg.riskEkle(req.body, req.body.aktor)));
router.get('/isg/is-izinleri', g((req) => { gerek(req, 'proje_id'); return isg.isIzinleriGetir(req.query.proje_id); }));
router.post('/isg/is-izinleri', p((req) => isg.isIzniTalepEt(req.body, req.body.aktor)));
router.post('/isg/is-izinleri/:id/durum', g((req) => isg.isIzniDurumDegistir(req.params.id, req.body.durum, req.body.onaylayan, req.body.aktor)));
router.get('/isg/denetim-sablonlari', g(() => isg.sablonlariGetir()));
router.post('/isg/denetim-sablonlari', p((req) => isg.sablonEkle(req.body)));
router.get('/isg/denetimler', g((req) => { gerek(req, 'proje_id'); return isg.denetimleriGetir(req.query.proje_id); }));
router.post('/isg/denetimler', p((req) => isg.denetimYanitla(req.body, req.body.aktor)));
router.get('/isg/ramak-kala', g((req) => { gerek(req, 'proje_id'); return isg.ramakKalalariGetir(req.query.proje_id); }));
router.post('/isg/ramak-kala', p((req) => isg.ramakKalaBildir(req.body, req.body.aktor)));
router.get('/isg/olaylar', g((req) => { gerek(req, 'proje_id'); return isg.olaylariGetir(req.query.proje_id); }));
router.post('/isg/olaylar', p((req) => isg.olayKaydet(req.body, req.body.aktor)));
router.post('/isg/olaylar/:id/bildirim-yapildi', g((req) => isg.olayBildirimYapildi(req.params.id, req.body.tarih, req.body.aktor)));
router.get('/isg/duzeltici-faaliyetler', g((req) => { gerek(req, 'proje_id'); return isg.duzelticileriGetir(req.query.proje_id); }));
router.post('/isg/duzeltici-faaliyetler', p((req) => isg.duzelticiEkle(req.body, req.body.aktor)));
router.post('/isg/duzeltici-faaliyetler/:id/kapat', g((req) => isg.duzelticiKapat(req.params.id, req.body.kapanis_notu, req.body.aktor)));

// --- Kalite ---
router.get('/ncr', g((req) => { gerek(req, 'proje_id'); return kalite.ncrListele(req.query.proje_id); }));
router.post('/ncr', p((req) => kalite.ncrAc(req.body, req.body.aktor)));
router.post('/ncr/:id/duzelt', g((req) => kalite.ncrDuzelt(req.params.id, req.body.duzeltme_notu, req.body.aktor)));
router.post('/ncr/:id/kapat', g((req) => kalite.ncrKapat(req.params.id, req.body.tarih, req.body.aktor)));
router.get('/beton-dokumleri', g((req) => { gerek(req, 'proje_id'); return kalite.dokumleriListele(req.query.proje_id); }));
router.post('/beton-dokumleri', p((req) => kalite.dokumEkle(req.body, req.body.aktor)));
router.post('/beton-numuneleri/:id/sonuc', g((req) => kalite.numuneSonucGir(req.params.id, req.body.sonuc_mpa, req.body.tarih, req.body.aktor)));
router.get('/beton-numuneleri/bekleyen', g((req) => { gerek(req, 'proje_id'); return kalite.kirimiBekleyenler(req.query.proje_id, req.query.tarih); }));

// --- Ekipman ---
router.get('/ekipmanlar', g((req) => { gerek(req, 'proje_id'); return ekipman.listele(req.query.proje_id); }));
router.post('/ekipmanlar', p((req) => ekipman.olustur(req.body, req.body.aktor)));
router.post('/ekipmanlar/:id/ariza', g((req) => ekipman.arizaBildir(req.params.id, req.body.notu, req.body.aktor)));
router.get('/ekipmanlar/:id/calismalar', g((req) => ekipman.calismalariGetir(req.params.id)));
router.post('/ekipman-calismalari', p((req) => ekipman.calismaKaydet(req.body, req.body.aktor)));

// --- GeoJSON (harita katmanı için veri servisi) ---
router.get('/geojson', g((req) => { gerek(req, 'proje_id'); return geojson.featureCollection(req.query.proje_id, req.query.katmanlar ? String(req.query.katmanlar).split(',') : undefined); }));
