// Taşeron REST uçları — server/index.js'e app.use('/api/taseron', router)
// ile eklenir. Generic '/api/:table' deseninden ÖNCE mount edilmelidir.
import express from 'express';
import * as ekip from './ekip.js';
import * as puantajTaseron from './puantajTaseron.js';
import * as metraj from './metraj.js';
import * as odemeDonemi from './odemeDonemi.js';
import * as kesinti from './kesinti.js';
import * as verimlilik from './verimlilik.js';

export const router = express.Router();

function hataYaniti(res, err) {
  console.error('[taseron]', err);
  res.status(400).json({ error: String(err && err.message || err) });
}

// --- Ekip ---
router.get('/ekipler', (req, res) => {
  if (!req.query.proje_id) return res.status(400).json({ error: 'proje_id gereklidir' });
  res.json(ekip.projeIcinListele(req.query.proje_id));
});
router.get('/ekipler/:id', (req, res) => {
  const item = ekip.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Ekip bulunamadı' });
  res.json(item);
});
router.post('/ekipler', (req, res) => {
  try { res.status(201).json(ekip.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Ekip Üyesi ---
router.get('/ekipler/:id/uyeler', (req, res) => res.json(ekip.ekipUyeleriGetir(req.params.id)));
router.post('/ekipler/:id/uyeler', (req, res) => {
  try { res.status(201).json(ekip.uyeEkle(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/ekip-uyeleri/:id/sgk-bildirge', (req, res) => {
  res.json(ekip.sgkBildirgesiGuncelle(req.params.id, req.body.tarih, req.body.aktor));
});
router.post('/ekip-uyeleri/:id/ayril', (req, res) => {
  ekip.uyeAyril(req.params.id, req.body.tarih, req.body.aktor);
  res.json({ ok: true });
});
router.get('/ekip-uyeleri/:id/yevmiye', (req, res) => res.json(ekip.yevmiyeGecmisiGetir(req.params.id)));
router.post('/ekip-uyeleri/:id/yevmiye', (req, res) => {
  try { res.status(201).json(ekip.yevmiyeTanimla(req.params.id, req.body.yevmiye_kurus, req.body.gecerli_baslangic, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/ekipler/:id/eksik-evrakli-uyeler', (req, res) => res.json(puantajTaseron.eksikEvrakliUyeleriGetir(req.params.id, req.query.tarih)));

// --- Puantaj (Çekirdek'in ince sarmalayıcısı) ---
router.post('/puantaj', (req, res) => {
  try { res.status(201).json(puantajTaseron.kaydet(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/ekipler/:id/puantaj/tum-ekip', (req, res) => {
  res.json(puantajTaseron.tumEkibeUygula(req.params.id, req.body.tarih, req.body.gun_degeri, req.body.maliyet_kodu_id, req.body.aktor));
});
router.get('/kisiler/:kisiId/puantaj', (req, res) => {
  if (!req.query.baslangic || !req.query.bitis) return res.status(400).json({ error: 'baslangic ve bitis gereklidir' });
  res.json(puantajTaseron.kisiAraligiListele(req.params.kisiId, req.query.baslangic, req.query.bitis));
});

// --- Metraj ---
router.get('/ekipler/:id/metraj', (req, res) => res.json(metraj.ekipIcinListele(req.params.id)));
router.post('/ekipler/:id/metraj', (req, res) => {
  try { res.status(201).json(metraj.kaydet(req.params.id, req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/metraj/:id/onay', (req, res) => {
  try { res.json(metraj.sefOnayiVer(req.params.id, req.body.onay_miktari, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Ödeme Dönemi ---
router.get('/ekipler/:id/donemler', (req, res) => res.json(odemeDonemi.ekipIcinListele(req.params.id)));
router.get('/donemler/:id', (req, res) => {
  const item = odemeDonemi.getir(req.params.id);
  if (!item) return res.status(404).json({ error: 'Ödeme dönemi bulunamadı' });
  res.json(item);
});
router.post('/donemler', (req, res) => {
  try { res.status(201).json(odemeDonemi.olustur(req.body, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/donemler/:id/hesapla', (req, res) => {
  try { res.json(odemeDonemi.hesapla(req.params.id, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/donemler/:id/durum', (req, res) => {
  try { res.json(odemeDonemi.durumDegistir(req.params.id, req.body.durum, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/donemler/:id/odeme-talimati', (req, res) => {
  try { res.status(201).json(odemeDonemi.odemeTalimatiOlustur(req.params.id, req.body.vade_tarihi, req.body.aktor)); }
  catch (err) { hataYaniti(res, err); }
});

// --- Kesinti ---
router.get('/donemler/:id/kesintiler', (req, res) => res.json(kesinti.listele(req.params.id)));
router.post('/donemler/:id/kesintiler', (req, res) => {
  try { kesinti.ekle(req.params.id, req.body, req.body.aktor); res.status(201).json(odemeDonemi.tutarlariYenidenHesapla(req.params.id)); }
  catch (err) { hataYaniti(res, err); }
});
router.post('/donemler/:id/kesintiler/malzeme-fire', (req, res) => {
  try { kesinti.malzemeFireKesintisiEkle(req.params.id, req.body.sozlesme_id, req.body.aktor); res.status(201).json(odemeDonemi.tutarlariYenidenHesapla(req.params.id)); }
  catch (err) { hataYaniti(res, err); }
});
router.get('/ekipler/:id/kayip-zimmetler', (req, res) => res.json(kesinti.kayipZimmetleriGetir(req.params.id)));

// --- Verimlilik ---
router.get('/verimlilik', (req, res) => {
  const { ekip_id, sozlesme_kalem_id, baslangic, bitis } = req.query;
  if (!ekip_id || !sozlesme_kalem_id || !baslangic || !bitis) return res.status(400).json({ error: 'ekip_id, sozlesme_kalem_id, baslangic ve bitis gereklidir' });
  try { res.json(verimlilik.raporOlustur(ekip_id, sozlesme_kalem_id, baslangic, bitis)); }
  catch (err) { hataYaniti(res, err); }
});
