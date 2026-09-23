import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const talep = await import('./talep.js');

const PROJE = 'IGA-ETAP-1';

test('olustur: min_teklif_istisna işaretlenip gerekçe verilmezse reddedilir', () => {
  assert.throws(
    () => talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01', min_teklif_istisna: true }),
    /istisna_gerekcesi zorunludur/
  );
});

test('olustur: geçerli talep TLP- numarasıyla taslak durumunda açılır', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01', aciklama: '2 kamyon kum' });
  assert.equal(t.durum, 'taslak');
  assert.match(t.numara, /^TLP-\d{4}-\d{4}$/);
});

test('kalemEkle: malzeme_id OLMADAN da (eksik tanımlı talep) kalem eklenebilir', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  const k = talep.kalemEkle(t.id, { aciklama: '2 kamyon kum', miktar: 2, birim: 'kamyon' });
  assert.equal(k.malzeme_id, null);
  assert.equal(talep.kalemleriGetir(t.id).length, 1);
});

test('durumDegistir: geçersiz geçiş (taslak -> onaylandi, onay_bekliyor atlanarak) reddedilir', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  assert.throws(() => talep.durumDegistir(t.id, 'onaylandi'), /Geçersiz durum geçişi/);
});

test('durumDegistir: min_teklif_istisna işaretli talep onaylanınca istisna_onaylayan dolar', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01', min_teklif_istisna: true, istisna_gerekcesi: 'Acil — şantiye durdu' });
  talep.durumDegistir(t.id, 'onay_bekliyor');
  const onaylanan = talep.durumDegistir(t.id, 'onaylandi', 77);
  assert.equal(onaylanan.istisna_onaylayan, 77);
});
