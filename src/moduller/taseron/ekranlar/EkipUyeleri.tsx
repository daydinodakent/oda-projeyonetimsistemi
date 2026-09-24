import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import HizliForm, { tlToKurus } from '../../_cekirdek/HizliForm';
import * as cekirdekApi from '../../_cekirdek/api';
import * as api from '../api';
import type { EkipUye, RolSaha } from '../types';
import type { Kisi } from '../../_cekirdek/types';

const ROLLER: { deger: RolSaha; etiket: string }[] = [
  { deger: 'usta_basi', etiket: 'Usta başı' }, { deger: 'usta', etiket: 'Usta' }, { deger: 'kalfa', etiket: 'Kalfa' }, { deger: 'duz_isci', etiket: 'Düz işçi' },
];
const bugun = () => new Date().toISOString().slice(0, 10);

/** Ekip üyeleri: işçi (Çekirdek kişi) ekleme, saha rolü, SGK bildirge tarihi ve yevmiye tanımı. */
export default function EkipUyeleri({ ekipId }: { ekipId: number }) {
  const [uyeler, setUyeler] = useState<EkipUye[]>([]);
  const [kisiler, setKisiler] = useState<Kisi[]>([]);
  const yenile = async () => {
    const [u, k] = await Promise.all([api.ekipUyeleriGetir(ekipId), cekirdekApi.kisileriListele('taseron_iscisi')]);
    setUyeler(u); setKisiler(k);
  };
  useEffect(() => { yenile(); }, [ekipId]); // eslint-disable-line react-hooks/exhaustive-deps
  const ad = (id: number) => kisiler.find((k) => k.id === id)?.ad_soyad ?? `Kişi #${id}`;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><UserPlus className="w-5 h-5 text-indigo-400" /> Ekip Üyeleri</h2>
      <div className="flex flex-wrap gap-x-3">
        <HizliForm
          butonEtiket="Yeni İşçi Kaydet"
          ipucu="İşçi kimlik kaydı oluşturur (TCKN şifreli saklanır, ekranda maskelenir). Ardından 'Ekibe Ekle' ile ekibe alın."
          alanlar={[{ ad: 'ad_soyad', etiket: 'Ad Soyad', zorunlu: true }, { ad: 'tckn', etiket: 'TCKN (11 hane)', zorunlu: true }, { ad: 'telefon', etiket: 'Telefon' }]}
          onKaydet={async (v) => { await cekirdekApi.kisiOlustur({ ad_soyad: v.ad_soyad, tckn: v.tckn, rol: 'taseron_iscisi', telefon: v.telefon || undefined }); await yenile(); }}
        />
        <HizliForm
          butonEtiket="Ekibe Ekle"
          alanlar={[
            { ad: 'kisi', etiket: 'İşçi', tip: 'select', zorunlu: true, secenekler: kisiler.filter((k) => !uyeler.some((u) => u.kisi_id === k.id && !u.bitis_tarihi)).map((k) => ({ deger: String(k.id), etiket: `${k.ad_soyad} (${k.tckn_maske})` })) },
            { ad: 'rol', etiket: 'Saha rolü', tip: 'select', varsayilan: 'duz_isci', secenekler: ROLLER.map((r) => ({ deger: r.deger, etiket: r.etiket })) },
            { ad: 'baslangic', etiket: 'Başlangıç', tip: 'date', zorunlu: true, varsayilan: bugun() },
            { ad: 'sgk', etiket: 'SGK giriş bildirge tarihi', tip: 'date' },
          ]}
          onKaydet={async (v) => { await api.uyeEkle(ekipId, { kisi_id: Number(v.kisi), rol_saha: (v.rol || 'duz_isci') as RolSaha, baslangic_tarihi: v.baslangic, sgk_giris_bildirge_tarihi: v.sgk || undefined }); await yenile(); }}
        />
      </div>

      {uyeler.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-6 text-center">Ekipte üye yok. Önce işçiyi kaydedin, sonra ekibe ekleyin.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {uyeler.map((u) => (
            <div key={u.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold">{ad(u.kisi_id)} <span className="text-[10px] text-[var(--text-secondary)]">• {ROLLER.find((r) => r.deger === u.rol_saha)?.etiket} • {u.baslangic_tarihi}{u.bitis_tarihi ? ` → ${u.bitis_tarihi}` : ''}</span></span>
                <span className="text-[10px] text-[var(--text-secondary)]">SGK bildirge: {u.sgk_giris_bildirge_tarihi ?? 'YOK'}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 mt-2">
                <HizliForm butonEtiket="Yevmiye tanımla"
                  alanlar={[{ ad: 'yevmiye', etiket: 'Günlük yevmiye (TL)', tip: 'number', zorunlu: true }, { ad: 'gecerli', etiket: 'Geçerlilik başlangıcı', tip: 'date', zorunlu: true, varsayilan: bugun() }]}
                  onKaydet={(v) => api.yevmiyeTanimla(u.id, tlToKurus(v.yevmiye), v.gecerli)} />
                {!u.sgk_giris_bildirge_tarihi && (
                  <HizliForm butonEtiket="SGK bildirgesi gir"
                    alanlar={[{ ad: 'tarih', etiket: 'Bildirge tarihi', tip: 'date', zorunlu: true, varsayilan: bugun() }]}
                    onKaydet={async (v) => { await api.sgkBildirgesiGuncelle(u.id, v.tarih); await yenile(); }} />
                )}
                {!u.bitis_tarihi && (
                  <HizliForm butonEtiket="Ekipten ayrıl"
                    alanlar={[{ ad: 'tarih', etiket: 'Ayrılış tarihi', tip: 'date', zorunlu: true, varsayilan: bugun() }]}
                    onKaydet={async (v) => { await api.uyeAyril(u.id, v.tarih); await yenile(); }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
