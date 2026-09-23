// Depo — MİNİMAL/GEÇİCİ malzeme kartı tipleri (bkz. server/moduller/depo/db.js
// başındaki sahiplik notu: P4'te Depo modülüne TAM devredilecek).
export interface MalzemeKarti {
  id: number;
  kod: string;
  ad: string;
  birim: string;
  kategori?: string | null;
  /** MALİYET KURALI'nın kalbi — bkz. server/moduller/satinalma/db.js başı. */
  stoklu_mu: 0 | 1;
  notes?: string | null;
  row_status: 0 | 1;
  create_uid?: number | null;
  create_date: string;
}
