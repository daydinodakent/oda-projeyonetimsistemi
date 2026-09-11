import React, { useEffect, useRef, useState } from 'react';
// Vite'ın ?url eki, dosyayı derleme zamanında ayrı bir statik dosya olarak işler ve
// (dev'de orijinal yolu, build'de hash'lenmiş nihai yolu) bir URL string'i döndürür.
// `srcDoc` yerine gerçek bir `src` URL'si kullanmak önemlidir: `srcDoc` ile yüklenen
// bir iframe'in kökeni tarayıcıda "null" (opak) sayılır ve bu, MapLibre GL JS'in
// vektör tile (PBF) verilerini işlemek için kullandığı Web Worker'ın ve tile
// fetch döngüsünün tarayıcıda sessizce çalışmamasına yol açar — harita sadece
// raster katmanları çizip vektör içeriği (yol/bina/etiket — asıl web altlık
// görünümü) hiç render etmez. Gerçek bir `src` (aynı köken) ile yüklendiğinde
// iframe normal bir doküman gibi davranır ve bu sorun ortadan kalkar.
// @ts-ignore - .html?url için tip tanımı gerekmiyor, Vite bunu string olarak çözer.
import krokiHtmlUrl from '../../../legacy-standalone-tools/kroki-harita-cizim-araci.html?url';
import * as api from '../../services/api';

/**
 * ODA+ Proje Yönetim Sistemi'nin "harita" sekmesindeki placeholder'ın yerini alır.
 * Kroki, kendi tam sayfa (position:absolute, id tabanlı) yapısına sahip bağımsız
 * bir araç olduğu için ana uygulamayla stil/DOM çakışmasını önlemek amacıyla
 * izole bir iframe içinde çalıştırılır.
 *
 * Veritabanı (PostGIS) köprüsü: Kroki kendi başına bir veritabanı bağlantısına
 * sahip değildir. Bu bileşen, üst pencerenin (React) elindeki mock PostGIS
 * tablolarını (tb_proje_sinirlari, tb_binalar_3d, tb_altyapi_hatlari —
 * src/data.ts) iframe hazır olduğunda ("kroki:ready" mesajı) postMessage ile
 * iframe'e gönderir; Kroki bunları "Katmanlar" ağacına varsayılan olarak
 * GÖRÜNÜR (visible:true) yeni bir "Veritabanı Katmanları (PostGIS)" klasörü
 * altında ekler (bkz. legacy-standalone-tools/kroki-harita-cizim-araci.html
 * içindeki 'kroki:load-db-layers' mesaj dinleyicisi).
 *
 * Proje ↔ harita entegrasyonu: `activeProjectId` her belirlendiğinde/
 * değiştiğinde (harita ilk açıldığında üst panelde zaten seçili olan proje
 * dahil, ya da kullanıcı üst panelden BAŞKA bir proje seçtiğinde), CANLI
 * veritabanındaki (api.getProjeSinirlari()) o projenin tek sınır kaydından
 * bir bbox hesaplanıp 'kroki:zoom-to-project' mesajıyla iframe'e gönderilir;
 * Kroki doğrudan bu sınıra yakınlaşır (bkz. HTML'deki ilgili dinleyici).
 */
interface KrokiMapModuleProps {
  activeProjectId?: string;
}

// Haritadaki bir objeye ("obje") bağlı dokümanları (feature_id dolu olan
// tb_dokumanlar kayıtlarını) Kroki iframe'ine gönderir — hem ilk açılışta
// hem de "Doküman Ekle" akışından sonra çağrılır, böylece Bilgi panelindeki
// doküman listesi/önizleme her zaman güncel kalır.
async function sendDocumentsToIframe(iframeWindow: Window) {
  try {
    const allDocs = await api.getDokumanlar();
    const featureDocs = allDocs.filter((d) => !!d.feature_id);
    iframeWindow.postMessage({ type: 'kroki:documents-updated', documents: featureDocs }, '*');
  } catch (err) {
    console.error('Dokümanlar haritaya gönderilemedi:', err);
  }
}

// Harita üzerindeki PostGIS katmanlarını (db-layer-*) kendi veritabanı
// tablolarına eşler — Kroki tarafı Veri Girişi / Öznitelik Düzenle
// formlarını bu eşleme üzerinden dinamik olarak (gerçek sütunlara göre) kurar.
const LAYER_TABLE_MAP: Record<string, string> = {
  'db-layer-sinirlar': 'tb_proje_sinirlari',
  'db-layer-binalar': 'tb_binalar_3d',
  'db-layer-altyapi': 'tb_altyapi_hatlari',
};

// Her db-layer için, sistem (STANDART 7) sütunları hariç tutulmuş gerçek
// sütun şemasını iframe'e gönderir — 'Veri Girişi' ve 'Öznitelik Düzenle'
// formları bu şema üzerinden dinamik olarak kurulur (bkz. HTML'deki
// renderSchemaFields / dbTableSchemas).
// Tablo adından (relation_table) o tablonun kayıtlarını {id, label} olarak
// çeker — bir sütunun ilişkili (FK) olduğu durumda Kroki tarafındaki
// combobox'ı doldurmak için kullanılır (bkz. sendSchemasToIframe).
async function fetchRelationOptions(tableName: string): Promise<{ id: any; label: string }[]> {
  switch (tableName) {
    case 'tb_projeler': {
      const rows = await api.getProjeler();
      return rows.map((r) => ({ id: r.id, label: r.name }));
    }
    case 'tb_data_status': {
      const rows = await api.getVeriDurumlari();
      return rows.map((r) => ({ id: r.id, label: r.name }));
    }
    default:
      return [];
  }
}

async function sendSchemasToIframe(iframeWindow: Window) {
  try {
    const allColumns = await api.getTabloSutunlari();
    const schemas: Record<string, { layerId: string; columns: typeof allColumns }> = {};
    const relationTables = new Set<string>();
    Object.entries(LAYER_TABLE_MAP).forEach(([layerId, tableName]) => {
      const columns = allColumns.filter((c) => c.table_name === tableName && !c.is_hidden);
      schemas[layerId] = { layerId, columns };
      columns.forEach((c) => { if (c.relation_table) relationTables.add(c.relation_table); });
    });
    const relationOptions: Record<string, { id: any; label: string }[]> = {};
    await Promise.all(Array.from(relationTables).map(async (t) => {
      relationOptions[t] = await fetchRelationOptions(t);
    }));
    iframeWindow.postMessage({ type: 'kroki:load-schemas', schemas, relationOptions }, '*');
  } catch (err) {
    console.error('Sütun şemaları haritaya gönderilemedi:', err);
  }
}

const KrokiMapModule: React.FC<KrokiMapModuleProps> = ({ activeProjectId }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    const handleReady = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      if (!event.data || event.data.type !== 'kroki:ready') return;
      setIframeReady(true);

      // Not: harita her açıldığında (iframe yeniden monte edildiğinde — ör.
      // sekme değiştirip geri dönüldüğünde veya sayfa yenilendiğinde) katmanlar
      // data.ts'teki DURAĞAN (pristine) kayıtlardan değil, api.ts'teki CANLI
      // mock veritabanı store'undan (sinirlarStore/binalarStore/altyapiStore)
      // okunur. Böylece daha önce taşınan/geometrisi değiştirilip veritabanına
      // kaydedilmiş (handleUpdateDbFeature → api.updateProjeSiniri/updateBina3D/
      // updateAltyapiHatti) bir obje, harita yeniden yüklendiğinde eski/orijinal
      // konumuyla değil SON KAYDEDİLMİŞ haliyle görüntülenir.
      const [sinirlar, binalar, altyapi] = await Promise.all([
        api.getProjeSinirlari(),
        api.getBinalar3D(),
        api.getAltyapiHatlari(),
      ]);

      const dbFolder = {
        id: 'folder-db',
        name: 'Veritabanı Katmanları (PostGIS)',
        mapId: 'map-genel',
        parentFolderId: 'folder-genel',
        expanded: true,
        deletable: false,
      };

      const dbLayers = [
        {
          id: 'db-layer-sinirlar',
          name: 'Proje Sınırları',
          visible: true,
          color: '#f59e0b',
          fillColor: '#f59e0b',
          lineWidth: 2,
          dash: 'solid',
          geomType: 'Polygon',
          mapId: 'map-genel',
          folderId: 'folder-db',
        },
        {
          id: 'db-layer-binalar',
          name: 'Binalar 3D',
          visible: true,
          color: '#6366f1',
          fillColor: '#6366f1',
          lineWidth: 2,
          dash: 'solid',
          geomType: 'Polygon',
          mapId: 'map-genel',
          folderId: 'folder-db',
        },
        {
          id: 'db-layer-altyapi',
          name: 'Altyapı Hatları',
          visible: true,
          color: '#10b981',
          lineWidth: 2,
          dash: 'solid',
          geomType: 'LineString',
          mapId: 'map-genel',
          folderId: 'folder-db',
        },
      ];

      // Not: id, alttaki mock PostGIS kaydının kendi (kararlı/deterministik) id'si
      // olarak açıkça ayarlanır. Bunu atlarsak Kroki tarafı her sayfa yüklemesinde
      // rastgele yeni bir id üretir (uid()) — bu da localStorage'a kaydedilmiş bir
      // önceki oturumun (ör. kullanıcının taşıdığı bir proje sınırının) aynı kaydı
      // artık eşleştirememesine ve ekranda İKİ KOPYA (eski + yeni) görünmesine yol açar.
      // Not: özellik (properties) anahtarları KASITLI OLARAK gerçek veritabanı
      // sütun adlarıyla (project_id, block_name, height_meters, ...) birebir
      // aynıdır — Editör > Öznitelik formu, Veri Girişi formuyla AYNI
      // renderSchemaFields() mekanizmasını kullanarak bu alanları önceden
      // doldurur; anahtarlar sütun adlarından farklı olsaydı mevcut objeler
      // için form boş görünürdü.
      const dbFeatures = [
        ...sinirlar.map((r) => ({
          id: r.id,
          type: 'Feature',
          geometry: { type: r.the_geom?.tip, coordinates: r.the_geom?.coordinates },
          properties: {
            layerId: 'db-layer-sinirlar',
            tablo: LAYER_TABLE_MAP['db-layer-sinirlar'],
            name: r.project_name,
            project_id: r.project_id,
            project_name: r.project_name,
            ada_parsel: r.ada_parsel,
            area_sqm: r.area_sqm,
            veri_durumu: r.veri_durumu,
          },
        })),
        ...binalar.map((r) => {
          // Kat adedi/yükseklik bilgisi dolu olan bir bina, haritada
          // otomatik olarak 3B (ekstrüzyonlu) çizilir — kullanıcının her
          // birini tek tek "3B'ye çevir" ile dönüştürmesine gerek kalmaz.
          const floors = r.floors_count || 1;
          const floorHeight = r.height_meters && floors ? r.height_meters / floors : 3;
          return {
            id: r.id,
            type: 'Feature',
            geometry: { type: r.the_geom?.tip, coordinates: r.the_geom?.coordinates },
            properties: {
              layerId: 'db-layer-binalar',
              tablo: LAYER_TABLE_MAP['db-layer-binalar'],
              name: r.block_name,
              project_id: r.project_id,
              block_name: r.block_name,
              building_type: r.building_type,
              height_meters: r.height_meters,
              floors_count: r.floors_count,
              construction_progress: r.construction_progress,
              structural_status: r.structural_status,
              footprint_area_sqm: r.footprint_area_sqm,
              veri_durumu: r.veri_durumu,
              extrude: true,
              floors,
              floorHeight,
              height: r.height_meters || floors * floorHeight,
              base: 0,
            },
          };
        }),
        ...altyapi.map((r) => ({
          id: r.id,
          type: 'Feature',
          geometry: { type: r.the_geom?.tip, coordinates: r.the_geom?.coordinates },
          properties: {
            layerId: 'db-layer-altyapi',
            tablo: LAYER_TABLE_MAP['db-layer-altyapi'],
            name: r.network_name,
            project_id: r.project_id,
            line_type: r.line_type,
            network_name: r.network_name,
            pipe_or_cable_spec: r.pipe_or_cable_spec,
            depth_meters: r.depth_meters,
            voltage_or_pressure: r.voltage_or_pressure,
            status: r.status,
            total_length_meters: r.total_length_meters,
            veri_durumu: r.veri_durumu,
          },
        })),
      ];

      iframeWindow.postMessage(
        { type: 'kroki:load-db-layers', folders: [dbFolder], layers: dbLayers, features: dbFeatures },
        '*'
      );

      sendDocumentsToIframe(iframeWindow);
      sendSchemasToIframe(iframeWindow);
    };

    // Editör > "Doküman" ile haritadaki bir objeye eklenen dosyalar buradan
    // gelir: mevcut Doküman Yönetimi altyapısına (tb_dokumanlar / api.ts)
    // kaydedilir, ardından güncel liste tekrar iframe'e gönderilir — böylece
    // Bilgi panelindeki doküman listesi/önizleme anında güncellenir.
    const handleAddDocuments = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'kroki:add-documents' || !msg.featureId || !Array.isArray(msg.files)) return;
      try {
        for (const file of msg.files) {
          await api.createDokuman({
            feature_id: msg.featureId,
            project_id: msg.projectId || undefined,
            name: file.name,
            version: 'v1.0',
            file_size: file.sizeLabel,
            upload_date: new Date().toISOString().slice(0, 10),
            doc_type: file.docType,
            file_data_url: file.dataUrl || null,
            approval_status: 'Approved',
            approver: 'Saha Ekibi'
          });
        }
        await sendDocumentsToIframe(iframeWindow);
      } catch (err) {
        console.error('Doküman eklenemedi:', err);
      }
    };

    // Haritadaki bir PostGIS (db-layer-*) objesi taşındığında, geometrisi
    // (köşe ekle/sil/sürükle, döndür, ölçekle, tampon/basitleştir vb.)
    // değiştirildiğinde bu mesaj gelir (bkz. HTML'deki maybeAutoSaveDbFeature)
    // ve ilgili tabloya (tb_proje_sinirlari / tb_binalar_3d / tb_altyapi_hatlari)
    // anında (tarayıcı localStorage'ına ek olarak) veritabanı güncellemesi
    // olarak yazılır — Admin Panel > Tablo/Katman Verileri her zaman güncel kalır.
    const handleUpdateDbFeature = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'kroki:update-db-feature' || !msg.featureId || !msg.geometry) return;
      const theGeom = { tip: msg.geometry.type, coordinates: msg.geometry.coordinates };
      const tableName = LAYER_TABLE_MAP[msg.layerId];
      try {
        // Öznitelik Düzenle formundan (Editör > Öznitelik) gelen alanlar da
        // aynı mesajla taşınır — burada yalnızca gerçek tablo sütunlarıyla
        // eşleşen alanlar (properties) seçilip geometriyle birlikte yazılır;
        // Kroki'ye özgü eski takma-ad anahtarları (blok, yukseklik_m vb.)
        // herhangi bir gerçek sütunla eşleşmediği için sessizce yok sayılır.
        let updateData: Record<string, any> = { the_geom: theGeom };
        if (tableName && msg.properties && typeof msg.properties === 'object') {
          const cols = await api.getTabloSutunlari(tableName);
          const colNames = new Set(cols.filter((c) => !c.is_hidden).map((c) => c.column_name));
          Object.entries(msg.properties as Record<string, any>).forEach(([k, v]) => {
            if (colNames.has(k)) updateData[k] = v;
          });
        }
        switch (msg.layerId) {
          case 'db-layer-sinirlar':
            await api.updateProjeSiniri(msg.featureId, updateData);
            break;
          case 'db-layer-binalar':
            await api.updateBina3D(msg.featureId, updateData);
            break;
          case 'db-layer-altyapi':
            await api.updateAltyapiHatti(msg.featureId, updateData);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Obje veritabanına kaydedilemedi:', err);
      }
    };

    window.addEventListener('message', handleReady);
    window.addEventListener('message', handleAddDocuments);
    window.addEventListener('message', handleUpdateDbFeature);
    return () => {
      window.removeEventListener('message', handleReady);
      window.removeEventListener('message', handleAddDocuments);
      window.removeEventListener('message', handleUpdateDbFeature);
    };
  }, []);

  useEffect(() => {
    // Üst panelden bir proje seçili olduğunda (ilk açılış dahil) doğrudan o
    // projenin sınırına yakınlaşır — hem harita ilk açıldığında zaten seçili
    // olan proje için, hem de kullanıcı üst panelden BAŞKA bir proje
    // seçtiğinde (activeProjectId değiştiğinde) devreye girer.
    //
    // Not: bbox, data.ts'teki DURAĞAN (pristine) gisBoundaryRecords'tan değil,
    // api.getProjeSinirlari() ile CANLI veritabanından hesaplanır — böylece
    // zoom hedefi HER ZAMAN haritada GERÇEKTEN ÇİZİLEN (ve kullanıcı
    // tarafından taşınmış/düzenlenmiş olabilecek) proje sınırı objesiyle
    // birebir aynı kaynaktan gelir; aksi halde (statik veri kullanılsaydı)
    // harita binalarla değil, sınırın ESKİ/durağan konumuyla hizalı olmayan
    // yanlış bir noktaya yakınlaşabilirdi.
    if (!iframeReady || !activeProjectId) return;
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    let cancelled = false;
    (async () => {
      const sinirlar = await api.getProjeSinirlari();
      if (cancelled) return;
      const boundary = sinirlar.find((r) => r.project_id === activeProjectId);
      const ring = boundary?.the_geom?.coordinates?.[0];
      if (!boundary || !ring || !ring.length) return;
      const lngs = ring.map((c) => c[0]);
      const lats = ring.map((c) => c[1]);
      const bbox: [number, number, number, number] = [
        Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats),
      ];
      iframeWindow.postMessage({ type: 'kroki:zoom-to-project', bbox }, '*');
    })();

    return () => { cancelled = true; };
  }, [activeProjectId, iframeReady]);

  return (
    <iframe
      ref={iframeRef}
      src={krokiHtmlUrl}
      title="Kroki — Harita Çizim Aracı"
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
    />
  );
};

export default KrokiMapModule;
