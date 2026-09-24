// Maliyet ekranları için biçimlendirme yardımcıları (TL kuruş → gösterim).
export const tl = (kurus: number | null | undefined) => (kurus == null ? '—' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(kurus / 100));
export const tlTam = (kurus: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(kurus / 100);
export const yuzde = (v: number | null | undefined) => (v == null ? '—' : `%${v.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`);
export function formatTarih(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
export const KUR_BAZI_ETIKET: Record<string, string> = { nominal: 'Nominal TL', sabit: 'Sabit kur (bütçe kuru)', guncel: 'Güncel kur' };
export const TUR_ETIKET: Record<string, string> = { TAAHHUT: 'Taahhüt', GERCEKLESEN: 'Gerçekleşen', GELIR: 'Gelir', BUTCE: 'Bütçe' };
export const BULGU_ETIKET: Record<string, string> = {
  defterde_yok: 'Defterde yok', kaynak_yok: 'Kaynak belge yok', kaynak_iptal: 'Kaynak iptal (ters kayıt yok)', cift_sayim: 'Çift sayım',
  tutar_uyumsuz: 'Tutar uyumsuz', butce_uyumsuz: 'Bütçe uyumsuz', kodsuz: 'Maliyet kodsuz',
};
export const sapmaRenk = (v: number | null | undefined) => (v == null ? '' : v < 0 ? 'text-red-400' : 'text-emerald-400');

export const INPUT = 'bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs w-full';
export const KART = 'w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]';
export const BTN_YESIL = 'px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer';
export const BTN_MOR = 'px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer';
export const HATA_KUTU = 'mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs';
