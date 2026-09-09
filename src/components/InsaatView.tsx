import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { Shield, Bell, FileText, AlertOctagon, Layers, Calendar, CheckSquare, Plus, Info, RefreshCw, Compass, CheckCircle, TrendingUp, Pencil, X, Save, Camera, Image, Search, Video, Play, Pause, Cpu, Clock, Award, RotateCcw, Eye, Sliders } from 'lucide-react';
import { Project, Permit, Block, WBSTask } from '../types';

interface InsaatViewProps {
  project: Project;
  projects?: Project[];
  tasks: WBSTask[];
  onAddPermit: (permit: Permit) => void;
  onUpdateProject?: (updatedProject: Partial<Project>) => void;
  onUpdateTask?: (updatedTask: WBSTask) => void;
  theme: 'dark' | 'light';
}

export default function InsaatView({ 
  project, 
  projects = [], 
  tasks, 
  onAddPermit, 
  onUpdateProject, 
  onUpdateTask, 
  theme 
}: InsaatViewProps) {
  const [activeTab, setActiveTab] = useState<'ceo_summary' | 'ruhsat' | '4d' | '5d' | 'journal'>('ceo_summary');
  
  // Şantiye Günlüğü Fotoğraf Galerisi States
  const [journalPhotos, setJournalPhotos] = useState<Array<{
    id: string;
    date: string;
    title: string;
    category: string;
    description: string;
    imageUrl: string;
    videoUrl?: string;
    type?: 'image' | 'video';
    takenBy: string;
    gpsCoordinates: string;
    weather: string;
    workingGroup: string;
    aiDetectedObjects?: string[];
    workingHours?: Record<string, number>;
    zoneTransitions?: Array<{ time: string; object: string; from: string; to: string }>;
  }>>([
    {
      id: 'jp-video-1',
      date: '2026-08-29',
      title: 'Kule Vinç & Ekskavatör Sahası AI Takibi',
      category: 'Kazı & Temel',
      description: 'Yapay zeka nesne tanıma motoru aktif. Sektör-C üzerindeki mobil araçların, kule vinç çalışma verimliliklerinin ve baret kullanımı takibi.',
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-construction-site-with-cranes-and-machinery-34281-large.mp4',
      type: 'video',
      takenBy: 'AI Gözlem Kamerası (Sektör-C)',
      gpsCoordinates: '41.0084° N, 28.9785° E',
      weather: 'Güneşli',
      workingGroup: 'İnşaat',
      aiDetectedObjects: ['Ekskavatör', 'Kule Vinç', 'Baret', 'İskele'],
      workingHours: { 'Ekskavatör': 4.5, 'Kule Vinç': 6.2, 'Baret (İSG)': 7.8 },
      zoneTransitions: [
        { time: '10:15:02', object: 'Ekskavatör #1', from: 'Sektör-A', to: 'Sektör-C' },
        { time: '11:34:45', object: 'Mobil Vinç #2', from: 'Depo Alanı', to: 'Sektör-C' },
        { time: '13:02:11', object: 'Kamyon #5', from: 'Sektör-C', to: 'Hafriyat Çıkışı' }
      ]
    },
    {
      id: 'jp-video-2',
      date: '2026-08-29',
      title: 'İSG Baret ve Koruyucu Donanım Denetim Analizi',
      category: 'Betonarme',
      description: 'Kuzey rüzgar panelleri ve iskele montaj alanında çalışan personelin kişisel koruyucu donanım (baret, iskele vb.) uygunluk analiz kaydı.',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-worker-on-a-construction-site-34283-large.mp4',
      type: 'video',
      takenBy: 'İSG Denetim Drone (Kuzey)',
      gpsCoordinates: '41.0089° N, 28.9781° E',
      weather: 'Rüzgarlı',
      workingGroup: 'İnşaat',
      aiDetectedObjects: ['Baret', 'İskele'],
      workingHours: { 'İskele Ekipmanı': 8.0, 'Baret (İSG)': 8.0 },
      zoneTransitions: [
        { time: '09:05:12', object: 'Personel Grup-3', from: 'Zemin Kat', to: 'Dış İskele K-4' }
      ]
    },
    {
      id: 'jp-1',
      date: '2026-08-01',
      title: 'Zemin Kazı ve Temel Islah Çalışmaları',
      category: 'Kazı & Temel',
      description: 'Ana terminal binası Grid Sektör-A temel kazısı tamamlandı ve zemin jet-grout enjeksiyon testleri başarıyla gerçekleştirildi.',
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Cem Yiğit (Saha Şefi)',
      gpsCoordinates: '41.0082° N, 28.9784° E',
      weather: 'Güneşli',
      workingGroup: 'İnşaat'
    },
    {
      id: 'jp-2',
      date: '2026-08-10',
      title: 'Grid Sektör-A Betonarme Temel Döşeme Dökümü',
      category: 'Betonarme',
      description: 'Sektör-A radye temel döküm çalışmaları aralıksız 24 saatlik operasyonla tamamlanarak kürleme safhasına geçilmiştir.',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Ahmet Taşçı (Kalite Kontrol)',
      gpsCoordinates: '41.0085° N, 28.9789° E',
      weather: 'Açık / Sıcak',
      workingGroup: 'İnşaat'
    },
    {
      id: 'jp-3',
      date: '2026-08-18',
      title: 'Blok-B Tesisat ve Kablo Tavaları Montajı',
      category: 'Mekanik & Elektrik',
      description: 'Blok-B asma tavan içi ana taşıyıcı mekanik havalandırma kanalları ve elektrik kablo tavası montaj hatları çekiliyor.',
      imageUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Elif Şen (Elektrik Mühendisi)',
      gpsCoordinates: '41.0081° N, 28.9781° E',
      weather: 'Bulutlu',
      workingGroup: 'Elektrik'
    },
    {
      id: 'jp-4',
      date: '2026-08-25',
      title: 'Cephe Giydirme ve Isı Yalıtım Panelleri',
      category: 'Dış Cephe',
      description: 'Güney cephe giydirme cam ve kompozit ısı yalıtım panellerinin montajı örümcek vinçler ve iskele yardımıyla devam ediyor.',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Mustafa Alkan (Cephe Kontrol)',
      gpsCoordinates: '41.0089° N, 28.9788° E',
      weather: 'Rüzgarlı',
      workingGroup: 'İnşaat'
    },
    {
      id: 'jp-5',
      date: '2026-08-28',
      title: 'Terminal Çelik Karkas Çatı Makasları',
      category: 'Çelik Yapı',
      description: 'Geniş açıklıklı ana terminal binası çelik konstrüksiyon makas montajları şantiye sahasında mobil vinçlerle gerçekleştirildi.',
      imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Murat Can (Çelik Yapı Sorumlusu)',
      gpsCoordinates: '41.0083° N, 28.9785° E',
      weather: 'Güneşli',
      workingGroup: 'İnşaat'
    },
    {
      id: 'jp-6',
      date: '2026-08-29',
      title: 'Saha Genel Çevre Düzenleme ve Peyzaj',
      category: 'Peyzaj & Çevre',
      description: 'Ana giriş aksı çevre tretuvar taşlarının döşenmesi, altyapı yağmur suyu drenaj ızgaralarının yerleştirilmesi tamamlanmak üzere.',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      takenBy: 'Ayşe Kaya (Peyzaj Mimarı)',
      gpsCoordinates: '41.0080° N, 28.9780° E',
      weather: 'Parçalı Bulutlu',
      workingGroup: 'Tesisat'
    }
  ]);

  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [selectedWeather, setSelectedWeather] = useState<string>('Tümü');
  const [selectedWorkingGroup, setSelectedWorkingGroup] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddJournalModal, setShowAddJournalModal] = useState<boolean>(false);
  const [newJournalForm, setNewJournalForm] = useState({
    title: '',
    category: 'Kazı & Temel',
    description: '',
    date: '2026-08-29',
    imageUrl: '',
    takenBy: 'Hasan Yılmaz (Saha Mühendisi)',
    gpsCoordinates: '41.0084° N, 28.9782° E',
    weather: 'Güneşli',
    workingGroup: 'İnşaat'
  });
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [loadingCAD, setLoadingCAD] = useState<boolean>(false);
  const [selectedCADFile, setSelectedCADFile] = useState<string>('atasehir_BIM_structure.ifc');

  // Video recording and AI Object Recognition states
  const [showVideoRecorder, setShowVideoRecorder] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recorderMode, setRecorderMode] = useState<'camera' | 'screen' | 'simulated'>('simulated');
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedDetectedObjects, setRecordedDetectedObjects] = useState<string[]>(['Ekskavatör', 'Baret']);
  const [recordedWorkingHours, setRecordedWorkingHours] = useState<Record<string, number>>({ 'Ekskavatör': 0.5, 'Baret (İSG)': 0.8 });
  const [recordedZoneTransitions, setRecordedZoneTransitions] = useState<Array<{ time: string; object: string; from: string; to: string }>>([
    { time: '14:04:10', object: 'Ekskavatör #1', from: 'Sektör-A', to: 'Sektör-C' }
  ]);
  const [recordingLogs, setRecordingLogs] = useState<string[]>([]);
  const [selectedAIObjectFilter, setSelectedAIObjectFilter] = useState<string>('Tümü');

  // ISG / HSE Alerts state
  const [isgAlerts, setIsgAlerts] = useState<Array<{
    id: string;
    title: string;
    level: 'high' | 'medium';
    zone: string;
    description: string;
    time: string;
    status: 'Açık' | 'Giderildi';
    coordinates: { x: number; y: number };
    actionRequired: string;
  }>>([
    {
      id: 'isg-1',
      title: 'Emniyet Kemeri İhlali',
      level: 'high',
      zone: 'Sektör-A (İskele)',
      description: 'Dış cephe iskele kurulumunda çalışan 2 personelde emniyet kemeri veya askı bağlantısı bulunmadığı AI kamera tarafından tespit edildi.',
      time: '14:02',
      status: 'Açık',
      coordinates: { x: 24, y: 35 },
      actionRequired: 'İSG Sorumlusunun bölgeye derhal giderek çalışmayı durdurması ve emniyet kemeri tedariğini sağlaması gerekmektedir.'
    },
    {
      id: 'isg-2',
      title: 'Baret Kullanım Eksikliği',
      level: 'medium',
      zone: 'Sektör-C (Temel)',
      description: 'Beton döküm alanına baretsiz giren demirci kalfası tespit edildi. AI Gözlem kamerası otomatik uyarı verdi.',
      time: '13:48',
      status: 'Açık',
      coordinates: { x: 72, y: 58 },
      actionRequired: 'İSG saha devriyesi tarafından personelin uyarılması ve baretsiz bölgeye girişinin engellenmesi.'
    },
    {
      id: 'isg-3',
      title: 'Yük Altında Geçiş İhlali',
      level: 'high',
      zone: 'Sektör-C (Kule Vinç)',
      description: 'Kule vinç yük taşıma salınım dairesi altına emniyet şeridi çekilmeden yaya geçişi yapıldığı saptandı.',
      time: '12:15',
      status: 'Açık',
      coordinates: { x: 55, y: 22 },
      actionRequired: 'Yük taşıma esnasında zemin işaretçisinin / sapancının bariyer kontrolünü sıkılaştırması.'
    },
    {
      id: 'isg-4',
      title: 'Sıcak Çalışma Alanı Kıvılcım Riski',
      level: 'medium',
      zone: 'Malzeme Deposu',
      description: 'Kaynak makinesi kıvılcımlarının yanıcı kimyasallara yakın mesafede olduğu termal kameralarla doğrulandı.',
      time: '11:04',
      status: 'Giderildi',
      coordinates: { x: 82, y: 25 },
      actionRequired: 'Kaynak perdesinin çekilmesi ve yangın tüpünün konumlandırılması tamamlandı.'
    }
  ]);
  const [selectedIsgAlertId, setSelectedIsgAlertId] = useState<string | null>('isg-1');
  const [isgFilter, setIsgFilter] = useState<'all' | 'high' | 'medium'>('all');

  // Recording Timer and Simulated AI Logs
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
        
        // Randomly generate dynamic AI detection events during recording
        const objects = ['Ekskavatör #1', 'Kule Vinç #3', 'Baret Maskeli Personel', 'Dış İskele Askı Unitesi', 'Kamyon #4'];
        const actions = ['tespit edildi', 'çalışma alanı güncellendi', 'bölge geçişi algılandı', 'aktif çalışma modunda'];
        const zones = ['Sektör-A', 'Sektör-B', 'Sektör-C', 'Şantiye Girişi', 'Hafriyat Alanı'];
        
        const randomObject = objects[Math.floor(Math.random() * objects.length)];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        const randomZone = zones[Math.floor(Math.random() * zones.length)];
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const logMsg = `[${timeStr}] AI NESNE DETEKTÖRÜ: ${randomObject} -> ${randomZone} bölgesinde ${randomAction} (Güven Oranı: %${(85 + Math.random() * 14).toFixed(1)}).`;
        
        setRecordingLogs(prev => [logMsg, ...prev].slice(0, 50));

        // Periodically update active working hours and zone transitions
        if (Math.random() > 0.6) {
          const cleanObjName = randomObject.split(' ')[0]; // e.g. "Ekskavatör" or "Baret"
          setRecordedWorkingHours(prev => ({
            ...prev,
            [cleanObjName]: Number(((prev[cleanObjName] || 0) + 0.1).toFixed(2))
          }));
          
          if (!recordedDetectedObjects.includes(cleanObjName)) {
            setRecordedDetectedObjects(prev => [...prev, cleanObjName]);
          }
        }

        if (Math.random() > 0.8) {
          const fromZone = zones[Math.floor(Math.random() * zones.length)];
          let toZone = zones[Math.floor(Math.random() * zones.length)];
          while (toZone === fromZone) {
            toZone = zones[Math.floor(Math.random() * zones.length)];
          }
          setRecordedZoneTransitions(prev => [
            { time: timeStr, object: randomObject, from: fromZone, to: toZone },
            ...prev
          ].slice(0, 10));
        }

      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordedDetectedObjects]);

  // Local state for interactive editing
  const [localProject, setLocalProject] = useState<Project>(project);
  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  // EVM & Budget modal states
  const [showEvmModal, setShowEvmModal] = useState(false);
  const [evmForm, setEvmForm] = useState({
    plannedSpent: project.plannedSpent || 120,
    spent: project.spent || 135,
    earnedValue: project.earnedValue || 128,
    budget: project.budget || 180,
    overallProgress: project.overallProgress || 70,
    status: project.status || 'Aktif'
  });

  // Keep evmForm synced with localProject when modal opens
  const openEvmModal = () => {
    setEvmForm({
      plannedSpent: localProject.plannedSpent,
      spent: localProject.spent,
      earnedValue: localProject.earnedValue,
      budget: localProject.budget,
      overallProgress: localProject.overallProgress,
      status: localProject.status
    });
    setShowEvmModal(true);
  };

  const handleEvmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...localProject,
      plannedSpent: Number(evmForm.plannedSpent),
      spent: Number(evmForm.spent),
      earnedValue: Number(evmForm.earnedValue),
      budget: Number(evmForm.budget),
      overallProgress: Number(evmForm.overallProgress),
      status: evmForm.status
    };
    setLocalProject(updated);
    if (onUpdateProject) {
      onUpdateProject(updated);
    }
    setShowEvmModal(false);
  };

  // Permits editing states
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);

  const handleEditPermitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermit) return;

    const updatedPermits = localProject.permits.map(p => 
      p.id === editingPermit.id ? editingPermit : p
    );

    const updated = {
      ...localProject,
      permits: updatedPermits
    };

    setLocalProject(updated);
    if (onUpdateProject) {
      onUpdateProject(updated);
    }
    setEditingPermit(null);
  };

  // WBS Tasks editing state for 4D view
  const [editingTask, setEditingTask] = useState<WBSTask | null>(null);

  const handleEditTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    if (onUpdateTask) {
      onUpdateTask(editingTask);
    }
    setEditingTask(null);
  };

  // 5D Cost center data state for the chart
  const [costCenters, setCostCenters] = useState([
    { id: '1', name: 'Kaba Yapı', butce: 700, harcanan: 600, limit: 700 },
    { id: '2', name: 'Cephe & Cam', butce: 400, harcanan: 220, limit: 400 },
    { id: '3', name: 'Mekanik & Elk', butce: 300, harcanan: 160, limit: 300 },
    { id: '4', name: 'Zemin Hafriyat', butce: 200, harcanan: 198, limit: 200 },
    { id: '5', name: 'Peyzaj & Çevre', butce: 150, harcanan: 20, limit: 150 },
    { id: '6', name: 'Müşavirlik', butce: 100, harcanan: 82, limit: 100 }
  ]);
  const [showCostCenterModal, setShowCostCenterModal] = useState(false);
  const [editingCostCenters, setEditingCostCenters] = useState([...costCenters]);

  const handleCostCenterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCostCenters(editingCostCenters);
    setShowCostCenterModal(false);
  };

  // New permit form state
  const [newPermit, setNewPermit] = useState({
    name: '',
    authority: '',
    expiryDate: '',
    geographicScope: ''
  });

  const handlePermitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permit: Permit = {
      id: `permit-${Date.now()}`,
      name: newPermit.name,
      authority: newPermit.authority,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: newPermit.expiryDate,
      status: 'Bekliyor',
      geographicScope: newPermit.geographicScope,
      documentUrl: 'yeni_basvuru_evrak.pdf'
    };
    onAddPermit(permit);
    setShowPermitModal(false);
  };

  const simulateCADLoading = () => {
    setLoadingCAD(true);
    setTimeout(() => {
      setLoadingCAD(false);
      alert(`${selectedCADFile} modeli başarıyla haritada konumlandırıldı ve katmanlar güncellendi.`);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-5 transition-all duration-300">
      {/* View Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">İnşaat Süreçleri (4D / 5D Saha Yönetimi)</h2>
          <p className="text-xs text-[var(--text-secondary)]">Saha İmalat Takibi, BIM/CAD Katman Entegrasyonları ve 5D Maliyet Bağlantıları</p>
        </div>
        <div className="flex gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)] flex-wrap">
          <button 
            onClick={() => setActiveTab('ceo_summary')}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition flex items-center gap-1.5 uppercase tracking-wide border ${activeTab === 'ceo_summary' ? 'bg-[#221711] border-[#e67e22] text-[#e67e22] shadow-[0_0_10px_rgba(230,126,34,0.15)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'}`}
            id="insaat-tab-ceo-summary"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#e67e22]" />
            CEO PORTFÖY ÖZETİ
          </button>
          <button 
            onClick={() => setActiveTab('ruhsat')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'ruhsat' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="insaat-tab-ruhsat"
          >
            <Shield className="w-3.5 h-3.5" />
            Ruhsat & İzin Takibi
          </button>
          <button 
            onClick={() => setActiveTab('4d')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === '4d' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="insaat-tab-4d"
          >
            <Calendar className="w-3.5 h-3.5" />
            4D Zaman Çizelgesi
          </button>
          <button 
            onClick={() => setActiveTab('5d')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === '5d' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="insaat-tab-5d"
          >
            <span>5D Maliyet Bindirme</span>
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'journal' ? 'bg-emerald-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'}`}
            id="insaat-tab-journal"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Şantiye Günlüğü</span>
          </button>
        </div>
      </div>

      {/* CEO PORTFÖY ÖZETİ Tab Content */}
      {activeTab === 'ceo_summary' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <span className="text-[9px] font-black tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase block w-max mb-1">CEO Portföy Özeti</span>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase flex items-center gap-1.5">
                <span>DİNAMİK KAZANILAN DEĞER (EVM) VE FİNANSAL SAPMALAR</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="EVM ve Bütçe Verilerini Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-[#e67e22]/10 text-[#e67e22] text-[8px] font-black rounded uppercase border border-[#e67e22]/20">CBS Senkron</span>
          </div>

          {/* EVM Scorecards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[9px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Proje Durumu</span>
              <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase">{localProject.status}</span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[9px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Zaman İndeksi (SPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.plannedSpent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.plannedSpent > 0 ? (localProject.earnedValue / localProject.plannedSpent) : 1.00).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[9px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Maliyet İndeksi (CPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.spent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.spent > 0 ? (localProject.earnedValue / localProject.spent) : 1.02).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[9px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Kazanılan Değer</span>
              <span className="text-xs font-black text-indigo-500">₺{localProject.earnedValue}M</span>
            </div>
          </div>

          {/* Visual Recharts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* İnşaat Bütçe & Hakediş Emilim Trendi */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>PORTFÖY İNŞAAT BÜTÇE EMİLİM SÜRECİ (Milyon ₺)</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="Verileri Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projects.length > 0 ? projects : [localProject]} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorInsaatBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInsaatSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                    <XAxis dataKey="code" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} fontStyle="bold" />
                    <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', 
                        fontSize: '11px', 
                        borderRadius: '8px',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="budget" name="Toplam Bütçe" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInsaatBudget)" />
                    <Area type="monotone" dataKey="spent" name="Harcanan Hakediş" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorInsaatSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* İnşaat EVM Performans Analizi */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>CBS SAHA EVM ANALİZİ (Milyon ₺)</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="Verileri Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projects.length > 0 ? projects : [localProject]} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorInsaatPV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInsaatEV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInsaatAC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                    <XAxis dataKey="code" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', 
                        fontSize: '11px', 
                        borderRadius: '8px',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="plannedSpent" name="Plandaki Harcama (PV)" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorInsaatPV)" />
                    <Area type="monotone" dataKey="earnedValue" name="Kazanılan Değer (EV)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInsaatEV)" />
                    <Area type="monotone" dataKey="spent" name="Gerçekleşen Harcama (AC)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorInsaatAC)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-[10px] text-[var(--text-secondary)] flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>EVM Doğrulaması: {localProject.name} CBS sahasında bütçesel sapmalar tolerans limitleri dâhilinde olup, projenin tamamlanma oranı kümülatif eğriyle %100 as-built uyumludur.</span>
          </div>
        </div>
      )}

      {/* Tab: Ruhsat & İzin Takibi */}
      {activeTab === 'ruhsat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Permits list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <span>Yapım Ruhsatları & Yasal İzin Defteri</span>
              </h3>
              <button 
                onClick={() => setShowPermitModal(true)}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-700 transition"
                id="permit-btn-add"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni İzin / Ruhsat Ekle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localProject.permits.map((p) => {
                const isExpired = p.status === 'Süresi Doldu';
                const isExpiringSoon = p.status === 'Süresi Doluyor';
                
                return (
                  <div 
                    key={p.id} 
                    className={`p-4 rounded-xl border bg-[var(--bg-secondary)] transition-all duration-300 flex flex-col justify-between group relative ${
                      isExpired 
                        ? 'border-red-600 bg-red-600/5 shadow-lg shadow-red-600/5' 
                        : isExpiringSoon 
                          ? 'border-amber-500 bg-amber-500/5 animate-pulse' 
                          : 'border-[var(--border)]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{p.name}</span>
                          <button 
                            onClick={() => setEditingPermit(p)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                            title="Ruhsat Düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          isExpired 
                            ? 'bg-red-600 text-white' 
                            : isExpiringSoon 
                              ? 'bg-amber-500 text-slate-900' 
                              : p.status === 'Alındı' 
                                ? 'bg-emerald-500/15 text-emerald-500' 
                                : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10px] text-[var(--text-secondary)] mt-2">
                        <div>Sorumlu Kurum: <strong className="text-[var(--text-primary)]">{p.authority}</strong></div>
                        <div>Coğrafi Kapsam: <span className="text-blue-400">{p.geographicScope}</span></div>
                        <div>Bitiş Tarihi: <strong className={`${isExpired || isExpiringSoon ? 'text-red-500' : 'text-[var(--text-primary)]'} font-mono`}>{p.expiryDate}</strong></div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-[var(--border)] flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 truncate max-w-[150px]">{p.documentUrl}</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => setEditingPermit(p)}
                          className="text-slate-400 hover:text-blue-500 text-[10px] font-semibold"
                        >
                          Düzenle
                        </button>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <button 
                          onClick={() => alert(`Ruhsat dosyası açılıyor: ${p.documentUrl}`)}
                          className="text-blue-500 hover:underline text-[10px] font-bold"
                        >
                          Dosyayı Görüntüle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BIM / CAD Entegrasyon widget */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
              <Layers className="w-5 h-5 text-blue-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-primary)]">BIM / CAD Konumlandırma</h3>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                2D CAD çizimlerini (DWG) ve 3D BIM modellerini (IFC) doğrudan şantiye parsel koordinatlarına bindirip, harita üstünde katman katman açabilirsiniz.
              </p>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Yüklü Model Dosyası</label>
                <select 
                  value={selectedCADFile}
                  onChange={(e) => setSelectedCADFile(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                >
                  <option value="atasehir_BIM_structure.ifc">atasehir_BIM_structure.ifc (BIM Model)</option>
                  <option value="atakoy_metro_yol_altapi.dwg">atakoy_metro_yol_altapi.dwg (CAD 2D)</option>
                  <option value="cankaya_kamu_parsel.shp">cankaya_kamu_parsel.shp (GIS Shapefile)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] text-[var(--text-secondary)]">
                <strong>Projeksiyon:</strong> EPSG:3857 (WGS 84 / Pseudo-Mercator) ile şantiye koordinat merkezine %100 as-built uyumluluk.
              </div>

              <button 
                onClick={simulateCADLoading}
                disabled={loadingCAD}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                id="insaat-btn-aligncad"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCAD ? 'animate-spin' : ''}`} />
                {loadingCAD ? 'CAD Konumlandırılıyor...' : 'Modeli Haritaya Hizala'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: 4D Zaman Çizelgesi */}
      {activeTab === '4d' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Schedule Compare */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5 uppercase">
              <span>Zamana Bağlı İmalat İlerleme Kıyaslama (4D)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Şantiye iş programındaki hedef imalat oranları ile sahada tamamlanan hakediş imalatlarının kıyaslaması</p>

            <div className="space-y-4">
              {tasks.map(task => {
                const isDelayed = task.progress < 70 && task.status === 'Devam';
                return (
                  <div key={task.id} className="p-3.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl group relative">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>{task.name}</span>
                        <button 
                          onClick={() => setEditingTask(task)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                          title="İlerleme Düzenle"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                        isDelayed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {isDelayed ? 'Kritik Gecikme' : 'Zamanında'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Target bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>Hedeflenen (İş Programı):</span>
                          <span>%100</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      {/* Actual completed bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-[var(--text-secondary)]">
                          <span>Gerçekleşen (Metraj / Hakediş):</span>
                          <span className="font-black text-emerald-500">%{task.progress}</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isDelayed ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4D Simulation notes */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-blue-500 mb-3">4D Simülasyon Kılavuzu</h3>
            <ul className="text-xs text-[var(--text-secondary)] space-y-3 list-disc pl-4 leading-relaxed">
              <li>
                Haritanın altındaki zaman sürgüsünü kaydırarak binaların kaba yapı seviyelerinin zamanla nasıl yükseldiğini görsel olarak izleyebilirsiniz.
              </li>
              <li>
                <strong>Kırmızı Renkli Bloklar</strong>, iş takvimine göre o gün bitmesi gereken imalatların gerisinde kalınmış kuleleri gösterir.
              </li>
              <li>
                <strong>Sarı Renkli Bloklar</strong> ise malzeme tedarik sıkıntısı veya kadastro tescili süresi bitimi nedeniyle risk grubundaki imalatları temsil eder.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab: 5D Maliyet Bindirme */}
      {activeTab === '5d' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart for Maliyet Merkezleri */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center justify-between uppercase">
              <span>Disiplinler Bazında Bütçe Tavanı ve Hakediş Analizi</span>
              <button 
                onClick={() => {
                  setEditingCostCenters([...costCenters]);
                  setShowCostCenterModal(true);
                }}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                title="Bütçe Dağılımını Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Maliyet merkezlerinin onaylanmış tavan bütçeleri ile taşeronlara ödenen hak ediş miktarları kıyaslaması (Milyon ₺)</p>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costCenters} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                  <XAxis type="number" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="butce" name="Toplam Atanan Bütçe (Milyon ₺)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="harcanan" name="Gerçekleşen Hakediş Ödemesi" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget Risk warnings */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-red-500 mb-3">5D Finansal Sapma Alarmları</h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                <div className="font-bold text-red-500 mb-1">Zemin Güçlendirme Limit Aşımı</div>
                <p className="text-[10px] text-[var(--text-secondary)]">Bütçe: ₺200M | Harcanan: ₺198M. Tahsis edilen limitin %99'u kullanılmıştır. İlave ankraj imalatları bütçeyi delecektir.</p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                <div className="font-bold text-amber-500 mb-1">Müşavirlik & Yönetim Hakedişi</div>
                <p className="text-[10px] text-[var(--text-secondary)]">Bütçe: ₺100M | Ödenen: ₺82M. Çeyrek raporu ve teknik onaylar tamamlandığında kalan %18 serbest bırakılacaktır.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVM Editor Modal */}
      {showEvmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-500" />
                EVM & BÜTÇE EDİTÖRÜ (SpU)
              </h3>
              <button onClick={() => setShowEvmModal(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded-md transition text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEvmSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Kümülatif Atanan Bütçe (Milyon ₺)</label>
                <input 
                  type="number" 
                  value={evmForm.budget} 
                  onChange={(e) => setEvmForm(p => ({ ...p, budget: Number(e.target.value) }))}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Planlanan Harcama (PV) (Milyon ₺)</label>
                <input 
                  type="number" 
                  value={evmForm.plannedSpent} 
                  onChange={(e) => setEvmForm(p => ({ ...p, plannedSpent: Number(e.target.value) }))}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Gerçekleşen Değer (EV) (Milyon ₺)</label>
                  <input 
                    type="number" 
                    value={evmForm.earnedValue} 
                    onChange={(e) => setEvmForm(p => ({ ...p, earnedValue: Number(e.target.value) }))}
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold font-bold">Gerçekleşen Harcama (AC) (Milyon ₺)</label>
                  <input 
                    type="number" 
                    value={evmForm.spent} 
                    onChange={(e) => setEvmForm(p => ({ ...p, spent: Number(e.target.value) }))}
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold font-bold font-bold font-bold">İlerleme Oranı (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={evmForm.overallProgress} 
                    onChange={(e) => setEvmForm(p => ({ ...p, overallProgress: Number(e.target.value) }))}
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Proje Durumu</label>
                  <select 
                    value={evmForm.status} 
                    onChange={(e) => setEvmForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                  >
                    <option value="Planlama">Planlama</option>
                    <option value="İnşaat">İnşaat</option>
                    <option value="İşletme">İşletme</option>
                    <option value="Askıda">Askıda</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button 
                  type="button" 
                  onClick={() => setShowEvmModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permit Editing Modal */}
      {editingPermit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-500" />
                Ruhsat & İzin Düzenleme (SpU)
              </h3>
              <button onClick={() => setEditingPermit(null)} className="p-1 hover:bg-[var(--bg-primary)] rounded-md transition text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditPermitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Ruhsat / İzin Başlığı</label>
                <input 
                  type="text" 
                  value={editingPermit.name} 
                  onChange={(e) => setEditingPermit(p => p ? ({ ...p, name: e.target.value }) : null)}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Sorumlu Onay Mercii (Kurum)</label>
                <input 
                  type="text" 
                  value={editingPermit.authority} 
                  onChange={(e) => setEditingPermit(p => p ? ({ ...p, authority: e.target.value }) : null)}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold font-bold font-bold">Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    value={editingPermit.expiryDate} 
                    onChange={(e) => setEditingPermit(p => p ? ({ ...p, expiryDate: e.target.value }) : null)}
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Ruhsat Durumu</label>
                  <select 
                    value={editingPermit.status} 
                    onChange={(e) => setEditingPermit(p => p ? ({ ...p, status: e.target.value as any }) : null)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Alındı">Alındı</option>
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Süresi Doluyor">Süresi Doluyor</option>
                    <option value="Süresi Doldu">Süresi Doldu</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Coğrafi Kapsam</label>
                <input 
                  type="text" 
                  value={editingPermit.geographicScope} 
                  onChange={(e) => setEditingPermit(p => p ? ({ ...p, geographicScope: e.target.value }) : null)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingPermit(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Şantiye Günlüğü Fotoğraf Galerisi */}
      {activeTab === 'journal' && (
        <div className="space-y-5 animate-fade-in">
          {/* Güvenlik Özeti (Safety/HSE Summary Box) */}
          <div className="bg-[var(--bg-secondary)] border border-red-500/10 rounded-2xl p-4 shadow-md bg-gradient-to-br from-[var(--bg-secondary)] to-red-950/5 relative overflow-hidden">
            {/* Top Header of Security Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border)] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 animate-pulse">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[var(--text-primary)] text-sm uppercase tracking-wide flex items-center gap-2">
                    🛡️ GÜVENLİK ÖZETİ & SAHA ANALİZİ
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">Yapay Zeka Destekli Kameralar ve Drone Devriyesinden Gelen Gerçek Zamanlı Uyarılar</p>
                </div>
              </div>
              
              {/* Count badges */}
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{isgAlerts.filter(a => a.level === 'high' && a.status === 'Açık').length} KRİTİK</span>
                </span>
                <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span>{isgAlerts.filter(a => a.level === 'medium' && a.status === 'Açık').length} UYARI</span>
                </span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span>{isgAlerts.filter(a => a.status === 'Giderildi').length} ÇÖZÜLDÜ</span>
                </span>
              </div>
            </div>

            {/* Grid of HSE Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {isgAlerts.map((alert) => {
                const isHigh = alert.level === 'high';
                const isGiderildi = alert.status === 'Giderildi';
                const isSelected = selectedIsgAlertId === alert.id;

                return (
                  <div
                    key={`summary-box-${alert.id}`}
                    onClick={() => setSelectedIsgAlertId(alert.id)}
                    className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-[105px] relative group ${
                      isGiderildi
                        ? 'bg-emerald-950/5 border-emerald-500/10 opacity-70 hover:opacity-100'
                        : isSelected
                          ? isHigh
                            ? 'bg-red-950/20 border-red-500/60 ring-2 ring-red-500/15'
                            : 'bg-yellow-950/20 border-yellow-500/60 ring-2 ring-yellow-500/15'
                          : isHigh
                            ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/15'
                            : 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/15'
                    }`}
                  >
                    <div>
                      {/* Level indicators */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          isGiderildi
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : isHigh
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {isGiderildi ? 'ÇÖZÜLDÜ' : isHigh ? '🔴 YÜKSEK' : '🟡 ORTA'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono font-bold">{alert.time}</span>
                      </div>
                      
                      <h5 className="font-extrabold text-[var(--text-primary)] text-xs truncate uppercase tracking-wide">
                        {alert.title}
                      </h5>
                      <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-normal font-medium">
                        {alert.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[8.5px] mt-2 border-t border-[var(--border)]/30 pt-1.5 text-slate-400 font-mono">
                      <span className="truncate max-w-[110px]">📍 {alert.zone}</span>
                      <span className="text-[9px] text-blue-400 font-bold group-hover:underline">Detay ➔</span>
                    </div>

                    {/* Accent Color Side Strip */}
                    {!isGiderildi && (
                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                        isHigh ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top filter and actions bar */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Fotoğraf, detay veya etiketlerde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 font-bold"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500 text-xs"
                >
                  Temizle
                </button>
              )}
            </div>

            {/* Quick Metadata Selectors */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Weather Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">☁️ HAVA:</span>
                <select
                  value={selectedWeather}
                  onChange={(e) => setSelectedWeather(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Tümü">Tümü</option>
                  <option value="Güneşli">Güneşli</option>
                  <option value="Bulutlu">Bulutlu</option>
                  <option value="Parçalı Bulutlu">Parçalı Bulutlu</option>
                  <option value="Rüzgarlı">Rüzgarlı</option>
                  <option value="Yağmurlu">Yağmurlu</option>
                  <option value="Açık / Sıcak">Açık / Sıcak</option>
                </select>
              </div>

              {/* Working Group Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">👷 GRUP:</span>
                <select
                  value={selectedWorkingGroup}
                  onChange={(e) => setSelectedWorkingGroup(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Tümü">Tümü</option>
                  <option value="İnşaat">İnşaat</option>
                  <option value="Elektrik">Elektrik</option>
                  <option value="Tesisat">Tesisat</option>
                </select>
              </div>

              {/* AI Object Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">🤖 AI NESNE:</span>
                <select
                  value={selectedAIObjectFilter}
                  onChange={(e) => setSelectedAIObjectFilter(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Tümü">Tümü</option>
                  <option value="Ekskavatör">Ekskavatör</option>
                  <option value="Kule Vinç">Kule Vinç</option>
                  <option value="Baret">Baret</option>
                  <option value="İskele">İskele</option>
                </select>
              </div>
            </div>

            {/* Actions: Add Photo & Video */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setShowVideoRecorder(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/25"
                title="Saha kamerasından veya sanal model gezintisinden video kaydet"
              >
                <Video className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>AI VİDEO KAYIT STÜDYOSU</span>
              </button>
              
              <button
                onClick={() => setShowAddJournalModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
              >
                <Camera className="w-4 h-4" />
                <span>FOTOĞRAF EKLE</span>
              </button>
            </div>
          </div>

          {/* AI Analiz Arayüzü (AI Object Detection Dashboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-950/40 border border-[var(--border)] rounded-2xl p-4 shadow-inner animate-fade-in text-xs">
            
            {/* Sol Taraf: Tanınan Nesneler & Kümülatif Çalışma Saatleri */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-500 animate-spin-slow" />
                  Yapay Zeka Destekli İş Makinesi Çalışma Saatleri (Eşzamanlı)
                </span>
                <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded animate-pulse uppercase">
                  OTOMATİK TELEMETRİ
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Ekskavatör', icon: '🚜', hour: 4.5, status: 'Aktif', badgeColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                  { name: 'Kule Vinç', icon: '🏗️', hour: 6.2, status: 'Aktif', badgeColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                  { name: 'Baret (İSG Kontrol)', icon: '🪖', hour: 7.8, status: 'Sürekli', badgeColor: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
                ].map((eq) => {
                  // Recalculate working hours dynamically using the active journal list values!
                  const totalHourInDataset = journalPhotos
                    .filter(photo => selectedCategory === 'Tümü' || photo.category === selectedCategory)
                    .reduce((sum, photo) => {
                      if (photo.workingHours) {
                        const baseName = eq.name.split(' ')[0];
                        // Find matching key
                        const key = Object.keys(photo.workingHours).find(k => k.includes(baseName));
                        if (key) {
                          return sum + (photo.workingHours[key] || 0);
                        }
                      }
                      return sum;
                    }, 0);

                  const displayHour = totalHourInDataset > 0 ? totalHourInDataset.toFixed(1) : eq.hour.toFixed(1);

                  return (
                    <div key={eq.name} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 flex flex-col justify-between hover:border-blue-500/30 transition shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[16px]">{eq.icon}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${eq.badgeColor}`}>
                          {eq.status}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <span className="text-[10px] text-[var(--text-secondary)] font-extrabold block uppercase">{eq.name}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-[var(--text-primary)] font-mono">{displayHour}</span>
                          <span className="text-[9px] text-slate-500 font-bold">Saat</span>
                        </div>
                      </div>
                      <div className="w-full bg-[var(--border)] h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (Number(displayHour) / 10) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sağ Taraf: Bölge Geçişleri (Zone Transitions Logs) */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5">
                <span className="font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Saha Bölge Geçiş Logu
                </span>
                <span className="text-[9px] text-indigo-400 font-mono font-bold animate-pulse">CANLI</span>
              </div>
              
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto scrollbar-thin pr-1 text-[10px]">
                {(() => {
                  // Gather transitions dynamically from dataset
                  const transitions = journalPhotos
                    .filter(photo => selectedCategory === 'Tümü' || photo.category === selectedCategory)
                    .flatMap(photo => photo.zoneTransitions || []);
                  
                  if (transitions.length === 0) {
                    return <div className="text-slate-500 text-center py-4">Kayıtlı bölge geçişi algılanmadı.</div>;
                  }

                  return transitions.slice(0, 4).map((tr, index) => (
                    <div key={index} className="flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-1.5 hover:bg-slate-900/40 transition">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-500 font-mono font-bold shrink-0">{tr.time}</span>
                        <span className="text-[var(--text-primary)] font-bold truncate max-w-[80px]">{tr.object.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-[var(--border)]">{tr.from}</span>
                        <span className="text-slate-500">→</span>
                        <span className="bg-blue-950 px-1.5 py-0.5 rounded text-blue-400 border border-blue-900/30 font-bold">{tr.to}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* İSG (HSE) RISK MONITORING & MAP PLATFORM */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 bg-slate-950/20 border border-[var(--border)] rounded-2xl p-4 shadow-sm animate-fade-in text-xs">
            
            {/* Left/Middle Column (2/3): Interactive ISG Risk Map Blueprint */}
            <div className="xl:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500 animate-pulse" />
                  <div className="text-left">
                    <h4 className="font-extrabold text-[var(--text-primary)] uppercase tracking-wider text-xs">
                      İSG Canlı Risk Konum Haritası
                    </h4>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium">Şantiye yerleşim planı üzerinde yapay zeka tarafından konumlandırılan anlık risk bölgeleri</p>
                  </div>
                </div>

                {/* Filter & Status controls */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">FİLTRE:</span>
                  <div className="flex bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border)] font-bold text-[9px]">
                    {(['all', 'high', 'medium'] as const).map((filterOpt) => (
                      <button
                        key={filterOpt}
                        onClick={() => setIsgFilter(filterOpt)}
                        className={`px-2 py-1 rounded transition-all cursor-pointer ${
                          isgFilter === filterOpt
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-sm font-black'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {filterOpt === 'all' && 'Hepsi'}
                        {filterOpt === 'high' && '🔴 Yüksek'}
                        {filterOpt === 'medium' && '🟡 Orta'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Blueprint Simulation Map Area */}
              <div className="relative aspect-[16/9] w-full rounded-xl bg-[#0d0e14] border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between p-4 group select-none">
                
                {/* Simulated Blueprint Grid Line system */}
                <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                  backgroundSize: '16px 16px, 48px 48px, 48px 48px'
                }} />

                {/* Grid Zone Borders / Construction Site layout schematics */}
                <div className="absolute inset-0 pointer-events-none border border-dashed border-blue-500/20 m-6 rounded flex items-center justify-between">
                  <div className="h-full border-r border-dashed border-blue-500/10 w-1/3 flex items-center justify-center">
                    <span className="text-[10px] text-slate-600 font-mono font-black tracking-widest rotate-90 uppercase">Sektör-A (Kuzey İskele)</span>
                  </div>
                  <div className="h-full border-r border-dashed border-blue-500/10 w-1/3 flex items-center justify-center">
                    <span className="text-[10px] text-slate-600 font-mono font-black tracking-widest rotate-90 uppercase">Sektör-C (Ana Temel)</span>
                  </div>
                  <div className="h-full w-1/3 flex items-center justify-center">
                    <span className="text-[10px] text-slate-600 font-mono font-black tracking-widest rotate-90 uppercase">Depolama & Hafriyat</span>
                  </div>
                </div>

                {/* Blueprint Overlay Header Info */}
                <div className="relative z-10 flex justify-between pointer-events-none">
                  <span className="text-[9px] font-mono text-slate-500 font-black tracking-wider uppercase bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded border border-white/5">
                    🏗️ PLAN REFERANS: ODA-SL-2026_V4
                  </span>
                  <span className="text-[9px] font-mono text-blue-400 font-black tracking-wider uppercase bg-blue-950/60 backdrop-blur px-2 py-0.5 rounded border border-blue-900/30 animate-pulse">
                    🛰️ CANLI TELEMETRİ OKUMA
                  </span>
                </div>

                {/* Interactive Dynamic Pins overlay */}
                <div className="absolute inset-0">
                  {isgAlerts
                    .filter(alert => {
                      if (isgFilter === 'all') return true;
                      return alert.level === isgFilter;
                    })
                    .map((alert) => {
                      const isSelected = selectedIsgAlertId === alert.id;
                      const isHigh = alert.level === 'high';
                      const isGiderildi = alert.status === 'Giderildi';

                      return (
                        <button
                          key={alert.id}
                          onClick={() => setSelectedIsgAlertId(alert.id)}
                          style={{ left: `${alert.coordinates.x}%`, top: `${alert.coordinates.y}%` }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer z-20 focus:outline-none"
                        >
                          {/* Pulsing indicator ring */}
                          {!isGiderildi && (
                            <span className={`absolute inline-flex h-8 w-8 rounded-full opacity-75 animate-ping -left-2.5 -top-2.5 ${
                              isHigh ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                          )}

                          {/* Outer Circle Ring */}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                            isGiderildi
                              ? 'bg-emerald-600 border border-emerald-400 text-white scale-90 opacity-60'
                              : isSelected
                                ? 'bg-white border-2 scale-125 border-slate-900 ring-4 ' + (isHigh ? 'ring-red-500 text-red-600' : 'ring-yellow-500 text-yellow-600')
                                : (isHigh ? 'bg-red-600 border border-red-400 text-white hover:bg-red-500' : 'bg-yellow-500 border border-yellow-300 text-slate-950 hover:bg-yellow-400')
                          }`}>
                            <span className="text-[9px] font-black font-mono">
                              {isGiderildi ? '✓' : alert.level === 'high' ? '!' : '?'}
                            </span>
                          </div>

                          {/* Float mini tooltip box on hover */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 bg-slate-950/95 text-white text-[9px] font-extrabold px-2 py-1 rounded border border-white/15 shadow-2xl opacity-0 group-hover/pin:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                            {alert.title} <span className="text-slate-400">({alert.zone})</span>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Map Grid Legend scale overlay */}
                <div className="relative z-10 flex justify-between items-end mt-auto pointer-events-none">
                  <div className="bg-slate-900/80 backdrop-blur border border-white/5 rounded px-2 py-1 text-[8px] font-mono text-slate-500 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>Yüksek Risk</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      <span>Orta Risk</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Çözüldü</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-slate-600">Ölçek: 1:250 | Grid: UTM 35N</span>
                </div>
              </div>

              {/* Selected Alert Detailed Mitigation Plan Panel */}
              {(() => {
                const activeAlert = isgAlerts.find(a => a.id === selectedIsgAlertId);
                if (!activeAlert) {
                  return <div className="text-center py-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-slate-500">Detaylarını görmek istediğiniz İSG risk pinine veya uyarı kartına tıklayınız.</div>;
                }

                const isHigh = activeAlert.level === 'high';
                const isGiderildi = activeAlert.status === 'Giderildi';

                return (
                  <div className={`p-3 rounded-xl border transition-all duration-300 animate-fade-in ${
                    isGiderildi
                      ? 'bg-emerald-950/10 border-emerald-500/20'
                      : isHigh
                        ? 'bg-red-950/10 border-red-500/20'
                        : 'bg-yellow-950/10 border-yellow-500/20'
                  }`}>
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                          isGiderildi
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : isHigh
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {isGiderildi ? 'ÇÖZÜLDÜ' : isHigh ? 'KRİTİK ALARM' : 'ORTA RİSK UYARI'}
                        </span>
                        <h5 className="font-extrabold text-[var(--text-primary)] text-xs uppercase">{activeAlert.title}</h5>
                      </div>
                      <span className="text-slate-500 font-mono text-[9px] font-bold">Zaman: {activeAlert.time} | Bölge: {activeAlert.zone}</span>
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
                      {activeAlert.description}
                    </p>

                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2.5 flex items-start gap-2 text-[10px]">
                      <span className="text-blue-500 font-bold shrink-0">🛡️ GİDERME TALİMATI:</span>
                      <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                        {activeAlert.actionRequired}
                      </p>
                    </div>

                    {/* HSE Mitigation Actions Toolbar */}
                    <div className="flex justify-end gap-2 mt-3 pt-2.5 border-t border-[var(--border)]">
                      <button
                        onClick={() => {
                          alert(`${activeAlert.zone} bölgesindeki saha sorumlularına "${activeAlert.title}" uyarısı ve giderme talimatı SMS/Mobil bildirim olarak gönderildi!`);
                        }}
                        className="px-3 py-1.5 bg-slate-900 border border-[var(--border)] text-[var(--text-primary)] hover:border-blue-500/40 hover:text-blue-400 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                        disabled={isGiderildi}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Saha Şefini Uyar</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsgAlerts(prev => prev.map(a => a.id === activeAlert.id ? { ...a, status: a.status === 'Açık' ? 'Giderildi' : 'Açık' } : a));
                        }}
                        className={`px-3 py-1.5 text-white font-extrabold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                          isGiderildi
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-950/25'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isGiderildi ? 'Yeniden Aç' : 'Giderildi Olarak İşaretle'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column (1/3): HSE Alarm Summary Cards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-amber-500 animate-pulse" />
                  İSG Son Uyarı Özetleri
                </span>
                <span className="text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse uppercase">
                  {isgAlerts.filter(a => a.status === 'Açık').length} AKTİF
                </span>
              </div>

              {/* HSE Cards scroll feed */}
              <div className="space-y-2 max-h-[350px] xl:max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                {isgAlerts.map((alert) => {
                  const isHigh = alert.level === 'high';
                  const isGiderildi = alert.status === 'Giderildi';
                  const isSelected = selectedIsgAlertId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedIsgAlertId(alert.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all duration-300 flex flex-col gap-2 relative overflow-hidden group ${
                        isGiderildi
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-100'
                          : isSelected
                            ? isHigh
                              ? 'bg-red-950/20 border-red-500/60 ring-2 ring-red-500/20'
                              : 'bg-yellow-950/20 border-yellow-500/60 ring-2 ring-yellow-500/20'
                            : isHigh
                              ? 'bg-[var(--bg-primary)] border-red-500/10 hover:border-red-500/30'
                              : 'bg-[var(--bg-primary)] border-yellow-500/10 hover:border-yellow-500/30'
                      }`}
                    >
                      {/* Alert Card Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isGiderildi
                              ? 'bg-emerald-500'
                              : isHigh
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-yellow-500 animate-pulse'
                          }`} />
                          <span className="font-extrabold text-[var(--text-primary)] uppercase truncate tracking-wide text-[11px]">
                            {alert.title}
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono shrink-0 font-bold">
                          {alert.time}
                        </span>
                      </div>

                      {/* Card Content Snippet */}
                      <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {alert.description}
                      </p>

                      {/* Card Footer tags */}
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[var(--border)]/50 text-[9px]">
                        <span className="text-slate-400 font-mono truncate max-w-[120px]">
                          📍 {alert.zone}
                        </span>
                        
                        <span className={`font-black uppercase text-[8px] px-1.5 py-0.5 rounded border ${
                          isGiderildi
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : isHigh
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      
                      {/* Accent border bar highlighting the card */}
                      {!isGiderildi && (
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                          isHigh ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* HSE Dynamic quick notice tip */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[10px] space-y-1">
                <span className="font-extrabold text-blue-400 uppercase tracking-wider block">💡 Yapay Zeka Devriyesi Bilgisi</span>
                <p className="text-slate-400 leading-relaxed font-medium">
                  Kameralar her 30 saniyede bir iskele emniyet ağlarını, şantiye baret kullanımını ve yük salınım emniyet alanlarını yapay sinir ağları ile kontrol etmektedir.
                </p>
              </div>

            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {['Tümü', 'Kazı & Temel', 'Betonarme', 'Mekanik & Elektrik', 'Dış Cephe', 'Çelik Yapı', 'Peyzaj & Çevre'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-sm'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Photo Gallery Grid */}
          {(() => {
            const filteredPhotos = journalPhotos.filter(photo => {
              const matchesCategory = selectedCategory === 'Tümü' || photo.category === selectedCategory;
              const matchesWeather = selectedWeather === 'Tümü' || photo.weather === selectedWeather;
              const matchesWorkingGroup = selectedWorkingGroup === 'Tümü' || photo.workingGroup === selectedWorkingGroup;
              const matchesAIObject = selectedAIObjectFilter === 'Tümü' || (photo.aiDetectedObjects && photo.aiDetectedObjects.includes(selectedAIObjectFilter));
              
              const query = searchQuery.toLowerCase();
              const matchesSearch = !query || 
                                    photo.title.toLowerCase().includes(query) || 
                                    photo.description.toLowerCase().includes(query) ||
                                    photo.takenBy.toLowerCase().includes(query) ||
                                    photo.weather.toLowerCase().includes(query) ||
                                    photo.workingGroup.toLowerCase().includes(query);
              return matchesCategory && matchesWeather && matchesWorkingGroup && matchesAIObject && matchesSearch;
            });

            if (filteredPhotos.length === 0) {
              return (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-12 text-center">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto mb-3 stroke-[1.5]" />
                  <p className="text-xs text-[var(--text-secondary)] font-bold">Arama kriterlerine uygun şantiye kayıtları bulunamadı.</p>
                  <button 
                    onClick={() => { setSelectedCategory('Tümü'); setSelectedWeather('Tümü'); setSelectedWorkingGroup('Tümü'); setSelectedAIObjectFilter('Tümü'); setSearchQuery(''); }}
                    className="mt-3 text-xs text-emerald-500 hover:underline font-bold"
                  >
                    Filtreleri Sıfırla
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredPhotos.map((photo) => {
                  // Find index in main array for correct fullscreen navigation
                  const originalIndex = journalPhotos.findIndex(p => p.id === photo.id);
                  const isVideo = photo.type === 'video';
                  return (
                    <div 
                      key={photo.id}
                      className={`bg-[var(--bg-secondary)] border rounded-2xl overflow-hidden shadow-sm flex flex-col group transition-all duration-300 hover:border-emerald-500/30 animate-fade-in ${
                        isVideo ? 'border-blue-500/30 shadow-md shadow-blue-950/5' : 'border-[var(--border)]'
                      }`}
                    >
                      {/* Image block with hover overlay */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-950 cursor-pointer" onClick={() => setFullscreenPhotoIndex(originalIndex)}>
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105 opacity-80"
                        />
                        
                        {/* Play Video Overlay icon for videos */}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                            <div className="w-12 h-12 rounded-full bg-blue-600/90 flex items-center justify-center text-white border border-blue-400/40 shadow-lg group-hover:scale-110 transition duration-300">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                            <span className="absolute bottom-3 right-3 bg-red-600 text-white font-extrabold text-[8px] tracking-widest px-1.5 py-0.5 rounded animate-pulse">
                              AI CANLI ANALİZ
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4 z-10">
                          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
                            isVideo 
                              ? 'text-blue-300 bg-blue-900/40 border-blue-500/20' 
                              : 'text-emerald-300 bg-emerald-900/40 border-emerald-500/20'
                          }`}>
                            {isVideo ? 'Videoyu Oynat & AI Verisini İncele' : 'Büyüt ve İncele'}
                          </span>
                        </div>

                        {/* Top Date & Category Tags */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md border border-white/10 shadow-md">
                            📅 {photo.date}
                          </span>
                          <span className={`text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow-sm uppercase ${
                            isVideo ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {photo.category}
                          </span>
                        </div>

                        {/* Delete action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Bu günlük kaydını silmek istediğinize emin misiniz?')) {
                              setJournalPhotos(p => p.filter(item => item.id !== photo.id));
                            }
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition cursor-pointer opacity-0 group-hover:opacity-100 shadow-md border border-red-500/20 z-20"
                          title="Kaydı Sil"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Details Area */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h4 className={`text-xs font-black text-[var(--text-primary)] uppercase tracking-wide transition ${
                            isVideo ? 'group-hover:text-blue-400' : 'group-hover:text-emerald-400'
                          }`}>
                            {photo.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 line-clamp-3">
                            {photo.description}
                          </p>

                          {/* Metadata Tags */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <span>☁️</span>
                              <span>{photo.weather}</span>
                            </span>
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                              <span>👷</span>
                              <span>{photo.workingGroup}</span>
                            </span>

                            {/* AI Detected Objects labels */}
                            {isVideo && photo.aiDetectedObjects && (
                              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <span>🤖 AI:</span>
                                <span className="font-mono font-bold text-[8px] uppercase">{photo.aiDetectedObjects.join(', ')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center text-[9px] font-mono text-slate-500">
                          <span className="truncate max-w-[130px]" title={`Çeken: ${photo.takenBy}`}>
                            👤 {photo.takenBy.split(' ')[0]}
                          </span>
                          <span className="truncate max-w-[130px] text-right" title={`GPS: ${photo.gpsCoordinates}`}>
                            📍 {photo.gpsCoordinates}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Task progress edit modal (4D timeline) */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-500" />
                İş Kalemi İlerleme Düzenleme
              </h3>
              <button onClick={() => setEditingTask(null)} className="p-1 hover:bg-[var(--bg-primary)] rounded-md transition text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditTaskSubmit} className="space-y-4 text-xs">
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] p-3 rounded-lg text-[11px] text-[var(--text-secondary)]">
                <div>WBS Kodu: <strong className="text-[var(--text-primary)]">{editingTask.wbsCode}</strong></div>
                <div className="mt-1">İş Kalemi Adı: <strong className="text-[var(--text-primary)]">{editingTask.name}</strong></div>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Tamamlanma Oranı (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={editingTask.progress} 
                  onChange={(e) => setEditingTask(p => p ? ({ ...p, progress: Number(e.target.value) }) : null)}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Sorumlu Müteahhit / Taşeron</label>
                <input 
                  type="text" 
                  value={editingTask.contractor} 
                  onChange={(e) => setEditingTask(p => p ? ({ ...p, contractor: e.target.value }) : null)}
                  required
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Kalem Durumu</label>
                <select 
                  value={editingTask.status} 
                  onChange={(e) => setEditingTask(p => p ? ({ ...p, status: e.target.value as any }) : null)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none font-bold"
                >
                  <option value="Başlamadı">Başlamadı</option>
                  <option value="Devam">Devam ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="Gecikmeli">Gecikmeli</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button 
                  type="button" 
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Center 5D Editor Modal */}
      {showCostCenterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-500" />
                5D BÜTÇE ve HAKEDİŞ DAĞILIMI DÜZENLEME (SpU)
              </h3>
              <button onClick={() => setShowCostCenterModal(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded-md transition text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCostCenterSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                {editingCostCenters.map((cc, index) => (
                  <div key={cc.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl space-y-2">
                    <span className="font-extrabold text-[var(--text-primary)] block text-[11px]">{cc.name}</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-[var(--text-secondary)] mb-0.5">Tahsis Edilen Bütçe (Milyon ₺)</label>
                        <input 
                          type="number" 
                          value={cc.butce} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditingCostCenters(prev => prev.map((item, idx) => idx === index ? { ...item, butce: val, limit: val } : item));
                          }}
                          required
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md p-1.5 text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--text-secondary)] mb-0.5 font-bold font-bold font-bold">Harcanan / Ödenen (Milyon ₺)</label>
                        <input 
                          type="number" 
                          value={cc.harcanan} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditingCostCenters(prev => prev.map((item, idx) => idx === index ? { ...item, harcanan: val } : item));
                          }}
                          required
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md p-1.5 text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button 
                  type="button" 
                  onClick={() => setShowCostCenterModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permit Creation Modal */}
      {showPermitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Yeni Yasal İzin / Ruhsat Kaydı Girişi</h3>
            <form onSubmit={handlePermitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Ruhsat / İzin Başlığı</label>
                <input 
                  type="text" 
                  value={newPermit.name} 
                  onChange={(e) => setNewPermit(p => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="İtfaiye Uygunluk Belgesi"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Sorumlu Onay Mercii (Kurum)</label>
                <input 
                  type="text" 
                  value={newPermit.authority} 
                  onChange={(e) => setNewPermit(p => ({ ...p, authority: e.target.value }))}
                  required
                  placeholder="Büyükşehir Belediyesi İtfaiye Daire Bşk."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Bitiş / Expiry Tarihi</label>
                  <input 
                    type="date" 
                    value={newPermit.expiryDate} 
                    onChange={(e) => setNewPermit(p => ({ ...p, expiryDate: e.target.value }))}
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Coğrafi Kapsam</label>
                  <input 
                    type="text" 
                    value={newPermit.geographicScope} 
                    onChange={(e) => setNewPermit(p => ({ ...p, geographicScope: e.target.value }))}
                    placeholder="Blok-A ve Blok-B Tesisleri"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowPermitModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Geri Dön
                </button>
                <button 
                  type="submit" 
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                >
                  Sisteme Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şantiye Günlüğü - Yeni Fotoğraf Ekleme Modalı */}
      {showAddJournalModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddJournalModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition text-slate-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wide flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              Yeni Şantiye Günlük Kaydı
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newJournalForm.title || !newJournalForm.imageUrl) {
                  alert('Lütfen başlık ve geçerli bir fotoğraf URL adresi girin.');
                  return;
                }
                const newRecord = {
                  id: `jp-${Date.now()}`,
                  ...newJournalForm
                };
                setJournalPhotos(prev => [newRecord, ...prev]);
                setShowAddJournalModal(false);
                setNewJournalForm({
                  title: '',
                  category: 'Kazı & Temel',
                  description: '',
                  date: '2026-08-29',
                  imageUrl: '',
                  takenBy: 'Hasan Yılmaz (Saha Mühendisi)',
                  gpsCoordinates: '41.0084° N, 28.9782° E',
                  weather: 'Güneşli',
                  workingGroup: 'İnşaat'
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Fotoğraf Başlığı</label>
                <input
                  type="text"
                  required
                  value={newJournalForm.title}
                  onChange={(e) => setNewJournalForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Örn: Blok-A Çatı İzolasyon Çalışmaları"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Kategori / Disiplin</label>
                  <select
                    value={newJournalForm.category}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none"
                  >
                    {['Kazı & Temel', 'Betonarme', 'Mekanik & Elektrik', 'Dış Cephe', 'Çelik Yapı', 'Peyzaj & Çevre'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Çekim Tarihi</label>
                  <input
                    type="date"
                    required
                    value={newJournalForm.date}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Görsel URL Adresi</label>
                <input
                  type="text"
                  required
                  value={newJournalForm.imageUrl}
                  onChange={(e) => setNewJournalForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 font-mono text-[10px]"
                />
                <p className="text-[9px] text-slate-500 mt-1">İpucu: Test için Unsplash veya herhangi bir görsel linki kullanabilirsiniz.</p>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Detaylı Açıklama</label>
                <textarea
                  value={newJournalForm.description}
                  onChange={(e) => setNewJournalForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Yapılan imalat detaylarını, ilerleme durumunu ve notları yazın..."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Hava Durumu</label>
                  <select
                    value={newJournalForm.weather}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, weather: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none font-bold"
                  >
                    {['Güneşli', 'Bulutlu', 'Parçalı Bulutlu', 'Rüzgarlı', 'Yağmurlu', 'Açık / Sıcak'].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Çalışma Grubu</label>
                  <select
                    value={newJournalForm.workingGroup}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, workingGroup: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none font-bold"
                  >
                    {['İnşaat', 'Elektrik', 'Tesisat'].map(wg => (
                      <option key={wg} value={wg}>{wg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">Fotoğrafı Çeken</label>
                  <input
                    type="text"
                    required
                    value={newJournalForm.takenBy}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, takenBy: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-bold">GPS Koordinatları</label>
                  <input
                    type="text"
                    required
                    value={newJournalForm.gpsCoordinates}
                    onChange={(e) => setNewJournalForm(prev => ({ ...prev, gpsCoordinates: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition"
                >
                  Kayıt Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şantiye Günlüğü - Tam Ekran Görsel İnceleme & Slideshow Modalı */}
      {fullscreenPhotoIndex !== null && journalPhotos[fullscreenPhotoIndex] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col md:flex-row items-stretch justify-between animate-fade-in text-white select-none">
          
          {/* Main Visual Carousel Stage */}
          <div className="flex-1 flex items-center justify-between p-4 relative bg-black">
            {/* Upper Action Close Block */}
            <button
              onClick={() => setFullscreenPhotoIndex(null)}
              className="absolute top-6 right-6 p-2 bg-slate-900/60 hover:bg-red-600 border border-white/10 rounded-full text-white transition cursor-pointer z-50 flex items-center justify-center shadow-lg hover:shadow-red-600/20"
              title="Kapat"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Left Nav Arrow */}
            <button
              onClick={() => {
                setFullscreenPhotoIndex(prev => {
                  if (prev === null) return null;
                  return prev === 0 ? journalPhotos.length - 1 : prev - 1;
                });
              }}
              className="p-3 bg-slate-900/60 hover:bg-slate-800 border border-white/10 rounded-full text-white transition cursor-pointer z-40 flex items-center justify-center font-bold text-lg"
              title="Önceki Kayıt"
            >
              ◀
            </button>

            {/* Actual Fullscreen Image or Video with AI overlays */}
            <div className="flex-1 max-h-[85vh] flex items-center justify-center px-4 relative">
              {journalPhotos[fullscreenPhotoIndex].type === 'video' ? (
                <div className="relative rounded-lg overflow-hidden shadow-2xl border border-blue-500/20 max-w-full max-h-[80vh]">
                  <video
                    src={journalPhotos[fullscreenPhotoIndex].videoUrl}
                    autoPlay
                    loop
                    muted
                    controls
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                  
                  {/* Real-time AI Bounding Boxes simulator overlays */}
                  <div className="absolute top-[22%] left-[28%] w-[22%] h-[22%] border-2 border-emerald-500 rounded bg-emerald-500/10 z-10 pointer-events-none animate-pulse">
                    <span className="absolute -top-5 left-0 bg-emerald-600 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      🚜 EKSKAVATÖR #1 (%96.2)
                    </span>
                  </div>

                  <div className="absolute top-[12%] right-[18%] w-[18%] h-[32%] border-2 border-yellow-500 rounded bg-yellow-500/10 z-10 pointer-events-none">
                    <span className="absolute -top-5 left-0 bg-yellow-600 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      🏗️ KULE VİNÇ #3 (%94.1)
                    </span>
                  </div>

                  <div className="absolute bottom-[35%] left-[12%] w-[10%] h-[10%] border-2 border-blue-500 rounded bg-blue-500/10 z-10 pointer-events-none animate-pulse">
                    <span className="absolute -top-5 left-0 bg-blue-600 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      🪖 BARET OK (%99.4)
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg z-20 pointer-events-none text-[9px] font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-red-400 font-bold">AI VIDEO FEED PROCESSING</span>
                  </div>
                </div>
              ) : (
                <img
                  src={journalPhotos[fullscreenPhotoIndex].imageUrl}
                  alt={journalPhotos[fullscreenPhotoIndex].title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/5"
                />
              )}
            </div>

            {/* Right Nav Arrow */}
            <button
              onClick={() => {
                setFullscreenPhotoIndex(prev => {
                  if (prev === null) return null;
                  return prev === journalPhotos.length - 1 ? 0 : prev + 1;
                });
              }}
              className="p-3 bg-slate-900/60 hover:bg-slate-800 border border-white/10 rounded-full text-white transition cursor-pointer z-40 flex items-center justify-center font-bold text-lg"
              title="Sonraki Kayıt"
            >
              ▶
            </button>

            {/* Slideshow index indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900/60 border border-white/10 rounded-full text-[11px] font-mono tracking-widest text-slate-300">
              {fullscreenPhotoIndex + 1} / {journalPhotos.length}
            </div>
          </div>

          {/* Side Information Panel */}
          <div className="w-full md:w-[350px] bg-slate-900 border-t md:border-t-0 md:border-l border-white/10 p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-4 max-h-[90vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {journalPhotos[fullscreenPhotoIndex].category}
                </span>
                <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {journalPhotos[fullscreenPhotoIndex].workingGroup}
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">
                  📅 {journalPhotos[fullscreenPhotoIndex].date}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                  {journalPhotos[fullscreenPhotoIndex].title}
                </h3>
                <div className="w-10 h-1 bg-emerald-500 rounded mt-2" />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SAHA RAPORU</span>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                  {journalPhotos[fullscreenPhotoIndex].description}
                </p>
              </div>

              {/* Dynamic AI Telemetry in slideshow sidebar for video type entries */}
              {journalPhotos[fullscreenPhotoIndex].type === 'video' && (
                <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-[10px]">
                  <div>
                    <span className="text-blue-400 font-extrabold uppercase tracking-wider text-[9px] block mb-1.5">🤖 AI NESNE TELEMETRİSİ:</span>
                    <div className="flex flex-wrap gap-1">
                      {journalPhotos[fullscreenPhotoIndex].aiDetectedObjects?.map(obj => (
                        <span key={obj} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[8px] font-extrabold border border-blue-500/20 uppercase">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>

                  {journalPhotos[fullscreenPhotoIndex].workingHours && (
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px] block mb-1">⏰ EKİPMAN SÜRELERİ:</span>
                      <div className="space-y-1">
                        {Object.entries(journalPhotos[fullscreenPhotoIndex].workingHours).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400">{key}:</span>
                            <span className="text-white font-mono font-bold">{val} Saat</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {journalPhotos[fullscreenPhotoIndex].zoneTransitions && (
                    <div>
                      <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px] block mb-1">🔄 ALAN TRANSİT HAREKETLERİ:</span>
                      <div className="space-y-1 max-h-[80px] overflow-y-auto scrollbar-thin">
                        {journalPhotos[fullscreenPhotoIndex].zoneTransitions.map((tr, i) => (
                          <div key={i} className="flex justify-between items-center text-[8px] bg-slate-900 border border-white/5 p-1 rounded font-mono">
                            <span className="text-slate-500">{tr.time}</span>
                            <span className="text-slate-300 font-bold truncate max-w-[60px]">{tr.object.split(' ')[0]}</span>
                            <span className="text-blue-400 font-bold">{tr.from} ➔ {tr.to}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-white/5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">👤 RAPORLAYAN:</span>
                  <span className="text-slate-200 font-bold">{journalPhotos[fullscreenPhotoIndex].takenBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">📍 GPS KOORDİNATI:</span>
                  <span className="text-slate-200 font-mono font-bold">{journalPhotos[fullscreenPhotoIndex].gpsCoordinates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">☁️ HAVA DURUMU:</span>
                  <span className="text-slate-200 font-mono font-bold">{journalPhotos[fullscreenPhotoIndex].weather}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-6 flex flex-col gap-2">
              <p className="text-[9px] text-slate-400 text-center">Şantiye Günlüğü, entegre CBS ve BIM katmanlarıyla eşzamanlı güncellenmektedir.</p>
              <button
                onClick={() => setFullscreenPhotoIndex(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition uppercase cursor-pointer text-center"
              >
                İncelemeyi Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
