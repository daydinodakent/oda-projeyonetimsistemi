// Taşeron ekranları için bağımsız biçimlendirme yardımcıları (AYNI kalıp:
// diğer modüllerin ekranlar/format.ts dosyaları).
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(kurus / 100);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export const ODEME_TIPI_ETIKET: Record<string, string> = { yevmiye: 'Yevmiye', metraj: 'Metraj', goturu: 'Götürü', karma: 'Karma' };
export const ROL_SAHA_ETIKET: Record<string, string> = { usta_basi: 'Usta Başı', usta: 'Usta', kalfa: 'Kalfa', duz_isci: 'Düz İşçi' };

export const DONEM_DURUM_ETIKET: Record<string, string> = { acik: 'Açık', sef_onayi: 'Şef Onayı', proje_muduru_onayi: 'Proje Müdürü Onayı', kapandi: 'Kapandı' };
export const DONEM_DURUM_RENK: Record<string, string> = {
  acik: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  sef_onayi: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  proje_muduru_onayi: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
  kapandi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
};

export const KESINTI_TUR_ETIKET: Record<string, string> = {
  avans: 'Avans', yemek: 'Yemek', barinma: 'Barınma', malzeme_fire: 'Malzeme/Fire', alet_kaybi: 'Alet Kaybı', ceza: 'Ceza', diger: 'Diğer',
};

export function haftaGunleri(baslangicIso: string): string[] {
  const gunler: string[] = [];
  const baslangic = new Date(baslangicIso);
  for (let i = 0; i < 7; i++) {
    const d = new Date(baslangic);
    d.setDate(d.getDate() + i);
    gunler.push(d.toISOString().slice(0, 10));
  }
  return gunler;
}
