import { useEffect, useState } from 'react';
import { ArrowLeft, IdCard, FileText, CalendarCheck, Palmtree, Wallet, ShieldAlert, Plus, Lock } from 'lucide-react';
import HizliForm, { tlToKurus } from '../../_cekirdek/HizliForm';
import * as api from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { Personel, PersonelUcret, IzinTalebi, Avans } from '../types';
import type { Kisi, Belge, BelgeTuru } from '../../_cekirdek/types';
import { formatKurus, formatTarih, kidemYiliHesapla, CALISMA_SEKLI_ETIKET, IZIN_TUR_ETIKET, IZIN_DURUM_ETIKET, IZIN_DURUM_RENK } from './format';

type Sekme = 'ozluk' | 'belgeler' | 'puantaj' | 'izin' | 'avans' | 'isg';

interface Props {
  personelId: number;
  /** Rol bazlı görünürlük simülasyonu — gerçek bir oturum/login sistemi olmadığından (bkz. server/moduller/_cekirdek/routes.js dosya başı notu) burada PROP ile taklit edilir. 'sef' maaş/ücret bilgisini GÖREMEZ (KABUL kriteri). */
  gorunenRol?: 'sef' | 'ik_yetkilisi';
  onGeri: () => void;
}

const BELGE_TURLERI: BelgeTuru[] = ['is_sozlesmesi', 'kimlik', 'ikametgah', 'diploma', 'ehliyet', 'src_operator', 'mesleki_yeterlilik', 'saglik_raporu', 'isg_sertifikasi', 'diger'];
const BELGE_TUR_ETIKET: Record<string, string> = {
  is_sozlesmesi: 'İş Sözleşmesi', kimlik: 'Kimlik', ikametgah: 'İkametgah', diploma: 'Diploma', ehliyet: 'Ehliyet',
  src_operator: 'SRC/Operatör', mesleki_yeterlilik: 'Mesleki Yeterlilik', saglik_raporu: 'Sağlık Raporu', isg_sertifikasi: 'İSG Sertifikası', diger: 'Diğer',
};

export default function PersonelKarti({ personelId, gorunenRol = 'ik_yetkilisi', onGeri }: Props) {
  const [sekme, setSekme] = useState<Sekme>('ozluk');
  const [personel, setPersonel] = useState<Personel | null>(null);
  const [kisi, setKisi] = useState<Kisi | null>(null);
  const [ucretler, setUcretler] = useState<PersonelUcret[]>([]);
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [izinler, setIzinler] = useState<IzinTalebi[]>([]);
  const [avanslar, setAvanslar] = useState<Avans[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const p = await api.personelGetir(personelId);
    setPersonel(p);
    const k = await cekirdekApi.kisiGetir(p.kisi_id);
    setKisi(k);
    setUcretler(await api.ucretGecmisiGetir(personelId));
    setBelgeler(await cekirdekApi.belgeleriListele('kisi', p.kisi_id));
    setIzinler(await api.izinTalepleriGetir(personelId));
    setAvanslar(await api.avanslariGetir(personelId));
  }
  useEffect(() => { yenile(); }, [personelId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!personel || !kisi) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  const kidem = kidemYiliHesapla(personel.ise_giris_tarihi);
  const guncelUcret = ucretler[0];

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)] mb-4">
        <button onClick={onGeri} className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h2 className="text-lg font-black tracking-tight">{kisi.ad_soyad}</h2>
          <div className="text-[10px] text-[var(--text-secondary)]">{personel.sicil_no} • {personel.unvan || '—'} • Kıdem: {kidem} yıl</div>
        </div>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-1 mb-4 overflow-x-auto">
        <TabButon aktif={sekme === 'ozluk'} onClick={() => setSekme('ozluk')} icon={<IdCard className="w-3.5 h-3.5" />} etiket="Özlük" />
        <TabButon aktif={sekme === 'belgeler'} onClick={() => setSekme('belgeler')} icon={<FileText className="w-3.5 h-3.5" />} etiket="Belgeler" />
        <TabButon aktif={sekme === 'puantaj'} onClick={() => setSekme('puantaj')} icon={<CalendarCheck className="w-3.5 h-3.5" />} etiket="Puantaj" />
        <TabButon aktif={sekme === 'izin'} onClick={() => setSekme('izin')} icon={<Palmtree className="w-3.5 h-3.5" />} etiket="İzin" />
        <TabButon aktif={sekme === 'avans'} onClick={() => setSekme('avans')} icon={<Wallet className="w-3.5 h-3.5" />} etiket="Avans" />
        <TabButon aktif={sekme === 'isg'} onClick={() => setSekme('isg')} icon={<ShieldAlert className="w-3.5 h-3.5" />} etiket="İSG (salt okunur)" />
      </div>

      {sekme === 'ozluk' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">TCKN</div>{kisi.tckn_maske}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">Çalışma Şekli</div>{CALISMA_SEKLI_ETIKET[personel.calisma_sekli]}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">İşe Giriş</div>{formatTarih(personel.ise_giris_tarihi)}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">Departman</div>{personel.departman || '—'}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">Biyometrik PDKS Rızası</div>{personel.biyometrik_riza_verildi_mi ? `Verildi (${formatTarih(personel.biyometrik_riza_tarihi)})` : 'Verilmedi'}</div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" /> Ücret Geçmişi
              {gorunenRol !== 'ik_yetkilisi' && <span className="text-red-400 flex items-center gap-0.5"><Lock className="w-3 h-3" /> yalnızca İK yetkilisi görebilir</span>}
            </div>
            {gorunenRol !== 'ik_yetkilisi' ? (
              <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text-secondary)]">Bu bilgiyi görüntüleme yetkiniz yok.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {guncelUcret && <div className="text-sm font-black text-emerald-400">{formatKurus(guncelUcret.brut_maas_kurus)} / {guncelUcret.odeme_periyodu}</div>}
                {ucretler.map((u) => (
                  <div key={u.id} className="text-[10px] text-[var(--text-secondary)] flex justify-between p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded">
                    <span>{formatTarih(u.gecerli_baslangic)} →</span><span>{formatKurus(u.brut_maas_kurus)}</span>
                  </div>
                ))}
                {ucretler.length === 0 && <div className="text-[10px] text-[var(--text-secondary)]">Ücret tanımlı değil.</div>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3">
            {gorunenRol === 'ik_yetkilisi' && (
              <HizliForm butonEtiket="Ücret tanımla" ipucu="Yeni ücret, geçerlilik tarihinden itibaren geçerli olur; eski ücret geçmişte kalır."
                alanlar={[{ ad: 'maas', etiket: 'Brüt maaş (TL)', tip: 'number', zorunlu: true }, { ad: 'tarih', etiket: 'Geçerlilik başlangıcı', tip: 'date', zorunlu: true, varsayilan: new Date().toISOString().slice(0, 10) }]}
                onKaydet={async (v) => { await api.ucretTanimla(personelId, tlToKurus(v.maas), v.tarih); await yenile(); }} />
            )}
            <HizliForm butonEtiket="Projeye ata"
              alanlar={[{ ad: 'proje', etiket: 'Proje ID', zorunlu: true }, { ad: 'bas', etiket: 'Başlangıç', tip: 'date', zorunlu: true, varsayilan: new Date().toISOString().slice(0, 10) }, { ad: 'bit', etiket: 'Bitiş', tip: 'date' }]}
              onKaydet={(v) => api.projeyeAta(personelId, { proje_id: v.proje, baslangic_tarihi: v.bas, bitis_tarihi: v.bit || undefined })} />
            {!personel.cikis_tarihi && (
              <HizliForm butonEtiket="İşten çıkış" ipucu="Çıkış tarihi işlenir; kalan izin/avans mahsubu sonuç olarak döner."
                alanlar={[{ ad: 'tarih', etiket: 'Çıkış tarihi', tip: 'date', zorunlu: true, varsayilan: new Date().toISOString().slice(0, 10) }, { ad: 'neden', etiket: 'Neden' }]}
                onKaydet={async (v) => { await api.personelCikisYap(personelId, v.tarih, v.neden || undefined); await yenile(); }} />
            )}
          </div>
        </div>
      )}

      {sekme === 'belgeler' && (
        <div className="flex flex-col gap-2">
          <HizliForm butonEtiket="Belge ekle" ipucu="Belge kaydı (tür, dosya adı, geçerlilik) Çekirdek Belge modülüne işlenir; süresi dolanlar uyarı listesine düşer."
            alanlar={[
              { ad: 'tur', etiket: 'Tür', tip: 'select', zorunlu: true, secenekler: BELGE_TURLERI.map((t) => ({ deger: t, etiket: BELGE_TUR_ETIKET[t] })) },
              { ad: 'dosya', etiket: 'Dosya adı', zorunlu: true },
              { ad: 'bas', etiket: 'Geçerlilik başlangıcı', tip: 'date' },
              { ad: 'bit', etiket: 'Geçerlilik bitişi', tip: 'date' },
            ]}
            onKaydet={async (v) => { await cekirdekApi.belgeOlustur({ ilgili_tip: 'kisi', ilgili_id: personel.kisi_id, tur: v.tur as BelgeTuru, dosya_adi: v.dosya, gecerlilik_baslangic: v.bas || undefined, gecerlilik_bitis: v.bit || undefined }); await yenile(); }} />
          {BELGE_TURLERI.map((tur) => {
            const belge = belgeler.find((b) => b.tur === tur);
            const suresiGecmis = belge?.gecerlilik_bitis && belge.gecerlilik_bitis < new Date().toISOString().slice(0, 10);
            return (
              <div key={tur} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${belge ? (suresiGecmis ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]') : 'bg-[var(--bg-primary)] border-dashed border-[var(--border)] opacity-60'}`}>
                <div>
                  <div className="font-bold">{BELGE_TUR_ETIKET[tur]}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{belge ? `${belge.dosya_adi} — geçerlilik: ${formatTarih(belge.gecerlilik_bitis)}` : 'Yüklenmedi'}</div>
                </div>
                {suresiGecmis && <span className="text-[9px] font-black text-red-400 uppercase">Süresi Dolmuş</span>}
              </div>
            );
          })}
        </div>
      )}

      {sekme === 'puantaj' && (
        <div className="text-[10px] text-[var(--text-secondary)]">
          Puantaj kayıtları (Çekirdek puantaj_kaydi, kisi_id={personel.kisi_id}) proje bazlı olduğundan "PDKS Günlük Durum" ekranından proje seçilerek görüntülenir — Çekirdek'in mevcut REST'i yalnızca proje+tarih ile sorgulanabildiğinden (kişi aralığı uç noktası yok) burada AYRICA listelenmedi.
        </div>
      )}

      {sekme === 'izin' && (
        <div className="flex flex-col gap-2">
          {izinler.length === 0 && <div className="text-[10px] text-[var(--text-secondary)]">İzin talebi yok.</div>}
          {izinler.map((i) => (
            <div key={i.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between text-xs">
              <div>
                <div className="font-bold">{IZIN_TUR_ETIKET[i.tur]} — {i.gun_sayisi} gün</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{formatTarih(i.baslangic_tarihi)} → {formatTarih(i.bitis_tarihi)}</div>
              </div>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${IZIN_DURUM_RENK[i.durum]}`}>{IZIN_DURUM_ETIKET[i.durum]}</span>
            </div>
          ))}
        </div>
      )}

      {sekme === 'avans' && (
        <div className="flex flex-col gap-2">
          {avanslar.length === 0 && <div className="text-[10px] text-[var(--text-secondary)]">Avans talebi yok.</div>}
          {avanslar.map((a) => (
            <div key={a.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">{formatKurus(a.tutar_kurus)} ({a.taksit_sayisi} taksit)</span>
                <span className="text-[9px] font-black uppercase text-[var(--text-secondary)]">{a.durum}</span>
              </div>
              {a.taksitler && (
                <div className="mt-1 flex gap-1 flex-wrap">
                  {a.taksitler.map((t) => (
                    <span key={t.id} className={`text-[9px] px-1.5 py-0.5 rounded border ${t.mahsup_edildi_mi ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-600/20 text-slate-400 border-slate-500/30'}`}>
                      #{t.taksit_no} {formatKurus(t.tutar_kurus)} {t.mahsup_edildi_mi ? '✓' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sekme === 'isg' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 bg-amber-600/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-400">
            Bu sekme SALT OKUNURdur — İSG eğitim kayıtlarının sahibi P8'dir (henüz kurulmadı); veriler şimdilik Çekirdek Kişi kaydından okunur.
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">İSG Eğitim Tarihi</div>{formatTarih(kisi.isg_egitim_tarihi)}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">Geçerlilik Bitişi</div>{formatTarih(kisi.isg_egitim_gecerlilik_tarihi)}</div>
            <div><div className="text-[10px] text-[var(--text-secondary)] uppercase">Şantiye Giriş Yetkisi</div>{kisi.santiye_giris_yetkisi ? 'Var' : 'Yok'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButon({ aktif, onClick, icon, etiket }: { aktif: boolean; onClick: () => void; icon: React.ReactNode; etiket: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
        aktif ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}>
      {icon} {etiket}
    </button>
  );
}
