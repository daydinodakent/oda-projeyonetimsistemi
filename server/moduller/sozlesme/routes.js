// Sözleşme REST uçları — server/index.js'e app.use('/api/sozlesme', router)
// ile eklenir. NOT: generic '/api/:table' deseninden ÖNCE mount edilmelidir
// (bkz. server/moduller/_cekirdek/routes.js'teki AYNI uyarı).
import express from 'express';
import * as sozlesme from './sozlesme.js';
import * as sablon from './sablon.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[sozlesme]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Sözleşme ---
router.get('/', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(sozlesme.listele(req.query.proje_id));
});
router.get('/:id', (req, res) => {
  const item = sozlesme.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Sözleşme bulunamadı' });
  res.json(item);
});
router.post('/', (req, res) => {
  try { res.status(201).json(sozlesme.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/:id/durum', (req, res) => {
  try { res.json(sozlesme.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/:id/kalan-bedel', (req, res) => {
  try { res.json(sozlesme.kalanBedel(req.params.id)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Kalem ---
router.get('/:id/kalemler', (req, res) => res.json(sozlesme.kalemleriGetir(req.params.id)));
router.post('/:id/kalemler', (req, res) => {
  try { res.status(201).json(sozlesme.kalemEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/kalemler/:kalemId', (req, res) => {
  try { sozlesme.kalemSil(req.params.kalemId, req.query.aktor); res.json({ ok: true }); }
  catch (err) { hataYaniti(res, err); }
});

// --- Versiyon / Zeyilname ---
router.get('/:id/versiyonlar', (req, res) => res.json(sozlesme.versiyonlariGetir(req.params.id)));
router.post('/:id/zeyilname', (req, res) => {
  try { res.status(201).json(sozlesme.zeyilnameOlustur(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Madde ---
router.get('/:id/maddeler', (req, res) => res.json(sozlesme.maddeleriGetir(req.params.id)));
router.post('/:id/maddeler', (req, res) => {
  try { res.status(201).json(sozlesme.maddeEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Teminat ---
router.get('/:id/teminatlar', (req, res) => res.json(sozlesme.teminatlariGetir(req.params.id)));
router.post('/:id/teminatlar', (req, res) => {
  try { res.status(201).json(sozlesme.teminatEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/teminatlar/:teminatId/iade', (req, res) => {
  try { sozlesme.teminatIadeIsaretle(req.params.teminatId, req.body.durum, req.body.aktor); res.json({ ok: true }); }
  catch (err) { hataYaniti(res, err); }
});

// --- Belge (mevcut tb_dokumanlar'a referans) ---
router.get('/:id/belgeler', (req, res) => res.json(sozlesme.belgeleriGetir(req.params.id)));
router.post('/:id/belgeler', (req, res) => {
  try { res.status(201).json(sozlesme.belgeBagla(req.params.id, req.body.dokuman_id, req.body.rol, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Kritik Tarihler ---
router.get('/kritik-tarihler/:projeId', (req, res) => res.json(sozlesme.kritikTarihler(req.params.projeId)));

// --- Şablon ---
router.get('/sablonlar/liste', (req, res) => res.json(sablon.listele(req.query.tip)));
router.get('/sablonlar/:sablonId', (req, res) => {
  const item = sablon.getir(req.params.sablonId);
  if (!item) return res.status(404).json({ error: 'Şablon bulunamadı' });
  res.json(item);
});
router.post('/sablonlar', (req, res) => {
  try { res.status(201).json(sablon.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.delete('/sablonlar/:sablonId', (req, res) => {
  sablon.pasifEt(req.params.sablonId, req.query.aktor);
  res.json({ ok: true });
});
router.post('/sablonlar/:sablonId/belge-uret', (req, res) => {
  try { res.json(sablon.belgeUret(req.params.sablonId, req.body.degiskenler || {})); }
  catch (err) { hataYaniti(res, err); }
});
