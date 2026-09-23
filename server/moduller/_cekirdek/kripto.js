// TCKN gibi kişisel verilerin (KVKK) şifreli saklanması için AES-256-GCM
// yardımcıları. Yeni bir bağımlılık EKLEMEZ — Node'un yerleşik node:crypto
// modülünü kullanır.
//
// Anahtar: process.env.CEKIRDEK_KISI_ENCRYPTION_KEY — 32 baytlık (64 hex
// karakter) bir anahtar olmalı (bkz. .env.example). Ortamda tanımlı
// DEĞİLSE, geliştirme kolaylığı için sabit bir (ÜRETİMDE KULLANILMAMASI
// GEREKEN) anahtara düşer ve konsola UYARI basar — üretime alınmadan önce
// gerçek bir anahtar tanımlanmalıdır.
import crypto from 'node:crypto';

// SHA-256("oda-cekirdek-dev-fallback-anahtari") — 32 bayt, yalnızca ortamda
// gerçek bir anahtar tanımlı DEĞİLKEN (geliştirme) kullanılır.
const DEV_FALLBACK_KEY_HEX = '0c72f4e5a952fb486cd4fbfe3a338694d91e4b3e7f08b6a68240a16264d30a33';

function resolveKey() {
  const hex = process.env.CEKIRDEK_KISI_ENCRYPTION_KEY;
  if (!hex) {
    console.warn('[cekirdek/kripto] CEKIRDEK_KISI_ENCRYPTION_KEY tanımlı değil — GELİŞTİRME anahtarı kullanılıyor. Üretimde .env dosyasına gerçek bir anahtar ekleyin.');
  }
  const buf = Buffer.from(hex || DEV_FALLBACK_KEY_HEX, 'hex');
  if (buf.length !== 32) throw new Error('CEKIRDEK_KISI_ENCRYPTION_KEY 32 bayt (64 hex karakter) olmalıdır.');
  return buf;
}

const KEY = resolveKey();

/** Düz metni (ör. TCKN) şifreleyip base64 (iv:authTag:cipher birleşik) döner. */
export function sifrele(duzMetin) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(duzMetin), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, enc]).toString('base64');
}

/** sifrele() ile üretilmiş blob'u düz metne çevirir. */
export function cozul(sifreliBase64) {
  const buf = Buffer.from(sifreliBase64, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** TCKN için maskeli gösterim üretir: ilk 3 ve son 2 hane görünür (ör. "123*****80"). API yanıtlarında DÜZ TCKN yerine bu döner. */
export function maskele(tckn) {
  const s = String(tckn);
  if (s.length < 6) return '*'.repeat(s.length);
  return s.slice(0, 3) + '*'.repeat(s.length - 5) + s.slice(-2);
}
