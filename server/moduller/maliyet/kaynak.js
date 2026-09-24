// Kaynak belge çözümleyici — Maliyet Defteri hareketinden KAYNAK BELGEYE
// (drill-down) ve tersine, kaynak modüllerde onaylı olup defterde olmayan
// kayıtları bulmaya (mutabakat) yarar.
//
// SAHİPLİK NOTU: burası, diğer modüllerin tablolarını SALT OKUNUR sorgulayan
// TEK yerdir (hiçbir yazma yok). Her modülün servis fonksiyonu tek belge
// için var ama "tüm onaylılar" gibi toplu sorguları (mutabakat için şart)
// yok; bu yüzden okuma tek dosyada toplandı. Yazma/kural mantığı ilgili
// modülde kalır.
import '../sozlesme/db.js';
import '../satinalma/db.js';
import '../depo/db.js';
import '../altyuklenici/db.js';
import '../taseron/db.js';
import '../ik/db.js';
import '../santiye/db.js';
import '../musteri/db.js';
import './db.js';
import { db } from '../_cekirdek/db.js';

const g = (sql, ...p) => db.prepare(sql).get(...p);
const l = (sql, ...p) => db.prepare(sql).all(...p);
const ilk = (kaynakId) => String(kaynakId).split(':')[0];

/** Hareketin kaynak belgesini çözer. { bulundu, iptal, etiket, belge_tipi, belge_id, durum, ozet, zincir[], beklenen_tutar_kurus?, stoklu_fatura_kalemi? } */
export function coz(h) {
  const modul = h.kaynak_modul; const id = ilk(h.kaynak_id);
  const yok = { modul, bulundu: false, iptal: false, etiket: `${modul} #${h.kaynak_id}`, belge_tipi: modul, belge_id: h.kaynak_id, zincir: [] };
  const ana = !String(h.kaynak_id).includes(':'); // ':kur_farki' vb. ek satırlar tutar kıyaslamasına girmez

  if (modul === 'satinalma_siparis') {
    const s = g('SELECT * FROM satinalma_siparis WHERE id = ?', id);
    if (!s) return yok;
    return { modul, bulundu: true, iptal: ['iptal', 'taslak'].includes(s.durum), etiket: `Sipariş ${s.numara}`, belge_tipi: 'Satın Alma Siparişi', belge_id: s.id, durum: s.durum,
      ozet: { numara: s.numara, firma_id: s.firma_id, toplam_tutar_kurus: s.toplam_tutar_kurus, teslim_tarihi: s.teslim_tarihi }, zincir: [], beklenen_tutar_kurus: ana ? s.toplam_tutar_kurus : undefined };
  }
  if (modul === 'satinalma_fatura') {
    const f = g('SELECT * FROM satinalma_fatura WHERE id = ?', id);
    if (!f) return yok;
    const kalemId = String(h.kaynak_id).split('kalem-')[1];
    const k = kalemId ? g('SELECT * FROM satinalma_fatura_kalem WHERE id = ?', kalemId) : null;
    const sk = k?.siparis_kalem_id ? g('SELECT * FROM satinalma_siparis_kalem WHERE id = ?', k.siparis_kalem_id) : null;
    const mz = sk?.malzeme_id ? g('SELECT * FROM malzeme_karti WHERE id = ?', sk.malzeme_id) : null;
    const s = g('SELECT * FROM satinalma_siparis WHERE id = ?', f.siparis_id);
    return { modul, bulundu: !!k || !kalemId, iptal: false, etiket: `Fatura ${f.fatura_no}`, belge_tipi: 'Satın Alma Faturası', belge_id: f.id, durum: f.durum,
      ozet: { fatura_no: f.fatura_no, fatura_tarihi: f.fatura_tarihi, kalem_id: k?.id, kalem_tutar_kurus: k ? Math.round(k.birim_fiyat_kurus * k.miktar) : null },
      zincir: s ? [{ belge_tipi: 'Satın Alma Siparişi', belge_id: s.id, etiket: `Sipariş ${s.numara}` }] : [],
      stoklu_fatura_kalemi: !!(mz && mz.stoklu_mu === 1), beklenen_tutar_kurus: k ? Math.round(k.birim_fiyat_kurus * k.miktar) : undefined };
  }
  if (modul === 'depo_stok_hareketi') {
    const s = g('SELECT * FROM stok_hareketi WHERE id = ?', id);
    if (!s) return yok;
    const mz = g('SELECT * FROM malzeme_karti WHERE id = ?', s.malzeme_id);
    const zincir = [];
    // Çıkışın "geldiği yer": aynı depo+malzemenin en son mal kabulden gelen girişi → mal kabul → sipariş
    const giris = g("SELECT * FROM stok_hareketi WHERE depo_id = ? AND malzeme_id = ? AND tur = 'giris' AND kaynak_belge_modul = 'depo_mal_kabul' AND id <= ? ORDER BY id DESC LIMIT 1", s.depo_id, s.malzeme_id, s.id);
    if (giris) {
      zincir.push({ belge_tipi: 'Depo Girişi', belge_id: giris.id, etiket: `Stok girişi #${giris.id} (${giris.miktar})` });
      const mk = g('SELECT * FROM mal_kabul WHERE id = ?', giris.kaynak_belge_id);
      if (mk) {
        zincir.push({ belge_tipi: 'Mal Kabul', belge_id: mk.id, etiket: `Mal kabul #${mk.id} (${mk.kabul_miktar})` });
        const sk = g('SELECT * FROM satinalma_siparis_kalem WHERE id = ?', mk.siparis_kalem_id);
        const so = sk ? g('SELECT * FROM satinalma_siparis WHERE id = ?', sk.siparis_id) : null;
        if (so) zincir.push({ belge_tipi: 'Satın Alma Siparişi', belge_id: so.id, etiket: `Sipariş ${so.numara}` });
      }
    }
    return { modul, bulundu: true, iptal: s.row_status === 0 || s.emanet_mi === 1, etiket: `Depo ${s.tur} #${s.id} — ${mz?.ad ?? 'malzeme'}`, belge_tipi: 'Depo Stok Hareketi', belge_id: s.id, durum: s.tur,
      ozet: { malzeme: mz?.ad, miktar: s.miktar, teslim_alan_tipi: s.teslim_alan_tipi, emanet_mi: s.emanet_mi, toplam_maliyet_kurus: s.toplam_maliyet_kurus }, zincir,
      beklenen_tutar_kurus: ana ? s.toplam_maliyet_kurus : undefined };
  }
  if (modul === 'altyuklenici_hakedis') {
    const hk = g('SELECT * FROM hakedis WHERE id = ?', id);
    if (!hk) return yok;
    const so = g('SELECT * FROM sozlesme WHERE id = ?', hk.sozlesme_id);
    return { modul, bulundu: true, iptal: hk.row_status === 0 || hk.durum === 'reddedildi', etiket: `Hakediş ${hk.numara}`, belge_tipi: 'Alt Yüklenici Hakedişi', belge_id: hk.id, durum: hk.durum,
      ozet: { numara: hk.numara, donem: `${hk.donem_baslangic} → ${hk.donem_bitis}`, brut_tutar_kurus: hk.brut_tutar_kurus, net_tutar_kurus: hk.net_tutar_kurus },
      zincir: so ? [{ belge_tipi: 'Sözleşme', belge_id: so.id, etiket: `Sözleşme ${so.numara}` }] : [] };
  }
  if (modul === 'taseron_odeme_donemi') {
    const d = g('SELECT * FROM odeme_donemi WHERE id = ?', id);
    if (!d) return yok;
    const parca = String(h.kaynak_id).split(':')[1] || '';
    const pk = parca.startsWith('puantaj-') ? g('SELECT * FROM puantaj_kaydi WHERE id = ?', parca.slice(8)) : null;
    const mt = parca.startsWith('metraj-') ? g('SELECT * FROM taseron_metraj WHERE id = ?', parca.slice(7)) : null;
    const kaynakYok = (parca.startsWith('puantaj-') && !pk) || (parca.startsWith('metraj-') && !mt);
    const kaynakIptal = (pk && pk.row_status === 0) || (mt && mt.row_status === 0);
    const zincir = [];
    if (pk) zincir.push({ belge_tipi: 'Puantaj Kaydı', belge_id: pk.id, etiket: `Puantaj ${pk.tarih} (kişi #${pk.kisi_id}, ${pk.gun_degeri} gün)` });
    if (mt) zincir.push({ belge_tipi: 'Taşeron Metrajı', belge_id: mt.id, etiket: `Metraj ${mt.tarih} (${mt.sef_onay_miktar ?? mt.miktar})` });
    return { modul, bulundu: !kaynakYok, iptal: !!kaynakIptal, etiket: `Taşeron ödeme dönemi ${d.numara}`, belge_tipi: 'Taşeron Ödeme Dönemi', belge_id: d.id, durum: d.durum,
      ozet: { numara: d.numara, donem: `${d.donem_baslangic} → ${d.donem_bitis}`, brut_tutar_kurus: d.brut_tutar_kurus, net_tutar_kurus: d.net_tutar_kurus }, zincir };
  }
  if (modul === 'ik_bordro_donemi') {
    const d = g('SELECT * FROM ik_bordro_donemi WHERE id = ?', id);
    if (!d) return yok;
    return { modul, bulundu: true, iptal: d.row_status === 0, etiket: `Bordro dönemi ${d.numara}`, belge_tipi: 'İK Bordro Dönemi', belge_id: d.id, durum: d.durum, ozet: { numara: d.numara, donem: `${d.donem_yil}-${d.donem_ay}` }, zincir: [] };
  }
  if (modul === 'santiye_ekipman_calisma') {
    const c = g('SELECT * FROM ekipman_calisma WHERE id = ?', id);
    if (!c) return yok;
    const e = g('SELECT * FROM ekipman WHERE id = ?', c.ekipman_id);
    return { modul, bulundu: true, iptal: false, etiket: `${e?.ad ?? 'Ekipman'} çalışma ${c.tarih}`, belge_tipi: 'Ekipman Çalışma Kaydı', belge_id: c.id, durum: 'kayitli',
      ozet: { ekipman: e?.ad, tarih: c.tarih, calisma_saat: c.calisma_saat, tutar_kurus: c.tutar_kurus }, zincir: [], beklenen_tutar_kurus: ana ? c.tutar_kurus : undefined };
  }
  if (modul === 'sozlesme') {
    const s = g('SELECT * FROM sozlesme WHERE id = ?', id);
    if (!s) return yok;
    return { modul, bulundu: true, iptal: s.durum === 'feshedildi', etiket: `Sözleşme ${s.numara}`, belge_tipi: `Sözleşme (${s.tip})`, belge_id: s.id, durum: s.durum,
      ozet: { numara: s.numara, tip: s.tip, konu: s.konu, bedel_kurus: s.bedel_kurus }, zincir: [] };
  }
  if (modul === 'musteri_tahsilat') {
    const t = g('SELECT * FROM tahsilat WHERE id = ?', id);
    if (!t) return yok;
    const satis = g('SELECT * FROM satis WHERE id = ?', t.kaynak_id);
    return { modul, bulundu: true, iptal: t.iptal === 1, etiket: `Tahsilat #${t.id} (${t.tarih})`, belge_tipi: 'Müşteri Tahsilatı', belge_id: t.id, durum: t.iptal ? 'iptal' : 'kayitli',
      ozet: { tutar_kurus: t.tutar_kurus, para_birimi: t.para_birimi, kur: t.kur, yontem: t.yontem }, zincir: satis ? [{ belge_tipi: 'Satış', belge_id: satis.id, etiket: `Satış #${satis.id}` }] : [],
      beklenen_tutar_kurus: ana ? t.tutar_kurus : undefined };
  }
  if (modul === 'butce_versiyon') {
    const v = g('SELECT * FROM butce_versiyon WHERE id = ?', id);
    if (!v) return yok;
    return { modul, bulundu: true, iptal: false, etiket: `Bütçe ${v.ad} (v${v.versiyon_no})`, belge_tipi: 'Bütçe Versiyonu', belge_id: v.id, durum: v.durum, ozet: { ad: v.ad }, zincir: [] };
  }
  return yok;
}

/** Kaynak modüllerde ONAYLI/GEÇERLİ olup defterde karşılığı olmayanlar. projeId=null → global (proje bağımsız kontroller dahil). */
export function defterdeOlmayanlar(projeId, ledgerRows) {
  const var_ = new Set(ledgerRows.map((r) => `${r.kaynak_modul}|${r.kaynak_id}|${r.tur}`));
  const onek = new Set(); // "modul|id:" önekleri
  for (const r of ledgerRows) { const p = String(r.kaynak_id).split(':')[0]; onek.add(`${r.kaynak_modul}|${p}`); }
  const bul = [];
  const pf = projeId ? ' AND proje_id = ?' : ''; const pp = projeId ? [projeId] : [];

  for (const s of l(`SELECT * FROM satinalma_siparis WHERE durum IN ('onaylandi','kismi_teslim','tamamlandi')${pf}`, ...pp)) {
    if (!var_.has(`satinalma_siparis|${s.id}|TAAHHUT`)) bul.push({ tur: 'defterde_yok', modul: 'satinalma_siparis', kaynak_id: String(s.id), proje_id: s.proje_id, etiket: `Sipariş ${s.numara}`, mesaj: 'Onaylı sipariş için TAAHHÜT defterde yok', tutar_kurus: s.toplam_tutar_kurus });
  }
  for (const s of l(`SELECT * FROM sozlesme WHERE durum IN ('imzali','yururlukte','askida','tamamlandi')${pf}`, ...pp)) {
    if (!var_.has(`sozlesme|${s.id}|TAAHHUT`) && !var_.has(`sozlesme|${s.id}|GELIR`)) bul.push({ tur: 'defterde_yok', modul: 'sozlesme', kaynak_id: String(s.id), proje_id: s.proje_id, etiket: `Sözleşme ${s.numara}`, mesaj: 'İmzalı sözleşme için TAAHHÜT/GELİR defterde yok', tutar_kurus: s.bedel_kurus });
  }
  for (const s of l(`SELECT * FROM stok_hareketi WHERE tur = 'cikis' AND emanet_mi = 0 AND row_status = 1 AND maliyet_kodu_id IS NOT NULL${pf}`, ...pp)) {
    if (!var_.has(`depo_stok_hareketi|${s.id}|GERCEKLESEN`)) bul.push({ tur: 'defterde_yok', modul: 'depo_stok_hareketi', kaynak_id: String(s.id), proje_id: s.proje_id, etiket: `Depo çıkışı #${s.id}`, mesaj: 'Maliyete girmesi gereken depo çıkışı defterde yok', tutar_kurus: s.toplam_maliyet_kurus });
  }
  for (const h of l(`SELECT * FROM hakedis WHERE durum = 'onayli' AND row_status = 1${pf}`, ...pp)) {
    if (!onek.has(`altyuklenici_hakedis|${h.id}`)) bul.push({ tur: 'defterde_yok', modul: 'altyuklenici_hakedis', kaynak_id: String(h.id), proje_id: h.proje_id, etiket: `Hakediş ${h.numara}`, mesaj: 'Onaylı hakediş için GERÇEKLEŞEN defterde yok', tutar_kurus: h.brut_tutar_kurus });
  }
  for (const d of l(`SELECT * FROM odeme_donemi WHERE durum = 'kapandi' AND row_status = 1${pf}`, ...pp)) {
    if (d.brut_tutar_kurus > 0 && !onek.has(`taseron_odeme_donemi|${d.id}`)) bul.push({ tur: 'defterde_yok', modul: 'taseron_odeme_donemi', kaynak_id: String(d.id), proje_id: d.proje_id, etiket: `Taşeron dönemi ${d.numara}`, mesaj: 'Kapanmış ödeme dönemi için GERÇEKLEŞEN defterde yok (WBS/maliyet kodsuz puantaj olabilir)', tutar_kurus: d.brut_tutar_kurus });
  }
  for (const c of l(`SELECT * FROM ekipman_calisma WHERE tutar_kurus IS NOT NULL AND maliyet_kodu_id IS NOT NULL${pf}`, ...pp)) {
    if (!var_.has(`santiye_ekipman_calisma|${c.id}|GERCEKLESEN`)) bul.push({ tur: 'defterde_yok', modul: 'santiye_ekipman_calisma', kaynak_id: String(c.id), proje_id: c.proje_id, etiket: `Ekipman çalışma #${c.id}`, mesaj: 'Maliyet kodlu ekipman çalışması defterde yok', tutar_kurus: c.tutar_kurus });
  }
  for (const t of l(`SELECT * FROM tahsilat WHERE iptal = 0 AND kaynak_modul = 'musteri_satis'${pf}`, ...pp)) {
    if (!var_.has(`musteri_tahsilat|${t.id}|GELIR`)) bul.push({ tur: 'defterde_yok', modul: 'musteri_tahsilat', kaynak_id: String(t.id), proje_id: t.proje_id, etiket: `Tahsilat #${t.id}`, mesaj: 'Tahsilat GELİR olarak defterde yok', tutar_kurus: t.tutar_kurus });
  }
  if (!projeId) {
    for (const d of l("SELECT * FROM ik_bordro_donemi WHERE durum IN ('onaylandi','disa_aktarildi') AND row_status = 1")) {
      const satirVar = g('SELECT COUNT(*) AS n FROM ik_bordro_satiri WHERE bordro_donemi_id = ?', d.id).n > 0;
      if (satirVar && !onek.has(`ik_bordro_donemi|${d.id}`)) bul.push({ tur: 'defterde_yok', modul: 'ik_bordro_donemi', kaynak_id: String(d.id), etiket: `Bordro ${d.numara}`, mesaj: 'Onaylı bordro dönemi için hiç GERÇEKLEŞEN defterde yok' });
    }
  }
  return bul;
}
