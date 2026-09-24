// Müşteri kartı — bir Kişi/Firma (rol: musteri) için bölümler, ödeme planı,
// tahsilatlar, talepler, belgeler ve KVKK durumu. Hepsi sahibinin servisinden
// OKUNUR; burada saklanan/kopyalanan veri yok.
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as belge from '../_cekirdek/belge.js';
import * as bolum from './bolum.js';
import * as satis from './satis.js';
import * as odemePlani from './odemePlani.js';
import * as tahsilat from './tahsilat.js';
import * as satisSonrasi from './satisSonrasi.js';
import * as kvkk from './kvkk.js';
import * as teslim from './teslim.js';

export function kart({ kisi_id, firma_id }) {
  const musteri = kisi_id ? kisiSrv.getir(kisi_id) : firma_id ? cariFirma.getir(firma_id) : null;
  if (!musteri) throw new Error('Müşteri bulunamadı');
  const satislar = satis.musteriIcinListele({ kisi_id, firma_id }).map((s) => {
    const b = bolum.getir(s.bolum_id);
    return {
      satis: s, bolum: b ? { ...b, etiket: bolum.etiket(b) } : null, plan: odemePlani.planGetir(s.id), odeme: tahsilat.odemeOzeti(s.id) ?? null,
      tahsilatlar: tahsilat.satisIcinListele(s.id), teslim: teslim.satisIcinGetir(s.id), talepler: satisSonrasi.satisIcinListele(s.id),
    };
  });
  return {
    musteri, tip: kisi_id ? 'kisi' : 'firma', satislar,
    belgeler: kisi_id ? belge.ilgiliIcinListele('kisi', kisi_id) : [],
    kvkk: kisi_id ? kvkk.durum('kisi', kisi_id) : null,
  };
}
