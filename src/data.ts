import { 
  Project, WBSTask, ProjectDocument, Asset, MaintenanceLog, Notification,
  GISBoundaryRecord, GISBuildingRecord, GISInfrastructureRecord 
} from './types';

export const initialProjects: Project[] = [
  {
    id: 'IGA-ETAP-1',
    code: 'IGA-ETAP-1',
    name: 'IGA CITY 1. Etap - Terminal & Ticaret Merkezi',
    location: 'Arnavutköy (İGA Batı Bölgesi)',
    coordinates: [28.6850, 41.2950], // [Lng, Lat]
    adaParcel: '4102 / 1',
    area: '185.000 m²',
    riskLevel: 'Düşük',
    overallProgress: 72,
    budget: 4850, // 4.85 Milyar TL
    spent: 3420, // 3.42 Milyar TL
    plannedSpent: 3500,
    earnedValue: 3492, // EVM Earned Value
    status: 'Devam Ediyor',
    blocks: [
      {
        id: 'iga1-block-tower',
        name: '[K-1] İGA Sky Tower (Finans & Genel Merkez)',
        height: 165,
        floors: 42,
        progress: 80,
        status: 'İnce Yapı',
        coordinates: [
          [28.7655, 41.2700],
          [28.7675, 41.2700],
          [28.7675, 41.2680],
          [28.7655, 41.2680]
        ],
        center: [28.7665, 41.2690]
      },
      {
        id: 'iga1-block-plaza',
        name: '[K-2] Airport Plaza (Ofis & Ticaret Bloğu)',
        height: 95,
        floors: 24,
        progress: 75,
        status: 'İnce Yapı',
        coordinates: [
          [28.7685, 41.2702],
          [28.7705, 41.2702],
          [28.7705, 41.2682],
          [28.7685, 41.2682]
        ],
        center: [28.7695, 41.2692]
      },
      {
        id: 'iga1-block-mall',
        name: '[T-1] İGA Terminal AVM & Duty Free Mall',
        height: 35,
        floors: 6,
        progress: 90,
        status: 'İnce Yapı',
        coordinates: [
          [28.7668, 41.2678],
          [28.7692, 41.2678],
          [28.7692, 41.2658],
          [28.7668, 41.2658]
        ],
        center: [28.7680, 41.2668]
      },
      {
        id: 'iga1-block-parking',
        name: '[O-1] Katlı Otopark & Yolcu Transfer Hub',
        height: 24,
        floors: 5,
        progress: 60,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7640, 41.2675],
          [28.7660, 41.2675],
          [28.7660, 41.2655],
          [28.7640, 41.2655]
        ],
        center: [28.7650, 41.2665]
      },
      {
        id: 'iga1-block-recreation',
        name: '[S-2] İGA Kongre & Fuar Oteli',
        height: 68,
        floors: 17,
        progress: 85,
        status: 'İnce Yapı',
        coordinates: [
          [28.7710, 41.2710],
          [28.7725, 41.2710],
          [28.7725, 41.2695],
          [28.7710, 41.2695]
        ],
        center: [28.7717, 41.2702]
      }
    ],
    permits: [
      {
        id: 'permit-iga1-1',
        name: 'DHMİ Havalimanı Komşuluk & Yapılaşma İzni',
        authority: 'Devlet Hava Meydanları İşletmesi (DHMİ)',
        issueDate: '2024-01-15',
        expiryDate: '2029-01-15',
        status: 'Alındı',
        geographicScope: 'İGA 1. Etap İmar Parseli',
        documentUrl: 'dhmi_yapilasma_izni_iga1.pdf'
      },
      {
        id: 'permit-iga1-2',
        name: 'ÇED Olumlu Raporu & Akustik İzolasyon Onayı',
        authority: 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        issueDate: '2023-10-10',
        expiryDate: '2028-10-10',
        status: 'Alındı',
        geographicScope: 'Havalimanı Doğu Çevresi 2.5km Çap',
        documentUrl: 'ced_raporu_iga_city_v1.pdf'
      },
      {
        id: 'permit-iga1-3',
        name: 'İmar Plan Onayı & 1/1000 Uygulama İmar Planı',
        authority: 'İstanbul Büyükşehir Belediyesi & Arnavutköy Belediyesi',
        issueDate: '2023-06-01',
        expiryDate: '2028-06-01',
        status: 'Alındı',
        geographicScope: 'Ada 4102 Parsel 1',
        documentUrl: 'imar_plan_onay_iga1.pdf'
      }
    ],
    employees: [
      {
        id: 'emp-iga-1',
        name: 'Murat Erdem',
        role: 'Proje Direktörü & Başmühendis',
        allocationPercentage: 60,
        otherProjects: [
          { projectName: 'IGA CITY 2. Etap', percentage: 40 }
        ]
      },
      {
        id: 'emp-iga-2',
        name: 'Berrin Yücel',
        role: 'BIM / GIS Koordinatörü',
        allocationPercentage: 50,
        otherProjects: [
          { projectName: 'IGA CITY 3. Etap', percentage: 50 }
        ]
      },
      {
        id: 'emp-iga-3',
        name: 'Selim Kara',
        role: 'Elektromekanik Saha Şefi',
        allocationPercentage: 100,
        otherProjects: []
      }
    ]
  },
  {
    id: 'IGA-ETAP-2',
    code: 'IGA-ETAP-2',
    name: 'IGA CITY 2. Etap - Oteller & Kongre Kompleksi',
    location: 'Arnavutköy (İGA Batı - Fuar Vadisi)',
    coordinates: [28.6250, 41.2700],
    adaParcel: '4105 / 4',
    area: '240.000 m²',
    riskLevel: 'Orta',
    overallProgress: 54,
    budget: 5400,
    spent: 2850,
    plannedSpent: 2920,
    earnedValue: 2916,
    status: 'Devam Ediyor',
    blocks: [
      {
        id: 'iga2-block-hotel1',
        name: '[H-1] Grand Airport Hotel & Suites',
        height: 120,
        floors: 30,
        progress: 62,
        status: 'İnce Yapı',
        coordinates: [
          [28.7835, 41.2745],
          [28.7855, 41.2745],
          [28.7855, 41.2725],
          [28.7835, 41.2725]
        ],
        center: [28.7845, 41.2735]
      },
      {
        id: 'iga2-block-hotel2',
        name: '[H-2] Business Transit Resort',
        height: 75,
        floors: 18,
        progress: 58,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7870, 41.2748],
          [28.7890, 41.2748],
          [28.7890, 41.2728],
          [28.7870, 41.2728]
        ],
        center: [28.7880, 41.2738]
      },
      {
        id: 'iga2-block-expo',
        name: '[EXPO-1] İGA Uluslararası Fuar & Kongre Sarayı',
        height: 42,
        floors: 4,
        progress: 48,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7845, 41.2715],
          [28.7875, 41.2715],
          [28.7875, 41.2695],
          [28.7845, 41.2695]
        ],
        center: [28.7860, 41.2705]
      },
      {
        id: 'iga2-block-hall',
        name: '[S-1] Kültür & Gösteri Oditoryumu',
        height: 28,
        floors: 3,
        progress: 40,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7820, 41.2720],
          [28.7840, 41.2720],
          [28.7840, 41.2700],
          [28.7820, 41.2700]
        ],
        center: [28.7830, 41.2710]
      },
      {
        id: 'iga2-block-vip',
        name: '[H-3] VIP Terminal Rezidans Oteli',
        height: 85,
        floors: 22,
        progress: 70,
        status: 'İnce Yapı',
        coordinates: [
          [28.7895, 41.2725],
          [28.7915, 41.2725],
          [28.7915, 41.2705],
          [28.7895, 41.2705]
        ],
        center: [28.7905, 41.2715]
      }
    ],
    permits: [
      {
        id: 'permit-iga2-1',
        name: 'Turizm Yatırım Belgesi & Ruhsatı',
        authority: 'Kültür ve Turizm Bakanlığı',
        issueDate: '2024-03-01',
        expiryDate: '2029-03-01',
        status: 'Alındı',
        geographicScope: 'Ada 4105 Parsel 4',
        documentUrl: 'turizm_ruhsati_iga2.pdf'
      },
      {
        id: 'permit-iga2-2',
        name: 'İSKİ Altyapı ve Su Havzası Uygunluk İzni',
        authority: 'İstanbul Su ve Kanalizasyon İdaresi (İSKİ)',
        issueDate: '2024-04-15',
        expiryDate: '2027-04-15',
        status: 'Alındı',
        geographicScope: 'Terkos İsale Hattı Koruma Koridoru',
        documentUrl: 'iski_uygunluk_iga2.pdf'
      }
    ],
    employees: [
      {
        id: 'emp-iga-1',
        name: 'Murat Erdem',
        role: 'Proje Direktörü & Başmühendis',
        allocationPercentage: 40,
        otherProjects: [
          { projectName: 'IGA CITY 1. Etap', percentage: 60 }
        ]
      },
      {
        id: 'emp-iga-4',
        name: 'Deniz Aktaş',
        role: 'Otel & Fitout Mimari Şefi',
        allocationPercentage: 100,
        otherProjects: []
      }
    ]
  },
  {
    id: 'IGA-ETAP-3',
    code: 'IGA-ETAP-3',
    name: 'IGA CITY 3. Etap - Lojistik & Kargo Parkı',
    location: 'Arnavutköy (İGA Batı - Kargo Hattı)',
    coordinates: [28.6700, 41.2300],
    adaParcel: '4110 / 12',
    area: '320.000 m²',
    riskLevel: 'Düşük',
    overallProgress: 88,
    budget: 3200,
    spent: 2816,
    plannedSpent: 2800,
    earnedValue: 2816,
    status: 'Devam Ediyor',
    blocks: [
      {
        id: 'iga3-block-cargo1',
        name: '[L-1] Akıllı Hava Kargo Dağıtım Merkezi',
        height: 32,
        floors: 4,
        progress: 95,
        status: 'Tamamlandı',
        coordinates: [
          [28.7615, 41.2535],
          [28.7645, 41.2535],
          [28.7645, 41.2515],
          [28.7615, 41.2515]
        ],
        center: [28.7630, 41.2525]
      },
      {
        id: 'iga3-block-cold',
        name: '[L-2] Soğuk Hava & İlaç Depolama Tesisi',
        height: 26,
        floors: 3,
        progress: 90,
        status: 'Tamamlandı',
        coordinates: [
          [28.7655, 41.2538],
          [28.7685, 41.2538],
          [28.7685, 41.2518],
          [28.7655, 41.2518]
        ],
        center: [28.7670, 41.2528]
      },
      {
        id: 'iga3-block-customs',
        name: '[G-1] Gümrük İdare Binası & Operasyon Kulesi',
        height: 58,
        floors: 14,
        progress: 82,
        status: 'İnce Yapı',
        coordinates: [
          [28.7640, 41.2505],
          [28.7660, 41.2505],
          [28.7660, 41.2485],
          [28.7640, 41.2485]
        ],
        center: [28.7650, 41.2495]
      },
      {
        id: 'iga3-block-fleet',
        name: '[L-3] Lojistik TIR Filo & Şarj Parkı',
        height: 14,
        floors: 2,
        progress: 85,
        status: 'Tamamlandı',
        coordinates: [
          [28.7675, 41.2510],
          [28.7695, 41.2510],
          [28.7695, 41.2490],
          [28.7675, 41.2490]
        ],
        center: [28.7685, 41.2500]
      },
      {
        id: 'iga3-block-tower',
        name: '[G-2] Lojistik Hava Trafik Kontrol Kulesi',
        height: 92,
        floors: 20,
        progress: 95,
        status: 'Tamamlandı',
        coordinates: [
          [28.7610, 41.2500],
          [28.7625, 41.2500],
          [28.7625, 41.2485],
          [28.7610, 41.2485]
        ],
        center: [28.7617, 41.2492]
      }
    ],
    permits: [
      {
        id: 'permit-iga3-1',
        name: 'Gümrüklü Saha & Antrepo İşletme İzni',
        authority: 'Ticaret Bakanlığı Gümrükler Genel Müdürlüğü',
        issueDate: '2023-11-20',
        expiryDate: '2028-11-20',
        status: 'Alındı',
        geographicScope: 'Ada 4110 Parsel 12',
        documentUrl: 'gumruk_antrepo_belgesi.pdf'
      }
    ],
    employees: [
      {
        id: 'emp-iga-2',
        name: 'Berrin Yücel',
        role: 'BIM / GIS Koordinatörü',
        allocationPercentage: 50,
        otherProjects: [
          { projectName: 'IGA CITY 1. Etap', percentage: 50 }
        ]
      }
    ]
  },
  {
    id: 'IGA-ETAP-4',
    code: 'IGA-ETAP-4',
    name: 'IGA CITY 4. Etap - Havacılık Akademisi & Teknopark',
    location: 'Arnavutköy (İGA Batı - Ar-Ge Kampüsü)',
    coordinates: [28.6100, 41.3050],
    adaParcel: '4118 / 8',
    area: '210.000 m²',
    riskLevel: 'Düşük',
    overallProgress: 25,
    budget: 3900,
    spent: 950,
    plannedSpent: 1050,
    earnedValue: 975,
    status: 'Planlama',
    blocks: [
      {
        id: 'iga4-block-sim',
        name: '[A-1] Uçuş Simülatörleri & Havacılık Akademisi',
        height: 48,
        floors: 8,
        progress: 35,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7850, 41.2555],
          [28.7880, 41.2555],
          [28.7880, 41.2535],
          [28.7850, 41.2535]
        ],
        center: [28.7865, 41.2545]
      },
      {
        id: 'iga4-block-tech',
        name: '[T-1] İGA Teknopark İnovasyon Kulesi',
        height: 110,
        floors: 28,
        progress: 20,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7895, 41.2558],
          [28.7915, 41.2558],
          [28.7915, 41.2538],
          [28.7895, 41.2538]
        ],
        center: [28.7905, 41.2548]
      },
      {
        id: 'iga4-block-hangar',
        name: '[R-1] Drone & Otonom Sistemler Test Hangarı',
        height: 30,
        floors: 3,
        progress: 25,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7865, 41.2525],
          [28.7885, 41.2525],
          [28.7885, 41.2505],
          [28.7865, 41.2505]
        ],
        center: [28.7875, 41.2515]
      },
      {
        id: 'iga4-block-res',
        name: '[D-1] Akademi Öğrenci & Araştırmacı Rezidansı',
        height: 65,
        floors: 16,
        progress: 18,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7905, 41.2528],
          [28.7925, 41.2528],
          [28.7925, 41.2508],
          [28.7905, 41.2508]
        ],
        center: [28.7915, 41.2518]
      },
      {
        id: 'iga4-block-expo',
        name: '[A-2] Havacılık Müzesi & Gösteri Merkezi',
        height: 38,
        floors: 5,
        progress: 45,
        status: 'Kaba Yapı',
        coordinates: [
          [28.7820, 41.2545],
          [28.7845, 41.2545],
          [28.7845, 41.2525],
          [28.7820, 41.2525]
        ],
        center: [28.7832, 41.2535]
      }
    ],
    permits: [
      {
        id: 'permit-iga4-1',
        name: 'Teknoloji Geliştirme Bölgesi (TGB) Kuruluş Onayı',
        authority: 'Sanayi ve Teknoloji Bakanlığı',
        issueDate: '2025-02-10',
        expiryDate: '2030-02-10',
        status: 'Alındı',
        geographicScope: 'Ada 4118 Parsel 8',
        documentUrl: 'tgb_kurulus_onayi.pdf'
      }
    ],
    employees: [
      {
        id: 'emp-iga-5',
        name: 'Dr. Kerem Tan',
        role: 'Teknopark & Ar-Ge Direktörü',
        allocationPercentage: 100,
        otherProjects: []
      }
    ]
  }
];

// ---------------------------------------------------------------------
// Database Katman Tabloları (PostGIS Table Mock Definitions)
// Proje sınırları (1/proje), binalar (10/proje, ızgara düzeninde) ve
// altyapı hatları (o 10 binayı birbirine bağlayan 10 hat/proje) her
// projenin kendi merkezi (Project.coordinates) etrafında programatik
// olarak üretilir. Böylece her proje kendine ait, çakışmayan bir coğrafi
// alana sahip olur ve "Üst panelde proje seçilince haritada o proje
// sınırına zoom" özelliği (KrokiMapModule.tsx → kroki:zoom-to-project)
// gisBoundaryRecords'taki tek satırı doğrudan kullanabilir.
// ---------------------------------------------------------------------

const BOUNDARY_HALF_LNG = 0.011;
const BOUNDARY_HALF_LAT = 0.009;

export const gisBoundaryRecords: GISBoundaryRecord[] = initialProjects.map((p) => {
  const [lng, lat] = p.coordinates;
  const widthMeters = BOUNDARY_HALF_LNG * 2 * 111320 * Math.cos(lat * Math.PI / 180);
  const heightMeters = BOUNDARY_HALF_LAT * 2 * 110540;
  return {
    id: `bnd-${p.id}`,
    table_name: 'tb_proje_sinirlari',
    project_id: p.id,
    project_name: p.name,
    ada_parsel: p.adaParcel,
    area_sqm: Math.round(widthMeters * heightMeters),
    srid: 4326,
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [lng - BOUNDARY_HALF_LNG, lat - BOUNDARY_HALF_LAT],
        [lng + BOUNDARY_HALF_LNG, lat - BOUNDARY_HALF_LAT],
        [lng + BOUNDARY_HALF_LNG, lat + BOUNDARY_HALF_LAT],
        [lng - BOUNDARY_HALF_LNG, lat + BOUNDARY_HALF_LAT],
        [lng - BOUNDARY_HALF_LNG, lat - BOUNDARY_HALF_LAT]
      ]]
    }
  };
});

// 10 bina/proje — 2 satır x 5 sütunluk bir ızgarada, proje sınırının içinde.
const BUILDING_GRID_OFFSETS: [number, number][] = [
  [-0.008, 0.003], [-0.004, 0.003], [0, 0.003], [0.004, 0.003], [0.008, 0.003],
  [-0.008, -0.003], [-0.004, -0.003], [0, -0.003], [0.004, -0.003], [0.008, -0.003]
];
const BUILDING_HALF = 0.0007;
const BUILDING_PROFILES: { height: number; floors: number; progress: number; status: string }[] = [
  { height: 180, floors: 45, progress: 85, status: 'İnce Yapı' },
  { height: 45,  floors: 11, progress: 60, status: 'Kaba Yapı' },
  { height: 90,  floors: 22, progress: 72, status: 'İnce Yapı' },
  { height: 150, floors: 38, progress: 90, status: 'Tamamlandı' },
  { height: 60,  floors: 15, progress: 55, status: 'Kaba Yapı' },
  { height: 120, floors: 30, progress: 78, status: 'İnce Yapı' },
  { height: 200, floors: 50, progress: 40, status: 'Temel' },
  { height: 75,  floors: 19, progress: 65, status: 'Kaba Yapı' },
  { height: 110, floors: 28, progress: 82, status: 'İnce Yapı' },
  { height: 35,  floors: 9,  progress: 95, status: 'Tamamlandı' }
];

export const gisBuildingRecords: GISBuildingRecord[] = initialProjects.flatMap((p) => {
  const [lng, lat] = p.coordinates;
  return BUILDING_GRID_OFFSETS.map((offset, i) => {
    const cx = lng + offset[0], cy = lat + offset[1];
    const prof = BUILDING_PROFILES[i];
    return {
      id: `bld-${p.id}-${i + 1}`,
      table_name: 'tb_binalar_3d',
      project_id: p.id,
      block_name: `${p.code} — Blok ${String.fromCharCode(65 + Math.floor(i / 5))}${(i % 5) + 1}`,
      building_type: prof.height > 100 ? 'Gökdelen / Kule' : prof.height > 50 ? 'Yüksek Yapı' : 'Orta / Alçak Yapı',
      height_meters: prof.height,
      floors_count: prof.floors,
      construction_progress: prof.progress,
      structural_status: prof.status,
      footprint_area_sqm: Math.round(Math.pow(BUILDING_HALF * 2 * 111000, 2)),
      srid: 4326,
      coordinates: [
        [cx - BUILDING_HALF, cy - BUILDING_HALF],
        [cx + BUILDING_HALF, cy - BUILDING_HALF],
        [cx + BUILDING_HALF, cy + BUILDING_HALF],
        [cx - BUILDING_HALF, cy + BUILDING_HALF]
      ] as [number, number][]
    };
  });
});

// 10 altyapı hattı/proje — yukarıdaki 10 binayı birbirine bağlayan bir
// şebeke (her satırın kendi içinde 4'er yatay bağlantı + iki satırı
// birleştiren 2 dikey bağlantı = 10 kenar), elektrik/su/gaz/telekom/drenaj
// arasında dönüşümlü tiplendirilmiş. Hat durumu projenin genel ilerlemesine
// göre belirlenir (orijinal veri setindeki Etap1/3 Faal, Etap2 İnşaat
// Halinde, Etap4 Planlanan örüntüsüyle tutarlı).
const INFRA_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],   // 1. sıra binalarını birbirine bağlar
  [5, 6], [6, 7], [7, 8], [8, 9],   // 2. sıra binalarını birbirine bağlar
  [0, 5], [4, 9]                     // iki sırayı dikey olarak bağlar
];
const INFRA_TYPE_CYCLE: GISInfrastructureRecord['line_type'][] = ['elektrik', 'su', 'gaz', 'telekom', 'drenaj'];
const INFRA_SPEC_BY_TYPE: Record<string, { spec: string; depth: number; voltage: string }> = {
  elektrik: { spec: '3x(1x240/25) mm² XLPE Yeraltı Kablosu', depth: 1.8, voltage: '34.5 kV' },
  su:       { spec: 'Ø400 mm Duktil Font Boru', depth: 2.0, voltage: '12 Bar' },
  gaz:      { spec: 'Ø200 mm Polietilen Boru', depth: 1.6, voltage: '4 Bar' },
  telekom:  { spec: '144 Core Single Mode Fiber Optik', depth: 1.1, voltage: 'Optik Sinyal' },
  drenaj:   { spec: 'Ø800 mm Koruge Boru', depth: 2.4, voltage: 'Cazibeli Akış' }
};
function statusForProgress(progress: number): GISInfrastructureRecord['status'] {
  if (progress >= 70) return 'Faal';
  if (progress >= 40) return 'İnşaat Halinde';
  return 'Planlanan';
}

export const gisInfrastructureRecords: GISInfrastructureRecord[] = initialProjects.flatMap((p) => {
  const [lng, lat] = p.coordinates;
  const status = statusForProgress(p.overallProgress);
  return INFRA_EDGES.map((edge, i) => {
    const a = BUILDING_GRID_OFFSETS[edge[0]];
    const b = BUILDING_GRID_OFFSETS[edge[1]];
    const from: [number, number] = [lng + a[0], lat + a[1]];
    const to: [number, number] = [lng + b[0], lat + b[1]];
    const type = INFRA_TYPE_CYCLE[i % INFRA_TYPE_CYCLE.length];
    const specInfo = INFRA_SPEC_BY_TYPE[type];
    const lengthMeters = Math.round(Math.hypot(
      (to[0] - from[0]) * 111320 * Math.cos(lat * Math.PI / 180),
      (to[1] - from[1]) * 110540
    ));
    return {
      id: `infra-${p.id}-${i + 1}`,
      table_name: 'tb_altyapi_hatlari',
      project_id: p.id,
      line_type: type,
      network_name: `${p.code} — Bina ${edge[0] + 1} / Bina ${edge[1] + 1} Arası ${type.charAt(0).toUpperCase() + type.slice(1)} Hattı`,
      pipe_or_cable_spec: specInfo.spec,
      depth_meters: specInfo.depth,
      voltage_or_pressure: specInfo.voltage,
      total_length_meters: lengthMeters,
      status,
      coordinates: [from, to]
    };
  });
});

export const initialWbsTasks: Record<string, WBSTask[]> = {
  'IGA-ETAP-1': [
    {
      id: 'task-iga1-1',
      wbsCode: '32',
      name: 'Sky Tower 38. Kat Çelik Kompozit Kolon ve Döşeme Betonu',
      progress: 82,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      contractor: 'Limak-Kalyon İnşaat Konsorsiyumu',
      plannedQuantity: 650,
      actualQuantity: 533,
      unit: 'm³',
      responsible: 'İnş. Müh. Murat E.',
      durationDays: 14,
      status: 'Devam',
      blockId: 'iga1-block-tower',
      cost: 28.5
    },
    {
      id: 'task-iga1-2',
      wbsCode: '24',
      name: 'Airport Plaza Dış Cephe Akustik Çift Cam Giydirme',
      progress: 74,
      startDate: '2026-08-01',
      endDate: '2026-11-30',
      contractor: 'Schüco Türkiye / Cetaş Cephe',
      plannedQuantity: 4200,
      actualQuantity: 3108,
      unit: 'm²',
      responsible: 'Mimar Sinan O.',
      durationDays: 20,
      status: 'Devam',
      blockId: 'iga1-block-plaza',
      cost: 42.0
    },
    {
      id: 'task-iga1-3',
      wbsCode: '18',
      name: 'Duty Free Mall İklimlendirme ve Yangın Sprinkler Otomasyonu',
      progress: 95,
      startDate: '2026-07-10',
      endDate: '2026-08-28',
      contractor: 'Honeywell Building Solutions',
      plannedQuantity: 450,
      actualQuantity: 428,
      unit: 'Adet',
      responsible: 'Mak. Müh. Selim K.',
      durationDays: 12,
      status: 'Devam',
      blockId: 'iga1-block-mall',
      cost: 16.8
    },
    {
      id: 'task-iga1-4',
      wbsCode: '09',
      name: 'Yolcu Transfer Hub Otopark Katı Elektrikli Araç Şarj İstasyonları',
      progress: 60,
      startDate: '2026-08-15',
      endDate: '2026-09-30',
      contractor: 'Siemens eMobility / Trugo',
      plannedQuantity: 80,
      actualQuantity: 48,
      unit: 'İstasyon',
      responsible: 'Elk. Müh. Mustafa D.',
      durationDays: 18,
      status: 'Devam',
      blockId: 'iga1-block-parking',
      cost: 9.4
    }
  ],
  'IGA-ETAP-2': [
    {
      id: 'task-iga2-1',
      wbsCode: '22',
      name: 'Grand Airport Hotel 18. Kat Mekanik Tesisat ve Havalandırma Şaftları',
      progress: 62,
      startDate: '2026-08-01',
      endDate: '2026-09-15',
      contractor: 'Mekanik Pro A.Ş.',
      plannedQuantity: 180,
      actualQuantity: 112,
      unit: 'Modül',
      responsible: 'Mak. Müh. Selim K.',
      durationDays: 25,
      status: 'Devam',
      blockId: 'iga2-block-hotel1',
      cost: 22.0
    },
    {
      id: 'task-iga2-2',
      wbsCode: '14',
      name: 'Fuar & Kongre Sarayı Uzay Kafes Çelik Çatı Makası Montajı',
      progress: 48,
      startDate: '2026-07-15',
      endDate: '2026-10-15',
      contractor: 'Çimtaş Çelik İmalat',
      plannedQuantity: 1200,
      actualQuantity: 576,
      unit: 'Ton',
      responsible: 'İnş. Müh. Murat E.',
      durationDays: 45,
      status: 'Devam',
      blockId: 'iga2-block-expo',
      cost: 54.0
    }
  ],
  'IGA-ETAP-3': [
    {
      id: 'task-iga3-1',
      wbsCode: '06',
      name: 'Akıllı Kargo Merkezi Otomatik Konveyör ve AS/RS Robotik Raf Sistemi',
      progress: 95,
      startDate: '2026-06-01',
      endDate: '2026-08-30',
      contractor: 'Dematic Lojistik Sistemleri',
      plannedQuantity: 12,
      actualQuantity: 11,
      unit: 'Hat',
      responsible: 'Mekatronik Müh. Alper T.',
      durationDays: 30,
      status: 'Devam',
      blockId: 'iga3-block-cargo1',
      cost: 38.0
    },
    {
      id: 'task-iga3-2',
      wbsCode: '04',
      name: 'Soğuk Hava & İlaç Deposu Sıcaklık Kontrollü İzolasyon Panelleri',
      progress: 90,
      startDate: '2026-07-01',
      endDate: '2026-08-25',
      contractor: 'FrigoPanel İzolasyon',
      plannedQuantity: 8500,
      actualQuantity: 7650,
      unit: 'm²',
      responsible: 'İnş. Müh. Berrin Y.',
      durationDays: 15,
      status: 'Devam',
      blockId: 'iga3-block-cold',
      cost: 14.5
    }
  ],
  'IGA-ETAP-4': [
    {
      id: 'task-iga4-1',
      wbsCode: '02',
      name: 'Uçuş Simülatörleri Hidrolik Zemin Ankrajları ve Sönümleyici Platform',
      progress: 35,
      startDate: '2026-08-01',
      endDate: '2026-10-31',
      contractor: 'HAVELSAN Simülasyon Sistemleri',
      plannedQuantity: 6,
      actualQuantity: 2,
      unit: 'Platform',
      responsible: 'Dr. Kerem Tan',
      durationDays: 60,
      status: 'Devam',
      blockId: 'iga4-block-sim',
      cost: 45.0
    },
    {
      id: 'task-iga4-2',
      wbsCode: '01',
      name: 'İnovasyon Kulesi Temel Radye Betonu ve İksa Kazık İmalatı',
      progress: 20,
      startDate: '2026-08-10',
      endDate: '2026-11-20',
      contractor: 'Zemin Yapı Ltd.',
      plannedQuantity: 18000,
      actualQuantity: 3600,
      unit: 'm³',
      responsible: 'İnş. Müh. Murat E.',
      durationDays: 70,
      status: 'Devam',
      blockId: 'iga4-block-tech',
      cost: 52.0
    }
  ]
};

export const initialDocuments: ProjectDocument[] = [
  {
    id: 'doc-iga-1',
    name: 'İGA City 1. Etap Sky Tower Mimari Uygulama Projesi (Rev_06).pdf',
    version: 'v6.0',
    revisionHistory: [
      { version: 'v1.0', date: '2024-01-10', author: 'Grimshaw & Haptic Architects', note: 'Masterplan Konsept Tasarımı' },
      { version: 'v4.0', date: '2025-06-15', author: 'BIM Koord. Berrin Y.', note: 'Havalimanı Mania Kriterleri Uyumlaştırma' },
      { version: 'v6.0', date: '2026-04-12', author: 'Murat Erdem', note: 'As-built Öncesi Son İnce Yapı Revizyonu' }
    ],
    approvalWorkflow: [
      { step: 'DHMİ Mania Kontrolü', status: 'Approved', approver: 'DHMİ Havacılık Güvenliği Dairesi' },
      { step: 'BIM CBS Koordinasyonu', status: 'Approved', approver: 'Berrin Yücel' },
      { step: 'İcra Kurulu Onayı', status: 'Approved', approver: 'İGA Yönetim Kurulu' }
    ],
    associatedBlockId: 'iga1-block-tower',
    fileSize: '58.4 MB',
    uploadDate: '2026-04-15'
  },
  {
    id: 'doc-iga-2',
    name: 'İGA Doğu Bölgesi PostGIS Katmanları ve Altyapı Çakışma Raporu.pdf',
    version: 'v3.2',
    revisionHistory: [
      { version: 'v1.0', date: '2025-02-20', author: 'CBS Uzm. Zeynep K.', note: 'İlk Kadastro ve Hat Çizimleri' },
      { version: 'v3.2', date: '2026-07-01', author: 'Berrin Yücel', note: 'Jet Yakıt ve Terkos İsale Hattı Koridoru Entegrasyonu' }
    ],
    approvalWorkflow: [
      { step: 'İSKİ & İGDAŞ Onayı', status: 'Approved', approver: 'İSKİ Altyapı Dairesi' },
      { step: 'Şantiye Koordinatörü', status: 'Approved', approver: 'Murat Erdem' }
    ],
    associatedBlockId: 'iga1-block-plaza',
    fileSize: '34.8 MB',
    uploadDate: '2026-07-05'
  }
];

export const initialAssets: Asset[] = [
  {
    id: 'asset-iga-chiller',
    name: 'İGA 1. Etap Merkezi Manyetik Yataklı Chiller Soğutma Grubu',
    type: 'Ekipman',
    installDate: '2026-04-10',
    expectedLifeYears: 25,
    warrantyStatus: 'Garantide (Bitiş: 2031-04-10)',
    manufacturer: 'Trane Technologies',
    techDocUrl: 'trane_centrifugal_chiller_iga.pdf',
    maintenanceCost: 2.8,
    energyCost: 6.5,
    status: 'Sorunsuz',
    associatedProjectId: 'IGA-ETAP-1',
    associatedBlockId: 'iga1-block-tower',
    lastMaintenanceDate: '2026-08-15'
  },
  {
    id: 'asset-iga-generator',
    name: 'Sky Tower 3500 kVA Kesintisiz Senkron Dizel Jeneratör Seti',
    type: 'Altyapı',
    installDate: '2026-03-20',
    expectedLifeYears: 30,
    warrantyStatus: 'Garantide (Bitiş: 2036-03-20)',
    manufacturer: 'Caterpillar (Borusan Güç Sistemleri)',
    techDocUrl: 'cat_3500kva_genset_manual.pdf',
    maintenanceCost: 1.4,
    energyCost: 4.2,
    status: 'Sorunsuz',
    associatedProjectId: 'IGA-ETAP-1',
    associatedBlockId: 'iga1-block-tower',
    lastMaintenanceDate: '2026-08-01'
  },
  {
    id: 'asset-iga-lift',
    name: 'Airport Plaza Çift Katlı Yüksek Hızlı Asansör Sistemi (7 m/s)',
    type: 'Ekipman',
    installDate: '2026-05-15',
    expectedLifeYears: 25,
    warrantyStatus: 'Garantide (Bitiş: 2030-05-15)',
    manufacturer: 'Schindler Elevator Corp',
    techDocUrl: 'schindler_7000_highspeed.pdf',
    maintenanceCost: 1.1,
    energyCost: 2.9,
    status: 'Bakım Bekliyor',
    associatedProjectId: 'IGA-ETAP-1',
    associatedBlockId: 'iga1-block-plaza',
    lastMaintenanceDate: '2026-08-20'
  }
];

export const initialMaintenanceLogs: MaintenanceLog[] = [
  {
    id: 'log-iga-1',
    assetId: 'asset-iga-chiller',
    date: '2026-08-15',
    type: 'Planlı Bakım (PM)',
    description: 'Chiller kompresör yağ analizi ve kondenser boru kavitasyon testi tamamlandı. Verimlilik %99.2.',
    cost: 55000,
    technician: 'Trane Yetkili Servis',
    status: 'Tamamlandı'
  },
  {
    id: 'log-iga-2',
    assetId: 'asset-iga-lift',
    date: '2026-08-20',
    type: 'Planlı Bakım (PM)',
    description: 'Yüksek hızlı asansör fren balata kalınlığı ölçüldü, kılavuz ray yağlama kartuşları değişti.',
    cost: 38000,
    technician: 'Schindler Bölge Servisi',
    status: 'Açık'
  }
];

export const initialNotifications: Notification[] = [
  {
    id: 'notif-ncr-1',
    projectId: 'IGA-ETAP-1',
    type: 'danger',
    category: 'Saha NCR',
    path: 'NCR / NCR-2026-42',
    badge: 'KRİTİK',
    badgeType: 'danger',
    title: 'Yeni Saha Uygunsuzluğu (NCR–2026–42)',
    message: '18. Kat Dış Cephe Ankraj Bağlantısında Tork Eksikliği tespit edildi ve kritik öncelikle açıldı.',
    tags: ['İSG Uzmanı Banu Aydın', 'Kritik'],
    actionText: 'Saha NCR Listesine Git',
    actionLink: '#ncr-list',
    date: '10 dakika önce',
    read: false
  },
  {
    id: 'notif-cad-1',
    projectId: 'IGA-ETAP-1',
    type: 'warning',
    category: 'Dosyalar',
    path: 'CAD / DWG ÇİZİM',
    badge: 'YÜKSEK',
    badgeType: 'warning',
    title: 'Yeni Teknik Doküman Yüklendi (Rev.04)',
    message: 'A-Blok Statik Uygulama ve Donatı Detay Çizimleri CDE Dosya Yöneticisine eklendi.',
    tags: ['A_BLOK_STATIK_REV04.dwg', 'Mimar Selin Çelik'],
    actionText: 'Dosya Yöneticisinde Aç',
    actionLink: '#cde-manager',
    date: '45 dakika önce',
    read: false
  },
  {
    id: 'notif-file-2',
    projectId: 'IGA-ETAP-2',
    type: 'info',
    category: 'Dosyalar',
    path: 'RAPOR / HAKEDİŞ',
    badge: 'ORTA',
    badgeType: 'info',
    title: 'Temmuz Ayı Hakediş Raporu Yayımlandı',
    message: 'Ortak altyapı ve saha deplase işleri Temmuz ayı hakediş kapak onay süreçleri tamamlanmıştır.',
    tags: ['IGA_TEMMUZ_HAKEDIS.pdf', 'QS Uzmanı Caner Şen'],
    actionText: 'Dosya Yöneticisinde Aç',
    actionLink: '#cde-manager',
    date: '2 saat önce',
    read: false
  },
  {
    id: 'notif-file-3',
    projectId: 'IGA-ETAP-2',
    type: 'info',
    category: 'Dosyalar',
    path: 'BIM / IFC MODEL',
    badge: 'DÜŞÜK',
    badgeType: 'info',
    title: 'Terminal Çelik Çatı IFC Revizyonu',
    message: 'Yapısal çelik bağlantı detayları güncel imalat çizimleriyle senkronize edilerek IFC modeline aktarıldı.',
    tags: ['TERMINAL_ROOF_V2.ifc', 'BIM Yöneticisi Mert Soylu'],
    actionText: 'Dosya Yöneticisinde Aç',
    actionLink: '#cde-manager',
    date: '4 saat önce',
    read: true
  },
  {
    id: 'notif-ncr-2',
    projectId: 'IGA-ETAP-3',
    type: 'info',
    category: 'Saha NCR',
    path: 'NCR / NCR-2026-40',
    badge: 'ORTA',
    badgeType: 'info',
    title: 'Beton Dayanım Sonuçları Girişi (Onaylandı)',
    message: 'Terminal 1. Etap C35/45 hazır beton dökümüne ait 28 günlük mukavemet kırımı standart limitleri karşıladı.',
    tags: ['Mukavemet_Kabul_Raporu.pdf', 'Laboratuvar Sorumlusu Elif Kaya'],
    actionText: 'Saha NCR Listesine Git',
    actionLink: '#ncr-list',
    date: '1 gün önce',
    read: true
  }
];
