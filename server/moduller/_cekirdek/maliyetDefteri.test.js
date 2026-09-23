import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const maliyetDefteri = await import('./maliyetDefteri.js');
const maliyetKodu = await import('./maliyetKodu.js');
const { putRecord } = await import('../../db.js');

const OLAY = {
  proje_id: 'IGA-ETAP-1', tur: 'GERCEKLESEN', tutar_kurus: 150000_00, // 150.000,00 TL
  tarih: '2026-08-15', kaynak_modul: 'satin_alma', kaynak_id: 'SAT-2026-0001',
};

test('yaz: tutar_kurus tam sayı olmalı — ondalık/float REDDEDİLİR', () => {
  assert.throws(
    () => maliyetDefteri.yaz({ ...OLAY, kaynak_id: 'SAT-FLOAT', tutar_kurus: 1500.5 }),
    /tam sayı/
  );
});

test('yaz: AYNI olay (kaynak_modul, kaynak_id, tur) İKİNCİ kez gönderilirse hata VERMEZ, idempotent döner', () => {
  const ilk = maliyetDefteri.yaz(OLAY);
  assert.equal(ilk.tekrarGonderim, false);
  const ikinci = maliyetDefteri.yaz(OLAY);
  assert.equal(ikinci.tekrarGonderim, true);
  assert.equal(ikinci.kayit.id, ilk.kayit.id, 'ikinci gönderim YENİ bir satır oluşturmamalı');
});

test('yaz: farklı tur ile AYNI kaynak — ayrı bir satır olarak kabul edilir (BÜTÇE ile GERÇEKLEŞEN çakışmaz)', () => {
  const butce = maliyetDefteri.yaz({ ...OLAY, tur: 'BUTCE', kaynak_id: 'SAT-2026-0002', tutar_kurus: 200000_00 });
  const gerceklesen = maliyetDefteri.yaz({ ...OLAY, tur: 'GERCEKLESEN', kaynak_id: 'SAT-2026-0002', tutar_kurus: 195000_00 });
  assert.notEqual(butce.kayit.id, gerceklesen.kayit.id);
});

test('iptalEt: SİLMEZ — orijinali işaretler ve TERS işaretli yeni bir satır ekler', () => {
  const { kayit } = maliyetDefteri.yaz({ ...OLAY, kaynak_id: 'SAT-2026-0003', tutar_kurus: 50000_00 });
  const ters = maliyetDefteri.iptalEt(kayit.id, 1);
  assert.equal(ters.tutar_kurus, -50000_00);
  assert.equal(ters.ters_kayit_id, null, 'ters kayıt kendi başına orijinal değil, ters_kayit_id sadece orijinalde işaretlenir');

  const guncelListe = maliyetDefteri.projeIcinListele('IGA-ETAP-1');
  const orijinal = guncelListe.find((k) => k.id === kayit.id);
  assert.equal(orijinal.iptal_edildi, 1);
  assert.equal(orijinal.ters_kayit_id, ters.id);
});

test('iptalEt: aynı hareket iki kez iptal EDİLEMEZ', () => {
  const { kayit } = maliyetDefteri.yaz({ ...OLAY, kaynak_id: 'SAT-2026-0004', tutar_kurus: 10000_00 });
  maliyetDefteri.iptalEt(kayit.id, 1);
  assert.throws(() => maliyetDefteri.iptalEt(kayit.id, 1), /zaten iptal/);
});

test('ozet: bir maliyet kodunun tür bazında toplamlarını doğru hesaplar (iptaller dahil, net)', () => {
  const proje = 'OZET-TEST-PROJE';
  putRecord('tb_wbs_gorevler', { id: 'wbs-ozet-1', wbs_code: 'OZ1', name: 'Özet Testi WBS', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: proje, wbs_gorev_id: 'wbs-ozet-1', kaynak_tipi: 'malzeme' });

  maliyetDefteri.yaz({ proje_id: proje, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: 1000_00, tarih: '2026-01-01', kaynak_modul: 'x', kaynak_id: 'a' });
  maliyetDefteri.yaz({ proje_id: proje, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: 500_00, tarih: '2026-01-02', kaynak_modul: 'x', kaynak_id: 'b' });
  const { kayit } = maliyetDefteri.yaz({ proje_id: proje, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: 300_00, tarih: '2026-01-03', kaynak_modul: 'x', kaynak_id: 'c' });
  maliyetDefteri.iptalEt(kayit.id, 1);
  const ozet = maliyetDefteri.ozet(mk.id);
  assert.equal(ozet.GERCEKLESEN, 1500_00, '1000+500+300-300(iptal) = 1500 kuruş olmalı');
});
