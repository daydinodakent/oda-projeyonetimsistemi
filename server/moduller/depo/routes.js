// Depo (GEÇİCİ/minimal — bkz. db.js) REST uçları. server/index.js'e
// app.use('/api/depo', router) ile eklenir; generic '/api/:table' deseninden
// ÖNCE mount edilmelidir.
import express from 'express';
import * as malzeme from './malzeme.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[depo]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

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
