// Alt Yüklenici REST uçları — server/index.js'e app.use('/api/altyuklenici', router)
// ile eklenir. Generic '/api/:table' deseninden ÖNCE mount edilmelidir.
import express from 'express';
import * as hakedis from './hakedis.js';
import * as kesinti from './kesinti.js';
import * as evrak from './evrak.js';
import * as ilerleme from './ilerleme.js';
import * as performans from './performans.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[altyuklenici]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Hakediş ---
router.get('/sozlesmeler/:sozlesmeId/hakedisler', (req, res) => res.json(hakedis.sozlesmeIcinListele(req.params.sozlesmeId)));
router.get('/hakedisler/:id', (req, res) => {
  const item = hakedis.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Hakediş bulunamadı' });
  res.json(item);
});
router.post('/hakedisler', (req, res) => {
  try { res.status(201).json(hakedis.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/hakedisler/:id/durum', (req, res) => {
  try { res.json(hakedis.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/hakedisler/:id/blokaj-as', (req, res) => {
  try { res.json(hakedis.blokajiAsarakOnayla(req.params.id, req.body.gerekce, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/hakedisler/:id/odeme-talimati', (req, res) => {
  try { res.status(201).json(hakedis.odemeTalimatiOlustur(req.params.id, req.body.vade_tarihi, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Hakediş Kalemi ---
router.get('/hakedisler/:id/kalemler', (req, res) => res.json(hakedis.kalemleriGetir(req.params.id)));
router.post('/hakedisler/:id/kalemler', (req, res) => {
  try { res.status(201).json(hakedis.kalemEkle(req.params.id, req.body.sozlesme_kalem_id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/hakedis-kalemleri/:id/beyan', (req, res) => {
  try { res.json(hakedis.beyanGir(req.params.id, req.body.miktar, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/hakedis-kalemleri/:id/onay', (req, res) => {
  try { res.json(hakedis.onayGir(req.params.id, req.body.miktar, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Kesinti ---
router.get('/hakedisler/:id/kesintiler', (req, res) => res.json(kesinti.listele(req.params.id)));
router.post('/hakedisler/:id/kesintiler', (req, res) => {
  try {
    kesinti.ekle(req.params.id, req.body, req.body.aktor);
    res.status(201).json(hakedis.tutarlariYenidenHesapla(req.params.id));
  } catch (err) { hataYaniti(res, err); }
});
router.post('/hakedisler/:id/kesintiler/parametrik', (req, res) => {
  try {
    kesinti.parametrikKesintiEkle(req.params.id, req.body.tur, req.body.parametre_kodu, req.body.brut_tutar_kurus, req.body.tarih, req.body.aktor);
    res.status(201).json(hakedis.tutarlariYenidenHesapla(req.params.id));
  } catch (err) { hataYaniti(res, err); }
});
router.post('/hakedisler/:id/kesintiler/malzeme', (req, res) => {
  try {
    kesinti.malzemeKesintisiEkle(req.params.id, req.body.sozlesme_id, req.body.aktor);
    res.status(201).json(hakedis.tutarlariYenidenHesapla(req.params.id));
  } catch (err) { hataYaniti(res, err); }
});

// --- Evrak Kontrol ---
router.get('/sozlesmeler/:sozlesmeId/evraklar', (req, res) => res.json(evrak.listele(req.params.sozlesmeId, req.query.son_hakedis === 'true')));
router.post('/sozlesmeler/:sozlesmeId/evraklar/:tur', (req, res) => {
  try { res.status(201).json(evrak.ekleVeyaGuncelle(req.params.sozlesmeId, req.params.tur, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- İlerleme ---
router.get('/sozlesmeler/:sozlesmeId/ilerleme', (req, res) => res.json(ilerleme.listele(req.params.sozlesmeId)));
router.get('/sozlesmeler/:sozlesmeId/ilerleme/ozet', (req, res) => res.json(ilerleme.gecikmeOzeti(req.params.sozlesmeId)));
router.post('/sozlesmeler/:sozlesmeId/ilerleme', (req, res) => {
  try { res.status(201).json(ilerleme.kaydet(req.params.sozlesmeId, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Performans ---
router.get('/sozlesmeler/:sozlesmeId/performans', (req, res) => res.json(performans.listele(req.params.sozlesmeId)));
router.post('/sozlesmeler/:sozlesmeId/performans', (req, res) => {
  try { res.status(201).json(performans.hesaplaVeKaydet(req.params.sozlesmeId, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
