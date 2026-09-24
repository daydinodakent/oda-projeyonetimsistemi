// Müşteri ekranları için bağımsız biçimlendirme yardımcıları.
export const formatKurus = (kurus: number, pb = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: pb, maximumFractionDigits: 2 }).format(kurus / 100);
export function formatTarih(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
export const bugun = () => new Date().toISOString().slice(0, 10);

export const DURUM_ETIKET: Record<string, string> = { musait: 'Müsait', opsiyonlu: 'Opsiyonlu', satildi: 'Satıldı', teslim_edildi: 'Teslim Edildi', arsa_sahibi: 'Arsa Sahibi' };
export const DURUM_RENK: Record<string, string> = {
  musait: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400',
  opsiyonlu: 'bg-amber-600/20 border-amber-500/40 text-amber-400',
  satildi: 'bg-blue-600/20 border-blue-500/40 text-blue-400',
  teslim_edildi: 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300',
  arsa_sahibi: 'bg-slate-600/30 border-slate-500/40 text-slate-400',
};
export const TAKSIT_TUR_ETIKET: Record<string, string> = { pesinat: 'Peşinat', taksit: 'Taksit', ara_odeme: 'Ara Ödeme', senet: 'Senet', kredi: 'Banka Kredisi', takas: 'Takas' };
export const ASAMA_ETIKET: Record<string, string> = { aday: 'Aday', gorusme: 'Görüşme', rezervasyon: 'Rezervasyon', satis: 'Satış', kayip: 'Kayıp' };

export const INPUT = 'bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs w-full';
export const KART = 'w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]';
export const BTN_YESIL = 'px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer';
export const BTN_MOR = 'px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer';
export const HATA_KUTU = 'mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs';
