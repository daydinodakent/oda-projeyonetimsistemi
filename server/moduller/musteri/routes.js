// Müşteri REST uçları — server/index.js'e app.use('/api/musteri', router).
import express from 'express';
import * as bolum from './bolum.js';
import * as rezervasyon from './rezervasyon.js';
import * as satis from './satis.js';
import * as odemePlani from './odemePlani.js';
import * as tahsilat from './tahsilat.js';
import * as vade from './vade.js';
import * as teslim from './teslim.js';
import * as satisSonrasi from './satisSonrasi.js';
import * as aday from './aday.js';
import * as kvkk from './kvkk.js';
import * as musteriKarti from './musteriKarti.js';

export const router = express.Router();
const hata = (res, err) => { console.error('[musteri]', err); res.status(400).json({ error: String((err && err.message) || err) }); };
const g = (fn) => (req, res) => { try { res.json(fn(req)); } catch (err) { hata(res, err); } };
const p = (fn) => (req, res) => { try { res.status(201).json(fn(req)); } catch (err) { hata(res, err); } };
const gerek = (req, ...a) => { for (const k of a) if (!req.query[k]) throw new Error(`${k} gereklidir`); };

// --- Bölüm / Fiyat / Satış tablosu ---
router.get('/bolumler', g((req) => { gerek(req, 'proje_id'); rezervasyon.suresiDolanlariSerbestBirak(); return bolum.listele(req.query.proje_id); }));
router.get('/satis-tablosu', g((req) => { gerek(req, 'proje_id'); rezervasyon.suresiDolanlariSerbestBirak(); return bolum.izgara(req.query.proje_id, req.query.tarih); }));
router.get('/bolumler/:id', (req, res) => { const b = bolum.getir(req.params.id); b ? res.json({ ...b, fiyat: bolum.fiyatGetir(b.id), fiyat_gecmisi: bolum.fiyatGecmisi(b.id) }) : res.status(404).json({ error: 'Bölüm bulunamadı' }); });
router.post('/bolumler', p((req) => bolum.olustur(req.body, req.body.aktor)));
router.post('/bolumler/:id/fiyat', p((req) => bolum.fiyatTanimla(Number(req.params.id), req.body.fiyat_kurus, req.body.gecerli_baslangic, req.body.para_birimi, req.body.aktor)));
router.post('/bolumler/:id/arsa-sahibine-ayir', g((req) => bolum.arsaSahibineAyir(Number(req.params.id), req.body.arsa_sozlesme_id, req.body.aktor)));
router.post('/arsa-sozlesmeleri/:id/paylasim-uygula', g((req) => bolum.paylasimListesiUygula(Number(req.params.id), req.body.aktor)));

// --- Rezervasyon ---
router.get('/rezervasyonlar', g((req) => { gerek(req, 'proje_id'); rezervasyon.suresiDolanlariSerbestBirak(); return rezervasyon.projeIcinListele(req.query.proje_id); }));
router.post('/rezervasyonlar', p((req) => rezervasyon.olustur(req.body, req.body.aktor)));
router.post('/rezervasyonlar/:id/iptal', g((req) => rezervasyon.iptalEt(Number(req.params.id), req.body.aktor)));
router.post('/rezervasyonlar/suresi-dolanlari-serbest-birak', g((req) => ({ serbest: rezervasyon.suresiDolanlariSerbestBirak(req.body.tarih, req.body.aktor) })));

// --- Satış / Ödeme planı / Tahsilat ---
router.get('/satislar', g((req) => { gerek(req, 'proje_id'); return satis.projeIcinListele(req.query.proje_id); }));
router.get('/satislar/:id', (req, res) => { const s = satis.getir(Number(req.params.id)); s ? res.json(s) : res.status(404).json({ error: 'Satış bulunamadı' }); });
router.post('/satislar', p((req) => satis.olustur(req.body, req.body.aktor)));
router.post('/satislar/:id/onay', g((req) => satis.onayla(Number(req.params.id), req.body.aktor)));
router.post('/satislar/:id/iptal', g((req) => satis.iptalEt(Number(req.params.id), req.body.aktor)));
router.get('/satislar/:id/plan', g((req) => odemePlani.planGetir(Number(req.params.id))));
router.post('/satislar/:id/plan', p((req) => odemePlani.olustur(Number(req.params.id), req.body.taksitler, req.body.aktor)));
router.post('/satislar/:id/plan/revize', g((req) => odemePlani.revize(Number(req.params.id), req.body.taksitler, req.body.nedeni, req.body.aktor)));
router.get('/planlar/:planId/taksitler', g((req) => odemePlani.versiyonTaksitleri(Number(req.params.planId))));
router.post('/taksitler/:id/kredi-durumu', g((req) => odemePlani.krediDurumuAyarla(Number(req.params.id), req.body.durum, req.body.aktor)));
router.get('/satislar/:id/tahsilatlar', g((req) => tahsilat.satisIcinListele(Number(req.params.id))));
router.get('/satislar/:id/odeme-ozeti', g((req) => tahsilat.odemeOzeti(Number(req.params.id))));
router.post('/satislar/:id/tahsilatlar', p((req) => tahsilat.kaydet({ ...req.body, satis_id: Number(req.params.id) }, req.body.aktor)));

// --- Vadesi geçenler / hatırlatma ---
router.get('/vadesi-gecenler', g((req) => { gerek(req, 'proje_id'); return vade.vadesiGecenler(req.query.proje_id, req.query.tarih); }));
router.post('/hatirlatmalar/uret', g((req) => vade.hatirlatmaUret(req.body.proje_id, req.body.tarih)));
router.get('/hatirlatmalar/bekleyen', g((req) => vade.bekleyenHatirlatmalar(req.query.tarih)));
router.post('/hatirlatmalar/:id/durum', g((req) => { vade.hatirlatmaDurumu(Number(req.params.id), req.body.durum); return { ok: true }; }));

// --- Teslim / Satış sonrası ---
router.get('/satislar/:id/teslim', g((req) => teslim.satisIcinGetir(Number(req.params.id))));
router.post('/satislar/:id/teslim', p((req) => teslim.teslimYap(Number(req.params.id), req.body, req.body.aktor)));
router.post('/teslim-tutanaklari/:id/eksikler', p((req) => teslim.eksikEkle(Number(req.params.id), req.body.aciklama)));
router.post('/teslim-tutanaklari/:id/goreve-donustur', g((req) => teslim.eksikleriGoreveDonustur(Number(req.params.id), req.body, req.body.aktor)));
router.get('/talepler', g((req) => { gerek(req, 'proje_id'); return satisSonrasi.projeIcinListele(req.query.proje_id); }));
router.post('/talepler', p((req) => satisSonrasi.talepAc(req.body, req.body.aktor)));
router.post('/talepler/:id/yonlendir', g((req) => satisSonrasi.yonlendir(Number(req.params.id), req.body, req.body.aktor)));
router.post('/talepler/:id/kapat', g((req) => satisSonrasi.kapat(Number(req.params.id), req.body.aktor)));

// --- Aday / huni ---
router.get('/adaylar', g((req) => { gerek(req, 'proje_id'); return aday.listele(req.query.proje_id); }));
router.get('/adaylar/huni', g((req) => { gerek(req, 'proje_id'); return aday.huni(req.query.proje_id); }));
router.get('/adaylar/:id', (req, res) => { const a = aday.getir(Number(req.params.id)); a ? res.json(a) : res.status(404).json({ error: 'Aday bulunamadı' }); });
router.post('/adaylar', p((req) => aday.olustur(req.body, req.body.aktor)));
router.post('/adaylar/:id/asama', g((req) => aday.asamaDegistir(Number(req.params.id), req.body.asama, req.body.aktor)));
router.post('/adaylar/:id/etkilesimler', p((req) => aday.etkilesimEkle(Number(req.params.id), req.body, req.body.aktor)));
router.post('/adaylar/:id/musteriye-bagla', g((req) => aday.musteriyeBagla(Number(req.params.id), req.body, req.body.aktor)));

// --- Müşteri kartı / KVKK ---
router.get('/musteri-karti', g((req) => musteriKarti.kart({ kisi_id: req.query.kisi_id ? Number(req.query.kisi_id) : undefined, firma_id: req.query.firma_id ? Number(req.query.firma_id) : undefined })));
router.get('/kvkk', g((req) => { gerek(req, 'ilgili_tip', 'ilgili_id'); return { riza: kvkk.listele(req.query.ilgili_tip, Number(req.query.ilgili_id)), durum: kvkk.durum(req.query.ilgili_tip, Number(req.query.ilgili_id)) }; }));
router.post('/kvkk', p((req) => kvkk.rizaKaydet(req.body, req.body.aktor)));
router.post('/kvkk/:id/geri-cek', g((req) => kvkk.geriCek(Number(req.params.id), req.body.tarih, req.body.aktor)));
