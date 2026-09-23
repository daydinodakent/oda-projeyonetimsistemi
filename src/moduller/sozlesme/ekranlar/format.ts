// Sözleşme ekranları için küçük, bağımsız biçimlendirme yardımcıları —
// mevcut src/ genelinde ortak bir format util'i olmadığından (bkz. arama),
// burada YENİ paylaşılan bir bağımlılık AÇILMADI, yalnızca bu modüle özel.
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  const tl = kurus / 100;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(tl);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export const SOZLESME_TIP_ETIKET: Record<string, string> = {
  musteri_satis: 'Müşteri Satış',
  alt_yuklenici: 'Alt Yüklenici',
  taseron: 'Taşeron',
  tedarikci_cerceve: 'Tedarikçi Çerçeve',
  kira: 'Kira',
  hizmet: 'Hizmet',
  arsa_sahibi: 'Arsa Sahibi',
};

export const SOZLESME_DURUM_ETIKET: Record<string, string> = {
  taslak: 'Taslak',
  onayda: 'Onayda',
  imzali: 'İmzalı',
  yururlukte: 'Yürürlükte',
  askida: 'Askıda',
  feshedildi: 'Feshedildi',
  tamamlandi: 'Tamamlandı',
};

export const SOZLESME_DURUM_RENK: Record<string, string> = {
  taslak: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  onayda: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  imzali: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
  yururlukte: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  askida: 'bg-orange-600/15 text-orange-400 border-orange-500/30',
  feshedildi: 'bg-red-600/15 text-red-400 border-red-500/30',
  tamamlandi: 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30',
};

export const ACILIYET_RENK: Record<string, string> = {
  gecikti: 'bg-red-600/15 text-red-400 border-red-500/30',
  kritik: 'bg-red-600/15 text-red-400 border-red-500/30',
  yakin: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  bilgi: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
};

export const ACILIYET_ETIKET: Record<string, string> = {
  gecikti: 'Gecikti',
  kritik: 'Kritik',
  yakin: 'Yaklaşıyor',
  bilgi: 'Bilgi',
};
