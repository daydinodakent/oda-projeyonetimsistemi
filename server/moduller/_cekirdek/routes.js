// Ortak Çekirdek REST uçları — server/index.js'e app.use('/api/cekirdek', router)
// ile eklenir. NOT: generic '/api/:table' deseninden ÖNCE mount edilmelidir
// (bkz. server/index.js'in GPKG export/ETL rotalarındaki AYNI uyarı) —
// aksi halde Express '/api/cekirdek/...'i table='cekirdek' olarak eşleştirir.
//
// aktor: şu an gerçek bir oturum/login sistemi olmadığından (bkz.
// docs/moduller/CAKISMA_HARITASI.md — kimlik doğrulama P0 kapsamı dışında
// kalan bir konu), istek gövdesindeki `aktor` alanı (varsa) kullanılır;
// yoksa null — audit_log.aktor NULL kabul eder.
import express from 'express';
import * as cariFirma from './cariFirma.js';
import * as kisi from './kisi.js';
import * as parametre from './parametre.js';
import { sonraki } from './numaraSerisi.js';
import * as maliyetKodu from './maliyetKodu.js';
import * as maliyetDefteri from './maliyetDefteri.js';
import * as odeme from './odeme.js';
import * as puantaj from './puantaj.js';
import * as audit from './audit.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[cekirdek]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Firma (Cari) ---
router.get('/firmalar', (req, res) => res.json(cariFirma.listele()));
router.get('/firmalar/:id', (req, res) => {
  const item = cariFirma.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Firma bulunamadı' });
  res.json(item);
});
router.post('/firmalar', (req, res) => {
  try { res.status(201).json(cariFirma.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.put('/firmalar/:id', (req, res) => {
  try { res.json(cariFirma.guncelle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/firmalar/:id', (req, res) => {
  cariFirma.pasifEt(req.params.id, req.query.aktor);
  res.json({ ok: true });
});
router.post('/firmalar/:id/kara-liste', (req, res) => {
  try { res.json(cariFirma.karaListeIsaretle(req.params.id, req.body.kara_liste, req.body.notu, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Kişi ---
router.get('/kisiler', (req, res) => res.json(kisi.listele(req.query.rol)));
router.get('/kisiler/:id', (req, res) => {
  const item = kisi.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Kişi bulunamadı' });
  res.json(item);
});
router.post('/kisiler', (req, res) => {
  try { res.status(201).json(kisi.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.put('/kisiler/:id', (req, res) => {
  try { res.json(kisi.guncelle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/kisiler/:id', (req, res) => {
  kisi.pasifEt(req.params.id, req.query.aktor);
  res.json({ ok: true });
});

// --- Parametre ---
router.get('/parametreler', (req, res) => res.json(parametre.listele(req.query.kod)));
router.get('/parametreler/deger', (req, res) => {
  const sonuc = parametre.degerAl(req.query.kod, req.query.tarih);
  if (!sonuc) return res.status(404).json({ error: `"${req.query.kod}" için ${req.query.tarih || 'bugün'} tarihinde geçerli bir parametre bulunamadı` });
  res.json(sonuc);
});
router.post('/parametreler', (req, res) => {
  try { res.status(201).json(parametre.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/parametreler/:id', (req, res) => {
  parametre.pasifEt(req.params.id, req.query.aktor);
  res.json({ ok: true });
});

// --- Numara serileri ---
router.post('/numara-serileri/:seriKodu/sonraki', (req, res) => {
  res.json({ numara: sonraki(req.params.seriKodu, req.body && req.body.yil) });
});

// --- Maliyet Kodu ---
router.get('/maliyet-kodlari', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(maliyetKodu.listele(req.query.proje_id));
});
router.post('/maliyet-kodlari', (req, res) => {
  try { res.status(201).json(maliyetKodu.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Maliyet Defteri ---
router.get('/maliyet-hareketleri', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(maliyetDefteri.projeIcinListele(req.query.proje_id));
});
router.get('/maliyet-hareketleri/ozet/:maliyetKoduId', (req, res) => {
  res.json(maliyetDefteri.ozet(req.params.maliyetKoduId));
});
router.post('/maliyet-hareketleri', (req, res) => {
  try { res.status(201).json(maliyetDefteri.yaz(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/maliyet-hareketleri/:id/iptal', (req, res) => {
  try { res.json(maliyetDefteri.iptalEt(req.params.id, req.body.aktor, req.body.notes)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Ödeme ---
router.get('/odeme-talimatlari', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(odeme.talimatlariListele(req.query.proje_id));
});
router.post('/odeme-talimatlari', (req, res) => {
  try { res.status(201).json(odeme.talimatOlustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/odeme-talimatlari/:id/durum', (req, res) => {
  try { res.json(odeme.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/odeme-talimatlari/:id/odemeler', (req, res) => res.json(odeme.odemeleriListele(req.params.id)));
router.post('/odemeler', (req, res) => {
  try { res.status(201).json(odeme.odemeKaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/odemeler/disa-aktarim-bekleyen', (req, res) => res.json(odeme.disaAktarimNoktasi()));
router.post('/odemeler/:id/disa-aktarildi', (req, res) => {
  odeme.disaAktarildiIsaretle(req.params.id);
  res.json({ ok: true });
});

// --- Puantaj ---
router.get('/puantaj', (req, res) => {
  if (!req.query.proje_id || !req.query.tarih) return res.status(400).json({ error: 'proje_id ve tarih gereklidir' });
  res.json(puantaj.projeGunuListele(req.query.proje_id, req.query.tarih));
});
router.post('/puantaj', (req, res) => {
  try { res.status(201).json(puantaj.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/puantaj/:id/onay', (req, res) => {
  try { res.json(puantaj.onayla(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Audit log (salt okunur, hiçbir yerden yazılmaz) ---
router.get('/audit', (req, res) => {
  if (!req.query.varlik || !req.query.varlik_id) return res.status(400).json({ error: 'varlik ve varlik_id gereklidir' });
  res.json(audit.listele(req.query.varlik, req.query.varlik_id));
});
