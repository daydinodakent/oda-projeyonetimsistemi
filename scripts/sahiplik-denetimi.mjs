// Sahiplik denetimi (P11): her modülün db.js'inde CREATE TABLE ile tanımladığı tablolar o modüle aittir.
// Başka bir modülün (test olmayan) dosyasında o tabloya INSERT/UPDATE/DELETE yapan SQL varsa İHLAL sayılır;
// FROM/JOIN ile okuma ise "çapraz okuma" olarak listelenir (servis yerine doğrudan SQL).
// Kullanım: node scripts/sahiplik-denetimi.mjs   (ihlal varsa çıkış kodu 1)
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.join(process.cwd(), 'server', 'moduller');
const moduller = fs.readdirSync(KOK).filter((d) => fs.statSync(path.join(KOK, d)).isDirectory());
const sahip = new Map();
for (const m of moduller) {
  const dbf = path.join(KOK, m, 'db.js');
  if (!fs.existsSync(dbf)) continue;
  for (const x of fs.readFileSync(dbf, 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_0-9]+)/g)) if (!sahip.has(x[1])) sahip.set(x[1], m);
}

const ihlaller = [];
const okuma = new Map();
for (const m of moduller) {
  for (const f of fs.readdirSync(path.join(KOK, m)).filter((x) => x.endsWith('.js') && !x.endsWith('.test.js'))) {
    const src = fs.readFileSync(path.join(KOK, m, f), 'utf8');
    for (const [tablo, s] of sahip) {
      if (s === m) continue;
      const yaz = new RegExp('(INSERT\\s+(?:OR\\s+\\w+\\s+)?INTO|UPDATE|DELETE\\s+FROM)\\s+' + tablo + '\\b', 'gi');
      for (const x of src.matchAll(yaz)) {
        const satir = src.slice(0, x.index).split('\n').length;
        ihlaller.push({ yazan: `${m}/${f}:${satir}`, tablo, sahip: s, sql: x[1].toUpperCase().replace(/\s+/g, ' ') });
      }
      if (new RegExp('(FROM|JOIN)\\s+' + tablo + '\\b', 'i').test(src)) {
        const k = `${m}/${f}`;
        if (!okuma.has(k)) okuma.set(k, new Set());
        okuma.get(k).add(`${tablo}(${s})`);
      }
    }
  }
}
console.log(`${sahip.size} tablo, ${moduller.length} modül tarandı.`);
console.log('SAHİPLİK İHLALLERİ (başka modülün tablosuna doğrudan yazma):', ihlaller.length);
for (const i of ihlaller) console.log(`  ${i.yazan}  ${i.sql} ${i.tablo}  [sahibi: ${i.sahip}]`);
console.log('\nÇAPRAZ OKUMA (SQL FROM/JOIN — servis yerine doğrudan):');
for (const [k, v] of okuma) console.log(`  ${k} → ${[...v].join(', ')}`);
process.exit(ihlaller.length ? 1 : 0);
