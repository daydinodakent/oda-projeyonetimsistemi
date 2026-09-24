// Yetki denetimi (P11): gerçek HTTP katmanında proje bazlı yetki sızıntısı ve hassas veri görünürlüğü
// KANIT üretir (geçici DB, ephemeral port). Kullanım: node scripts/yetki-denetimi.mjs
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_yetki_${crypto.randomUUID()}.sqlite`);
const { default: express } = await import('express');
const R = async (p) => (await import(p)).router;
const app = express();
app.use(express.json());
app.use('/api/cekirdek', await R('../server/moduller/_cekirdek/routes.js'));
app.use('/api/ik', await R('../server/moduller/ik/routes.js'));
app.use('/api/santiye', await R('../server/moduller/santiye/routes.js'));
app.use('/api/maliyet', await R('../server/moduller/maliyet/routes.js'));
app.use('/api/musteri', await R('../server/moduller/musteri/routes.js'));
const sunucu = app.listen(0);
const B = `http://localhost:${sunucu.address().port}/api`;
const j = async (p, b) => { const r = await fetch(B + p, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : undefined); return { s: r.status, b: await r.json() }; };
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));

const kisi = (await j('/cekirdek/kisiler', { ad_soyad: 'Maaşlı Personel', tckn: tckn(), rol: 'personel' })).b;
const p = (await j('/ik/personel', { kisi_id: kisi.id, sicil_no: 'Y-1', ise_giris_tarihi: '2025-01-01' })).b;
await j(`/ik/personel/${p.id}/ucret`, { brut_maas_kurus: 5000000, gecerli_baslangic: '2025-01-01' });
await j('/santiye/gorevler', { proje_id: 'PROJE-B', baslik: 'B projesinin gizli görevi', sorumlu_tipi: 'kisi', sorumlu_id: kisi.id });

const bulgular = [];
const kontrol = (ad, kosul, ayrinti) => { bulgular.push({ ad, sizinti: !!kosul, ayrinti }); console.log(`${kosul ? 'SIZINTI' : 'ok     '}  ${ad}${ayrinti ? ' — ' + ayrinti : ''}`); };

const gorev = await j('/santiye/gorevler?proje_id=PROJE-B');
kontrol('Kimliksiz istemci başka projenin (B) görevlerini okuyabiliyor', gorev.b.length > 0, `${gorev.b.length} kayıt, kimlik/oturum kontrolü yok`);
const ucret = await j(`/ik/personel/${p.id}/ucret`);
kontrol('Kimliksiz istemci personel MAAŞINI okuyabiliyor (rol kontrolü yalnız arayüzde)', ucret.s === 200 && ucret.b.length > 0, `brüt maaş: ${ucret.b[0]?.brut_maas_kurus}`);
const liste = await j('/cekirdek/kisiler');
kontrol('Kişi listesi TÜM projelerin kişilerini döner (proje filtresi yok)', liste.b.length > 0, `${liste.b.length} kişi`);
kontrol('TCKN düz/şifreli değeri API çıktısında', JSON.stringify(liste.b).includes('tckn_sifreli') || /\d{11}/.test(JSON.stringify(liste.b)), 'yalnızca maskeli (tckn_maske) dönmeli');
const pers = await j('/ik/personel');
kontrol('Personel listesi projeden bağımsız tüm personeli döner', pers.b.length > 0, `${pers.b.length} personel`);
const maliyet = await j('/maliyet/portfoy');
kontrol('Portföy maliyet görünümü tüm projelere kimliksiz erişilebilir', maliyet.s === 200, 'proje yetkisi yok');
sunucu.close();
const sizinti = bulgular.filter((b) => b.sizinti && !b.ad.startsWith('TCKN'));
console.log(`\n${sizinti.length} yetki sızıntısı (kimlik doğrulama/yetkilendirme katmanı YOK — tüm uçlar herkese açık).`);
process.exit(0);
