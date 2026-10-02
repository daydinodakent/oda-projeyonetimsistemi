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
import odaHtmlUrl from '../../../legacy-standalone-tools/oda-harita-cizim-araci.html?url';
import * as api from '../../services/api';
import * as santiye from '../../moduller/santiye/api';
import { kisileriListele } from '../../moduller/_cekirdek/api';
import { ekipleriListele, metrajKaydet } from '../../moduller/taseron/api';
import { sozlesmeleriListele, kalemleriGetir } from '../../moduller/sozlesme/api';
import type { Sozlesme, SozlesmeKalem } from '../../moduller/sozlesme/types';

/**
 * ODA+ Proje Yönetim Sistemi'nin "harita" sekmesindeki placeholder'ın yerini alır.
 * ODA, kendi tam sayfa (position:absolute, id tabanlı) yapısına sahip bağımsız
 * bir araç olduğu için ana uygulamayla stil/DOM çakışmasını önlemek amacıyla
 * izole bir iframe içinde çalıştırılır.
 *
 * Veritabanı (PostGIS) köprüsü: ODA kendi başına bir veritabanı bağlantısına
 * sahip değildir. Bu bileşen, üst pencerenin (React) elindeki mock PostGIS
 * tablolarını (tb_proje_sinirlari, tb_binalar_3d, tb_altyapi_hatlari —
 * src/data.ts) iframe hazır olduğunda ("oda:ready" mesajı) postMessage ile
 * iframe'e gönderir; ODA bunları "Katmanlar" ağacına varsayılan olarak
 * GÖRÜNÜR (visible:true) yeni bir "Veritabanı Katmanları (PostGIS)" klasörü
 * altında ekler (bkz. legacy-standalone-tools/oda-harita-cizim-araci.html
 * içindeki 'oda:load-db-layers' mesaj dinleyicisi).
 *
 * Proje ↔ harita entegrasyonu: `activeProjectId` her belirlendiğinde/
 * değiştiğinde (harita ilk açıldığında üst panelde zaten seçili olan proje
 * dahil, ya da kullanıcı üst panelden BAŞKA bir proje seçtiğinde), CANLI
 * veritabanındaki (api.getProjeSinirlari()) o projenin tek sınır kaydından
 * bir bbox hesaplanıp 'oda:zoom-to-project' mesajıyla iframe'e gönderilir;
 * ODA doğrudan bu sınıra yakınlaşır (bkz. HTML'deki ilgili dinleyici).
 */
interface OdaMapModuleProps {
  activeProjectId?: string;
}

// Haritadaki bir objeye ("obje") bağlı dokümanları (feature_id dolu olan
// tb_dokumanlar kayıtlarını) ODA iframe'ine gönderir — hem ilk açılışta
// hem de "Doküman Ekle" akışından sonra çağrılır, böylece Bilgi panelindeki
// doküman listesi/önizleme her zaman güncel kalır.
async function sendDocumentsToIframe(iframeWindow: Window) {
  try {
    const allDocs = await api.getDokumanlar();
    const featureDocs = allDocs.filter((d) => !!d.feature_id);
    iframeWindow.postMessage({ type: 'oda:documents-updated', documents: featureDocs }, '*');
  } catch (err) {
    console.error('Dokümanlar haritaya gönderilemedi:', err);
  }
}

// Harita > Saha sekmesinden eklenen, belirli bir obje/feature'a değil
// doğrudan projeye bağlı, konumlu saha fotoğraflarını (tb_saha_fotograflari —
// gerçek bir GeoPackage nokta katmanı, bkz. server/db.js SPATIAL_TABLES ve
// SahaFotografRecord) ODA iframe'ine gönderir — hem ilk açılışta/proje
// değiştiğinde hem de yeni fotoğraf eklendikten sonra çağrılır, böylece
// Saha panelindeki harita pin'leri ve alt filmstrip her zaman güncel kalır.
// ODA tarafı (legacy HTML aracı) düz lat/lng ile çalıştığı için the_geom
// (Point) burada, React↔iframe sınırında, lat/lng'e dönüştürülür.
async function sendSahaPhotosToIframe(iframeWindow: Window, projectId?: string) {
  try {
    const all = await api.getSahaFotograflari();
    const photos = all
      .filter((p) => p.the_geom?.coordinates && (!projectId || p.project_id === projectId))
      .map((p) => ({
        id: p.id,
        name: p.name,
        notes: p.notes,
        file_data_url: p.file_data_url,
        doc_type: p.doc_type || 'resim',
        lng: p.the_geom!.coordinates[0],
        lat: p.the_geom!.coordinates[1]
      }));
    iframeWindow.postMessage({ type: 'oda:saha-photos-updated', photos }, '*');
  } catch (err) {
    console.error('Saha fotoğrafları haritaya gönderilemedi:', err);
  }
}

// Harita > Şantiye sekmesi: şantiye modülündeki konumlu kayıtlar (görev, NCR,
// İSG olayı, ramak kala, günlük rapor fotoğrafı, beton dökümü) GeoJSON olarak
// /api/santiye/geojson'dan okunup iframe'e gönderilir. Kayıtlar harita
// motorunun çizim/düzenleme katmanlarına GİRMEZ (localStorage'a yazılmaz) —
// ayrı, salt-okunur bir kaynak olarak çizilir; tek doğruluk kaynağı şantiye modülüdür.
async function sendSantiyeToIframe(iframeWindow: Window, projectId?: string) {
  if (!projectId) return;
  try {
    const fc = await santiye.geojsonGetir(projectId);
    iframeWindow.postMessage({ type: 'oda:santiye-updated', projectId, features: fc.features }, '*');
  } catch (err) {
    console.error('Şantiye kayıtları haritaya gönderilemedi:', err);
  }
}

// Görev/NCR için "sorumlu" seçenekleri (kişi / taşeron ekibi / alt yüklenici).
// KVKK: iframe'e yalnızca id + görünen ad gider (TCKN/telefon gibi alanlar gitmez).
async function sendSantiyeOptionsToIframe(iframeWindow: Window, projectId?: string) {
  if (!projectId) return;
  const [kisiler, ekipler, sozlesmeler] = await Promise.all([
    kisileriListele().catch(() => []),
    ekipleriListele(projectId).catch(() => []),
    sozlesmeleriListele(projectId).catch(() => []),
  ]);
  const sorumlular = [
    ...kisiler.map((k) => ({ tip: 'kisi', id: k.id, ad: k.ad_soyad })),
    ...ekipler.map((e) => ({ tip: 'taseron_ekibi', id: e.id, ad: `Ekip #${e.id}${e.is_kolu ? ` — ${e.is_kolu}` : ''}` })),
    ...sozlesmeler.filter((c) => c.tip === 'alt_yuklenici').map((c) => ({ tip: 'alt_yuklenici', id: c.id, ad: `${c.numara} — ${c.konu}` })),
  ];
  iframeWindow.postMessage({ type: 'oda:santiye-options', sorumlular }, '*');
}

// Harita > Yer İmi: aktif projenin kayıtlı görünümlerini iframe'e gönderir.
async function sendBookmarksToIframe(iframeWindow: Window, projectId?: string) {
  if (!projectId) { iframeWindow.postMessage({ type: 'oda:bookmarks-updated', bookmarks: [] }, '*'); return; }
  try {
    const bookmarks = await api.getHaritaYerImleri(projectId);
    iframeWindow.postMessage({ type: 'oda:bookmarks-updated', bookmarks }, '*');
  } catch (err) {
    console.error('Yer imleri haritaya gönderilemedi:', err);
  }
}

// Harita > Ölçüm > "Metraja aktar": aktif projedeki taşeron ekipleri ve her
// ekibin sözleşme kalemleri (birim + sözleşme miktarı) iframe'e gönderilir.
// Liste, pencere her açıldığında yeniden istenir (güncel kalsın diye).
async function sendMetrajOptionsToIframe(iframeWindow: Window, projectId?: string) {
  if (!projectId) { iframeWindow.postMessage({ type: 'oda:metraj-options', ekipler: [] }, '*'); return; }
  const [ekipler, sozlesmeler] = await Promise.all([
    ekipleriListele(projectId).catch(() => []),
    sozlesmeleriListele(projectId).catch((): Sozlesme[] => []),
  ]);
  const sozlesmeById = new Map(sozlesmeler.map((c) => [c.id, c]));
  const out = await Promise.all(ekipler.map(async (e) => {
    const soz = sozlesmeById.get(e.sozlesme_id);
    const kalemler = await kalemleriGetir(e.sozlesme_id).catch((): SozlesmeKalem[] => []);
    return {
      id: e.id,
      ad: `Ekip #${e.id}${e.is_kolu ? ` — ${e.is_kolu}` : ''}${soz ? ` (${soz.numara})` : ''}`,
      odeme_tipi: e.odeme_tipi,
      kalemler: kalemler.map((k) => ({ id: k.id, aciklama: k.aciklama, birim: k.birim, miktar: k.miktar })),
    };
  }));
  iframeWindow.postMessage({ type: 'oda:metraj-options', ekipler: out }, '*');
}

// Harita üzerindeki PostGIS katmanlarını (db-layer-*) kendi veritabanı
// tablolarına eşler — ODA tarafı Veri Girişi / Öznitelik Düzenle
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
// çeker — bir sütunun ilişkili (FK) olduğu durumda ODA tarafındaki
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
    case 'tb_altyapi_tipi': {
      const rows = await api.getAltyapiTipleri();
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
    iframeWindow.postMessage({ type: 'oda:load-schemas', schemas, relationOptions }, '*');
  } catch (err) {
    console.error('Sütun şemaları haritaya gönderilemedi:', err);
  }
}

const OdaMapModule: React.FC<OdaMapModuleProps> = ({ activeProjectId }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  // handleReady/handleAddSahaPhotos, ([] bağımlılıklı) mount effect'i
  // içinde tanımlandığından activeProjectId'nin İLK render'daki (bayat)
  // değerini closure'da tutar — güncel değeri her zaman bu ref üzerinden okur.
  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

  useEffect(() => {
    const handleReady = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      if (!event.data || event.data.type !== 'oda:ready') return;
      setIframeReady(true);

      // Not: harita her açıldığında (iframe yeniden monte edildiğinde — ör.
      // sekme değiştirip geri dönüldüğünde veya sayfa yenilendiğinde) katmanlar
      // data.ts'teki DURAĞAN (pristine) kayıtlardan değil, api.ts'teki CANLI
      // mock veritabanı store'undan (sinirlarStore/binalarStore/altyapiStore)
      // okunur. Böylece daha önce taşınan/geometrisi değiştirilip veritabanına
      // kaydedilmiş (handleUpdateDbFeature → api.updateProjeSiniri/updateBina3D/
      // updateAltyapiHatti) bir obje, harita yeniden yüklendiğinde eski/orijinal
      // konumuyla değil SON KAYDEDİLMİŞ haliyle görüntülenir.
      const [sinirlar, binalar, altyapi, altyapiTipleri] = await Promise.all([
        api.getProjeSinirlari(),
        api.getBinalar3D(),
        api.getAltyapiHatlari(),
        api.getAltyapiTipleri(),
      ]);
      // Her altyapı tipinin (içmesuyu/atıksu/yağmursuyu/doğalgaz/elektrik/
      // fiber) kendi haritada çizim rengi — aşağıda her hat objesine
      // 'line_color' özniteliği olarak eklenir (bkz. ODA'deki
      // visibleFeaturesForRender → __layerColor override'ı).
      const altyapiColorByType: Record<string, string> = {};
      altyapiTipleri.forEach((t) => { altyapiColorByType[String(t.id)] = t.color; });

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
      // olarak açıkça ayarlanır. Bunu atlarsak ODA tarafı her sayfa yüklemesinde
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
            line_color: altyapiColorByType[String(r.line_type)] || '#10b981',
          },
        })),
      ];

      iframeWindow.postMessage(
        { type: 'oda:load-db-layers', folders: [dbFolder], layers: dbLayers, features: dbFeatures },
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
      if (!msg || msg.type !== 'oda:add-documents' || !msg.featureId || !Array.isArray(msg.files)) return;
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
      if (!msg || msg.type !== 'oda:update-db-feature' || !msg.featureId || !msg.geometry) return;
      const theGeom = { tip: msg.geometry.type, coordinates: msg.geometry.coordinates };
      const tableName = LAYER_TABLE_MAP[msg.layerId];
      try {
        // Öznitelik Düzenle formundan (Editör > Öznitelik) gelen alanlar da
        // aynı mesajla taşınır — burada yalnızca gerçek tablo sütunlarıyla
        // eşleşen alanlar (properties) seçilip geometriyle birlikte yazılır;
        // ODA'ye özgü eski takma-ad anahtarları (blok, yukseklik_m vb.)
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

    // Harita > Saha sekmesinden ("Kaydet") gelen konumlu fotoğraflar —
    // EXIF GPS'ten otomatik ya da haritada tıklanarak elle belirlenen
    // lat/lng ile birlikte gelir; doğrudan projeye bağlı (feature_id yok)
    // birer tb_dokumanlar kaydı olarak saklanır.
    const handleAddSahaPhotos = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:add-saha-photos' || !Array.isArray(msg.photos)) return;
      const projectId = msg.projectId || activeProjectIdRef.current;
      try {
        for (const photo of msg.photos) {
          await api.createSahaFotografi({
            project_id: projectId,
            name: photo.name,
            file_size: photo.sizeLabel,
            upload_date: new Date().toISOString().slice(0, 10),
            file_data_url: photo.dataUrl || null,
            notes: photo.notes || null,
            doc_type: photo.docType || 'resim',
            the_geom: { tip: 'Point', coordinates: [photo.lng, photo.lat] }
          });
        }
        await sendSahaPhotosToIframe(iframeWindow, activeProjectIdRef.current);
      } catch (err) {
        console.error('Saha fotoğrafı eklenemedi:', err);
      }
    };

    // Saha panelindeki "Sil" — kayıtlı bir saha fotoğrafını (tb_dokumanlar
    // kaydı) kalıcı olarak siler, ardından güncel listeyi tekrar gönderir.
    const handleDeleteSahaPhoto = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:delete-saha-photo' || !msg.id) return;
      try {
        await api.deleteSahaFotografi(msg.id);
        await sendSahaPhotosToIframe(iframeWindow, activeProjectIdRef.current);
      } catch (err) {
        console.error('Saha fotoğrafı silinemedi:', err);
      }
    };

    // Saha panelindeki treeview'de bir dosyayı yeniden adlandırma — sadece
    // istemci tarafı klasör organizasyonundan farklı olarak, isim GERÇEK bir
    // veri alanı olduğundan kalıcı olması için veritabanına yazılır.
    const handleRenameSahaPhoto = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:rename-saha-photo' || !msg.id || !msg.name) return;
      try {
        await api.updateSahaFotografi(msg.id, { name: msg.name });
        await sendSahaPhotosToIframe(iframeWindow, activeProjectIdRef.current);
      } catch (err) {
        console.error('Saha dosyası yeniden adlandırılamadı:', err);
      }
    };

    // Harita > Şantiye: haritada seçilen konuma görev / NCR / ramak kala / İSG
    // olayı kaydı açar. Kayıt şantiye modülünün KENDİ servisi üzerinden yazılır
    // (doğrulama + audit orada); sonuç iframe'e 'oda:santiye-result' ile döner.
    const handleSantiyeCreate = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:santiye-create') return;
      const reply = (ok: boolean, error?: string) => iframeWindow.postMessage({ type: 'oda:santiye-result', op: 'create', ok, error }, '*');
      const projeId = activeProjectIdRef.current;
      try {
        if (!projeId) throw new Error('Önce üst panelden bir proje seçin.');
        const lat = Number(msg.lat); const lon = Number(msg.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Haritada bir konum seçin.');
        const baslik = String(msg.baslik || '').trim();
        const aciklama = String(msg.aciklama || '').trim();
        const tarih = String(msg.tarih || new Date().toISOString().slice(0, 10));
        switch (msg.tur) {
          case 'gorev':
          case 'ncr': {
            if (!baslik) throw new Error('Başlık zorunludur.');
            if (!msg.sorumlu_tipi || !Number.isFinite(Number(msg.sorumlu_id))) throw new Error('Sorumlu seçin.');
            const ortak = { proje_id: projeId, baslik, sorumlu_tipi: msg.sorumlu_tipi, sorumlu_id: Number(msg.sorumlu_id), lat, lon };
            if (msg.tur === 'gorev') await santiye.gorevOlustur({ ...ortak, son_tarih: msg.son_tarih || undefined });
            else await santiye.ncrAc({ ...ortak, aciklama: aciklama || undefined });
            break;
          }
          case 'ramak_kala':
            if (!aciklama) throw new Error('Açıklama zorunludur.');
            await santiye.ramakKalaBildir({ proje_id: projeId, tarih, aciklama, anonim: !!msg.anonim, lat, lon });
            break;
          case 'olay':
            if (!aciklama) throw new Error('Açıklama zorunludur.');
            if (!['is_kazasi', 'meslek_hastaligi', 'yaralanmasiz_olay'].includes(msg.olay_turu)) throw new Error('Olay türünü seçin.');
            await santiye.olayKaydet({ proje_id: projeId, tur: msg.olay_turu, tarih, aciklama, lat, lon });
            break;
          default:
            throw new Error('Bilinmeyen kayıt türü.');
        }
        reply(true);
        await sendSantiyeToIframe(iframeWindow, projeId);
      } catch (err) {
        reply(false, err instanceof Error ? err.message : String(err));
      }
    };

    // Harita popup'ındaki durum değiştirme düğmeleri (yalnızca beyaz listedeki geçişler).
    const handleSantiyeAction = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:santiye-action') return;
      const reply = (ok: boolean, error?: string) => iframeWindow.postMessage({ type: 'oda:santiye-result', op: 'action', ok, error }, '*');
      try {
        const id = Number(msg.id);
        if (!Number.isFinite(id)) throw new Error('Geçersiz kayıt.');
        if (msg.katman === 'gorev' && ['acik', 'devam', 'iptal'].includes(msg.islem)) await santiye.gorevDurum(id, msg.islem);
        else if (msg.katman === 'ncr' && msg.islem === 'duzelt') {
          const not = String(msg.notu || '').trim();
          if (!not) throw new Error('Düzeltme notu zorunludur.');
          await santiye.ncrDuzelt(id, not);
        } else if (msg.katman === 'ncr' && msg.islem === 'kapat') await santiye.ncrKapat(id);
        else throw new Error('Bu işlem haritadan yapılamaz.');
        reply(true);
        await sendSantiyeToIframe(iframeWindow, activeProjectIdRef.current);
      } catch (err) {
        reply(false, err instanceof Error ? err.message : String(err));
      }
    };

    // Harita > Ölçüm: ölçülen alan/mesafeyi taşeron metrajına (beyan edilen
    // miktar) yazar. Yazma taşeron modülünün KENDİ servisinden geçer
    // (ekip + sözleşme kalemi doğrulaması, audit); şef onayı orada yapılır.
    const handleMetrajOptionsRequest = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      if (!event.data || event.data.type !== 'oda:metraj-options-request') return;
      await sendMetrajOptionsToIframe(iframeWindow, activeProjectIdRef.current);
    };
    const handleMetrajCreate = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== 'oda:metraj-create') return;
      const reply = (ok: boolean, error?: string) => iframeWindow.postMessage({ type: 'oda:metraj-result', ok, error }, '*');
      try {
        const ekipId = Number(msg.ekip_id);
        const kalemId = Number(msg.sozlesme_kalem_id);
        const miktar = Number(msg.miktar);
        const tarih = String(msg.tarih || '');
        if (!Number.isInteger(ekipId) || !Number.isInteger(kalemId)) throw new Error('Ekip ve sözleşme kalemi seçin.');
        if (!Number.isFinite(miktar) || miktar <= 0) throw new Error('Miktar sıfırdan büyük olmalıdır.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error('Geçerli bir tarih girin.');
        const not = String(msg.notes || '').trim().slice(0, 500);
        await metrajKaydet(ekipId, { sozlesme_kalem_id: kalemId, tarih, miktar: Math.round(miktar * 100) / 100, notes: not || undefined });
        reply(true);
      } catch (err) {
        reply(false, err instanceof Error ? err.message : String(err));
      }
    };

    // Harita > Yer İmi: kaydet / yeniden adlandır / sil. Kayıt proje bazlıdır ve
    // o projeyi açan herkesle paylaşılır; yalnızca bilinen alanlar kaydedilir.
    const handleBookmarkOp = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const msg = event.data;
      if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('oda:bookmark-')) return;
      const reply = (ok: boolean, error?: string) => iframeWindow.postMessage({ type: 'oda:bookmark-result', op: msg.type, ok, error }, '*');
      const projeId = activeProjectIdRef.current;
      try {
        if (!projeId) throw new Error('Önce üst panelden bir proje seçin.');
        const name = String(msg.name || '').trim().slice(0, 60);
        if (msg.type === 'oda:bookmark-save') {
          const c = msg.view?.center;
          if (!name) throw new Error('Yer imi adı zorunludur.');
          if (!Array.isArray(c) || !Number.isFinite(Number(c[0])) || !Number.isFinite(Number(c[1]))) throw new Error('Geçersiz harita görünümü.');
          await api.createHaritaYerImi({
            project_id: projeId, name,
            center: [Number(c[0]), Number(c[1])],
            zoom: Number(msg.view.zoom), bearing: Number(msg.view.bearing) || 0, pitch: Number(msg.view.pitch) || 0,
            style_id: msg.styleId ? String(msg.styleId) : null,
            layer_state: msg.layerState && typeof msg.layerState === 'object' ? msg.layerState : null,
            santiye: msg.santiye && typeof msg.santiye === 'object' ? msg.santiye : null,
          });
        } else if (msg.type === 'oda:bookmark-rename') {
          if (!msg.id || !name) throw new Error('Yeni ad zorunludur.');
          await api.updateHaritaYerImi(msg.id, { name });
        } else if (msg.type === 'oda:bookmark-delete') {
          if (!msg.id) throw new Error('Geçersiz yer imi.');
          await api.deleteHaritaYerImi(msg.id);
        } else {
          return;
        }
        reply(true);
        await sendBookmarksToIframe(iframeWindow, projeId);
      } catch (err) {
        reply(false, err instanceof Error ? err.message : String(err));
      }
    };

    window.addEventListener('message', handleReady);
    window.addEventListener('message', handleAddDocuments);
    window.addEventListener('message', handleUpdateDbFeature);
    window.addEventListener('message', handleAddSahaPhotos);
    window.addEventListener('message', handleDeleteSahaPhoto);
    window.addEventListener('message', handleRenameSahaPhoto);
    window.addEventListener('message', handleSantiyeCreate);
    window.addEventListener('message', handleSantiyeAction);
    window.addEventListener('message', handleMetrajOptionsRequest);
    window.addEventListener('message', handleMetrajCreate);
    window.addEventListener('message', handleBookmarkOp);
    return () => {
      window.removeEventListener('message', handleReady);
      window.removeEventListener('message', handleAddDocuments);
      window.removeEventListener('message', handleUpdateDbFeature);
      window.removeEventListener('message', handleAddSahaPhotos);
      window.removeEventListener('message', handleDeleteSahaPhoto);
      window.removeEventListener('message', handleRenameSahaPhoto);
      window.removeEventListener('message', handleSantiyeCreate);
      window.removeEventListener('message', handleSantiyeAction);
      window.removeEventListener('message', handleMetrajOptionsRequest);
      window.removeEventListener('message', handleMetrajCreate);
      window.removeEventListener('message', handleBookmarkOp);
    };
  }, []);

  useEffect(() => {
    // Üst panelden bir proje seçildiğinde (ilk açılış dahil) o projeye ait
    // konumlu saha fotoğraflarını (bkz. sendSahaPhotosToIframe) haritaya
    // gönderir — hem ilk açılışta hem proje değiştiğinde günceller.
    if (!iframeReady || !activeProjectId) return;
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    sendSahaPhotosToIframe(iframeWindow, activeProjectId);
    sendSantiyeToIframe(iframeWindow, activeProjectId);
    sendSantiyeOptionsToIframe(iframeWindow, activeProjectId);
    sendBookmarksToIframe(iframeWindow, activeProjectId);
    // Pafta/yazdırma başlık bloğu için proje adı
    api.getProjeler().then((rows) => {
      const pr = rows.find((r) => r.id === activeProjectId);
      iframeWindow.postMessage({ type: 'oda:project-meta', projectId: activeProjectId, projectName: pr?.name || '' }, '*');
    }).catch(() => { /* proje adı yoksa başlık bloğu boş bırakılır */ });
  }, [activeProjectId, iframeReady]);

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
      iframeWindow.postMessage({ type: 'oda:zoom-to-project', bbox }, '*');
    })();

    return () => { cancelled = true; };
  }, [activeProjectId, iframeReady]);

  return (
    <iframe
      ref={iframeRef}
      src={odaHtmlUrl}
      title="ODA — Harita Çizim Aracı"
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      allow="geolocation"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
    />
  );
};

export default OdaMapModule;
