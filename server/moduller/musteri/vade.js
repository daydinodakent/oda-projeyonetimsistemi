// Vadesi geçenler + gecikme faizi + hatırlatma KUYRUĞU. Faiz sözleşmenin
// 'ceza' maddesindeki parametre kodundan (parametreler.gecikme_gunluk_yuzde_parametre_kodu,
// günlük %) okunur — koda gömülü oran YOK; madde/parametre yoksa faiz NULL.
// Hatırlatma: SMS/e-posta gönderim entegrasyonu KAPSAM DIŞI — yalnızca kuyruk.
import { db } from './db.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as odemePlani from './odemePlani.js';
import * as bolum from './bolum.js';

const stmtAktifSatislar = db.prepare("SELECT * FROM satis WHERE proje_id = ? AND durum = 'onayli' AND row_status = 1");
const stmtMusteri = db.prepare('SELECT * FROM satis_musteri WHERE satis_id = ? ORDER BY id');
const stmtHatirInsert = db.prepare('INSERT OR IGNORE INTO hatirlatma (taksit_id, ofset_gun, planlanan_tarih, kanal, sablon) VALUES (?, ?, ?, ?, ?)');
const stmtHatirBekleyen = db.prepare("SELECT * FROM hatirlatma WHERE durum = 'bekliyor' AND planlanan_tarih <= ? ORDER BY planlanan_tarih, id");
const stmtHatirDurum = db.prepare('UPDATE hatirlatma SET durum = ? WHERE id = ?');

function gunFarki(a, b) { return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000); }

function gunlukFaizYuzdesi(sozlesmeId, tarih) {
  for (const m of sozlesme.maddeleriGetir(sozlesmeId)) {
    if (m.tur !== 'ceza' || !m.parametreler) continue;
    let p; try { p = JSON.parse(m.parametreler); } catch { continue; }
    const kod = p.gecikme_gunluk_yuzde_parametre_kodu;
    if (kod) { const d = parametre.degerAl(kod, tarih); if (d) return d.deger; }
  }
  return null;
}

/** Vadesi geçmiş, kalanı olan taksitler (kredi onayı bekleyenler işaretlenir). */
export function vadesiGecenler(projeId, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const sonuc = [];
  for (const s of stmtAktifSatislar.all(projeId)) {
    const plan = odemePlani.planGetir(s.id);
    if (!plan) continue;
    const yuzde = gunlukFaizYuzdesi(s.sozlesme_id, t);
    const b = bolum.getir(s.bolum_id);
    for (const k of plan.taksitler) {
      if (k.kalan_kurus <= 0 || k.vade_tarihi >= t) continue;
      const gun = gunFarki(t, k.vade_tarihi);
      sonuc.push({
        satis_id: s.id, bolum: b ? bolum.etiket(b) : null, musteriler: stmtMusteri.all(s.id).map((m) => ({ kisi_id: m.kisi_id, firma_id: m.firma_id })),
        taksit_id: k.id, tur: k.tur, vade_tarihi: k.vade_tarihi, kalan_kurus: k.kalan_kurus, para_birimi: s.para_birimi, gecikme_gun: gun,
        gecikme_faizi_kurus: yuzde == null ? null : Math.round(k.kalan_kurus * (yuzde / 100) * gun),
        kredi_bekliyor_mu: k.tur === 'kredi' && k.kredi_onay_durumu !== 'onaylandi',
      });
    }
  }
  return sonuc.sort((a, b) => b.gecikme_gun - a.gecikme_gun);
}

function ofsetler(tarih) {
  return [
    -(parametre.degerAl('musteri_hatirlatma_once_gun', tarih)?.deger ?? 3),
    parametre.degerAl('musteri_hatirlatma_sonra_gun_1', tarih)?.deger ?? 1,
    parametre.degerAl('musteri_hatirlatma_sonra_gun_2', tarih)?.deger ?? 7,
  ];
}
function tarihEkle(t, gun) { const d = new Date(t); d.setDate(d.getDate() + gun); return d.toISOString().slice(0, 10); }
function sablon(ofset, vade, tutarKurus, pb) {
  const tutar = `${(tutarKurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${pb}`;
  return ofset < 0 ? `Sayın müşterimiz, ${vade} vadeli ${tutar} tutarındaki ödemeniz yaklaşmaktadır.`
    : `Sayın müşterimiz, ${vade} vadeli ${tutar} tutarındaki ödemeniz gecikmiştir; lütfen en kısa sürede ödeme yapınız.`;
}

/** Açık taksitler için hatırlatma dizisini KUYRUĞA yazar (mükerrer eklenmez). Ofsetler parametrik (varsayılan -3, +1, +7 gün). */
export function hatirlatmaUret(projeId, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  let eklenen = 0;
  for (const s of stmtAktifSatislar.all(projeId)) {
    const plan = odemePlani.planGetir(s.id);
    if (!plan) continue;
    for (const k of plan.taksitler.filter((x) => x.kalan_kurus > 0)) {
      for (const o of ofsetler(t)) {
        const info = stmtHatirInsert.run(k.id, o, tarihEkle(k.vade_tarihi, o), 'sms', sablon(o, k.vade_tarihi, k.kalan_kurus, s.para_birimi));
        eklenen += Number(info.changes);
      }
    }
  }
  return { eklenen };
}
export function bekleyenHatirlatmalar(tarih) { return stmtHatirBekleyen.all(tarih || new Date().toISOString().slice(0, 10)); }
export function hatirlatmaDurumu(id, durum) { stmtHatirDurum.run(durum, id); }
