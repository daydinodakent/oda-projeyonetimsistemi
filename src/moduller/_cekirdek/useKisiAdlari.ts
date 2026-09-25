import { useEffect, useState } from 'react';
import * as cekirdekApi from './api';

/** Kişi ID → ad soyad. Liste yüklenene kadar (veya bulunamazsa) "Kişi #id" döner. TCKN taşınmaz (yalnız ad). */
export function useKisiAdlari(): (id: number) => string {
  const [harita, setHarita] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let iptal = false;
    cekirdekApi.kisileriListele().then((l) => { if (!iptal) setHarita(new Map(l.map((k) => [k.id, k.ad_soyad]))); }).catch(() => undefined);
    return () => { iptal = true; };
  }, []);
  return (id: number) => harita.get(id) ?? `Kişi #${id}`;
}
