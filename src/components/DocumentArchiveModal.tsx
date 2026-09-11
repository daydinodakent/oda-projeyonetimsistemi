import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, Folder, FolderOpen, Plus, Search, Trash2, Eye, Download, X,
  FileCheck, Globe, Database, Image, Video, HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Upload, FileCode, Star,
  Layers, Grid, Map, Play, Pause, RotateCw, Volume2, ZoomIn, ZoomOut, Settings, Sliders, Sun, Bookmark, CheckCircle2,
  Shield, History, Lock, User
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  phase: 'PROJE' | 'İNŞAAT' | 'İŞLETME';
  category: string; // e.g. "Şartname", "Çizim", "GIS Verisi", "Ofis Belgesi", "Medya"
  author: string;
  date: string;
  version: string;
  size: string;
  extension: string; // e.g. "pdf", "dwg", "geojson", "xlsx", "docx", "png"
  folderId: string;
  description?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface SignatureLog {
  id: string;
  docId: string;
  docName: string;
  approver: string;
  role: string;
  date: string;
  timestamp: string;
  hash: string;
  signatureData: string; // Base64 dataUrl or text signature
  signatureType: 'draw' | 'type';
  ipAddress: string;
  verificationCode: string;
}

interface FolderItem {
  id: string;
  name: string;
  count: number;
}

interface PhaseFolder {
  id: string;
  name: string;
  count: number;
  subfolders: FolderItem[];
}

interface DocumentArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFullScreen?: boolean;
}

export default function DocumentArchiveModal({ isOpen, onClose, isFullScreen = false }: DocumentArchiveModalProps) {
  if (!isOpen && !isFullScreen) return null;

  // Initial Document state populated with documents from resim.png and the user's requested types
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 'doc-1',
      name: 'Atakoy_Metro_BHM_Ana_Ihale_Sozlesmesi.pdf',
      phase: 'PROJE',
      category: 'Şartname',
      author: 'Ahmet Yılmaz',
      date: '2024-03-15',
      version: 'v2.1',
      size: '12.4 MB',
      extension: 'pdf',
      folderId: 'proj-2',
      description: 'Ataköy - Basın Ekspres - İkitelli Metro Hattı ana ihale sözleşmesi ve teknik şartnameleri.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-2',
      name: 'BHM_Station_Superstructure_Architectural_Plan.dwg',
      phase: 'İNŞAAT',
      category: 'Çizim (CAD)',
      author: 'Selin Demir',
      date: '2024-06-20',
      version: 'v3.0',
      size: '142.8 MB',
      extension: 'dwg',
      folderId: 'ins-3',
      description: 'İstasyon üst yapı mimari uygulama ve ince işler projesi.',
      approvalStatus: 'APPROVED'
    },
    {
      id: 'doc-3',
      name: 'Atakoy_BHM_Hat_Geometrisi_ve_Ray_Profili.dxf',
      phase: 'İNŞAAT',
      category: 'Çizim (CAD)',
      author: 'Cenk Arslan',
      date: '2024-05-12',
      version: 'v4.2',
      size: '38.6 MB',
      extension: 'dxf',
      folderId: 'ins-3',
      description: 'Hat geometrisi, kurp bilgileri ve ray kesit profili detay çizimi.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-4',
      name: 'Atakoy_Fore_Kazik_Yukleme_Plani.xlsx',
      phase: 'İŞLETME',
      category: 'Ofis Belgesi',
      author: 'Kaan Çelik',
      date: '2024-04-02',
      version: 'v1.4',
      size: '18.2 MB',
      extension: 'xlsx',
      folderId: 'ins-2',
      description: 'İstasyon kazık yükleme deneyleri kümülatif raporu ve taşıma kapasiteleri tablosu.',
      approvalStatus: 'APPROVED'
    },
    {
      id: 'doc-5',
      name: 'Bakirkoy_Bld_Ana_Yapi_Ruhsati.pdf',
      phase: 'PROJE',
      category: 'Şartname',
      author: 'Ahmet Yılmaz',
      date: '2024-02-18',
      version: 'v1.0',
      size: '6.8 MB',
      extension: 'pdf',
      folderId: 'proj-2',
      description: 'Bakırköy Belediyesi tarafından onaylanmış ana yapı inşaat ruhsatı.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-6',
      name: '2026_07_Donemi_Hakedis_14_Ozeti.xlsx',
      phase: 'İŞLETME',
      category: 'Ofis Belgesi',
      author: 'Burak Kaya',
      date: '2026-07-31',
      version: 'v1.1',
      size: '14.5 MB',
      extension: 'xlsx',
      folderId: 'islet-1',
      description: 'Temmuz 2026 dönemi hakediş özeti, birim fiyat analizleri ve gerçekleşen harcama tablosu.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-7',
      name: 'BHM_Tunnel_MEP_Ventilation_Junction.dwg',
      phase: 'İNŞAAT',
      category: 'Çizim (CAD)',
      author: 'Mehmet Can',
      date: '2024-07-14',
      version: 'v2.0',
      size: '94.2 MB',
      extension: 'dwg',
      folderId: 'ins-3',
      description: 'Tünel mekanik, elektrik ve sıhhi tesisat havalandırma kesişim detayları.',
      approvalStatus: 'APPROVED'
    },
    // User requested file types additions
    {
      id: 'doc-8',
      name: 'Metro_Guzergah_Hat_Izleri.geojson',
      phase: 'PROJE',
      category: 'GIS Verisi',
      author: 'Elif Şen',
      date: '2024-08-10',
      version: 'v1.0',
      size: '2.4 MB',
      extension: 'geojson',
      folderId: 'proj-1',
      description: 'Ana hat güzergahı ray ekseni coğrafi koordinat verileri ve istasyon konumları.',
      approvalStatus: 'APPROVED'
    },
    {
      id: 'doc-9',
      name: 'Istasyon_Kamulastirma_Sinirlari.kml',
      phase: 'PROJE',
      category: 'GIS Verisi',
      author: 'Mert Aksoy',
      date: '2024-09-01',
      version: 'v1.2',
      size: '1.1 MB',
      extension: 'kml',
      folderId: 'proj-1',
      description: 'İstasyon çevre şaftları kamulaştırma sınırları KML poligon katmanı.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-10',
      name: 'Zemin_Sondaj_Jeoradar_Analiz_Raporu.docx',
      phase: 'PROJE',
      category: 'Ofis Belgesi',
      author: 'Kaan Çelik',
      date: '2024-03-22',
      version: 'v2.0',
      size: '4.5 MB',
      extension: 'docx',
      folderId: 'proj-4',
      description: 'Zemin sondaj kuyuları verileri, jeoradar taramaları ve geoteknik değerlendirme raporu.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-11',
      name: 'Deprem_Sismik_Risk_Analizi_Sunumu.pptx',
      phase: 'PROJE',
      category: 'Ofis Belgesi',
      author: 'Selin Demir',
      date: '2024-05-30',
      version: 'v1.5',
      size: '25.6 MB',
      extension: 'pptx',
      folderId: 'proj-4',
      description: 'Sismik risk analizleri, ivme spektrumları ve zemin ivmelenmesi sunumu.',
      approvalStatus: 'PENDING'
    },
    {
      id: 'doc-12',
      name: 'Istasyon_Santiye_Sahasi_Drone_Fotografi.png',
      phase: 'İNŞAAT',
      category: 'Medya',
      author: 'Caner Öz',
      date: '2024-06-15',
      version: 'v1.0',
      size: '8.2 MB',
      extension: 'png',
      folderId: 'ins-4',
      description: 'Drone ile çekilmiş şantiye sahası üst görünüm güncel ilerleme fotoğrafı.',
      approvalStatus: 'APPROVED'
    }
  ]);

  // Folder states
  const [folders, setFolders] = useState<PhaseFolder[]>([
    {
      id: 'phase-1',
      name: '1. Proje Aşaması',
      count: 4,
      subfolders: [
        { id: 'proj-1', name: 'Tüm Tasarım Arşivi', count: 2 },
        { id: 'proj-2', name: 'Teknik Şartnameler', count: 2 },
        { id: 'proj-3', name: 'Mimari ve Statik Çizimler', count: 0 },
        { id: 'proj-4', name: 'Zemin ve Geoteknik Raporu', count: 2 }
      ]
    },
    {
      id: 'phase-2',
      name: '2. İnşaat Aşaması',
      count: 4,
      subfolders: [
        { id: 'ins-1', name: 'Tüm Şantiye Belgeleri', count: 0 },
        { id: 'ins-2', name: 'İmalat Şartnameleri', count: 1 },
        { id: 'ins-3', name: 'Saha Revize Çizimleri', count: 3 },
        { id: 'ins-4', name: 'HSE ve Kalite Güvence', count: 1 }
      ]
    },
    {
      id: 'phase-3',
      name: '3. İşletme Aşaması',
      count: 3,
      subfolders: [
        { id: 'islet-1', name: 'Tüm Tesis Arşivi', count: 1 },
        { id: 'islet-2', name: 'Bakım ve İşletme Kılavuzu', count: 0 },
        { id: 'islet-3', name: 'Sistem Şemaları ve Detaylar', count: 0 }
      ]
    }
  ]);

  // Selected document state
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-1');
  const selectedDoc = useMemo(() => {
    return documents.find(d => d.id === selectedDocId) || documents[0];
  }, [documents, selectedDocId]);

  // Favorites storage states
  const [favoriteFolders, setFavoriteFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem('fav_folders');
    return saved ? JSON.parse(saved) : ['proj-2', 'ins-3'];
  });

  const [favoriteDocuments, setFavoriteDocuments] = useState<string[]>(() => {
    const saved = localStorage.getItem('fav_documents');
    return saved ? JSON.parse(saved) : ['doc-1', 'doc-8'];
  });

  const toggleFavoriteFolder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteFolders(prev => {
      const updated = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      localStorage.setItem('fav_folders', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleFavoriteDocument = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteDocuments(prev => {
      const updated = prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id];
      localStorage.setItem('fav_documents', JSON.stringify(updated));
      return updated;
    });
  };

  // Filters state
  const [activePhaseTab, setActivePhaseTab] = useState<'Tümü' | 'PROJE' | 'İNŞAAT' | 'İŞLETME'>('Tümü');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Tüm Tipler');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);

  // Modal open states for sub-flows
  const [showAddDocModal, setShowAddDocModal] = useState<boolean>(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [fullScreenPreviewDoc, setFullScreenPreviewDoc] = useState<Document | null>(null);

  // --- PREVIEW STATE MANAGERS ---
  // Spreadsheet States (xlsx)
  const [xlsxActiveSheet, setXlsxActiveSheet] = useState<string>('Hakediş Özeti');
  const [xlsxSearchQuery, setXlsxSearchQuery] = useState<string>('');
  
  // Document & PDF States (docx, pptx, pdf)
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfBookmarkSearch, setPdfBookmarkSearch] = useState<string>('');
  const [pptxCurrentSlide, setPptxCurrentSlide] = useState<number>(1);

  // CAD States (dwg, dxf, dgn, ncz)
  const [cadLayers, setCadLayers] = useState<{[key: string]: boolean}>({
    grid: true,
    structures: true,
    electrical: true,
    mep: true,
    dimension: true
  });
  const [cadCoords, setCadCoords] = useState<{x: number, y: number}>({ x: 432588.24, y: 4429511.12 });
  const [cadZoom, setCadZoom] = useState<number>(100);
  const [cadIsPanning, setCadIsPanning] = useState<boolean>(false);
  const [cadPanOffset, setCadPanOffset] = useState<{x: number, y: number}>({ x: 0, y: 0 });

  // GIS States (shp, kml, kmz, geojson, gpkg)
  const [gisLayers, setGisLayers] = useState<{[key: string]: boolean}>({
    routes: true,
    stations: true,
    parcels: true,
    labels: true
  });
  const [gisProjection, setGisProjection] = useState<string>('EPSG:4326 (WGS84)');
  const [gisSelectedFeature, setGisSelectedFeature] = useState<string | null>(null);

  // Image Workbench States (png, jpg, jpeg)
  const [imgBrightness, setImgBrightness] = useState<number>(100);
  const [imgContrast, setImgContrast] = useState<number>(100);
  const [imgGrayscale, setImgGrayscale] = useState<boolean>(false);
  const [imgFlipX, setImgFlipX] = useState<boolean>(false);
  const [imgFlipY, setImgFlipY] = useState<boolean>(false);

  // Video Workbench States (mp4, webm)
  const [vidPlaying, setVidPlaying] = useState<boolean>(false);
  const [vidProgress, setVidProgress] = useState<number>(35);
  const [vidVolume, setVidVolume] = useState<number>(75);
  const [vidSpeed, setVidSpeed] = useState<number>(1);

  // Preview reset effect
  React.useEffect(() => {
    if (fullScreenPreviewDoc) {
      setXlsxActiveSheet('Hakediş Özeti');
      setXlsxSearchQuery('');
      setPdfZoom(100);
      setPdfPage(1);
      setPdfBookmarkSearch('');
      setPptxCurrentSlide(1);
      setImgBrightness(100);
      setImgContrast(100);
      setImgGrayscale(false);
      setImgFlipX(false);
      setImgFlipY(false);
      setVidPlaying(false);
      setVidProgress(12);
      setGisSelectedFeature(null);
      setCadPanOffset({ x: 0, y: 0 });
      setCadZoom(100);
    }
  }, [fullScreenPreviewDoc]);

  // Video playback timer simulator effect
  React.useEffect(() => {
    let interval: any = null;
    if (fullScreenPreviewDoc && ['mp4', 'webm'].includes(fullScreenPreviewDoc.extension) && vidPlaying) {
      interval = setInterval(() => {
        setVidProgress(prev => (prev >= 100 ? 0 : prev + 1));
      }, 400 / vidSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fullScreenPreviewDoc, vidPlaying, vidSpeed]);

  // New folder form state
  const [newFolderPhase, setNewFolderPhase] = useState<string>('phase-1');
  const [newFolderName, setNewFolderName] = useState<string>('');

  // New Document form state
  const [newDocName, setNewDocName] = useState<string>('');
  const [newDocPhase, setNewDocPhase] = useState<'PROJE' | 'İNŞAAT' | 'İŞLETME'>('PROJE');
  const [newDocCategory, setNewDocCategory] = useState<string>('Şartname');
  const [newDocAuthor, setNewDocAuthor] = useState<string>('Ahmet Yılmaz');
  const [newDocVersion, setNewDocVersion] = useState<string>('v1.0');
  const [newDocSize, setNewDocSize] = useState<string>('2.5 MB');
  const [newDocExtension, setNewDocExtension] = useState<string>('pdf');
  const [newDocFolderId, setNewDocFolderId] = useState<string>('proj-1');
  const [newDocDescription, setNewDocDescription] = useState<string>('');

  // Treeview toggle collapse/expand states
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    'phase-1': true,
    'phase-2': true,
    'phase-3': true
  });

  const togglePhaseExpand = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  // Filter logic
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Phase tab filter
      if (activePhaseTab !== 'Tümü' && doc.phase !== activePhaseTab) return false;

      // Category tag filter
      if (activeCategoryFilter !== 'Tüm Tipler') {
        if (activeCategoryFilter === 'Şartnameler' && doc.category !== 'Şartname') return false;
        if (activeCategoryFilter === 'Çizimler (CAD)' && doc.category !== 'Çizim (CAD)') return false;
        if (activeCategoryFilter === 'GIS Verileri' && doc.category !== 'GIS Verisi') return false;
        if (activeCategoryFilter === 'Ofis Belgeleri' && doc.category !== 'Ofis Belgesi') return false;
        if (activeCategoryFilter === 'Medya' && doc.category !== 'Medya') return false;
      }

      // Folder selection filter
      if (selectedFolderId && doc.folderId !== selectedFolderId) return false;

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesAuthor = doc.author.toLowerCase().includes(query);
        const matchesDesc = (doc.description || '').toLowerCase().includes(query);
        const matchesExt = doc.extension.toLowerCase().includes(query);
        if (!matchesName && !matchesAuthor && !matchesDesc && !matchesExt) return false;
      }

      return true;
    });
  }, [documents, activePhaseTab, activeCategoryFilter, selectedFolderId, searchQuery]);

  // Handle delete document
  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Seçili dokümanı arşivden kalıcı olarak silmek istediğinize emin misiniz?')) {
      const updatedDocs = documents.filter(doc => doc.id !== id);
      setDocuments(updatedDocs);
      if (selectedDocId === id && updatedDocs.length > 0) {
        setSelectedDocId(updatedDocs[0].id);
      }
    }
  };

  // Handle add new folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newId = `folder-${Date.now()}`;
    const updatedFolders = folders.map(phase => {
      if (phase.id === newFolderPhase) {
        return {
          ...phase,
          subfolders: [...phase.subfolders, { id: newId, name: newFolderName, count: 0 }]
        };
      }
      return phase;
    });

    setFolders(updatedFolders);
    setNewFolderName('');
    setShowAddFolderModal(false);
  };

  // Handle add new document
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newId = `doc-${Date.now()}`;
    const newDoc: Document = {
      id: newId,
      name: newDocName.includes('.') ? newDocName : `${newDocName}.${newDocExtension}`,
      phase: newDocPhase,
      category: newDocCategory,
      author: newDocAuthor,
      date: new Date().toISOString().split('T')[0],
      version: newDocVersion,
      size: newDocSize,
      extension: newDocExtension,
      folderId: newDocFolderId,
      description: newDocDescription,
      approvalStatus: 'PENDING'
    };

    setDocuments([newDoc, ...documents]);
    setSelectedDocId(newId);
    setShowAddDocModal(false);

    // Reset fields
    setNewDocName('');
    setNewDocDescription('');
  };

  // --- DIGITAL SIGNATURE & APPROVAL STATE MANAGERS ---
  const [activeRightTab, setActiveRightTab] = useState<'details' | 'approval'>('details');
  const [signerName, setSignerName] = useState<string>('Deniz Aydın');
  const [signerRole, setSignerRole] = useState<string>('Baş Kontrol Mühendisi');
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignatureText, setTypedSignatureText] = useState<string>('Deniz Aydın');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [showAuditLedgerModal, setShowAuditLedgerModal] = useState<boolean>(false);
  const [searchLedgerQuery, setSearchLedgerQuery] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Seed default signature logs for already APPROVED documents
  const [signatureLogs, setSignatureLogs] = useState<SignatureLog[]>(() => {
    const saved = localStorage.getItem('signature_logs');
    if (saved) return JSON.parse(saved);
    
    const defaultLogs: SignatureLog[] = [
      {
        id: 'SIG-LOG-001',
        docId: 'doc-2',
        docName: 'BHM_Station_Superstructure_Architectural_Plan.dwg',
        approver: 'Selin Demir',
        role: 'Proje Direktörü (PM)',
        date: '2024-06-21',
        timestamp: '2024-06-21 14:32:18',
        hash: 'SHA256:7f2e5d8a9f4c3b2a8e7a0c18d9f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d',
        signatureData: 'Selin Demir',
        signatureType: 'type',
        ipAddress: '192.168.10.42',
        verificationCode: '7412'
      },
      {
        id: 'SIG-LOG-002',
        docId: 'doc-4',
        docName: 'Atakoy_Fore_Kazik_Yukleme_Plani.xlsx',
        approver: 'Kaan Çelik',
        role: 'Baş Kontrol Mühendisi',
        date: '2024-04-03',
        timestamp: '2024-04-03 09:15:44',
        hash: 'SHA256:8f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d3',
        signatureData: 'Kaan Çelik',
        signatureType: 'type',
        ipAddress: '192.168.10.87',
        verificationCode: '1596'
      },
      {
        id: 'SIG-LOG-003',
        docId: 'doc-8',
        docName: 'Metro_Guzergah_Hat_Izleri.geojson',
        approver: 'Elif Şen',
        role: 'CDE Kalite Koordinatörü',
        date: '2024-08-11',
        timestamp: '2024-08-11 11:20:05',
        hash: 'SHA256:4a3b2e7a0c18d9f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d3e7a0c18d9f',
        signatureData: 'Elif Şen',
        signatureType: 'type',
        ipAddress: '192.168.12.114',
        verificationCode: '3624'
      }
    ];
    localStorage.setItem('signature_logs', JSON.stringify(defaultLogs));
    return defaultLogs;
  });

  // Keep typed signature preview in sync
  useEffect(() => {
    setTypedSignatureText(signerName);
  }, [signerName]);

  // Handle canvas initialization
  useEffect(() => {
    if (activeRightTab === 'approval' && signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth || 250;
      canvas.height = canvas.offsetHeight || 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#6366f1'; // Indigo-500
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeRightTab, signatureType, selectedDocId]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApproveDocument = (docId: string) => {
    let signatureData = '';
    if (signatureType === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL('image/png');
      } else {
        signatureData = signerName;
      }
    } else {
      signatureData = typedSignatureText || signerName;
    }

    // SHA-256 Mock hash generator
    const randomHash = 'SHA256:' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const newLog: SignatureLog = {
      id: `SIG-LOG-${Date.now().toString().slice(-4)}`,
      docId,
      docName: selectedDoc.name,
      approver: signerName,
      role: signerRole,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      hash: randomHash,
      signatureData,
      signatureType,
      ipAddress: '185.124.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255),
      verificationCode: verificationCode || '1973'
    };

    const updatedLogs = [newLog, ...signatureLogs];
    setSignatureLogs(updatedLogs);
    localStorage.setItem('signature_logs', JSON.stringify(updatedLogs));

    const updatedDocs = documents.map(doc => {
      if (doc.id === docId) {
        return { ...doc, approvalStatus: 'APPROVED' as const };
      }
      return doc;
    });
    setDocuments(updatedDocs);
    alert(`🔐 Dijital İmza Başarıyla Kaydedildi!\nBelge mühürlendi ve CDE İmza Kanıt Defterine işlendi.\nSertifika No: ${newLog.id}`);
    
    // Clear dynamic inputs
    setVerificationCode('');
    setTermsAccepted(false);
  };

  const handleRejectDocument = (docId: string) => {
    if (confirm('Bu belgeyi reddetmek istediğinize emin misiniz?')) {
      const updatedDocs = documents.map(doc => {
        if (doc.id === docId) {
          return { ...doc, approvalStatus: 'REJECTED' as const };
        }
        return doc;
      });
      setDocuments(updatedDocs);
      alert('Belge REDDEDİLDİ olarak işaretlendi.');
    }
  };

  const handleRevokeApproval = (docId: string) => {
    if (confirm('Bu belgenin imzasını ve onayını geri çekmek istiyor musunuz? İlgili kanıt kaydı arşivde kalacak ancak belge durumu "Onay Bekliyor" olarak güncellenecektir.')) {
      const updatedDocs = documents.map(doc => {
        if (doc.id === docId) {
          return { ...doc, approvalStatus: 'PENDING' as const };
        }
        return doc;
      });
      setDocuments(updatedDocs);
      alert('Onay başarıyla geri çekildi. Belge yeniden imzalanabilir.');
    }
  };

  // Document Icon Mapper helper
  const getDocumentIcon = (ext: string, category: string) => {
    const format = ext.toLowerCase();
    if (format === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    }
    if (['dwg', 'dxf', 'dgn', 'ncz'].includes(format)) {
      return <FileCode className="w-5 h-5 text-blue-400 shrink-0" />;
    }
    if (['geojson', 'kml', 'kmz', 'shp', 'gpkg'].includes(format)) {
      return <Globe className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (['xlsx', 'docx', 'pptx'].includes(format)) {
      return <FileCheck className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg'].includes(format)) {
      return <Image className="w-5 h-5 text-purple-400 shrink-0" />;
    }
    if (['mp4', 'avi', 'mov'].includes(format)) {
      return <Video className="w-5 h-5 text-red-400 shrink-0" />;
    }
    return <Database className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  return (
    <div className={isFullScreen 
      ? "w-full h-[calc(100vh-250px)] min-h-[550px] flex flex-col overflow-hidden text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl select-none animate-fade-in"
      : "fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-white select-none"
    }>
      
      {/* If not full screen, render modal wrapper card layout, otherwise take full space */}
      <div className={isFullScreen 
        ? "flex flex-col w-full h-full" 
        : "bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-7xl h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden text-[var(--text-primary)]"
      }>
        
        {/* Top Header Section */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                DOKÜMAN YÖNETİMİ
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Proje, İnşaat ve İşletme aşamalarına ait teknik şartnameler, çizimler ve kalite kontrol kılavuzları
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[var(--border)] hover:border-slate-500 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center"
            title="Kapat ve Haritaya Dön"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Filters and Search Bar Row */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] gap-3 shrink-0">
          
          {/* Phase tab selectors */}
          <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
            {(['Tümü', 'PROJE', 'İNŞAAT', 'İŞLETME'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActivePhaseTab(tab);
                  setSelectedFolderId(null); // Reset subfolder on tab change
                }}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded transition duration-200 cursor-pointer border ${
                  activePhaseTab === tab
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 font-black'
                    : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {tab === 'Tümü' ? 'Tümü' : tab === 'PROJE' ? 'Plan(Tasarım)' : tab === 'İNŞAAT' ? 'İnşaat' : 'İşletme'}
              </button>
            ))}
          </div>

          {/* Category Tags */}
          <div className="flex flex-wrap gap-1 items-center bg-[var(--bg-secondary)] p-1 border border-[var(--border)] rounded">
            {['Tüm Tipler', 'Şartnameler', 'Çizimler (CAD)', 'GIS Verileri', 'Ofis Belgeleri', 'Medya'].map(tag => (
              <button
                key={tag}
                onClick={() => setActiveCategoryFilter(tag)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                  activeCategoryFilter === tag
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-b-2 border-indigo-500 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search box and View selectors */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Arşivde ara (isim, etiket, yazar)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2.5 pl-8 py-2 text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Main Content Workspace Split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT TREEVIEW COLUMN: KLASÖR HİYERARŞİSİ */}
          <aside className={`panel-transition flex flex-col min-h-0 select-none border-slate-800 bg-[var(--bg-primary)] overflow-hidden shrink-0 ${isLeftPanelOpen ? 'w-64 border-r opacity-100' : 'w-0 border-r-0 opacity-0'}`}>
            <div className="w-64 shrink-0 flex flex-col h-full min-h-0">
              <div className="p-4 border-b border-[var(--border)] flex justify-between items-center shrink-0">
                <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                  KLASÖR HİYERARŞİSİ
                </span>
                <button
                  onClick={() => setShowAddFolderModal(true)}
                  className="p-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 transition cursor-pointer"
                  title="Yeni Klasör Ekle"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tree Nodes List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3" style={{ scrollbarWidth: 'none' }}>
                
                {/* FAVORİLER BÖLÜMÜ */}
                {(favoriteFolders.length > 0 || favoriteDocuments.length > 0) && (
                  <div className="space-y-2 border-b border-[var(--border)] pb-3.5 mb-3.5">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                      FAVORİLER
                    </span>
                    
                    <div className="space-y-1">
                      {/* Favori Klasörler */}
                      {folders.flatMap(p => p.subfolders).filter(sub => favoriteFolders.includes(sub.id)).map(sub => {
                        const isSelected = selectedFolderId === sub.id;
                        return (
                          <div
                            key={`fav-f-${sub.id}`}
                            className={`w-full flex items-center justify-between p-1 rounded text-left text-[10px] transition group ${
                              isSelected 
                                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25 font-extrabold' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/10'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedFolderId(isSelected ? null : sub.id)}
                              className="flex items-center gap-1.5 truncate flex-1 text-left cursor-pointer"
                            >
                              <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0 fill-indigo-400/10" />
                              <span className="truncate">{sub.name}</span>
                            </button>
                            <button
                              onClick={(e) => toggleFavoriteFolder(sub.id, e)}
                              className="text-indigo-400 hover:text-indigo-300 p-0.5 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                              title="Favorilerden Çıkar"
                            >
                              <Star className="w-3 h-3 fill-indigo-400 text-indigo-400" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Favori Belgeler */}
                      {documents.filter(doc => favoriteDocuments.includes(doc.id)).map(doc => {
                        const isSelected = selectedDocId === doc.id;
                        return (
                          <div
                            key={`fav-d-${doc.id}`}
                            className={`w-full flex items-center justify-between p-1 rounded text-left text-[10px] transition group ${
                              isSelected 
                                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25 font-extrabold' 
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/10'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setSelectedDocId(doc.id);
                                if (doc.folderId) setSelectedFolderId(doc.folderId);
                              }}
                              className="flex items-center gap-1.5 truncate flex-1 text-left cursor-pointer"
                            >
                              {getDocumentIcon(doc.extension, doc.category)}
                              <span className="truncate text-slate-200">{doc.name}</span>
                            </button>
                            <button
                              onClick={(e) => toggleFavoriteDocument(doc.id, e)}
                              className="text-indigo-400 hover:text-indigo-300 p-0.5 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                              title="Favorilerden Çıkar"
                            >
                              <Star className="w-3 h-3 fill-indigo-400 text-indigo-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {folders.map(phase => {
                  // If the user selected a top phase tab, only show that phase tree
                  if (activePhaseTab !== 'Tümü' && phase.name.toUpperCase().indexOf(activePhaseTab) === -1) {
                    return null;
                  }

                  const isExpanded = expandedPhases[phase.id];
                  return (
                    <div key={phase.id} className="space-y-1">
                      {/* Level 1: Phase folder head */}
                      <button
                        onClick={() => togglePhaseExpand(phase.id)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-slate-800/20 rounded transition text-left cursor-pointer group"
                      >
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 group-hover:text-amber-400">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                          {phase.name}
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1 rounded-full font-mono font-bold">
                          {phase.subfolders.length}
                        </span>
                      </button>

                      {/* Level 2: Sub-folders list */}
                      {isExpanded && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-3">
                          {phase.subfolders.map(sub => {
                            const isSelected = selectedFolderId === sub.id;
                            const isFav = favoriteFolders.includes(sub.id);
                            return (
                              <div
                                key={sub.id}
                                className={`w-full flex items-center justify-between p-1 rounded text-left text-[10px] transition group ${
                                  isSelected 
                                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25 font-extrabold' 
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800/10'
                                }`}
                              >
                                <button
                                  onClick={() => setSelectedFolderId(isSelected ? null : sub.id)}
                                  className="flex items-center gap-1.5 truncate flex-1 text-left cursor-pointer"
                                >
                                  {isSelected ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                                  <span className="truncate">{sub.name}</span>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-500 font-bold font-mono mr-1">
                                    ({documents.filter(d => d.folderId === sub.id).length})
                                  </span>
                                  <button
                                    onClick={(e) => toggleFavoriteFolder(sub.id, e)}
                                    className="p-0.5 hover:text-indigo-400 text-slate-600 hover:scale-110 transition cursor-pointer"
                                    title={isFav ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isFav ? 'text-indigo-400 fill-indigo-400' : 'text-slate-700 hover:text-indigo-400'}`} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* MIDDLE COLUMN: BREADCRUMBS & FILE ARCHIVE TABLE */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#070b13]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLeftPanelOpen(prev => !prev)}
                  className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:text-indigo-400 transition cursor-pointer flex items-center justify-center shrink-0"
                  title={isLeftPanelOpen ? "Sol Paneli Gizle" : "Sol Paneli Göster"}
                >
                  {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">
                    BREADCRUMB / SEÇİLİ ALAN
                  </span>
                  <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-indigo-400" />
                    {selectedFolderId 
                      ? `Klasör: ${folders.flatMap(p => p.subfolders).find(s => s.id === selectedFolderId)?.name}` 
                      : 'Tüm Arşiv Klasör İçeriği'}
                    <span className="text-[10px] text-slate-500 font-mono">({filteredDocuments.length} döküman listeleniyor)</span>
                  </h3>
                </div>
              </div>

              {/* Actions Button Group */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuditLedgerModal(true)}
                  className="px-3 py-1.5 bg-[#101524] hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  İmza Kanıt Defteri
                </button>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.25)]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Yeni Teknik Doküman Yükle
                </button>
              </div>
            </div>

            {/* Document Table Workspace */}
            <div className="flex-1 overflow-auto p-4" style={{ scrollbarWidth: 'none' }}>
              {filteredDocuments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                  <FileText className="w-12 h-12 text-slate-700 stroke-[1.5] animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Arşivde Eşleşen Dosya Bulunamadı</p>
                  <p className="text-[10px] max-w-sm text-slate-500 leading-normal">
                    Filtre kriterlerini temizleyebilir veya yukarıdaki buton aracılığıyla arşive yeni bir teknik doküman ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] bg-[#0c101c]/40">
                        <th className="py-2.5 px-3">Döküman Adı</th>
                        <th className="py-2.5 px-2">Aşama / Tip</th>
                        <th className="py-2.5 px-2">Yazar / Tarih</th>
                        <th className="py-2.5 px-2">Versiyon / Boyut</th>
                        <th className="py-2.5 px-2">Onay Durumu</th>
                        <th className="py-2.5 px-2 text-center">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 font-medium">
                      {filteredDocuments.map(doc => {
                        const isSelected = doc.id === selectedDocId;
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className={`hover:bg-slate-800/10 transition duration-150 cursor-pointer ${
                              isSelected ? 'bg-indigo-600/5 border-l-2 border-indigo-500' : ''
                            }`}
                          >
                            {/* Doc name & Icon */}
                            <td className="py-2.5 px-3 flex items-center gap-2 max-w-xs md:max-w-md">
                              <button
                                onClick={(e) => toggleFavoriteDocument(doc.id, e)}
                                className="p-0.5 text-slate-500 hover:text-indigo-400 hover:scale-110 transition cursor-pointer shrink-0"
                                title={favoriteDocuments.includes(doc.id) ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                              >
                                <Star className={`w-3.5 h-3.5 ${favoriteDocuments.includes(doc.id) ? 'text-indigo-400 fill-indigo-400' : 'text-slate-600'}`} />
                              </button>
                              {getDocumentIcon(doc.extension, doc.category)}
                              <span className="truncate font-bold text-slate-200 block font-sans" title={doc.name}>
                                {doc.name}
                              </span>
                            </td>

                            {/* Phase and Category badges */}
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                  doc.phase === 'PROJE' 
                                    ? 'bg-blue-500/10 text-blue-400' 
                                    : doc.phase === 'İNŞAAT' 
                                      ? 'bg-amber-500/10 text-amber-400' 
                                      : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {doc.phase}
                                </span>
                                <span className="text-slate-400 font-bold">{doc.category}</span>
                              </div>
                            </td>

                            {/* Author & upload date */}
                            <td className="py-2.5 px-2 text-slate-300">
                              <div className="leading-tight">
                                <span className="block font-bold">{doc.author}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{doc.date}</span>
                              </div>
                            </td>

                            {/* Version and Filesize */}
                            <td className="py-2.5 px-2 font-mono text-slate-400 text-[10px]">
                              <div className="leading-tight">
                                <span className="block font-black text-slate-300">{doc.version}</span>
                                <span className="text-[10px] text-slate-500">{doc.size}</span>
                              </div>
                            </td>

                            {/* Approval Status */}
                            <td className="py-2.5 px-2">
                              {(() => {
                                const status = doc.approvalStatus || 'PENDING';
                                if (status === 'APPROVED') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/25">
                                      <Shield className="w-2.5 h-2.5" />
                                      ONAYLANDI
                                    </span>
                                  );
                                }
                                if (status === 'REJECTED') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase border border-rose-500/25">
                                      ✕ REDDEDİLDİ
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase border border-amber-500/25">
                                    ● BEKLİYOR
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Eye Preview & Delete Trash actions */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setFullScreenPreviewDoc(doc)}
                                  className="p-1 hover:bg-indigo-600/10 rounded text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                                  title="Tam Ekran Önizleme"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDoc(doc.id, e)}
                                  className="p-1 hover:bg-red-600/10 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                                  title="Arşivden Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DOCUMENT DETAILS & PREVIEW */}
          <aside className="w-80 border-l border-slate-800 bg-[#090d16] p-4 flex flex-col justify-between shrink-0 select-none overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {/* Top Details container */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  CDE TEKNİK PANEL
                </span>
                {selectedDoc && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    selectedDoc.approvalStatus === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : selectedDoc.approvalStatus === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {selectedDoc.approvalStatus === 'APPROVED' ? 'MÜHÜRLÜ' : selectedDoc.approvalStatus === 'REJECTED' ? 'RED' : 'BEKLİYOR'}
                  </span>
                )}
              </div>

              {selectedDoc ? (
                <div className="space-y-4">
                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#121624] border border-slate-800 rounded-lg">
                    <button
                      onClick={() => setActiveRightTab('details')}
                      className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition cursor-pointer ${
                        activeRightTab === 'details'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Özellikler
                    </button>
                    <button
                      onClick={() => setActiveRightTab('approval')}
                      className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                        activeRightTab === 'approval'
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      Onay & İmza
                    </button>
                  </div>

                  {/* Title and Icon */}
                  <div>
                    <h4 className="text-xs font-black text-slate-100 leading-normal mb-1 break-all">
                      {selectedDoc.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 italic">
                      {selectedDoc.description || 'Bu dökümana ait açıklama detayı bulunmamaktadır.'}
                    </p>
                  </div>

                  {activeRightTab === 'details' ? (
                    <div className="space-y-4">
                      {/* Document Simulated Viewer Area */}
                      <div className="bg-[#121624] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center relative aspect-video group overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[30px] pointer-events-none rounded-full" />
                        {getDocumentIcon(selectedDoc.extension, selectedDoc.category)}
                        
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider block mt-2">
                          {selectedDoc.extension.toUpperCase()} BELGE SİMÜLASYONU
                        </span>
                        <span className="text-[10px] text-slate-600 block mb-3 font-mono">Arşiv Güvenli Şifreleme v2</span>

                        <button
                          onClick={() => setFullScreenPreviewDoc(selectedDoc)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/25 hover:border-indigo-500 text-indigo-400 hover:text-white rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all duration-200"
                        >
                          <Eye className="w-3 h-3" />
                          Tam Ekran Önizleme
                        </button>
                      </div>

                      {/* Document specifications parameters */}
                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          BELGE BİLGİLERİ
                        </span>

                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Revizyon Tarihi:</span>
                            <span className="font-mono font-bold text-slate-200">{selectedDoc.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Oluşturan Yetkili:</span>
                            <span className="font-bold text-slate-200">{selectedDoc.author}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Versiyon:</span>
                            <span className="font-mono font-bold text-amber-500">{selectedDoc.version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Boyut:</span>
                            <span className="font-mono font-bold text-slate-200">{selectedDoc.size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Aşama Kategorisi:</span>
                            <span className="font-bold text-slate-200">{selectedDoc.phase}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Onay Durumu:</span>
                            <span className="font-bold text-indigo-400">{selectedDoc.approvalStatus || 'PENDING'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // --- APPROVAL & DIGITAL SIGNATURE UI TAB ---
                    <div className="space-y-4 pt-1">
                      {selectedDoc.approvalStatus === 'APPROVED' ? (
                        /* APPROVED CERTIFICATE VIEW */
                        <div className="bg-[#0b1c14] border border-emerald-500/20 rounded-xl p-3.5 space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-[25px] pointer-events-none rounded-full" />
                          
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Shield className="w-4 h-4 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest">GÜVENLİ ONAY MÜHRÜ</span>
                          </div>

                          {(() => {
                            const matchingLog = signatureLogs.find(log => log.docId === selectedDoc.id) || {
                              approver: selectedDoc.author,
                              role: 'Sistem Yöneticisi / Kayıt Dışı İmza',
                              timestamp: selectedDoc.date + ' 09:00:00',
                              hash: 'SHA256:8f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d3e7a0c18d9f4e2c91b8a4f6d3',
                              signatureType: 'type',
                              signatureData: selectedDoc.author,
                              ipAddress: '192.168.10.1',
                              id: 'SIG-AUTO'
                            };

                            return (
                              <div className="space-y-2 text-[10px]">
                                <p className="text-slate-300 leading-snug">
                                  Bu teknik döküman, <strong>5070 Sayılı Elektronik İmza Kanunu</strong> uyarınca dijital olarak mühürlenmiş ve arşivlenmiştir.
                                </p>

                                <div className="p-2 bg-slate-900/60 rounded border border-emerald-500/10 space-y-1 font-mono text-slate-400">
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Onaylayan Yetkili</span>
                                    <span className="text-emerald-300 font-sans font-bold">{matchingLog.approver}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Görevi / Rolü</span>
                                    <span className="text-slate-300 font-sans">{matchingLog.role}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Zaman Damgası</span>
                                    <span className="text-slate-300">{matchingLog.timestamp}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Doğrulama IP</span>
                                    <span className="text-slate-300">{matchingLog.ipAddress}</span>
                                  </div>
                                  <div className="pt-1 border-t border-slate-800">
                                    <span className="text-slate-500 block text-[10px]">Sertifika Hash</span>
                                    <span className="text-[10px] break-all font-mono select-all text-slate-500">{matchingLog.hash}</span>
                                  </div>
                                </div>

                                {/* Render Signature Image or Digital cursive Text */}
                                <div className="border border-emerald-500/15 bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center min-h-[50px]">
                                  <span className="text-[10px] text-slate-600 uppercase font-mono tracking-widest mb-1">E-İMZA KANITI</span>
                                  {matchingLog.signatureType === 'draw' && matchingLog.signatureData.startsWith('data:image') ? (
                                    <img 
                                      src={matchingLog.signatureData} 
                                      alt="Signature" 
                                      className="max-h-12 object-contain filter invert opacity-80 brightness-200"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <span className="font-serif italic text-base tracking-wide text-indigo-300 font-bold px-4 py-1 border-b border-indigo-500/30">
                                      {matchingLog.signatureData}
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleRevokeApproval(selectedDoc.id)}
                                  className="w-full mt-2 py-1 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 rounded text-[10px] font-black uppercase transition cursor-pointer"
                                >
                                  Onayı Geri Çek
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      ) : selectedDoc.approvalStatus === 'REJECTED' ? (
                        /* REJECTED STATE VIEW */
                        <div className="bg-[#240c12] border border-red-500/20 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center gap-1.5 text-red-400">
                            <span className="text-sm font-bold">✕</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">BELGE REDDEDİLDİ</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            Bu döküman revizyon gerektirdiği gerekçesiyle reddedilmiştir. Belgeyi güncelledikten sonra yeni versiyonunu yükleyebilir veya tekrar onaya sunabilirsiniz.
                          </p>
                          <button
                            onClick={() => {
                              const updated = documents.map(d => d.id === selectedDoc.id ? { ...d, approvalStatus: 'PENDING' as const } : d);
                              setDocuments(updated);
                            }}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase rounded border border-slate-700 transition cursor-pointer"
                          >
                            Tekrar İncelemeye Al (Onay Bekliyor)
                          </button>
                        </div>
                      ) : (
                        /* ACTIVE SIGNING FORM FOR PENDING STATUS */
                        <div className="space-y-3">
                          <div className="p-2 bg-[#0d1324] border border-slate-800 rounded-lg space-y-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block uppercase font-mono">İmzalayan Yetkili Ad Soyad</label>
                              <input 
                                type="text"
                                value={signerName}
                                onChange={e => setSignerName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-100 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block uppercase font-mono">Yetki Ünvanı / Rolü</label>
                              <input 
                                type="text"
                                value={signerRole}
                                onChange={e => setSignerRole(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-100 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Signature Input Mode Selection */}
                          <div className="flex gap-1 border-b border-slate-800 pb-2">
                            <button
                              onClick={() => setSignatureType('draw')}
                              className={`flex-1 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition ${
                                signatureType === 'draw' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Çizerek İmza
                            </button>
                            <button
                              onClick={() => setSignatureType('type')}
                              className={`flex-1 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition ${
                                signatureType === 'type' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Yazarak İmza
                            </button>
                          </div>

                          {/* Canvas Pad or text Input depending on state */}
                          {signatureType === 'draw' ? (
                            <div className="space-y-1.5">
                              <div className="border border-slate-800 bg-[#090e18] rounded-xl p-1 relative overflow-hidden group">
                                <canvas
                                  ref={canvasRef}
                                  onMouseDown={startDrawing}
                                  onMouseMove={draw}
                                  onMouseUp={stopDrawing}
                                  onMouseLeave={stopDrawing}
                                  onTouchStart={startDrawing}
                                  onTouchMove={draw}
                                  onTouchEnd={stopDrawing}
                                  className="w-full h-24 bg-[#050811] rounded-lg cursor-crosshair block border border-dashed border-slate-800/80"
                                />
                                <button
                                  type="button"
                                  onClick={clearCanvas}
                                  className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-400 text-[10px] font-mono rounded cursor-pointer uppercase tracking-widest border border-slate-700 transition"
                                >
                                  Temizle
                                </button>
                                <span className="absolute top-2 left-2 text-[10px] text-slate-600 font-mono pointer-events-none">İMZA ALANI</span>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-slate-800 bg-[#090e18] rounded-xl p-3 flex items-center justify-center text-center min-h-[96px]">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-600 font-mono block">DİJİTAL KALİGRAFİ</span>
                                <span className="font-serif italic text-lg tracking-wider text-indigo-300 font-bold px-4 py-1 border-b border-indigo-500/30 inline-block">
                                  {typedSignatureText || signerName}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* PIN verification code */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Dijital Güvenlik Kodu</label>
                              <span className="text-[10px] text-slate-600 font-mono">Örnek PIN: 1973</span>
                            </div>
                            <input
                              type="password"
                              placeholder="4 Haneli Onay Kodu girin..."
                              maxLength={6}
                              value={verificationCode}
                              onChange={e => setVerificationCode(e.target.value)}
                              className="w-full bg-[#121624] border border-slate-800 rounded px-2.5 py-1.5 text-[10px] font-mono focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                            />
                          </div>

                          {/* Terms Acceptance */}
                          <label className="flex items-start gap-1.5 p-1 text-[10px] text-slate-500 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={termsAccepted}
                              onChange={e => setTermsAccepted(e.target.checked)}
                              className="mt-0.5 cursor-pointer accent-indigo-600"
                            />
                            <span className="leading-tight">
                              Bu dökümanı onaylayarak dijital imzamın <strong>5070 Sayılı Kanun</strong> kapsamında asıl ıslak imza hükmünde arşivlenmesini kabul ediyorum.
                            </span>
                          </label>

                          {/* Final Buttons */}
                          <div className="flex gap-2 pt-1 border-t border-slate-900/60">
                            <button
                              onClick={() => handleRejectDocument(selectedDoc.id)}
                              className="flex-1 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/40 text-rose-400 rounded text-[10px] font-black uppercase transition cursor-pointer"
                            >
                              Reddet
                            </button>
                            <button
                              onClick={() => handleApproveDocument(selectedDoc.id)}
                              disabled={!termsAccepted}
                              className={`flex-[2] py-1.5 font-black uppercase rounded text-[10px] text-center transition flex items-center justify-center gap-1.5 ${
                                termsAccepted
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.25)] border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                              }`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              İmzala ve Onayla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-600 text-[10px]">
                  Detayları incelemek ve dijital onay süreçlerini başlatmak için döküman listesinden bir dosya seçin.
                </div>
              )}
            </div>

            {/* Bottom Download Actions */}
            {selectedDoc && (
              <div className="border-t border-slate-900 pt-3 flex gap-2">
                <button
                  onClick={() => toggleFavoriteDocument(selectedDoc.id)}
                  className={`flex-1 py-1.5 border rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    favoriteDocuments.includes(selectedDoc.id)
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                      : 'bg-slate-800/60 hover:bg-slate-700/80 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={favoriteDocuments.includes(selectedDoc.id) ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                >
                  <Star className={`w-3.5 h-3.5 ${favoriteDocuments.includes(selectedDoc.id) ? 'fill-indigo-400 text-indigo-400' : 'text-slate-400'}`} />
                  {favoriteDocuments.includes(selectedDoc.id) ? 'Favori' : 'Favoriye Ekle'}
                </button>
                <button
                  onClick={() => alert(`📥 ${selectedDoc.name} dosyası başarıyla indirildi.`)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  İndir
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD NEW DOCUMENT MODAL FORM */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 p-5 rounded-2xl w-full max-w-md space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5 uppercase">
                <Plus className="w-4 h-4 text-indigo-400" />
                Arşive Yeni Teknik Doküman Ekle
              </h3>
              <button 
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-[10px]">
              {/* Doc Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block">Doküman Adı:</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Metro_BHM_Zemin_Etut_Raporu"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-[#161a29] border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Phase Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Süreç Aşaması:</label>
                  <select
                    value={newDocPhase}
                    onChange={(e) => {
                      const phase = e.target.value as any;
                      setNewDocPhase(phase);
                      // Update appropriate default folder
                      setNewDocFolderId(phase === 'PROJE' ? 'proj-1' : phase === 'İNŞAAT' ? 'ins-2' : 'islet-1');
                    }}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="PROJE">Plan(Tasarım)</option>
                    <option value="İNŞAAT">İnşaat</option>
                    <option value="İŞLETME">İşletme</option>
                  </select>
                </div>

                {/* File format extension selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Dosya Formatı / Uzantısı:</label>
                  <select
                    value={newDocExtension}
                    onChange={(e) => {
                      const ext = e.target.value;
                      setNewDocExtension(ext);
                      // Auto categories selection mapper
                      if (ext === 'pdf') setNewDocCategory('Şartname');
                      else if (['dwg', 'dxf', 'dgn', 'ncz'].includes(ext)) setNewDocCategory('Çizim (CAD)');
                      else if (['geojson', 'kml', 'kmz', 'shp', 'gpkg'].includes(ext)) setNewDocCategory('GIS Verisi');
                      else if (['xlsx', 'docx', 'pptx'].includes(ext)) setNewDocCategory('Ofis Belgesi');
                      else if (['png', 'jpg', 'jpeg'].includes(ext)) setNewDocCategory('Medya');
                    }}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <optgroup label="Ofis Dokümanları">
                      <option value="xlsx">Excel (xlsx)</option>
                      <option value="docx">Word (docx)</option>
                      <option value="pptx">PowerPoint (pptx)</option>
                    </optgroup>
                    <optgroup label="Yayın ve Şablonlar">
                      <option value="pdf">Adobe PDF (pdf)</option>
                    </optgroup>
                    <optgroup label="CAD Çizimleri">
                      <option value="dwg">AutoCAD Drawing (dwg)</option>
                      <option value="dxf">Drawing Exchange (dxf)</option>
                      <option value="ncz">Netcad Çizim (ncz)</option>
                    </optgroup>
                    <optgroup label="Coğrafi / GIS Dosyaları">
                      <option value="geojson">GeoJSON Verisi (geojson)</option>
                      <option value="kml">Keyhole Markup (kml)</option>
                      <option value="kmz">Keyhole Zipped (kmz)</option>
                      <option value="shp">ESRI Shapefile (shp)</option>
                    </optgroup>
                    <optgroup label="Görsel & Medya">
                      <option value="png">PNG Görüntüsü (png)</option>
                      <option value="jpg">JPEG Fotoğraf (jpg)</option>
                      <option value="mp4">MP4 Video (mp4)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Spec */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Kategori Türü:</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                  >
                    <option value="Şartname">Şartname</option>
                    <option value="Çizim (CAD)">Çizim (CAD)</option>
                    <option value="GIS Verisi">GIS Verisi</option>
                    <option value="Ofis Belgesi">Ofis Belgesi</option>
                    <option value="Medya">Medya</option>
                  </select>
                </div>

                {/* Subfolder Node placement */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">İlişkili Klasör Konumu:</label>
                  <select
                    value={newDocFolderId}
                    onChange={(e) => setNewDocFolderId(e.target.value)}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                  >
                    {folders.map(phase => (
                      <optgroup key={phase.id} label={phase.name}>
                        {phase.subfolders.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Author Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Oluşturan / Yazar:</label>
                  <input
                    type="text"
                    required
                    value={newDocAuthor}
                    onChange={(e) => setNewDocAuthor(e.target.value)}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Version */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Belge Versiyonu:</label>
                  <input
                    type="text"
                    required
                    value={newDocVersion}
                    onChange={(e) => setNewDocVersion(e.target.value)}
                    className="w-full bg-[#161a29] border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block">Belge Açıklaması / Notlar:</label>
                <textarea
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  placeholder="Dokümanın revizyon içeriği, kullanım amacı ve koordinat şablon bilgileri."
                  rows={2}
                  className="w-full bg-[#161a29] border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none text-[10px] font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="w-1/2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-bold uppercase cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-black uppercase cursor-pointer"
                >
                  Arşive Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: ADD NEW FOLDER FORM */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-[#0e121e] border border-slate-800 p-5 rounded-2xl w-full max-w-sm space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-100 flex items-center gap-1.5 uppercase">
                <Folder className="w-4 h-4 text-amber-500" />
                Hiyerarşiye Yeni Klasör Ekle
              </h3>
              <button 
                onClick={() => setShowAddFolderModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4 text-[10px]">
              {/* Phase classification */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block">Üst Süreç Grubu:</label>
                <select
                  value={newFolderPhase}
                  onChange={(e) => setNewFolderPhase(e.target.value)}
                  className="w-full bg-[#161a29] border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none"
                >
                  <option value="phase-1">1. Proje Aşaması (Tasarım)</option>
                  <option value="phase-2">2. İnşaat Aşaması (Şantiye)</option>
                  <option value="phase-3">3. İşletme Aşaması (Tesis)</option>
                </select>
              </div>

              {/* Folder Name input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block">Klasör Adı:</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Geoteknik ve Sismografi Analizleri"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#161a29] border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  className="w-1/2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-bold uppercase cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-black uppercase cursor-pointer"
                >
                  Klasörü Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN DOCUMENT PREVIEW LIGHTBOX */}
      {fullScreenPreviewDoc && (
        <div className="fixed inset-0 bg-black/95 z-60 flex flex-col justify-between p-4 animate-fade-in select-none">
          {/* Preview Lightbox header */}
          <div className="flex justify-between items-center bg-[#090d16] border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              {getDocumentIcon(fullScreenPreviewDoc.extension, fullScreenPreviewDoc.category)}
              <div>
                <strong className="text-xs text-slate-100 block">{fullScreenPreviewDoc.name}</strong>
                <span className="text-[10px] text-slate-400">Yazar: {fullScreenPreviewDoc.author} | Revizyon: {fullScreenPreviewDoc.version}</span>
              </div>
            </div>
            <button
              onClick={() => setFullScreenPreviewDoc(null)}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white rounded text-[10px] font-black uppercase cursor-pointer transition"
            >
              Önizlemeyi Kapat (Esc)
            </button>
          </div>

          {/* Interactive Document Simulator Content */}
          <div className="flex-1 flex flex-col md:flex-row gap-4 p-2 overflow-hidden h-[calc(100vh-140px)]">
            {(() => {
              const ext = fullScreenPreviewDoc.extension.toLowerCase();

              // 1. SPREADSHEETS (xlsx)
              if (ext === 'xlsx') {
                const xlsxSheets: Record<string, any[]> = {
                  'Hakediş Özeti': [
                    { code: "İM-001", name: "Zemin Kazı ve Güçlendirme", unit: "m³", qty: 15400, price: 450, total: 6930000 },
                    { code: "İM-002", name: "Tünel Segment Montajı", unit: "Adet", qty: 850, price: 12500, total: 10625000 },
                    { code: "İM-003", name: "C35/45 Püskürtme Beton", unit: "m³", qty: 3200, price: 1850, total: 5920000 },
                    { code: "İM-004", name: "Saha Drenaj ve Yalıtım", unit: "m²", qty: 9800, price: 320, total: 3136000 },
                    { code: "İM-005", name: "Kesişim İstasyonu Havalandırma", unit: "Set", qty: 2, price: 1200000, total: 2400000 },
                  ],
                  'Birim Fiyat Analizleri': [
                    { code: "AN-001", name: "Kazı Malzeme ve Ekipman", unit: "m³", qty: 1, price: 180, total: 180 },
                    { code: "AN-002", name: "Saha İşçiliği ve Süpervizör", unit: "Saat", qty: 2.5, price: 80, total: 200 },
                    { code: "AN-003", name: "Yakıt ve Enerji Sarfiyatı", unit: "Litre", qty: 14, price: 45, total: 630 },
                  ],
                  'İmalat Metrajları': [
                    { code: "MT-001", name: "İstasyon Kuzey Şaftı Kazısı", unit: "m³", qty: 8500, price: 180, total: 1530000 },
                    { code: "MT-002", name: "İstasyon Güney Şaftı Kazısı", unit: "m³", qty: 6900, price: 180, total: 1242000 },
                  ]
                };

                const activeData = xlsxSheets[xlsxActiveSheet] || [];
                const filteredData = activeData.filter(row => 
                  row.name.toLowerCase().includes(xlsxSearchQuery.toLowerCase()) ||
                  row.code.toLowerCase().includes(xlsxSearchQuery.toLowerCase())
                );
                const grandTotal = filteredData.reduce((acc, curr) => acc + curr.total, 0);

                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left Sidebar Tabs */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-2 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">ÇALIŞMA SAYFALARI</span>
                      {Object.keys(xlsxSheets).map(sheetName => (
                        <button
                          key={sheetName}
                          onClick={() => {
                            setXlsxActiveSheet(sheetName);
                            setXlsxSearchQuery('');
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-[10px] font-bold transition flex items-center gap-2 cursor-pointer ${
                            xlsxActiveSheet === sheetName
                              ? 'bg-emerald-600/15 border border-emerald-500/20 text-emerald-400'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          <Grid className="w-3.5 h-3.5" />
                          {sheetName}
                        </button>
                      ))}

                      <div className="mt-auto pt-3 border-t border-slate-900 text-[10px] text-slate-500 font-mono space-y-1">
                        <div>Format: Microsoft Excel (.xlsx)</div>
                        <div>Dosya Boyutu: {fullScreenPreviewDoc.size}</div>
                        <div>Versiyon: {fullScreenPreviewDoc.version}</div>
                      </div>
                    </div>

                    {/* Main Excel Sheet View */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                      {/* Top Excel Bar */}
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="bg-[#1a2336] px-2 py-1 rounded text-[10px] text-slate-400 font-bold font-mono">fx</span>
                          <input
                            type="text"
                            readOnly
                            value={`=SUM(F2:F${filteredData.length + 1})`}
                            className="bg-[#080c14] border border-slate-800 rounded px-2.5 py-1 text-[10px] text-emerald-400 font-mono flex-1 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tabloda ara..."
                            value={xlsxSearchQuery}
                            onChange={(e) => setXlsxSearchQuery(e.target.value)}
                            className="bg-[#080c14] border border-slate-800 rounded px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500 w-44"
                          />
                        </div>
                      </div>

                      {/* Spreadsheet Grid Grid */}
                      <div className="flex-1 overflow-auto scrollbar-none">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-[#121929] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                              <th className="py-2 px-3 border-r border-slate-800 w-8 text-center">#</th>
                              <th className="py-2 px-3 border-r border-slate-800">A / Poz Kodu</th>
                              <th className="py-2 px-3 border-r border-slate-800">B / İmalat Kalemi Tanımı</th>
                              <th className="py-2 px-3 border-r border-slate-800 text-center">C / Birim</th>
                              <th className="py-2 px-3 border-r border-slate-800 text-right">D / Miktar</th>
                              <th className="py-2 px-3 border-r border-slate-800 text-right">E / Birim Fiyat</th>
                              <th className="py-2 px-3 text-right">F / Toplam Tutar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 font-mono">
                            {filteredData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                                <td className="py-2 px-3 border-r border-slate-800 text-center bg-[#101726]/30 text-slate-500 text-[10px]">{idx + 2}</td>
                                <td className="py-2 px-3 border-r border-slate-800 font-bold text-slate-200">{row.code}</td>
                                <td className="py-2 px-3 border-r border-slate-800 text-slate-300 font-sans">{row.name}</td>
                                <td className="py-2 px-3 border-r border-slate-800 text-center text-slate-400">{row.unit}</td>
                                <td className="py-2 px-3 border-r border-slate-800 text-right text-slate-200">{row.qty.toLocaleString('tr-TR')}</td>
                                <td className="py-2 px-3 border-r border-slate-800 text-right text-slate-400">{row.price > 0 ? `${row.price.toLocaleString('tr-TR')} ₺` : '-'}</td>
                                <td className="py-2 px-3 text-right text-emerald-400 font-bold">{row.total > 0 ? `${row.total.toLocaleString('tr-TR')} ₺` : '-'}</td>
                              </tr>
                            ))}

                            {filteredData.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-600">
                                  Aranan kriterlere uygun satır bulunamadı.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Excel Footer Formulas & Summaries */}
                      <div className="bg-[#111624] border-t border-slate-800 p-3.5 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Hesaplama Tablosu Formülleri Aktif
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-bold uppercase">TOPLAM TUTAR:</span>
                          <span className="bg-emerald-500/10 border border-emerald-500/35 px-3 py-1 rounded text-emerald-400 font-black font-mono text-xs">
                            {grandTotal.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. DOCUMENT (docx) & PRESENTATION (pptx)
              if (ext === 'docx' || ext === 'pptx') {
                const isDocx = ext === 'docx';

                // DOCX Mock pages and chapters
                const docxChapters = [
                  { title: "1. Giriş ve Kapsam", text: "Bu teknik şartname, İstanbul BHM Raylı Sistem hattı geoteknik ve kazı imalatlarının denetim, raporlama ve sismik izleme prensiplerini kapsamaktadır. Tüm zemin sondaj çalışmaları ve tünel içi segment montaj koordinatları bu kılavuzda tanımlanan tolerans sınırları dahilinde yürütülecektir." },
                  { title: "2. Geoteknik Sondaj ve Jeoradar Standartları", text: "Sondaj çapları asgari PQ normunda olmalı, her 1.5 metrede bir standart penetrasyon testi (SPT) yapılmalıdır. Alınan karot numuneleri jeoradar kesit taramasıyla sismik bütünlük testine tabi tutularak, sismik risk ivme katsayıları hesaplanacak ve tünel zemin kaplamasında kullanılacak beton katsayısı ayarlanacaktır." },
                  { title: "3. TBM Segment Montaj Toleransları", text: "Tünel Segment halkalarında yatay ve dikey sapma toleransları azami ±5 mm olarak sınırlandırılmıştır. Lazer kılavuzlu robotik total-station sistemleri ile anlık ölçümler her halka yerleşiminden sonra ana kontrol merkezine (CDE) aktarılmalıdır." },
                  { title: "4. Kalite Kontrol ve Kabul Kriterleri", text: "Kullanılan püskürtme beton (Shotcrete) numuneleri 7 ve 28 günlük basınç dayanımı testlerinden (en az C35/45 standardı) geçmelidir. Sismografik dinleme istasyonları 24 saat kesintisiz veri üreterek olası deformasyonları kontrol edecektir." }
                ];

                // PPTX Mock Slides
                const pptxSlides = [
                  {
                    title: "BHM Raylı Sistem Projesi Sismik İvme ve Risk Sunumu",
                    subtitle: "Deprem Analizleri ve Zemin İvmelenmesi Değerlendirme Raporu",
                    bullets: [
                      "Zemin Etüt Raporları doğrultusunda sismik ivme haritası çıkarılmıştır.",
                      "İstasyon çevre şaftlarında sismografik izleme sensörleri kurulmuştur.",
                      "Yapısal mukavemet hesapları 0.45g ivme katsayısına göre simüle edilmiştir."
                    ],
                    stats: "Azami Deprem Katsayısı: 0.45g"
                  },
                  {
                    title: "Zemin Sondaj Test Sonuçları & Karot Analizleri",
                    subtitle: "TBM Segment Mukavemet Sınıfları ve Reolojik Veriler",
                    bullets: [
                      "Farklı derinliklerden alınan 45 adet karot örneği laboratuvarda test edilmiştir.",
                      "Kohezyon değeri ortalama 120 kPa, içsel sürtünme açısı 28 derece ölçülmüştür.",
                      "C35/45 özel katkılı segment betonu kullanımı onaylanmıştır."
                    ],
                    stats: "Zemin Kohezyonu: 120 kPa"
                  },
                  {
                    title: "Tünel İçi Segment Deformasyon ve Sapma Analizi",
                    subtitle: "Robotik Total Station & Lazer Tarayıcı Ölçüm Değerleri",
                    bullets: [
                      "Total Station ölçümlerinde milimetrik sapma takibi yapılmaktadır.",
                      "Gerektiğinde halkalar arası derz dolgusu epoksi enjeksiyon ile güçlendirilmektedir.",
                      "Deformasyon hızı kritik eşik değeri: 0.2 mm / gün"
                    ],
                    stats: "Kritik Eşik Değeri: 0.2 mm/gün"
                  }
                ];

                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left Outline Sidebar */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-2 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">
                        {isDocx ? 'DOKÜMAN BÖLÜMLERİ' : 'SUNUM SLAYTLARI'}
                      </span>
                      
                      {isDocx ? (
                        docxChapters.map((ch, i) => (
                          <div key={i} className="p-2 bg-slate-900/40 rounded border border-slate-800/40 text-[10px] text-slate-300">
                            <span className="font-bold text-indigo-400 block mb-0.5">{ch.title}</span>
                            <span className="text-slate-500 text-[10px] line-clamp-1">{ch.text}</span>
                          </div>
                        ))
                      ) : (
                        pptxSlides.map((slide, i) => (
                          <button
                            key={i}
                            onClick={() => setPptxCurrentSlide(i + 1)}
                            className={`w-full text-left p-2 rounded text-[10px] transition cursor-pointer border ${
                              pptxCurrentSlide === i + 1
                                ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 font-extrabold'
                                : 'bg-slate-900/30 border-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="block text-[10px] text-slate-500 font-mono">SLAYT {i + 1}</span>
                            <span className="line-clamp-1">{slide.title}</span>
                          </button>
                        ))
                      )}

                      <div className="mt-auto pt-3 border-t border-slate-900 text-[10px] text-slate-500 font-mono space-y-1">
                        <div>Format: {isDocx ? 'Microsoft Word (.docx)' : 'Microsoft PowerPoint (.pptx)'}</div>
                        <div>Yazar: {fullScreenPreviewDoc.author}</div>
                        <div>Tarih: {fullScreenPreviewDoc.date}</div>
                      </div>
                    </div>

                    {/* Main Content Viewer Screen */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                      {/* Top Viewer Control Bar */}
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${isDocx ? 'bg-blue-600' : 'bg-orange-600'}`}>
                            {ext.toUpperCase()} OKUYUCU
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Versiyon: {fullScreenPreviewDoc.version}</span>
                        </div>

                        {!isDocx && (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={pptxCurrentSlide === 1}
                              onClick={() => setPptxCurrentSlide(p => Math.max(1, p - 1))}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-[10px] cursor-pointer"
                            >
                              Önceki
                            </button>
                            <span className="text-[10px] text-white font-mono font-bold">{pptxCurrentSlide} / {pptxSlides.length}</span>
                            <button
                              disabled={pptxCurrentSlide === pptxSlides.length}
                              onClick={() => setPptxCurrentSlide(p => Math.min(pptxSlides.length, p + 1))}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-[10px] cursor-pointer"
                            >
                              Sonraki
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Paper Layout Canvas */}
                      <div className="flex-1 p-5 overflow-y-auto bg-[#080b12] flex justify-center scrollbar-none">
                        {isDocx ? (
                          <div className="w-full max-w-2xl bg-[#0d121f] border border-slate-800 p-8 rounded-lg shadow-xl space-y-5 text-slate-300 text-[11px] leading-relaxed relative">
                            <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              DIJITAL ONAYLI (CDE)
                            </div>

                            <div className="border-b border-slate-800 pb-3">
                              <h1 className="text-sm font-black text-white uppercase tracking-wide leading-tight">{fullScreenPreviewDoc.name}</h1>
                              <p className="text-[10px] text-slate-500 font-mono mt-1">Oluşturan: {fullScreenPreviewDoc.author} | Revizyon Tarihi: {fullScreenPreviewDoc.date}</p>
                            </div>

                            {docxChapters.map((ch, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <h3 className="font-extrabold text-indigo-400 text-[11px]">{ch.title}</h3>
                                <p className="text-slate-300 font-medium">{ch.text}</p>
                              </div>
                            ))}

                            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-500">
                              <div>
                                <span>Doğrulama Anahtarı:</span>
                                <span className="block text-slate-400 truncate">SHA256: 8f4e2c91b8a4f6d3e7a0c1...</span>
                              </div>
                              <div className="text-right">
                                <span>Dijital İmza Kodu:</span>
                                <span className="block text-slate-400">SIGN-METRO-2026-V2</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-2xl bg-[#131929] border border-slate-800 p-8 rounded-xl shadow-xl flex flex-col justify-between text-slate-300 text-[11px] min-h-[350px]">
                            {/* Slide Title Panel */}
                            <div>
                              <span className="text-[10px] font-black text-amber-500 font-mono tracking-widest block uppercase mb-1">
                                SLAYT {pptxCurrentSlide} - TEKNİK SUNUM KATMANI
                              </span>
                              <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide border-b border-slate-800 pb-2 mb-4 leading-snug">
                                {pptxSlides[pptxCurrentSlide - 1].title}
                              </h2>
                              <p className="text-[10px] text-slate-400 font-bold mb-3 italic">
                                {pptxSlides[pptxCurrentSlide - 1].subtitle}
                              </p>
                              
                              <ul className="space-y-2 list-none pl-1">
                                {pptxSlides[pptxCurrentSlide - 1].bullets.map((bullet, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-slate-300 font-medium">
                                    <span className="text-indigo-400 text-xs shrink-0 select-none">•</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Slide Stats Panel */}
                            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-slate-500 text-[10px] font-mono">© {fullScreenPreviewDoc.date} - Istanbul Metro Sunumları</span>
                              <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 font-mono font-black text-[10px]">
                                {pptxSlides[pptxCurrentSlide - 1].stats}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 3. PDF DOCUMENTS (pdf)
              if (ext === 'pdf') {
                const pdfBookmarks = [
                  { page: 1, title: "Sayfa 1: Proje Kapak ve Genel Künye Raporu" },
                  { page: 2, title: "Sayfa 2: Güzergah Jeolojik Sondaj Karot Verileri" },
                  { page: 3, title: "Sayfa 3: Sismik Dinleme ve Sismografik Alarm Değerleri" }
                ];

                const filteredBookmarks = pdfBookmarks.filter(bm => 
                  bm.title.toLowerCase().includes(pdfBookmarkSearch.toLowerCase())
                );

                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left bookmarks panel */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-2 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">PDF İÇİNDEKİLER</span>
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Bölümlerde ara..."
                          value={pdfBookmarkSearch}
                          onChange={(e) => setPdfBookmarkSearch(e.target.value)}
                          className="w-full bg-[#101524] border border-slate-800 rounded px-2.5 pl-6 py-1.5 text-[10px] text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[160px] md:max-h-none flex-1 scrollbar-none">
                        {filteredBookmarks.map((bm, i) => (
                          <button
                            key={i}
                            onClick={() => setPdfPage(bm.page)}
                            className={`w-full text-left p-2 rounded text-[10px] transition cursor-pointer flex items-start gap-1.5 border ${
                              pdfPage === bm.page
                                ? 'bg-indigo-600/15 border-indigo-500/20 text-indigo-400 font-extrabold'
                                : 'bg-slate-900/40 border-slate-900/60 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                            <span>{bm.title}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-900 space-y-2">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider">GÜVENLİK VE ONAY</span>
                        <div className="bg-emerald-600/10 border border-emerald-500/20 p-2 rounded flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black text-emerald-400 block uppercase leading-tight">MÜHÜRLÜ DOKÜMAN</span>
                            <span className="text-[10px] text-slate-400 font-mono block">E-İMZA: AKTİF</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main PDF Panel with Zoom Controller */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                      {/* Top Action Bar */}
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-black text-white uppercase font-mono">PDF ENGINE</span>
                          <span className="text-[10px] text-slate-300 font-mono">Sayfa {pdfPage} / 3</span>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPdfZoom(z => Math.max(50, z - 25))}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Uzaklaştır"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-white font-mono font-bold w-12 text-center">{pdfZoom}%</span>
                          <button
                            onClick={() => setPdfZoom(z => Math.min(200, z + 25))}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Yakınlaştır"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Simple Page Navigator */}
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={pdfPage === 1}
                            onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                            className="px-2 py-1 bg-[#151b2a] hover:bg-[#1a2336] border border-slate-800 disabled:opacity-30 rounded text-[10px] text-slate-300 cursor-pointer"
                          >
                            Önceki
                          </button>
                          <button
                            disabled={pdfPage === 3}
                            onClick={() => setPdfPage(p => Math.min(3, p + 1))}
                            className="px-2 py-1 bg-[#151b2a] hover:bg-[#1a2336] border border-slate-800 disabled:opacity-30 rounded text-[10px] text-slate-300 cursor-pointer"
                          >
                            Sonraki
                          </button>
                        </div>
                      </div>

                      {/* PDF Scroll Area */}
                      <div className="flex-1 p-5 overflow-auto bg-[#080b12] flex justify-center scrollbar-none">
                        <div 
                          className="w-full max-w-xl bg-white border border-slate-200 text-slate-800 p-8 rounded-lg shadow-2xl space-y-6 text-[11px] leading-relaxed relative min-h-[480px] transition-transform duration-200"
                          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                        >
                          {/* Kapak Stamp */}
                          <div className="absolute top-5 right-5 border-4 border-red-500 text-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest font-mono select-none rotate-12">
                            YAYINLANDI
                          </div>

                          {pdfPage === 1 && (
                            <div className="space-y-4 pt-4">
                              <div className="border-b-2 border-slate-800 pb-3">
                                <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">ISTANBUL BULGURLU-HALKALI METRO PROJESI (BHM)</span>
                                <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide leading-snug mt-1">{fullScreenPreviewDoc.name}</h1>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono border-b border-slate-200 pb-3">
                                <div>
                                  <span className="text-slate-500 block font-bold">DOKÜMAN NO:</span>
                                  <span className="text-slate-800 font-extrabold">BHM-GEO-RPR-2026-V1</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block font-bold">KATEGORİ:</span>
                                  <span className="text-slate-800 font-extrabold">TEKNİK RAPOR & ŞARTNAME</span>
                                </div>
                              </div>
                              <h3 className="font-extrabold text-slate-900 text-[11px] uppercase">DOKÜMAN KÜNYESİ</h3>
                              <p className="text-slate-700 text-justify">
                                Bu doküman, tünel inşaatı kapsamında gerçekleştirilecek zemin geoteknik sondaj analizleri, deprem ve sismik risk ivmelenmeleri ile sismografik izleme standartlarını belirlemek amacıyla hazırlanmıştır. İşletme ve imalat aşamalarında tüm denetim mekanizmaları bu raporda yer alan kriterlere göre yürütülecektir.
                              </p>
                            </div>
                          )}

                          {pdfPage === 2 && (
                            <div className="space-y-4 pt-2">
                              <h3 className="font-black text-slate-900 border-b border-slate-300 pb-1 text-[11px] uppercase">GÜZERGAH JEOLOJİK SONDAJ VERİLERİ</h3>
                              <p className="text-slate-700">
                                Raylı sistem güzergahı boyunca açılan sondaj kuyularından alınan veriler, kil ve kalker tabakalarının yoğun olduğunu göstermektedir. TBM tünel delme makinesi parametreleri saniyede 12 mm delme hızını aşmayacak şekilde ayarlanacaktır.
                              </p>
                              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                                <thead>
                                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                                    <th className="p-2 border-r border-slate-300">Kuyu No</th>
                                    <th className="p-2 border-r border-slate-300">Derinlik (m)</th>
                                    <th className="p-2 border-r border-slate-300">SPT Değeri</th>
                                    <th className="p-2">Litomoloji</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  <tr>
                                    <td className="p-2 border-r border-slate-300 font-bold">SK-102</td>
                                    <td className="p-2 border-r border-slate-300">35.0</td>
                                    <td className="p-2 border-r border-slate-300">42</td>
                                    <td className="p-2">Marnlı Kil</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2 border-r border-slate-300 font-bold">SK-103</td>
                                    <td className="p-2 border-r border-slate-300">45.0</td>
                                    <td className="p-2 border-r border-slate-300">50+</td>
                                    <td className="p-2">Kalker Kayacı</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {pdfPage === 3 && (
                            <div className="space-y-4 pt-2">
                              <h3 className="font-black text-slate-900 border-b border-slate-300 pb-1 text-[11px] uppercase">SİSMİK ALARM VE DEFORMASTON SINIRLARI</h3>
                              <p className="text-slate-700">
                                Sahadaki sismograflar tarafından tünel zemin kaplamalarında milimetrik yer değiştirme (deformasyon) takipleri saniyede bir merkeze aktarılır. Aşağıdaki tabloda yer alan alarm eşikleri hassasiyetle kontrol edilmelidir:
                              </p>
                              <div className="bg-red-50 border-l-4 border-red-500 p-2.5 text-red-900">
                                <strong className="block text-[10px] text-red-800">⚠️ KRİTİK ALARM BİLGİSİ:</strong>
                                Deformasyon hızı günde 0.5 milimetreyi aştığı takdirde TBM ilerleme operasyonu anında durdurularak C35 beton enjeksiyon tahkimat katmanı yapılacaktır.
                              </div>
                            </div>
                          )}

                          <div className="pt-12 border-t border-slate-200 text-[10px] font-mono text-slate-400 flex justify-between">
                            <span>Sertifika No: BHM-PDF-A430</span>
                            <span>Doğrulanmış Güvenli PDF OKUYUCU</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 4. CAD VECTOR INTERACTIVE PREVIEWS (dwg, dxf, dgn, ncz)
              if (['dwg', 'dxf', 'dgn', 'ncz'].includes(ext)) {
                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left layer toggles */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-2.5 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        CAD KATMAN YÖNETİCİSİ
                      </span>

                      <div className="space-y-1.5 flex-1">
                        {Object.keys(cadLayers).map(layerName => {
                          const aliases: Record<string, string> = {
                            grid: 'Koordinat Ağı / Grid',
                            structures: 'Betonarme / Tünel Aksı',
                            electrical: 'Elektrik Hatları (Purp)',
                            mep: 'Mekanik & Havalandırma',
                            dimension: 'Ölçülendirme / Tolerans'
                          };
                          return (
                            <label 
                              key={layerName}
                              className="flex items-center gap-2 p-2 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800/40 rounded text-[10px] text-slate-300 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={cadLayers[layerName]}
                                onChange={() => setCadLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }))}
                                className="accent-indigo-500 rounded cursor-pointer"
                              />
                              <span className="font-medium text-slate-300">{aliases[layerName] || layerName}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-slate-900 space-y-2">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider">HARİTA KOORDİNATLARI</span>
                        <div className="bg-[#080b11] border border-slate-800 p-2.5 rounded font-mono text-[10px] text-indigo-400 space-y-1">
                          <div className="flex justify-between">
                            <span>UTM (Zone 35):</span>
                            <span className="font-bold text-slate-300">ED50</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Easting (X):</span>
                            <span className="font-bold text-white">{cadCoords.x.toLocaleString()} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Northing (Y):</span>
                            <span className="font-bold text-white">{cadCoords.y.toLocaleString()} m</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 block text-center italic">Haritada gezinmek için farenizi hareket ettirin.</span>
                      </div>
                    </div>

                    {/* Vector CAD Drawing Panel */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden relative group">
                      {/* Control Panel Header */}
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600/20 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-black text-indigo-400 uppercase font-mono">CAD VECTOR ENGINE</span>
                          <span className="text-[10px] text-slate-400">Dosya: {fullScreenPreviewDoc.name}</span>
                        </div>

                        {/* Pan & Zoom Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCadZoom(z => Math.max(50, z - 25))}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Uzaklaştır"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-white font-mono font-bold w-10 text-center">{cadZoom}%</span>
                          <button
                            onClick={() => setCadZoom(z => Math.min(250, z + 25))}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                            title="Yakınlaştır"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setCadZoom(100); setCadPanOffset({ x: 0, y: 0 }); }}
                            className="px-2 py-1 bg-[#1a2336] hover:bg-indigo-600/30 hover:text-indigo-400 text-slate-300 rounded text-[10px] font-bold font-sans cursor-pointer ml-1.5"
                          >
                            Ekranı Ortala
                          </button>
                        </div>
                      </div>

                      {/* Render CAD SVG Drawing */}
                      <div 
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const localX = e.clientX - rect.left;
                          const localY = e.clientY - rect.top;
                          const utmX = 432500 + Math.round(localX * 1.5 * (100 / cadZoom));
                          const utmY = 4429500 + Math.round(localY * 1.5 * (100 / cadZoom));
                          setCadCoords({ x: utmX, y: utmY });
                        }}
                        className="flex-1 overflow-hidden relative cursor-crosshair flex items-center justify-center p-4 min-h-[350px] bg-[#070b12]"
                      >
                        <svg 
                          className="w-full h-full min-h-[340px] max-h-[500px] transition-transform duration-150 rounded" 
                          viewBox="0 0 800 480"
                          style={{ 
                            transform: `scale(${cadZoom / 100}) translate(${cadPanOffset.x}px, ${cadPanOffset.y}px)`,
                            transformOrigin: 'center center'
                          }}
                        >
                          {/* Grid Layer */}
                          {cadLayers.grid && (
                            <g stroke="#161e2b" strokeWidth="0.8" strokeDasharray="3,3">
                              {Array.from({ length: 20 }).map((_, i) => (
                                <line key={`v-${i}`} x1={i * 45} y1={0} x2={i * 45} y2={480} />
                              ))}
                              {Array.from({ length: 15 }).map((_, i) => (
                                <line key={`h-${i}`} x1={0} y1={i * 35} x2={800} y2={i * 35} />
                              ))}
                            </g>
                          )}

                          {/* Structural Layer */}
                          {cadLayers.structures && (
                            <g stroke="#64748b" strokeWidth="1.5" fill="none">
                              {/* Main Tunnels */}
                              <path d="M 0 180 L 800 180" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="12,6" opacity="0.85" />
                              <path d="M 0 280 L 800 280" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="12,6" opacity="0.85" />
                              
                              {/* Central Station Block Outline */}
                              <rect x="240" y="120" width="320" height="220" fill="none" stroke="#38bdf8" strokeWidth="3" />
                              <text x="400" y="105" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="extrabold" fontFamily="sans-serif" letterSpacing="1">MECİDİYEKÖY İSTASYONU PLAN KESİTİ</text>
                              
                              {/* Support Columns */}
                              {Array.from({ length: 6 }).map((_, i) => (
                                <rect key={`col-${i}`} x={270 + i * 50} y={150} width="16" height="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
                              ))}
                              {Array.from({ length: 6 }).map((_, i) => (
                                <rect key={`col2-${i}`} x={270 + i * 50} y={290} width="16" height="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
                              ))}
                            </g>
                          )}

                          {/* MEP/Ventilation Layer */}
                          {cadLayers.mep && (
                            <g stroke="#10b981" strokeWidth="2.2" fill="none">
                              {/* Ventilation ducts and fans */}
                              <path d="M 80 200 L 720 200" strokeWidth="1.8" strokeDasharray="4,2" />
                              <path d="M 80 260 L 720 260" strokeWidth="1.8" strokeDasharray="4,2" />
                              
                              {/* Fan nodes */}
                              <circle cx="320" cy="200" r="14" fill="#042f2e" stroke="#10b981" />
                              <circle cx="480" cy="260" r="14" fill="#042f2e" stroke="#10b981" />
                              
                              {/* Fan blades indicator */}
                              <line x1="306" y1="200" x2="334" y2="200" strokeWidth="2" />
                              <line x1="320" y1="186" x2="320" y2="214" strokeWidth="2" />
                              <line x1="466" y1="260" x2="494" y2="260" strokeWidth="2" />
                              <line x1="480" y1="246" x2="480" y2="274" strokeWidth="2" />
                            </g>
                          )}

                          {/* Electrical Layer */}
                          {cadLayers.electrical && (
                            <g stroke="#c084fc" strokeWidth="1.5" fill="none" strokeDasharray="10,4">
                              <path d="M 240 135 L 560 135" />
                              <path d="M 240 325 L 560 325" />
                              
                              {/* Purp/Electrical Nodes */}
                              <g fill="#a855f7" stroke="none">
                                <rect x="270" y="130" width="10" height="10" />
                                <rect x="370" y="130" width="10" height="10" />
                                <rect x="470" y="130" width="10" height="10" />
                                <rect x="270" y="320" width="10" height="10" />
                                <rect x="370" y="320" width="10" height="10" />
                                <rect x="470" y="320" width="10" height="10" />
                              </g>
                            </g>
                          )}

                          {/* Dimension Layer */}
                          {cadLayers.dimension && (
                            <g stroke="#fb923c" strokeWidth="1.2" fill="#fb923c" fontSize="10" fontFamily="monospace">
                              {/* Dimension Line 1 */}
                              <line x1="240" y1="80" x2="560" y2="80" />
                              <line x1="240" y1="74" x2="240" y2="86" />
                              <line x1="560" y1="74" x2="560" y2="86" />
                              <text x="400" y="72" textAnchor="middle" fontWeight="bold">ISTASYON BOYU = 160.00 m</text>

                              {/* Dimension Line 2 */}
                              <line x1="180" y1="120" x2="180" y2="340" />
                              <line x1="174" y1="120" x2="186" y2="120" />
                              <line x1="174" y1="340" x2="186" y2="340" />
                              <text x="140" y="235" textAnchor="middle" fontWeight="bold" transform="rotate(-90 140 235)">ISTASYON ENI = 110.00 m</text>
                            </g>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              }

              // 5. GIS SPATIAL DATABASE AND MAPS (shp, kml, kmz, geojson, gpkg)
              if (['shp', 'kml', 'kmz', 'geojson', 'gpkg'].includes(ext)) {
                const gisFeatures: Record<string, any> = {
                  'f-1': { id: 'f-1', name: 'Mecidiyeköy Şaftı', type: 'Sondaj Şaftı', area: '1420 m²', desc: 'Zemin etüdü sondaj kazıları tamamlanmış sismik izleme istasyonu.', depth: '45m', status: 'Aktif Şantiye', geometry: 'POINT(29.0042, 41.0621)' },
                  'f-2': { id: 'f-2', name: 'Fulya Metro Güzergah Çizgisi', type: 'TBM Tünel Ekseni', area: 'N/A', desc: 'Ana metro hattı TBM tünel delme makinesi güzergah aksı coğrafi hattı.', depth: '32m', status: 'Kazı Devam Ediyor', geometry: 'LINESTRING(29.004, 41.062, 29.012, 41.055)' },
                  'f-3': { id: 'f-3', name: 'Kamulaştırma Parseli #204', type: 'Kadastro Poligonu', area: '4500 m²', desc: 'İstasyon çıkış çevre şaftı kamulaştırma sahası kadastral sınır poligonu.', depth: 'Yüzey', status: 'Kamulaştırıldı', geometry: 'POLYGON((29.006 41.061, 29.008 41.061, 29.008 41.059, 29.006 41.059))' }
                };

                const selectedFeatureData = gisSelectedFeature ? gisFeatures[gisSelectedFeature] : null;

                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left layer filter and Projection selection */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-2.5 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Map className="w-4 h-4 text-indigo-400" />
                        GIS VE HARİTA KATMANLARI
                      </span>

                      {/* Projection Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">PROJEKSİYON SİSTEMİ:</label>
                        <select
                          value={gisProjection}
                          onChange={(e) => setGisProjection(e.target.value)}
                          className="w-full bg-[#111624] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                        >
                          <option value="EPSG:4326 (WGS84)">EPSG:4326 (WGS84 - Coğrafi)</option>
                          <option value="EPSG:32635 (UTM-35N)">EPSG:32635 (UTM-35N / ED50)</option>
                          <option value="EPSG:3857 (Web Mercator)">EPSG:3857 (Web Mercator)</option>
                        </select>
                      </div>

                      {/* Map Layers Toggles */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">GÖRÜNÜR KATMANLAR:</label>
                        {Object.keys(gisLayers).map(layerKey => {
                          const aliases: Record<string, string> = {
                            routes: 'Metro Ray Güzergahı',
                            stations: 'İstasyon Şaft Noktaları',
                            parcels: 'Kamulaştırma Sınırları',
                            labels: 'Etiketler ve Bilgiler'
                          };
                          return (
                            <label key={layerKey} className="flex items-center gap-2 p-1.5 bg-[#121726]/40 hover:bg-[#121726]/80 border border-slate-800/40 rounded text-[10px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gisLayers[layerKey]}
                                onChange={() => setGisLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }))}
                                className="accent-indigo-500 rounded cursor-pointer"
                              />
                              <span>{aliases[layerKey] || layerKey}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Feature Selected Details Box */}
                      <div className="pt-3 border-t border-slate-900 mt-auto">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider mb-1.5">KATMAN ÖZNİTELİKLERİ</span>
                        {selectedFeatureData ? (
                          <div className="bg-[#080b11] border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-300 space-y-1.5">
                            <div className="text-indigo-400 font-extrabold text-[10px] font-sans border-b border-slate-900 pb-1">{selectedFeatureData.name}</div>
                            <div><span className="text-slate-500">Tür:</span> <span className="text-white font-bold">{selectedFeatureData.type}</span></div>
                            <div><span className="text-slate-500">Alan:</span> <span className="text-white">{selectedFeatureData.area}</span></div>
                            <div><span className="text-slate-500">Derinlik:</span> <span className="text-white font-bold text-amber-500">{selectedFeatureData.depth}</span></div>
                            <div><span className="text-slate-500">Durum:</span> <span className="text-emerald-400">{selectedFeatureData.status}</span></div>
                            <div className="text-[10px] text-slate-500 break-all leading-tight"><span className="text-slate-500 block font-bold">WKT Geometrisi:</span> {selectedFeatureData.geometry}</div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-600 text-[10px] italic bg-slate-900/10 border border-slate-900 border-dashed rounded">
                            Haritadan bir nesneye tıklayarak coğrafi veri tabanını sorgulayın.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive GIS Visualizer Canvas */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden relative">
                      {/* Top Action Bar */}
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600/20 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black text-emerald-400 uppercase font-mono">GIS RENDERER v2.4</span>
                          <span className="text-[10px] text-slate-400">Coğrafi Katman Entegrasyonu Aktif</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Doğruluk Sapması: &lt; 0.05m</div>
                      </div>

                      {/* Map Drawing Container */}
                      <div className="flex-1 bg-[#070b11] relative flex items-center justify-center p-4">
                        {/* Map Scale Indicator */}
                        <div className="absolute bottom-3 left-3 bg-[#0f1424] border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 font-mono z-10 flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-slate-400 border border-slate-700"></div>
                          <span>250 Metre (Scale 1:5000)</span>
                        </div>

                        <svg className="w-full h-full min-h-[340px] max-h-[500px] bg-[#0c101a] rounded border border-slate-900" viewBox="0 0 600 400">
                          {/* Sınır çizgileri grid */}
                          <g stroke="#161b29" strokeWidth="0.5">
                            {Array.from({ length: 12 }).map((_, i) => <line key={`gx-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={400} />)}
                            {Array.from({ length: 9 }).map((_, i) => <line key={`gy-${i}`} x1={0} y1={i * 50} x2={600} y2={i * 50} />)}
                          </g>

                          {/* 1. Kamulaştırma Poligonu Layer */}
                          {gisLayers.parcels && (
                            <polygon 
                              points="150,150 400,100 450,280 200,320" 
                              fill={gisSelectedFeature === 'f-3' ? 'rgba(251, 146, 60, 0.25)' : 'rgba(234, 179, 8, 0.12)'} 
                              stroke={gisSelectedFeature === 'f-3' ? '#fb923c' : '#eab308'} 
                              strokeWidth="2.5" 
                              className="cursor-pointer transition hover:fill-amber-500/20"
                              onClick={() => setGisSelectedFeature('f-3')}
                            />
                          )}

                          {/* 2. Metro Ray Güzergah Çizgisi Layer */}
                          {gisLayers.routes && (
                            <path 
                              d="M 50,300 Q 250,150 550,100" 
                              fill="none" 
                              stroke={gisSelectedFeature === 'f-2' ? '#a855f7' : '#f43f5e'} 
                              strokeWidth={gisSelectedFeature === 'f-2' ? '5' : '3.5'} 
                              className="cursor-pointer transition hover:stroke-purple-400"
                              onClick={() => setGisSelectedFeature('f-2')}
                            />
                          )}

                          {/* 3. İstasyon Şaft Noktaları Layer */}
                          {gisLayers.stations && (
                            <g>
                              {/* Mecidiyeköy Şaftı Node */}
                              <circle 
                                cx="250" 
                                cy="200" 
                                r={gisSelectedFeature === 'f-1' ? '12' : '8'} 
                                fill="#065f46" 
                                stroke={gisSelectedFeature === 'f-1' ? '#10b981' : '#34d399'} 
                                strokeWidth="2.5" 
                                className="cursor-pointer transition hover:scale-110"
                                onClick={() => setGisSelectedFeature('f-1')}
                              />
                              <circle cx="250" cy="200" r="3" fill="#ffffff" />
                            </g>
                          )}

                          {/* 4. Labels Layer overlay */}
                          {gisLayers.labels && (
                            <g fill="#94a3b8" fontSize="9.5" fontFamily="sans-serif" fontWeight="bold">
                              {gisLayers.stations && (
                                <text x="250" y="180" textAnchor="middle" fill="#34d399" className="drop-shadow-lg">Mecidiyeköy Şaftı (POINT)</text>
                              )}
                              {gisLayers.routes && (
                                <text x="380" y="145" textAnchor="middle" fill="#f43f5e" transform="rotate(-12 380 145)">TBM Tünel Ekseni (LINESTRING)</text>
                              )}
                              {gisLayers.parcels && (
                                <text x="320" y="250" textAnchor="middle" fill="#eab308">Kadastro Kamulaştırma Poligonu</text>
                              )}
                            </g>
                          )}
                        </svg>

                        {/* Visual Help Tips overlay */}
                        <div className="absolute top-3 right-3 bg-indigo-950/90 border border-indigo-500/30 p-2 rounded text-[10px] text-indigo-300 max-w-xs leading-relaxed shadow-lg font-bold">
                          💡 Nesnelerin coğrafi özniteliklerini detaylandırmak için haritada üzerlerine doğrudan tıklayabilirsiniz.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 6. OTHER FILES: IMAGES (png, jpg, jpeg) AND VIDEOS (mp4, webm)
              if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left Workbench Controls */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-3 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        GÖRÜNTÜ AYARLARI
                      </span>

                      {/* Contrast Brightness Sliders */}
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Parlaklık (Brightness)</span>
                            <span className="font-mono text-white font-bold">{imgBrightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="180"
                            value={imgBrightness}
                            onChange={(e) => setImgBrightness(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Kontrast (Contrast)</span>
                            <span className="font-mono text-white font-bold">{imgContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="180"
                            value={imgContrast}
                            onChange={(e) => setImgContrast(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Filter Toggles */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider">HIZLI FİLTRELER</span>
                        
                        <label className="flex items-center justify-between p-2 bg-[#121726]/40 hover:bg-[#121726]/80 border border-slate-800/40 rounded text-[10px] text-slate-300 cursor-pointer">
                          <span>Siyah-Beyaz (Grayscale)</span>
                          <input
                            type="checkbox"
                            checked={imgGrayscale}
                            onChange={() => setImgGrayscale(g => !g)}
                            className="accent-indigo-500 rounded cursor-pointer"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => setImgFlipX(f => !f)}
                            className={`py-1.5 rounded border text-[10px] font-bold cursor-pointer transition ${
                              imgFlipX ? 'bg-indigo-600/20 border-indigo-500' : 'bg-[#101524] border-slate-800 text-slate-400'
                            }`}
                          >
                            Yatay Çevir
                          </button>
                          <button
                            onClick={() => setImgFlipY(f => !f)}
                            className={`py-1.5 rounded border text-[10px] font-bold cursor-pointer transition ${
                              imgFlipY ? 'bg-indigo-600/20 border-indigo-500' : 'bg-[#101524] border-slate-800 text-slate-400'
                            }`}
                          >
                            Dikey Çevir
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setImgBrightness(100);
                          setImgContrast(100);
                          setImgGrayscale(false);
                          setImgFlipX(false);
                          setImgFlipY(false);
                        }}
                        className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[10px] uppercase cursor-pointer"
                      >
                        Ayarları Sıfırla
                      </button>

                      {/* EXIF Metadata parameters */}
                      <div className="pt-2 border-t border-slate-900 mt-auto">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider mb-1.5">KAMERA EXIF VERİSİ</span>
                        <div className="bg-[#080b11] border border-slate-800 p-2 rounded font-mono text-[10px] text-slate-400 space-y-1">
                          <div>Çözünürlük: <span className="text-white">3840 x 2160 (4K)</span></div>
                          <div>Kamera: <span className="text-white">DJI Mavic 3 Pro</span></div>
                          <div>Pozlama: <span className="text-white">1/160s f/2.8 ISO 100</span></div>
                          <div>GPS: <span className="text-indigo-400">41.0621° N, 29.0042° E</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Image Viewer Display Panel */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">Yüksek Kaliteli Önizleme Modu</span>
                        <span className="text-[10px] text-slate-500 font-mono">Tür: {ext.toUpperCase()} Görsel</span>
                      </div>

                      {/* The Main Rendered Image Canvas */}
                      <div className="flex-1 bg-[#070a12] p-4 flex items-center justify-center overflow-hidden min-h-[350px]">
                        <div 
                          className="w-full max-w-lg h-full max-h-[360px] border border-slate-900 rounded-lg shadow-2xl relative overflow-hidden flex items-center justify-center transition-all bg-[#101423]"
                          style={{
                            filter: `brightness(${imgBrightness}%) contrast(${imgContrast}%) ${imgGrayscale ? 'grayscale(100%)' : ''}`,
                            transform: `scaleX(${imgFlipX ? -1 : 1}) scaleY(${imgFlipY ? -1 : 1})`
                          }}
                        >
                          {/* Rich Vector Drone Photograph Mockup Illustration */}
                          <svg className="w-full h-full max-h-[360px]" viewBox="0 0 500 300">
                            {/* Blue Sky Gradient Background overlay */}
                            <defs>
                              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
                              </linearGradient>
                              <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#1e293b" />
                              </linearGradient>
                            </defs>
                            <rect width="500" height="300" fill="url(#groundGrad)" />
                            
                            {/* Sky block */}
                            <rect width="500" height="100" fill="url(#skyGrad)" />
                            
                            {/* Mountains contours */}
                            <path d="M 0,100 Q 120,60 220,100 T 500,100 L 500,300 L 0,300 Z" fill="#131d35" opacity="0.4" />
                            <path d="M 0,130 Q 180,80 320,130 T 500,130 L 500,300 L 0,300 Z" fill="#0f172a" />
                            
                            {/* Construction site outlines layout */}
                            <rect x="120" y="140" width="260" height="110" fill="#1e293b/80" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" />
                            <circle cx="250" cy="190" r="30" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                            
                            {/* Crane tower SVG mockup */}
                            <line x1="330" y1="240" x2="330" y2="110" stroke="#fb923c" strokeWidth="4" />
                            <line x1="280" y1="120" x2="380" y2="120" stroke="#fb923c" strokeWidth="3.5" />
                            <line x1="330" y1="110" x2="380" y2="120" stroke="#f97316" strokeWidth="1" />
                            
                            {/* Metro line routes */}
                            <path d="M 0,220 C 150,210 350,250 500,210" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            <path d="M 0,225 C 150,215 350,255 500,215" fill="none" stroke="#ef4444" strokeWidth="1" />
                            
                            {/* Drone camera grid overlay indicators */}
                            <g stroke="#38bdf8" strokeWidth="0.5" opacity="0.3">
                              <line x1="166" y1="0" x2="166" y2="300" />
                              <line x1="333" y1="0" x2="333" y2="300" />
                              <line x1="0" y1="100" x2="500" y2="100" />
                              <line x1="0" y1="200" x2="500" y2="200" />
                              
                              {/* Central focusing bracket */}
                              <rect x="235" y="135" width="30" height="30" fill="none" strokeWidth="1.5" />
                            </g>
                          </svg>

                          <div className="absolute bottom-3 right-3 bg-black/60 border border-slate-800/80 px-2.5 py-1 rounded text-[10px] text-slate-300 font-mono">
                            Drone_BHM_Station_Topview.png
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Videos (mp4, webm)
              if (['mp4', 'webm'].includes(ext)) {
                return (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 h-full text-left font-sans">
                    {/* Left sidebar video details */}
                    <div className="w-full md:w-56 bg-[#0a0e17] border border-slate-800 p-3 rounded-xl flex flex-col gap-3 shrink-0">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-indigo-400" />
                        VİDEO DETAYLARI
                      </span>

                      <div className="bg-[#080b11] border border-slate-800 p-2.5 rounded font-mono text-[10px] text-slate-400 space-y-2">
                        <div>Dosya Adı: <span className="text-white break-all">{fullScreenPreviewDoc.name}</span></div>
                        <div>Format: <span className="text-white uppercase">{ext}</span></div>
                        <div>Çözünürlük: <span className="text-emerald-400 font-bold">1920 x 1080 (FullHD)</span></div>
                        <div>Kare Hızı: <span className="text-white">60 FPS</span></div>
                        <div>Codec Sınıfı: <span className="text-white">H.264 / AAC Audio</span></div>
                        <div>Bant Genişliği: <span className="text-white">12.5 Mbps</span></div>
                      </div>

                      {/* Waveform Visualization sound activity (animates when video plays!) */}
                      <div className="pt-2 border-t border-slate-900 mt-auto">
                        <span className="text-[10px] text-slate-500 block uppercase font-black tracking-wider mb-2">SES SPEKTRUMU</span>
                        <div className="h-10 bg-slate-900/60 border border-slate-800 rounded flex items-end justify-center gap-[2px] p-1.5 overflow-hidden">
                          {Array.from({ length: 18 }).map((_, idx) => {
                            // Compute randomized wave heights when active
                            const minH = 2;
                            const maxH = 26;
                            const hValue = vidPlaying 
                              ? Math.floor(Math.random() * (maxH - minH) + minH) 
                              : [6, 12, 18, 14, 8, 4, 10, 16, 22, 14, 12, 6, 10, 15, 8, 4, 8, 5][idx];
                            
                            return (
                              <div
                                key={idx}
                                className={`w-[3px] bg-indigo-500 rounded-t transition-all duration-300 ${vidPlaying ? 'opacity-100' : 'opacity-40'}`}
                                style={{ height: `${hValue}px` }}
                              ></div>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-500 block text-center mt-1 font-mono">Audio Track: Stereo (L/R)</span>
                      </div>
                    </div>

                    {/* Video Player Main Canvas */}
                    <div className="flex-1 bg-[#0b0e17] border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                      <div className="p-3 bg-[#0d1321] border-b border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">Teknik Animasyon ve Şantiye İzleme Ekranı</span>
                        <span className="bg-indigo-600/20 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-black text-indigo-400 uppercase font-mono">CDE PLAYER</span>
                      </div>

                      {/* Video Player Display Container */}
                      <div className="flex-1 bg-black flex items-center justify-center p-4 relative min-h-[320px]">
                        {/* Video Mock Graphics */}
                        <div className="w-full max-w-md h-full max-h-[260px] bg-slate-950/80 border border-slate-900 rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-between">
                          <svg className="w-full h-full min-h-[200px]" viewBox="0 0 400 240">
                            <defs>
                              <linearGradient id="vidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#1e1b4b" />
                              </linearGradient>
                            </defs>
                            <rect width="400" height="240" fill="url(#vidGrad)" />

                            {/* Rotating tunnel drilling machine animation */}
                            <circle cx="200" cy="110" r="50" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="10,5" className={vidPlaying ? "animate-[spin_10s_linear_infinite]" : ""} />
                            <circle cx="200" cy="110" r="30" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,3" className={vidPlaying ? "animate-[spin_6s_linear_infinite]" : ""} />
                            <circle cx="200" cy="110" r="10" fill="#ef4444" />
                            
                            {/* Lines of tunnel grid */}
                            <line x1="50" y1="110" x2="150" y2="110" stroke="#334155" />
                            <line x1="250" y1="110" x2="350" y2="110" stroke="#334155" />
                            <line x1="200" y1="30" x2="200" y2="60" stroke="#334155" />
                            <line x1="200" y1="160" x2="200" y2="190" stroke="#334155" />

                            <text x="200" y="210" textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">TBM TUNNEL BORING SIMULATOR v1.12</text>
                            {vidPlaying && (
                              <g fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                                <circle cx="30" cy="30" r="4" fill="#10b981" className="animate-ping" />
                                <text x="42" y="33">LIVE VIDEO SIMULATION ACTIVE</text>
                              </g>
                            )}
                          </svg>

                          {/* Controls bar overlaid inside video canvas */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 border-t border-slate-900/60 p-2 flex flex-col gap-1.5">
                            {/* Progress bar timeline scrubber */}
                            <div 
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const percent = Math.round((x / rect.width) * 100);
                                setVidProgress(percent);
                              }}
                              className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer relative"
                            >
                              <div className="bg-indigo-500 h-full rounded-full transition-all duration-150" style={{ width: `${vidProgress}%` }}></div>
                              <div className="w-3 h-3 bg-white border-2 border-indigo-500 rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-150" style={{ left: `${vidProgress}%` }}></div>
                            </div>

                            {/* Row of control buttons */}
                            <div className="flex items-center justify-between text-[10px] text-slate-300">
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={() => setVidPlaying(!vidPlaying)}
                                  className="text-white hover:text-indigo-400 p-0.5 cursor-pointer"
                                  title={vidPlaying ? "Duraklat" : "Oynat"}
                                >
                                  {vidPlaying ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0 fill-white" />}
                                </button>

                                <span className="font-mono text-[10px]">
                                  {Math.floor((vidProgress * 1.2) / 60)}:
                                  {String(Math.floor((vidProgress * 1.2) % 60)).padStart(2, '0')} / 2:00
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Volume Slider */}
                                <div className="flex items-center gap-1">
                                  <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={vidVolume}
                                    onChange={(e) => setVidVolume(Number(e.target.value))}
                                    className="w-12 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                                  />
                                </div>

                                {/* Speed selector */}
                                <div className="flex items-center gap-1 font-mono text-[10px]">
                                  <span className="text-slate-500">Hız:</span>
                                  <select
                                    value={vidSpeed}
                                    onChange={(e) => setVidSpeed(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-800 rounded px-1 text-[10px] text-white focus:outline-none"
                                  >
                                    <option value={0.5}>0.5x</option>
                                    <option value={1}>1.0x</option>
                                    <option value={1.5}>1.5x</option>
                                    <option value={2}>2.0x</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback Default preview simulator info
              return (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div className="max-w-3xl space-y-4">
                    <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                      {getDocumentIcon(fullScreenPreviewDoc.extension, fullScreenPreviewDoc.category)}
                    </div>
                    
                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400">
                      {fullScreenPreviewDoc.extension.toUpperCase()} INTERACTIVE RENDER ENGINE SİMÜLASYONU
                    </h2>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl mx-auto">
                      📄 <strong>Teknik Doküman ve Ofis Okuyucu Aktif:</strong> {fullScreenPreviewDoc.category} tablosundaki veriler, revizyon geçmişi ve dipnot parametreleri tamamen çözümlendi. Dijital imza doğrulandı.
                    </p>

                    <div className="p-4 bg-[#0a0e1a]/80 border border-slate-800 rounded-xl text-left text-[10px] space-y-2 font-mono">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500 uppercase">Parametre</span>
                        <span className="text-slate-500 uppercase">Değer / Durum</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dosya Adı:</span>
                        <span className="text-white font-bold">{fullScreenPreviewDoc.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Açıklama:</span>
                        <span className="text-slate-300">{fullScreenPreviewDoc.description || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Boyut / Blok:</span>
                        <span className="text-indigo-400">{fullScreenPreviewDoc.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sistem Sağlık Testi:</span>
                        <span className="text-emerald-400">GEÇTİ (Checksum OK)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Preview Footer */}
          <div className="text-center text-[10px] text-slate-500 font-mono">
            <span>© 2026 Unified GIS/ERP Enterprise - Güvenli Doküman Görüntüleme Servisi v4.2</span>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: AUDIT LEDGER MODAL */}
      {showAuditLedgerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-[#0c101c] border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">CDE Dijital İmza Kanıt Defteri</h3>
                  <p className="text-[10px] text-slate-500 font-mono">5070 Sayılı Elektronik İmza Kanunu Güvenlik & Doğruluk Defteri</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditLedgerModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Search Bar */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Döküman Adı, Onaylayan Yetkili veya Rolüne göre kanıt ara..."
                  value={searchLedgerQuery}
                  onChange={e => setSearchLedgerQuery(e.target.value)}
                  className="w-full bg-[#121624] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                Toplam Kayıt: {signatureLogs.length}
              </span>
            </div>

            {/* Logs List Container */}
            <div className="flex-1 overflow-auto bg-[#070b13] border border-slate-900 rounded-xl max-h-[50vh]" style={{ scrollbarWidth: 'thin' }}>
              {(() => {
                const filteredLogs = signatureLogs.filter(log => 
                  log.docName.toLowerCase().includes(searchLedgerQuery.toLowerCase()) ||
                  log.approver.toLowerCase().includes(searchLedgerQuery.toLowerCase()) ||
                  log.role.toLowerCase().includes(searchLedgerQuery.toLowerCase()) ||
                  log.id.toLowerCase().includes(searchLedgerQuery.toLowerCase())
                );

                if (filteredLogs.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-600 font-mono text-[10px] space-y-2">
                      <Lock className="w-10 h-10 text-slate-800 mx-auto" />
                      <p className="uppercase font-bold text-slate-500">Defterde Kayıt Bulunamadı</p>
                      <p className="text-[10px] text-slate-600">Arama kriterini değiştirebilir veya bekleyen dökümanları imzalayarak yeni kanıt oluşturabilirsiniz.</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0c101c] text-slate-400 font-mono font-black uppercase text-[10px] tracking-widest">
                        <th className="py-2 px-3">Sertifika No</th>
                        <th className="py-2 px-3">Döküman Adı</th>
                        <th className="py-2 px-3">Onaylayan / Rol</th>
                        <th className="py-2 px-3">Zaman Damgası</th>
                        <th className="py-2 px-3">Doğrulama IP</th>
                        <th className="py-2 px-3">İmza Görsel Kanıtı</th>
                        <th className="py-2 px-3">Kriptografik Hash (SHA256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 font-medium">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/10 transition">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-400 select-all">{log.id}</td>
                          <td className="py-3 px-3 font-semibold text-slate-200 max-w-[150px] truncate" title={log.docName}>{log.docName}</td>
                          <td className="py-3 px-3 text-slate-300">
                            <span className="block font-bold">{log.approver}</span>
                            <span className="text-[10px] text-slate-500">{log.role}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{log.timestamp}</td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[10px]">{log.ipAddress}</td>
                          <td className="py-3 px-3">
                            <div className="bg-white/5 border border-slate-800/60 rounded px-1.5 py-1 min-h-[30px] flex items-center justify-center max-w-[120px]">
                              {log.signatureType === 'draw' && log.signatureData.startsWith('data:image') ? (
                                <img 
                                  src={log.signatureData} 
                                  alt="Signature Proof" 
                                  className="max-h-6 object-contain filter invert opacity-80 brightness-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="font-serif italic text-[11px] text-indigo-300 font-bold max-w-[110px] truncate">
                                  {log.signatureData}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[10px] max-w-[120px] truncate select-all" title={log.hash}>
                            {log.hash}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer Information */}
            <div className="p-3 bg-indigo-950/10 border border-indigo-500/15 rounded-xl flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div className="text-[10px] leading-relaxed text-slate-400">
                <strong className="text-slate-200 font-bold block mb-0.5">CDE Dağıtık Blokzincir & Loglama Protokolü Açıklaması:</strong>
                Burada loglanan tüm olaylar değiştirilemez, silinemez niteliktedir. Her onay işleminde oluşturulan benzersiz SHA-256 hash değeri; doküman içeriği, revizyon numarası, IP adresi ve yetkili zaman damgası bilgileri kullanılarak kriptografik olarak hesaplanır. CDE bütünlüğü bu şifreleme zinciri ile korunmaktadır.
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono pt-2 border-t border-slate-900">
              <span>Sistem Sürümü: v4.2-SecureArc</span>
              <button
                onClick={() => setShowAuditLedgerModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-black uppercase transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
