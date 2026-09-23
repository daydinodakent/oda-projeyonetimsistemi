// Çevrimdışı kuyruk — saha ekranları (puantaj, günlük rapor, depo çıkış,
// mal kabul) için genel amaçlı, localStorage tabanlı yazma kuyruğu.
//
// ÖNEMLİ: bu geçişte HİÇBİR mevcut ekrana BAĞLANMADI (ÇALIŞMA KURALLARI:
// "mevcut ekranlar bozulmaz"). Bağımsız, tekrar kullanılabilir bir modül —
// bir sonraki geçişte ilgili saha ekranı bunu import edip kullanacak.
//
// Kullanım deseni:
//   const kuyruk = createOfflineQueue<PuantajKaydi>({ kuyrukAdi: 'puantaj', gonder: puantajKaydet });
//   kuyruk.ekle(kayit);          // her zaman önce localStorage'a yazar
//   window.addEventListener('online', () => kuyruk.gonderiyiDene());
//
// istemci_kayit_id (crypto.randomUUID) idempotency anahtarıdır — sunucu
// tarafı (bkz. server/moduller/_cekirdek/puantaj.js) aynı id ile gelen
// tekrar gönderimi YENİ satır açmadan idempotent kabul eder.

export interface KuyrukGirdisi<T> {
  istemciKayitId: string;
  veri: T;
  eklenmeZamani: string;
  gonderimDenemeSayisi: number;
  sonHata?: string;
}

export type CakismaCozumu = 'sunucuyu_koru' | 'istemciyi_gonder';

export interface OfflineQueueSecenekleri<T> {
  /** localStorage anahtarını benzersiz kılmak için (ör. 'puantaj', 'gunluk-rapor'). */
  kuyrukAdi: string;
  /** Sunucuya gerçek gönderimi yapan fonksiyon (api.ts'ten, ör. puantajKaydet). */
  gonder: (veri: T & { istemci_kayit_id: string }) => Promise<unknown>;
  /**
   * Sunucu "409 Conflict" ile daha yeni bir kayıt olduğunu bildirdiğinde
   * çağrılır. Dönüş değeri hangi tarafın kazanacağını belirler.
   * Belirtilmezse varsayılan: kullanıcıya SORULMADAN sunucu kaydı korunur
   * (veri kaybını önlemek için en güvenli varsayılan).
   */
  cakismaCozumle?: (girdi: KuyrukGirdisi<T>) => Promise<CakismaCozumu> | CakismaCozumu;
}

const STORAGE_PREFIX = 'oda-cekirdek-offline-queue:';

function depoAnahtari(kuyrukAdi: string) {
  return `${STORAGE_PREFIX}${kuyrukAdi}`;
}

function guvenliOku<T>(kuyrukAdi: string): KuyrukGirdisi<T>[] {
  try {
    const ham = localStorage.getItem(depoAnahtari(kuyrukAdi));
    return ham ? (JSON.parse(ham) as KuyrukGirdisi<T>[]) : [];
  } catch {
    // localStorage kullanılamıyor (gizli sekme/engellenmiş) — kuyruk boş kabul edilir.
    return [];
  }
}

function guvenliYaz<T>(kuyrukAdi: string, girdiler: KuyrukGirdisi<T>[]): void {
  try {
    localStorage.setItem(depoAnahtari(kuyrukAdi), JSON.stringify(girdiler));
  } catch {
    // Yazılamıyorsa (kota/gizli sekme) sessizce yok say — veri yalnızca bellekte kalır.
  }
}

export function createOfflineQueue<T extends object>(secenekler: OfflineQueueSecenekleri<T>) {
  const { kuyrukAdi, gonder, cakismaCozumle } = secenekler;
  let gonderimSurmekte = false;

  function bekleyenleriListele(): KuyrukGirdisi<T>[] {
    return guvenliOku<T>(kuyrukAdi);
  }

  /** Yeni bir kaydı kuyruğa ekler (önce yerel, ağ bağlantısı beklenmez). */
  function ekle(veri: T): KuyrukGirdisi<T> {
    const girdi: KuyrukGirdisi<T> = {
      istemciKayitId: crypto.randomUUID(),
      veri,
      eklenmeZamani: new Date().toISOString(),
      gonderimDenemeSayisi: 0,
    };
    const mevcut = guvenliOku<T>(kuyrukAdi);
    guvenliYaz(kuyrukAdi, [...mevcut, girdi]);
    return girdi;
  }

  function cikar(istemciKayitId: string): void {
    const mevcut = guvenliOku<T>(kuyrukAdi);
    guvenliYaz(kuyrukAdi, mevcut.filter((g) => g.istemciKayitId !== istemciKayitId));
  }

  /**
   * Bekleyen tüm kayıtları sırayla göndermeyi dener. Bağlantı yeniden
   * kurulduğunda (ör. `window online` olayında) çağrılır. Aynı anda tek
   * bir gönderim döngüsü çalışır (yeniden giriş korumalı).
   */
  async function gonderiyiDene(): Promise<{ basarili: number; basarisiz: number }> {
    if (gonderimSurmekte) return { basarili: 0, basarisiz: 0 };
    gonderimSurmekte = true;
    let basarili = 0;
    let basarisiz = 0;
    try {
      for (const girdi of guvenliOku<T>(kuyrukAdi)) {
        try {
          if (girdi.gonderimDenemeSayisi > 0 && cakismaCozumle) {
            const karar = await cakismaCozumle(girdi);
            if (karar === 'sunucuyu_koru') {
              cikar(girdi.istemciKayitId);
              continue;
            }
          }
          await gonder({ ...girdi.veri, istemci_kayit_id: girdi.istemciKayitId });
          cikar(girdi.istemciKayitId);
          basarili += 1;
        } catch (err) {
          basarisiz += 1;
          const mevcut = guvenliOku<T>(kuyrukAdi);
          guvenliYaz(kuyrukAdi, mevcut.map((g) => (
            g.istemciKayitId === girdi.istemciKayitId
              ? { ...g, gonderimDenemeSayisi: g.gonderimDenemeSayisi + 1, sonHata: String((err as Error)?.message || err) }
              : g
          )));
        }
      }
    } finally {
      gonderimSurmekte = false;
    }
    return { basarili, basarisiz };
  }

  return { ekle, cikar, bekleyenleriListele, gonderiyiDene };
}
