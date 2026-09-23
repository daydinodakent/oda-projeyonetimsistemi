// Depo (geçici/minimal) — ince REST istemcisi.
import type { MalzemeKarti } from './types';

const BASE = '/api/depo';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Depo API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

export const malzemeleriListele = () => istek<MalzemeKarti[]>('/malzemeler');
export const malzemeGetir = (id: number) => istek<MalzemeKarti>(`/malzemeler/${id}`);
export const malzemeOlustur = (item: Partial<MalzemeKarti>, aktor?: number) =>
  istek<MalzemeKarti>('/malzemeler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const malzemePasifEt = (id: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/malzemeler/${id}${aktor ? `?aktor=${aktor}` : ''}`, { method: 'DELETE' });
