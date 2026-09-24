// İK ekranları için bağımsız biçimlendirme yardımcıları (AYNI kalıp: diğer
// modüllerin ekranlar/format.ts dosyaları).
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(kurus / 100);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function kidemYiliHesapla(iseGirisTarihi: string, tarih?: string): number {
  const baz = tarih ? new Date(tarih) : new Date();
  const giris = new Date(iseGirisTarihi);
  return Number(((baz.getTime() - giris.getTime()) / (365 * 86400000)).toFixed(2));
}

export const CALISMA_SEKLI_ETIKET: Record<string, string> = { tam_zamanli: 'Tam Zamanlı', yari_zamanli: 'Yarı Zamanlı', gecici: 'Geçici', mevsimlik: 'Mevsimlik' };
export const PDKS_YONTEM_ETIKET: Record<string, string> = { kartli: 'Kartlı', qr: 'QR', mobil_gps: 'Mobil GPS', manuel_sef: 'Manuel (Şef)', biyometrik: 'Biyometrik' };
export const IZIN_TUR_ETIKET: Record<string, string> = { yillik: 'Yıllık İzin', mazeret: 'Mazeret İzni', ucretsiz: 'Ücretsiz İzin', rapor: 'Rapor' };
export const IZIN_DURUM_ETIKET: Record<string, string> = { talep_edildi: 'Talep Edildi', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi', iptal: 'İptal' };
export const IZIN_DURUM_RENK: Record<string, string> = {
  talep_edildi: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  onaylandi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  reddedildi: 'bg-red-600/15 text-red-400 border-red-500/30',
  iptal: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
};
export const BORDRO_DURUM_ETIKET: Record<string, string> = { acik: 'Açık', onaylandi: 'Onaylandı', disa_aktarildi: 'Dışa Aktarıldı' };
