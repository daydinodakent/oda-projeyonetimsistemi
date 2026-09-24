// Nakit Akışı Projeksiyonu — GİDEN: Çekirdek ödeme talimatı vadeleri (henüz
// ödenmemiş), GELEN: müşteri ödeme planlarının kalan taksitleri. Haftalık
// veya aylık kovalara dağıtılır; vadesi geçmiş kalemler ilk kovada
// ("gecikmiş") toplanır. SALT OKUNUR — kaynak veri üretmez.
// SINIRLAMALAR: ödeme talimatı TRY varsayılır (talimatta kur yok); bordro ve
// nakit avans/petty-cash talimat üretmediği için burada görünmez.
import * as odeme from '../_cekirdek/odeme.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as satis from '../musteri/satis.js';
import * as odemePlani from '../musteri/odemePlani.js';

const GIDEN_DURUMLAR = ['TASLAK', 'ONAY_BEKLIYOR', 'ONAYLANDI'];

function hafta(t) { const d = new Date(t); const g = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - g); return d.toISOString().slice(0, 10); }
const ay = (t) => `${t.slice(0, 7)}-01`;

export function nakitAkisi(projeId, { periyot = 'aylik', tarih, baslangicBakiye = 0 } = {}) {
  if (!['haftalik', 'aylik'].includes(periyot)) throw new Error('periyot "haftalik" veya "aylik" olmalıdır.');
  const bugun = tarih || new Date().toISOString().slice(0, 10);
  const kalemler = [];
  for (const t of odeme.talimatlariListele(projeId)) {
    if (!GIDEN_DURUMLAR.includes(t.durum)) continue;
    kalemler.push({ yon: 'cikis', tarih: t.vade_tarihi, tutar_kurus: t.tutar_kurus, etiket: `Ödeme talimatı ${t.numara} — ${t.aciklama}`, kaynak: { modul: 'odeme_talimati', id: t.id }, kesin: t.durum === 'ONAYLANDI' });
  }
  for (const s of satis.projeIcinListele(projeId).filter((x) => x.durum === 'onayli')) {
    const plan = odemePlani.planGetir(s.id);
    if (!plan) continue;
    const kur = s.para_birimi === 'TRY' ? 1 : (parametre.degerAl(`kur_${s.para_birimi}`, bugun)?.deger ?? s.kur);
    for (const k of plan.taksitler.filter((x) => x.kalan_kurus > 0)) {
      kalemler.push({ yon: 'giris', tarih: k.vade_tarihi, tutar_kurus: Math.round(k.kalan_kurus * kur), etiket: `Satış #${s.id} — ${k.tur}`, kaynak: { modul: 'musteri_taksit', id: k.id }, kesin: !(k.tur === 'kredi' && k.kredi_onay_durumu !== 'onaylandi') });
    }
  }
  const kova = (t) => (t < bugun ? 'gecikmis' : periyot === 'haftalik' ? hafta(t) : ay(t));
  const map = new Map();
  for (const k of kalemler) {
    const a = kova(k.tarih);
    const d = map.get(a) || { baslangic: a, giris: 0, cikis: 0, kalemler: [] };
    d[k.yon === 'giris' ? 'giris' : 'cikis'] += k.tutar_kurus;
    d.kalemler.push(k);
    map.set(a, d);
  }
  const sirali = [...map.values()].sort((a, b) => (a.baslangic === 'gecikmis' ? -1 : b.baslangic === 'gecikmis' ? 1 : a.baslangic.localeCompare(b.baslangic)));
  let kumulatif = baslangicBakiye;
  const donemler = sirali.map((d) => { const net = d.giris - d.cikis; kumulatif += net; return { ...d, net, kumulatif }; });
  return {
    proje_id: projeId, periyot, tarih: bugun, baslangic_bakiye_kurus: baslangicBakiye, donemler,
    toplam_giris_kurus: donemler.reduce((t, d) => t + d.giris, 0), toplam_cikis_kurus: donemler.reduce((t, d) => t + d.cikis, 0),
    en_dusuk_kumulatif_kurus: donemler.length ? Math.min(...donemler.map((d) => d.kumulatif)) : baslangicBakiye,
    not: 'Ödeme talimatları TRY varsayılır; bordro ve talimatsız ödemeler görünmez.',
  };
}
