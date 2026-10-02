// Harita katmanı geçmişi REST uçları — server/index.js'te generic '/api/:table'dan
// ÖNCE mount edilir ('/api/gecmis').
import express from 'express';
import * as gecmis from './gecmis.js';

export const router = express.Router();

export const aktorBul = (req) => {
  const a = req.get('x-oda-aktor');
  return a ? decodeURIComponent(a).trim().slice(0, 60) || null : null;
};
const hata = (res, err, kod = 400) => res.status(kod).json({ error: String((err && err.message) || err) });

router.get('/', (req, res) => {
  try {
    res.json(gecmis.listele({ projeId: req.query.proje_id, tablo: req.query.tablo, kayitId: req.query.kayit_id, limit: req.query.limit }));
  } catch (err) { hata(res, err); }
});
router.get('/:id', (req, res) => {
  const g = gecmis.getir(Number(req.params.id));
  g ? res.json(g) : hata(res, 'Geçmiş kaydı bulunamadı', 404);
});
router.post('/:id/geri-al', (req, res) => {
  try { res.json(gecmis.geriAl(Number(req.params.id), aktorBul(req))); }
  catch (err) { hata(res, err); }
});
