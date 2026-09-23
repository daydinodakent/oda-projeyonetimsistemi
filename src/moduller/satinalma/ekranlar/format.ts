// Satın Alma ekranları için bağımsız biçimlendirme yardımcıları (bkz.
// src/moduller/sozlesme/ekranlar/format.ts — AYNI kalıp, modül sınırları
// gereği burada TEKRAR tanımlandı, paylaşılan bir util'e taşınmadı).
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(kurus / 100);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export const TALEP_DURUM_ETIKET: Record<string, string> = {
  taslak: 'Taslak', onay_bekliyor: 'Onay Bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi', iptal: 'İptal',
};
export const TALEP_DURUM_RENK: Record<string, string> = {
  taslak: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  onay_bekliyor: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  onaylandi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  reddedildi: 'bg-red-600/15 text-red-400 border-red-500/30',
  iptal: 'bg-red-600/15 text-red-400 border-red-500/30',
};

export const SIPARIS_DURUM_ETIKET: Record<string, string> = {
  taslak: 'Taslak', onaylandi: 'Onaylandı', kismi_teslim: 'Kısmi Teslim', tamamlandi: 'Tamamlandı', iptal: 'İptal',
};
export const SIPARIS_DURUM_RENK: Record<string, string> = {
  taslak: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  onaylandi: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
  kismi_teslim: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  tamamlandi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  iptal: 'bg-red-600/15 text-red-400 border-red-500/30',
};

export const FATURA_DURUM_ETIKET: Record<string, string> = {
  kaydedildi: 'Kaydedildi', eslestirildi: 'Eşleşti', eslesme_istisna: 'Eşleşme İstisnası', odeme_talimati_olusturuldu: 'Ödeme Talimatı Oluşturuldu',
};
export const FATURA_DURUM_RENK: Record<string, string> = {
  kaydedildi: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  eslestirildi: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  eslesme_istisna: 'bg-red-600/15 text-red-400 border-red-500/30',
  odeme_talimati_olusturuldu: 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30',
};

export const ISTISNA_TUR_ETIKET: Record<string, string> = {
  siparis_bulunamadi: 'Sipariş Kalemi Bulunamadı',
  miktar_asimi: 'Miktar Aşımı (Fazla Faturalanmış)',
  fiyat_sapmasi: 'Fiyat Sapması',
  teslim_alinmamis: 'Teslim Alınmamış',
};
