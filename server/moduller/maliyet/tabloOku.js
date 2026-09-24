// CSV ve XLSX (Excel) okuyucu — bütçe içe aktarımı için. XLSX yalnızca ilk
// çalışma sayfası, değer hücreleri (paylaşılan metin + sayı); formül SONUCU
// (cached value) okunur. Yeni bağımlılık EKLENMEDİ (jszip zaten projede).
import JSZip from 'jszip';

export function csvSatirlari(metin) {
  const ayirici = metin.includes(';') ? ';' : metin.includes('\t') ? '\t' : ',';
  return metin.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(ayirici).map((h) => h.trim().replace(/^"|"$/g, '')));
}

function kolonNo(ref) {
  const harfler = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const c of harfler) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}
const xmlCoz = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export async function xlsxSatirlari(base64) {
  const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
  const paylasimli = [];
  const ss = zip.file('xl/sharedStrings.xml');
  if (ss) {
    const xml = await ss.async('string');
    for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) || []) {
      paylasimli.push(xmlCoz((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('')));
    }
  }
  const sayfaAdi = Object.keys(zip.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort()[0];
  if (!sayfaAdi) throw new Error('XLSX içinde çalışma sayfası bulunamadı.');
  const xml = await zip.file(sayfaAdi).async('string');
  const satirlar = [];
  for (const satir of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []) {
    const hucreler = [];
    for (const c of satir.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const tip = (c.match(/t="([^"]+)"/) || [])[1];
      const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      const inline = (c.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
      let deger = '';
      if (tip === 's' && v != null) deger = paylasimli[Number(v)] ?? '';
      else if (tip === 'inlineStr') deger = xmlCoz(inline ?? '');
      else if (v != null) deger = xmlCoz(v);
      hucreler[kolonNo(ref)] = deger;
    }
    if (hucreler.some((x) => x !== undefined && x !== '')) satirlar.push(Array.from(hucreler, (x) => x ?? ''));
  }
  return satirlar;
}

/** "1.234,56" / "1234.56" / "1234" → sayı (TL). */
export function sayiCoz(s) {
  const t = String(s).trim().replace(/[^\d.,-]/g, '');
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t);
}
