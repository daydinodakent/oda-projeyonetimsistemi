// Alt Yüklenici ekranları için bağımsız biçimlendirme yardımcıları (AYNI
// kalıp: sozlesme/satinalma/depo ekranlar/format.ts).
export function formatKurus(kurus: number, paraBirimi = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: paraBirimi, maximumFractionDigits: 2 }).format(kurus / 100);
}

export function formatTarih(isoTarih?: string | null): string {
  if (!isoTarih) return '—';
  const d = new Date(isoTarih);
  if (Number.isNaN(d.getTime())) return isoTarih;
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export const HAKEDIS_DURUM_ETIKET: Record<string, string> = {
  taslak: 'Taslak', alt_yuklenici_beyani: 'Alt Yüklenici Beyanı', santiye_onayi: 'Şantiye Onayı',
  teknik_ofis: 'Teknik Ofis', onayli: 'Onaylı', reddedildi: 'Reddedildi',
};
export const HAKEDIS_DURUM_RENK: Record<string, string> = {
  taslak: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  alt_yuklenici_beyani: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  santiye_onayi: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
  teknik_ofis: 'bg-blue-600/15 text-blue-400 border-blue-500/30',
  onayli: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  reddedildi: 'bg-red-600/15 text-red-400 border-red-500/30',
};

export const KESINTI_TUR_ETIKET: Record<string, string> = {
  avans_mahsubu: 'Avans Mahsubu', teminat_kesintisi: 'Teminat Kesintisi', malzeme_kesintisi: 'Malzeme Kesintisi',
  ceza: 'Ceza', sgk_bekletme: 'SGK Bekletme', stopaj: 'Stopaj', kdv_tevkifati: 'KDV Tevkifatı', diger: 'Diğer',
};

export const EVRAK_TUR_ETIKET: Record<string, string> = {
  sgk_isyeri_sicili: 'SGK İşyeri Sicili', sigorta: 'Sigorta', isg_uzmani_atamasi: 'İSG Uzmanı Ataması',
  calisan_listesi: 'Çalışan Listesi', iliskiksizlik_belgesi: 'İlişiksizlik Belgesi',
};
export const EVRAK_DURUM_ETIKET: Record<string, string> = { tamam: 'Tamam', eksik: 'Eksik', suresi_gecmis: 'Süresi Geçmiş' };
export const EVRAK_DURUM_RENK: Record<string, string> = {
  tamam: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30',
  eksik: 'bg-red-600/15 text-red-400 border-red-500/30',
  suresi_gecmis: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
};
