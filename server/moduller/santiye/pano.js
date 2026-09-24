// Şantiye panosu — bugünün özeti. Kişi sayısı puantajdan (Çekirdek; İK/Taşeron
// yazar) OKUNUR, burada TOPLANMAZ/saklanmaz.
import { db } from './db.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as isg from './isg.js';
import * as gunlukRapor from './gunlukRapor.js';
import * as kalite from './kalite.js';
import * as isProgrami from './isProgrami.js';

export function panoGetir(projeId, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const kisiler = new Set(cekirdekPuantaj.projeGunuListele(projeId, t).filter((p) => p.gun_degeri > 0).map((p) => p.kisi_id));
  const acikGorev = db.prepare("SELECT COUNT(*) AS n FROM gorev WHERE proje_id = ? AND row_status = 1 AND durum IN ('acik','devam')").get(projeId).n;
  const gecikmisGorev = db.prepare("SELECT COUNT(*) AS n FROM gorev WHERE proje_id = ? AND row_status = 1 AND durum IN ('acik','devam') AND son_tarih IS NOT NULL AND son_tarih < ?").get(projeId, t).n;
  const acikNcr = db.prepare("SELECT COUNT(*) AS n FROM ncr WHERE proje_id = ? AND row_status = 1 AND durum != 'kapali'").get(projeId).n;
  const rapor = gunlukRapor.gunIcinGetir(projeId, t);
  const plan = isProgrami.planGerceklesen(projeId, t);
  return {
    proje_id: projeId, tarih: t,
    kisi_sayisi: kisiler.size,
    acik_gorev: acikGorev, gecikmis_gorev: gecikmisGorev,
    acik_ncr: acikNcr,
    isg_uyarilari: isg.isgUyarilari(projeId, t),
    kirimi_bekleyen_numune: kalite.kirimiBekleyenler(projeId, t).length,
    hava: rapor ? { durum: rapor.hava_durumu, sicaklik_c: rapor.sicaklik_c } : null,
    gunluk_rapor_durumu: rapor ? rapor.durum : 'yok',
    ilerleme_celiski_sayisi: plan.celiski_sayisi,
    geride_aktivite_sayisi: plan.satirlar.filter((s) => s.geride_mi).length,
  };
}
