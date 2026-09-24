// Maliyet Yönetimi REST uçları — server/index.js'e app.use('/api/maliyet', router).
import express from 'express';
import * as butce from './butce.js';
import { maliyetRaporu, kodHareketleri } from './rapor.js';
import { evmHesapla } from './evm.js';
import { nakitAkisi } from './nakit.js';
import { karlilik } from './karlilik.js';
import { uyarilar } from './uyari.js';
import { portfoy } from './portfoy.js';
import { mutabakatRaporu } from './mutabakat.js';
import * as genelGider from './genelGider.js';
import * as kaynak from './kaynak.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';

export const router = express.Router();
const hata = (res, err) => { console.error('[maliyet]', err); res.status(400).json({ error: String((err && err.message) || err) }); };
const g = (fn) => async (req, res) => { try { res.json(await fn(req)); } catch (err) { hata(res, err); } };
const p = (fn) => async (req, res) => { try { res.status(201).json(await fn(req)); } catch (err) { hata(res, err); } };
const gerek = (req, ...a) => { for (const k of a) if (!req.query[k]) throw new Error(`${k} gereklidir`); };
const sec = (req) => ({ versiyonId: req.query.versiyon_id ? Number(req.query.versiyon_id) : undefined, kurBazi: req.query.kur_bazi || 'nominal', tarih: req.query.tarih });

// --- Bütçe ---
router.get('/butce/versiyonlar', g((req) => { gerek(req, 'proje_id'); return butce.versiyonlariListele(req.query.proje_id); }));
router.post('/butce/versiyonlar', p((req) => butce.versiyonOlustur(req.body.proje_id, req.body, req.body.aktor)));
router.get('/butce/versiyonlar/:id/satirlar', g((req) => butce.satirlariGetir(Number(req.params.id))));
router.post('/butce/versiyonlar/:id/satirlar', p((req) => butce.satirKaydet(Number(req.params.id), req.body, req.body.aktor)));
router.delete('/butce/versiyonlar/:id/satirlar/:kodId', g((req) => { butce.satirSil(Number(req.params.id), Number(req.params.kodId), req.query.aktor); return { ok: true }; }));
router.post('/butce/versiyonlar/:id/onay', g((req) => butce.onayla(Number(req.params.id), req.body.onaylayan, req.body.aktor)));
router.post('/butce/versiyonlar/:id/ice-aktar', g((req) => (req.body.xlsx_base64 ? butce.xlsxIceAktar(Number(req.params.id), req.body.xlsx_base64, req.body.aktor) : butce.csvIceAktar(Number(req.params.id), req.body.csv || '', req.body.aktor))));
router.get('/maliyet-kodlari', g((req) => { gerek(req, 'proje_id'); return maliyetKodu.listele(req.query.proje_id); }));

// --- Raporlar ---
router.get('/rapor', g((req) => { gerek(req, 'proje_id'); return maliyetRaporu(req.query.proje_id, sec(req)); }));
router.get('/rapor/hareketler', g((req) => { gerek(req, 'proje_id', 'maliyet_kodu_id'); return kodHareketleri(req.query.proje_id, req.query.maliyet_kodu_id, sec(req)); }));
router.get('/hareketler/:id/kaynak', g((req) => { const h = maliyetDefteri.hareketGetir(Number(req.params.id)); if (!h) throw new Error('Hareket bulunamadı'); return { hareket: h, kaynak: kaynak.coz(h) }; }));
router.get('/evm', g((req) => { gerek(req, 'proje_id'); return evmHesapla(req.query.proje_id, sec(req)); }));
router.get('/nakit-akisi', g((req) => { gerek(req, 'proje_id'); return nakitAkisi(req.query.proje_id, { periyot: req.query.periyot, tarih: req.query.tarih }); }));
router.get('/karlilik', g((req) => { gerek(req, 'proje_id'); return karlilik(req.query.proje_id, sec(req)); }));
router.get('/uyarilar', g((req) => { gerek(req, 'proje_id'); return uyarilar(req.query.proje_id, sec(req)); }));
router.get('/portfoy', g((req) => portfoy(sec(req))));
router.get('/mutabakat', g((req) => mutabakatRaporu(req.query.proje_id || null)));

// --- Genel gider dağıtımı ---
router.post('/genel-gider/dagit', p((req) => genelGider.dagit(req.body.havuz_proje_id, req.body.donem_baslangic, req.body.donem_bitis, req.body.aktor)));
router.get('/genel-gider/dagitimlar', g((req) => { gerek(req, 'havuz_proje_id'); return genelGider.dagitimlariListele(req.query.havuz_proje_id); }));
