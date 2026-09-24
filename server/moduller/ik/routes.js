// İK REST uçları — server/index.js'e app.use('/api/ik', router) ile
// eklenir. Belge uçları BURADA YOK — Belge Çekirdek'in sahibi olduğu bir
// varlık (bkz. server/moduller/_cekirdek/routes.js '/belgeler'), İK yalnızca
// ilgili_tip='kisi' ile onu ÇAĞIRIR (frontend doğrudan Çekirdek api'sini kullanır).
import express from 'express';
import * as personel from './personel.js';
import * as pdks from './pdks.js';
import * as izin from './izin.js';
import * as avans from './avans.js';
import * as bordroDonemi from './bordroDonemi.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[ik]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Personel ---
router.get('/personel', (req, res) => res.json(personel.listele()));
router.get('/personel/:id', (req, res) => {
  const item = personel.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Personel bulunamadı' });
  res.json(item);
});
router.get('/personel/kisi/:kisiId', (req, res) => res.json(personel.kisiIcinGetir(req.params.kisiId)));
router.post('/personel', (req, res) => {
  try { res.status(201).json(personel.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.put('/personel/:id', (req, res) => {
  try { res.json(personel.guncelle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/personel/:id/cikis', (req, res) => {
  try { res.json(personel.cikisYap(req.params.id, req.body.tarih, req.body.neden, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Vardiya ---
router.get('/vardiyalar', (req, res) => res.json(personel.vardiyalariListele()));
router.post('/vardiyalar', (req, res) => {
  try { res.status(201).json(personel.vardiyaTanimla(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Proje Ataması ---
router.get('/personel/:id/atamalar', (req, res) => res.json(personel.atamalariGetir(req.params.id)));
router.post('/personel/:id/atamalar', (req, res) => {
  try { res.status(201).json(personel.projeyeAta(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Ücret Geçmişi ---
router.get('/personel/:id/ucret', (req, res) => res.json(personel.ucretGecmisiGetir(req.params.id)));
router.post('/personel/:id/ucret', (req, res) => {
  try { res.status(201).json(personel.ucretTanimla(req.params.id, req.body.brut_maas_kurus, req.body.gecerli_baslangic, req.body.aktor, req.body.odeme_periyodu)); }
  catch (err) { hataYaniti(res, err); }
});

// --- PDKS ---
router.get('/pdks/icindekiler', (req, res) => {
  if (!req.query.proje_id || !req.query.tarih) return res.status(400).json({ error: 'proje_id ve tarih gereklidir' });
  res.json(pdks.projeGunuIcindekiler(req.query.proje_id, req.query.tarih));
});
router.post('/pdks', (req, res) => {
  try { res.status(201).json(pdks.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/pdks/:id/duzelt', (req, res) => {
  try { res.json(pdks.duzelt(req.params.id, req.body, req.body.onaylayan, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- İzin ---
router.get('/izin-hakki-tablosu', (req, res) => res.json(izin.hakTablosunuListele()));
router.post('/izin-hakki-tablosu', (req, res) => {
  try { res.status(201).json(izin.hakkiTanimla(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/personel/:id/izin-bakiyesi', (req, res) => {
  try { res.json(izin.bakiyeyiAcYadaGetir(req.params.id, req.body.yil, req.body.kidem_yil, req.body.yas, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/personel/:id/izin-bakiyesi/:yil', (req, res) => res.json(izin.bakiyeGetir(req.params.id, req.params.yil)));
router.get('/personel/:id/izin-talepleri', (req, res) => res.json(izin.personelIcinListele(req.params.id)));
router.post('/izin-talepleri', (req, res) => {
  try { res.status(201).json(izin.talepEt(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/izin-talepleri/:id/onay', (req, res) => {
  try { res.json(izin.onayla(req.params.id, req.body.onaylayan, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/izin-talepleri/:id/red', (req, res) => {
  try { res.json(izin.reddet(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Avans ---
router.get('/personel/:id/avanslar', (req, res) => res.json(avans.personelIcinListele(req.params.id)));
router.post('/avanslar', (req, res) => {
  try { res.status(201).json(avans.talepEt(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/avanslar/:id/onay', (req, res) => {
  try { res.json(avans.onayla(req.params.id, req.body.onaylayan, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/avanslar/:id/red', (req, res) => {
  try { res.json(avans.reddet(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Bordro Dönemi ---
router.get('/bordro-donemleri', (req, res) => res.json(bordroDonemi.listele()));
router.get('/bordro-donemleri/:id', (req, res) => {
  const item = bordroDonemi.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Bordro dönemi bulunamadı' });
  res.json(item);
});
router.post('/bordro-donemleri', (req, res) => {
  try { res.status(201).json(bordroDonemi.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/bordro-donemleri/:id/satirlar', (req, res) => res.json(bordroDonemi.satirlariGetir(req.params.id)));
router.post('/bordro-donemleri/:id/hesapla/:personelId', (req, res) => {
  try { res.json(bordroDonemi.personelHesapla(req.params.id, req.params.personelId, req.body?.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/bordro-donemleri/:id/durum', (req, res) => {
  try { res.json(bordroDonemi.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/bordro-donemleri/:id/disa-aktarim', (req, res) => res.json(bordroDonemi.disaAktarimNoktasi(req.params.id)));
