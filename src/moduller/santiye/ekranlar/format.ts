// Şantiye ekranları için bağımsız biçimlendirme yardımcıları.
export function formatTarih(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
export function formatKurus(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(kurus / 100);
}
export const bugun = () => new Date().toISOString().slice(0, 10);

export const HAVA_ETIKET: Record<string, string> = { gunesli: 'Güneşli', bulutlu: 'Bulutlu', yagmurlu: 'Yağmurlu', karli: 'Karlı', ruzgarli: 'Rüzgarlı' };
export const SORUMLU_ETIKET: Record<string, string> = { kisi: 'Kişi', taseron_ekibi: 'Taşeron Ekibi', alt_yuklenici: 'Alt Yüklenici' };
export const GOREV_DURUM_ETIKET: Record<string, string> = { acik: 'Açık', devam: 'Devam Ediyor', kapali: 'Kapalı', iptal: 'İptal' };
export const IS_IZNI_ETIKET: Record<string, string> = { yuksekte_calisma: 'Yüksekte Çalışma', sicak_calisma: 'Sıcak Çalışma', kazi: 'Kazı', kapali_alan: 'Kapalı Alan' };
export const OLAY_ETIKET: Record<string, string> = { is_kazasi: 'İş Kazası', meslek_hastaligi: 'Meslek Hastalığı', yaralanmasiz_olay: 'Yaralanmasız Olay' };
export const NCR_DURUM_RENK: Record<string, string> = {
  acik: 'bg-red-600/15 text-red-400 border-red-500/30',
  duzeltildi: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  kapali: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
};

export const INPUT = 'bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs w-full';
export const KART = 'w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]';
export const BTN_YESIL = 'px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer';
export const BTN_MOR = 'px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer';
export const HATA_KUTU = 'mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs';
