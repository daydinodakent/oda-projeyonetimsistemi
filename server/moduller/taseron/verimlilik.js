// Verimlilik Raporu — ekip × iş kalemi bazında adam-gün/birim. Puantajdaki
// adam-gün, o iş kaleminin WBS'ine bağlı 'iscilik_taseron' maliyet koduyla
// İLİŞKİLENDİRİLEREK bulunur (RAW puantaj_kaydi sorgusu DEĞİL — Çekirdek'in
// kendi servis fonksiyonu kisiAraligiListele() üzerinden).
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as ekip from './ekip.js';
import * as metraj from './metraj.js';
import * as sozlesme from '../sozlesme/sozlesme.js';

/** @returns {{toplamMetraj, toplamAdamGun, adamGunBirim: number|null}} adamGunBirim = 1 birim iş için harcanan adam-gün — düşük olması daha VERİMLİ demektir. */
export function raporOlustur(ekipId, sozlesmeKalemId, baslangic, bitis) {
  // Number() zorunlu: HTTP query string'inden gelen id her zaman string'dir,
  // DB'den okunan sozlesme_kalem_id ise number — === karşılaştırması aksi
  // halde sessizce hep false döner (canlı testte yakalandı).
  sozlesmeKalemId = Number(sozlesmeKalemId);
  const kalem = sozlesme.kalemGetir(sozlesmeKalemId);
  if (!kalem) throw new Error('Sözleşme kalemi bulunamadı');

  const toplamMetraj = metraj.ekipIcinListele(ekipId)
    .filter((m) => m.sozlesme_kalem_id === sozlesmeKalemId && m.sef_onayli_mi && m.tarih >= baslangic && m.tarih <= bitis)
    .reduce((t, m) => t + m.sef_onay_miktar, 0);

  let toplamAdamGun = 0;
  if (kalem.wbs_gorev_id) {
    const mk = maliyetKodu.wbsIcinListele(kalem.wbs_gorev_id).find((x) => x.kaynak_tipi === 'iscilik_taseron');
    if (mk) {
      for (const uye of ekip.ekipUyeleriGetir(ekipId)) {
        for (const kayit of cekirdekPuantaj.kisiAraligiListele(uye.kisi_id, baslangic, bitis)) {
          if (kayit.maliyet_kodu_id === mk.id) toplamAdamGun += kayit.gun_degeri;
        }
      }
    }
  }

  return {
    ekip_id: ekipId, sozlesme_kalem_id: sozlesmeKalemId, birim: kalem.birim,
    toplamMetraj, toplamAdamGun, adamGunBirim: toplamMetraj > 0 ? Number((toplamAdamGun / toplamMetraj).toFixed(3)) : null,
  };
}
