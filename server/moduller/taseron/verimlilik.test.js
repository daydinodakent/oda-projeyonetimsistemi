import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const ekip = await import('./ekip.js');
const puantajTaseron = await import('./puantajTaseron.js');
const metraj = await import('./metraj.js');
const verimlilik = await import('./verimlilik.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';
putRecord('tb_wbs_gorevler', { id: 'wbs-verimlilik-1', wbs_code: 'W1', name: 'Sıva İşleri', row_status: 1 });
const mk = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-verimlilik-1', kaynak_tipi: 'iscilik_taseron' });

test('raporOlustur: adam-gün/birim doğru hesaplanır (düşük değer = daha verimli)', () => {
  const firma = cariFirma.olustur({ unvan: 'Sıva Taşeron', vkn_tckn: '7300000001', roller: ['taseron'] });
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Sıva işleri', bedel_kurus: 500000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const kalem = sozlesme.kalemEkle(s.id, { wbs_gorev_id: 'wbs-verimlilik-1', aciklama: 'İç sıva', birim: 'm2', miktar: 1000, birim_fiyat_kurus: 5000 });
  const e = ekip.olustur({ sozlesme_id: s.id, odeme_tipi: 'metraj' });

  const k = kisiMod.olustur({ ad_soyad: 'Sıva Ustası', tckn: '78901234567', rol: 'taseron_iscisi', isg_egitim_gecerlilik_tarihi: '2030-01-01' });
  const uye = ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: '2026-01-01' });
  ekip.yevmiyeTanimla(uye.id, 50000, '2026-01-01'); // verimlilik puantajı için gerekli değil ama tam gün girişi kaydet() üzerinden yapılabilsin diye

  // 4 adam-gün harcanmış (2 gün × 2 gündeğeri toplamı basitleştirme: tek kişi 4 gün çalışmış).
  for (const tarih of ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04']) {
    puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih, gun_degeri: 1, maliyet_kodu_id: mk.id });
  }
  // 100 m2 sıva yapılmış (şef onaylı).
  const m = metraj.kaydet(e.id, { sozlesme_kalem_id: kalem.id, tarih: '2026-03-04', miktar: 100 });
  metraj.sefOnayiVer(m.id, 100);

  const rapor = verimlilik.raporOlustur(e.id, kalem.id, '2026-03-01', '2026-03-04');
  assert.equal(rapor.toplamMetraj, 100);
  assert.equal(rapor.toplamAdamGun, 4);
  assert.equal(rapor.adamGunBirim, 0.04, '4 adam-gün / 100 m2 = 0,04 adam-gün/m2');
});
