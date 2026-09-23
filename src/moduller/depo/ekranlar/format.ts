// Depo ekranları için bağımsız biçimlendirme yardımcıları (AYNI kalıp:
// src/moduller/sozlesme/ekranlar/format.ts, src/moduller/satinalma/ekranlar/format.ts).
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(kurus / 100);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export const DEPO_TUR_ETIKET: Record<string, string> = {
  merkez: 'Merkez', santiye: 'Şantiye', acik_saha: 'Açık Saha', konteyner: 'Konteyner',
};

export const HAREKET_TUR_ETIKET: Record<string, string> = {
  giris: 'Giriş', cikis: 'Çıkış', transfer_cikis: 'Transfer (Çıkış)', transfer_giris: 'Transfer (Giriş)',
  iade: 'İade', sayim_farki: 'Sayım Farkı', fire: 'Fire',
};

export const TESLIM_ALAN_ETIKET: Record<string, string> = {
  personel: 'Personel', taseron_ekibi: 'Taşeron Ekibi', alt_yuklenici: 'Alt Yüklenici', sarf: 'Doğrudan Sarf',
};

export const ZIMMET_DURUM_ETIKET: Record<string, string> = { zimmette: 'Zimmette', iade_edildi: 'İade Edildi', kayip: 'Kayıp' };
export const ZIMMET_DURUM_RENK: Record<string, string> = {
  zimmette: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
  iade_edildi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  kayip: 'bg-red-600/15 text-red-400 border-red-500/30',
};
