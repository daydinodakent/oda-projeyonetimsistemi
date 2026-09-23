// Satın Alma REST uçları — server/index.js'e app.use('/api/satinalma', router)
// ile eklenir. Generic '/api/:table' deseninden ÖNCE mount edilmelidir.
import express from 'express';
import * as talep from './talep.js';
import * as teklif from './teklif.js';
import * as siparis from './siparis.js';
import * as malKabul from './malKabul.js';
import * as fatura from './fatura.js';
import * as tedarikciKarnesi from './tedarikciKarnesi.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[satinalma]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Talep ---
router.get('/talepler', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(talep.listele(req.query.proje_id));
});
router.get('/talepler/:id', (req, res) => {
  const item = talep.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Talep bulunamadı' });
  res.json(item);
});
router.post('/talepler', (req, res) => {
  try { res.status(201).json(talep.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/talepler/:id/durum', (req, res) => {
  try { res.json(talep.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/talepler/:id/kalemler', (req, res) => res.json(talep.kalemleriGetir(req.params.id)));
router.post('/talepler/:id/kalemler', (req, res) => {
  try { res.status(201).json(talep.kalemEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/talepler/:id/mukayese', (req, res) => {
  try { res.json(teklif.mukayeseSonucu(req.params.id)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Teklif ---
router.get('/talepler/:id/teklifler', (req, res) => res.json(teklif.talepIcinListele(req.params.id)));
router.post('/teklifler', (req, res) => {
  try { res.status(201).json(teklif.talepGonder(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/teklifler/:id/giris', (req, res) => {
  try { res.json(teklif.teklifiGir(req.params.id, req.body.kalemler || [], req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/teklifler/:id/kalemler', (req, res) => res.json(teklif.kalemleriGetir(req.params.id)));
router.post('/teklifler/:id/ele', (req, res) => {
  teklif.elemeIsaretle(req.params.id, req.body.aktor);
  res.json({ ok: true });
});

// --- Sipariş ---
router.get('/siparisler', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(siparis.listele(req.query.proje_id));
});
router.get('/siparisler/:id', (req, res) => {
  const item = siparis.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json(item);
});
router.post('/siparisler', (req, res) => {
  try { res.status(201).json(siparis.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/siparisler/:id/durum', (req, res) => {
  try { res.json(siparis.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/siparisler/:id/kalemler', (req, res) => res.json(siparis.kalemleriGetir(req.params.id)));
router.post('/siparisler/:id/kalemler', (req, res) => {
  try { res.status(201).json(siparis.kalemEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/siparisler/:id/faturalar', (req, res) => res.json(fatura.siparisIcinListele(req.params.id)));

// --- Mal Kabul (geçici/minimal) ---
router.post('/mal-kabul', (req, res) => {
  try { res.status(201).json(malKabul.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/siparis-kalemleri/:id/mal-kabul', (req, res) => res.json(malKabul.kalemIcinListele(req.params.id)));

// --- Fatura ---
router.get('/faturalar/:id', (req, res) => {
  const item = fatura.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Fatura bulunamadı' });
  res.json(item);
});
router.get('/faturalar/:id/kalemler', (req, res) => res.json(fatura.kalemleriGetir(req.params.id)));
router.post('/faturalar', (req, res) => {
  try { res.status(201).json(fatura.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/faturalar/:id/eslestir', (req, res) => {
  try { res.json(fatura.eslestir(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/faturalar/:id/istisnalar', (req, res) => res.json(fatura.istisnalariGetir(req.params.id)));
router.post('/faturalar/:id/odeme-talimati', (req, res) => {
  try { res.status(201).json(fatura.odemeTalimatiOlustur(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Tedarikçi Karnesi ---
router.get('/tedarikci-karnesi/:firmaId', (req, res) => res.json(tedarikciKarnesi.karnesi(req.params.firmaId)));
