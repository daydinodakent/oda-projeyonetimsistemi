// Depo REST uçları — server/index.js'e app.use('/api/depo', router) ile
// eklenir; generic '/api/:table' deseninden ÖNCE mount edilmelidir.
import express from 'express';
import * as malzeme from './malzeme.js';
import * as depo from './depo.js';
import * as stok from './stok.js';
import * as malKabul from './malKabul.js';
import * as zimmet from './zimmet.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[depo]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Malzeme Kartı ---
router.get('/malzemeler', (req, res) => res.json(malzeme.listele()));
router.get('/malzemeler/:id', (req, res) => {
  const item = malzeme.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Malzeme bulunamadı' });
  res.json(item);
});
router.post('/malzemeler', (req, res) => {
  try { res.status(201).json(malzeme.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/malzemeler/:id', (req, res) => {
  malzeme.pasifEt(req.params.id, req.query.aktor);
  res.json({ ok: true });
});
router.get('/malzemeler/:id/birim-donusumleri', (req, res) => res.json(malzeme.birimDonusumleriGetir(req.params.id)));
router.post('/malzemeler/:id/birim-donusumleri', (req, res) => {
  try { malzeme.birimDonusumTanimla(req.params.id, req.body.birim, req.body.katsayi, req.body.aktor); res.status(201).json({ ok: true }); }
  catch (err) { hataYaniti(res, err); }
});

// --- Depo (fiziksel konum) ---
router.get('/depolar', (req, res) => res.json(depo.listele(req.query.proje_id)));
router.post('/depolar', (req, res) => {
  try { res.status(201).json(depo.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/depolar/:id', (req, res) => {
  depo.pasifEt(req.params.id, req.query.aktor);
  res.json({ ok: true });
});

// --- Stok ---
router.get('/stok/:depoId', (req, res) => res.json(stok.depoStoklariGetir(req.params.depoId)));
router.get('/stok/:depoId/:malzemeId', (req, res) => res.json(stok.bakiyeGetir(req.params.depoId, req.params.malzemeId)));
router.get('/stok/:depoId/:malzemeId/hareketler', (req, res) => res.json(stok.hareketGecmisi(req.params.depoId, req.params.malzemeId)));
router.post('/stok/giris', (req, res) => {
  try { res.status(201).json(stok.giris(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/stok/cikis', (req, res) => {
  try { res.status(201).json(stok.cikis(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/kesinti-adaylari', (req, res) => res.json(stok.kesintiAdaylariniListele()));

// --- Transfer ---
router.get('/transferler/:depoId', (req, res) => res.json(stok.transferleriListele(req.params.depoId)));
router.post('/transferler', (req, res) => {
  try { res.status(201).json(stok.transferBaslat(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/transferler/:id/teslim-al', (req, res) => {
  try { res.json(stok.transferTeslimAl(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Sayım ---
router.post('/sayim', (req, res) => {
  try { res.status(201).json(stok.sayimBaslat(req.body.depo_id, req.body.tarih, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/sayim/:id/kalemler', (req, res) => res.json(stok.sayimKalemleriGetir(req.params.id)));
router.post('/sayim/:id/kalemler', (req, res) => {
  try { res.status(201).json(stok.sayimKalemGir(req.params.id, req.body.malzeme_id, req.body.sayilan_miktar)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/sayim/:id/tamamla', (req, res) => {
  try { res.json(stok.sayimTamamla(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Mal Kabul ---
router.post('/mal-kabul', (req, res) => {
  try { res.status(201).json(malKabul.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/siparis-kalemleri/:id/mal-kabul', (req, res) => res.json(malKabul.kalemIcinListele(req.params.id)));

// --- Zimmet ---
router.get('/zimmet', (req, res) => res.json(zimmet.listele(req.query.acik === 'true')));
router.post('/zimmet', (req, res) => {
  try { res.status(201).json(zimmet.ver(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/zimmet/:id/iade', (req, res) => {
  try { res.json(zimmet.iadeEt(req.params.id, req.body.tarih, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/zimmet/:id/kayip', (req, res) => {
  res.json(zimmet.kayipIsaretle(req.params.id, req.body.aktor));
});
