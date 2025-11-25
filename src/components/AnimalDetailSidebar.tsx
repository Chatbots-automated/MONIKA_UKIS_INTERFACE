import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisit, VisitProcedure, VisitStatus, Treatment, Product, UsageItem } from '../lib/types';
import { X, Calendar, Thermometer, Pill, Syringe, FileText, Plus, CheckCircle, XCircle, Clock, AlertCircle, Package, Check, Filter, Search, ExternalLink, Milk, Activity } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { normalizeNumberInput, sortByLithuanian } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import { AnimalAnalytics } from './AnimalAnalytics';
import { TeatStatusCard } from './TeatStatusCard';
import { TeatDisplay, TeatSelector } from './TeatSelector';
import { SynchronizationProtocolComponent } from './SynchronizationProtocol';
import { SearchableSelect } from './SearchableSelect';

interface Vaccination {
  id: string;
  animal_id: string;
  product_id: string;
  vaccination_date: string;
  batch_id: string | null;
  dose_amount: number;
  unit: string;
  dose_number: number;
  next_booster_date: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
}

interface VaccinationWithProduct extends Vaccination {
  product?: Product;
}

interface WithdrawalStatus {
  animal_id: string;
  milk_active: boolean;
  milk_until: string | null;
  meat_active: boolean;
  meat_until: string | null;
}

interface GeaDaily {
  id: number;
  animal_id: string;
  tag_no: string;
  collar_no: number | null;
  statusas: string | null;
  grupe: number | null;
  veisline_verte: string | null;
  milk_avg: number | null;
  m1_date: string | null;
  m1_time: string | null;
  m1_qty: number | null;
  m2_date: string | null;
  m2_time: string | null;
  m2_qty: number | null;
  m3_date: string | null;
  m3_time: string | null;
  m3_qty: number | null;
  m4_date: string | null;
  m4_time: string | null;
  m4_qty: number | null;
  m5_date: string | null;
  m5_time: string | null;
  m5_qty: number | null;
  in_milk: boolean | null;
  calved_on: string | null;
  lact_days: number | null;
  inseminated_on: string | null;
  snapshot_date: string;
  source: string;
  created_at: string;
}

function WithdrawalStatusCard({ animalId }: { animalId: string }) {
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWithdrawalStatus();
  }, [animalId]);

  const loadWithdrawalStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_withdrawal_status')
        .select('*')
        .eq('animal_id', animalId)
        .maybeSingle();

      if (error) throw error;
      setWithdrawalStatus(data);
    } catch (error) {
      console.error('Error loading withdrawal status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">Kraunama...</p>
      </div>
    );
  }

  if (!withdrawalStatus || (!withdrawalStatus.milk_active && !withdrawalStatus.meat_active)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900">Karencija</h4>
        </div>
        <p className="text-sm text-green-700 mt-2">Karencijos laikotarpis nėra aktyvus</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-gray-900">Karencijos Laikotarpis</h4>
      </div>
      <div className="space-y-2 text-sm">
        {withdrawalStatus.milk_active && withdrawalStatus.milk_until && (
          <p className="text-amber-800">
            🥛 Pienas iki: <strong>{formatDateLT(withdrawalStatus.milk_until)}</strong>
          </p>
        )}
        {withdrawalStatus.meat_active && withdrawalStatus.meat_until && (
          <p className="text-amber-800">
            🥩 Mėsa iki: <strong>{formatDateLT(withdrawalStatus.meat_until)}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

function GeaDailyCard({ animalId }: { animalId: string }) {
  const [geaData, setGeaData] = useState<GeaDaily | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeaData();
  }, [animalId]);

  const loadGeaData = async () => {
    try {
      const { data, error } = await supabase
        .from('gea_daily')
        .select('*')
        .eq('animal_id', animalId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setGeaData(data);
    } catch (error) {
      console.error('Error loading GEA data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
        <p className="text-sm text-gray-500">Kraunama...</p>
      </div>
    );
  }

  if (!geaData) {
    return null;
  }

  const milkings = [
    { date: geaData.m1_date, time: geaData.m1_time, qty: geaData.m1_qty },
    { date: geaData.m2_date, time: geaData.m2_time, qty: geaData.m2_qty },
    { date: geaData.m3_date, time: geaData.m3_time, qty: geaData.m3_qty },
    { date: geaData.m4_date, time: geaData.m4_time, qty: geaData.m4_qty },
    { date: geaData.m5_date, time: geaData.m5_time, qty: geaData.m5_qty },
  ].filter(m => m.qty !== null);

  // Calculate days until calving (expected calving date is insemination date + 283 days)
  const daysUntilCalving = geaData.inseminated_on ? (() => {
    const inseminationDate = new Date(geaData.inseminated_on);
    const expectedCalvingDate = new Date(inseminationDate);
    expectedCalvingDate.setDate(expectedCalvingDate.getDate() + 283);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expectedCalvingDate.setHours(0, 0, 0, 0);
    const diffTime = expectedCalvingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })() : null;

  // Calculate pregnancy days (days since insemination)
  const pregnancyDays = geaData.inseminated_on ? (() => {
    const inseminationDate = new Date(geaData.inseminated_on);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inseminationDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - inseminationDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })() : null;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Milk className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-gray-900 text-lg">GEA Duomenys</h3>
        <span className="text-xs text-gray-500 ml-auto">
          {formatDateLT(geaData.snapshot_date)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Duomenų data</span>
          <span className="font-bold text-gray-900 text-sm">{formatDateLT(geaData.snapshot_date)}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Kaklo Nr.</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.collar_no || '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Statusas</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.statusas || '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Grupė</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.grupe || '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Veislinė vertė</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.veisline_verte || '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Pieno vidurkis</span>
          <span className="font-bold text-purple-600 text-lg">{geaData.milk_avg ? `${geaData.milk_avg.toFixed(1)} L` : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Dalyvauja pieno gamyboje</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.in_milk ? 'Taip' : 'Ne'}</span>
        </div>
      </div>

      {geaData.in_milk && (
        <div className="bg-white rounded-lg p-3 border border-purple-100 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-gray-700">Melžimai</span>
          </div>
          <div className="space-y-1">
            {milkings.map((m, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {m.date && formatDateLT(m.date)} {m.time?.substring(0, 5)}
                </span>
                <span className="font-semibold text-purple-600">{m.qty?.toFixed(2)} L</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Apsiveršiavo</span>
          <span className="font-semibold text-gray-900 text-sm">{geaData.calved_on ? formatDateLT(geaData.calved_on) : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Laktacijos dienos</span>
          <span className="font-bold text-gray-900 text-lg">{geaData.lact_days !== null ? geaData.lact_days : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Apsėklinimo diena</span>
          <span className="font-semibold text-gray-900 text-sm">{geaData.inseminated_on ? formatDateLT(geaData.inseminated_on) : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Veršingumas</span>
          <span className="font-bold text-blue-600 text-lg">{pregnancyDays !== null ? `${pregnancyDays} d.` : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Kada veršiuosis</span>
          <span className="font-semibold text-gray-900 text-sm">{geaData.kada_versiuosis ? formatDateLT(geaData.kada_versiuosis) : '-'}</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <span className="text-xs text-gray-500 block mb-1">Liko iki apsiveršiavimo</span>
          <span className={`font-bold text-lg ${daysUntilCalving !== null && daysUntilCalving < 30 ? 'text-orange-600' : 'text-gray-900'}`}>
            {daysUntilCalving !== null ? `${daysUntilCalving} d.` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface TreatmentWithDetails extends Treatment {
  usage_items?: UsageItemWithProduct[];
  disease_name?: string;
}

interface UsageItemWithProduct extends UsageItem {
  product?: Product;
}

interface AnimalDetailSidebarProps {
  animal: Animal;
  onClose: () => void;
  defaultTab?: TabType;
}

type TabType = 'overview' | 'visits' | 'treatments' | 'vaccinations' | 'logs';

export function AnimalDetailSidebar({ animal, onClose, defaultTab = 'overview' }: AnimalDetailSidebarProps) {
  const { logAction } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [visits, setVisits] = useState<AnimalVisit[]>([]);
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AnimalVisit | null>(null);
  const [showVisitDetailModal, setShowVisitDetailModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [treatmentDateFrom, setTreatmentDateFrom] = useState('');
  const [treatmentDateTo, setTreatmentDateTo] = useState('');
  const [treatmentSearch, setTreatmentSearch] = useState('');

  const [vaccinationDateFrom, setVaccinationDateFrom] = useState('');
  const [vaccinationDateTo, setVaccinationDateTo] = useState('');
  const [vaccinationSearch, setVaccinationSearch] = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    loadAllData();
  }, [animal.id]);

  useEffect(() => {
    if (showVisitModal || showVisitDetailModal) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showVisitModal, showVisitDetailModal]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadVisits(),
      loadTreatments(),
      loadVaccinations(),
      loadProducts()
    ]);
    setLoading(false);
  };

  const loadVisits = async () => {
    const { data, error } = await supabase
      .from('animal_visits')
      .select('*')
      .eq('animal_id', animal.id)
      .order('visit_datetime', { ascending: false });

    if (!error && data) {
      setVisits(data);
    }
  };

  const loadTreatments = async () => {
    const { data: treatmentsData, error } = await supabase
      .from('treatments')
      .select('*, disease:diseases(name)')
      .eq('animal_id', animal.id)
      .order('reg_date', { ascending: false });

    if (!error && treatmentsData) {
      console.log('📥 Loaded treatments:', treatmentsData.length);

      const treatmentsWithItems = await Promise.all(
        treatmentsData.map(async (treatment: any) => {
          // Load both usage_items (single doses) and treatment_courses (multi-day courses)
          const [usageResult, coursesResult] = await Promise.all([
            supabase
              .from('usage_items')
              .select('*, product:products(*)')
              .eq('treatment_id', treatment.id),
            supabase
              .from('treatment_courses')
              .select('*, product:products(*), batch:batches(*)')
              .eq('treatment_id', treatment.id)
          ]);

          console.log(`📦 Treatment ${treatment.id.slice(0, 8)}:`, {
            withdrawal_milk: treatment.withdrawal_until_milk,
            withdrawal_meat: treatment.withdrawal_until_meat,
            usage_items: usageResult.data?.length || 0,
            courses: coursesResult.data?.length || 0
          });

          return {
            ...treatment,
            disease_name: treatment.disease?.name,
            usage_items: usageResult.data || [],
            treatment_courses: coursesResult.data || []
          };
        })
      );

      setTreatments(treatmentsWithItems);
    }
  };

  const loadVaccinations = async () => {
    const { data, error } = await supabase
      .from('vaccinations')
      .select('*, product:products(*)')
      .eq('animal_id', animal.id)
      .order('vaccination_date', { ascending: false });

    if (!error && data) {
      setVaccinations(data);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (!error && data) {
      // Sort by Lithuanian alphabet
      const sortedData = sortByLithuanian(data, 'name');
      setProducts(sortedData);
    }
  };

  // Categorize all visits by time
  const todayVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  });

  const futureVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate > today;
  }).sort((a, b) => new Date(a.visit_datetime).getTime() - new Date(b.visit_datetime).getTime());

  const pastVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate < today && visitDate.toDateString() !== today.toDateString();
  }).sort((a, b) => new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime());

  // Separate by completion status
  const todayIncomplete = todayVisits.filter(v => v.status !== 'Baigtas');
  const todayCompleted = todayVisits.filter(v => v.status === 'Baigtas');

  const futureIncomplete = futureVisits.filter(v => v.status !== 'Baigtas');
  const futureCompleted = futureVisits.filter(v => v.status === 'Baigtas');

  const pastIncomplete = pastVisits.filter(v => v.status !== 'Baigtas');
  const pastCompleted = pastVisits.filter(v => v.status === 'Baigtas');

  // For stats
  const incompleteVisits = visits.filter(v => v.status !== 'Baigtas');
  const completedVisits = visits.filter(v => v.status === 'Baigtas');

  const filteredTreatments = treatments.filter(treatment => {
    let match = true;

    if (treatmentDateFrom) {
      match = match && treatment.reg_date >= treatmentDateFrom;
    }

    if (treatmentDateTo) {
      match = match && treatment.reg_date <= treatmentDateTo;
    }

    if (treatmentSearch) {
      const search = treatmentSearch.toLowerCase();
      match = match && (
        treatment.disease_name?.toLowerCase().includes(search) ||
        treatment.vet_name?.toLowerCase().includes(search) ||
        treatment.clinical_diagnosis?.toLowerCase().includes(search) ||
        treatment.notes?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const filteredVaccinations = vaccinations.filter(vaccination => {
    let match = true;

    if (vaccinationDateFrom) {
      match = match && vaccination.vaccination_date >= vaccinationDateFrom;
    }

    if (vaccinationDateTo) {
      match = match && vaccination.vaccination_date <= vaccinationDateTo;
    }

    if (vaccinationSearch) {
      const search = vaccinationSearch.toLowerCase();
      match = match && (
        vaccination.product?.name?.toLowerCase().includes(search) ||
        vaccination.administered_by?.toLowerCase().includes(search) ||
        vaccination.notes?.toLowerCase().includes(search) ||
        vaccination.batch_id?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return 'bg-blue-100 text-blue-800';
      case 'Vykdomas': return 'bg-yellow-100 text-yellow-800';
      case 'Baigtas': return 'bg-green-100 text-green-800';
      case 'Atšauktas': return 'bg-gray-100 text-gray-800';
      case 'Neįvykęs': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return <Clock className="w-4 h-4" />;
      case 'Vykdomas': return <AlertCircle className="w-4 h-4" />;
      case 'Baigtas': return <CheckCircle className="w-4 h-4" />;
      case 'Atšauktas': return <XCircle className="w-4 h-4" />;
      case 'Neįvykęs': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] xl:w-[800px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-2 xl:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div>
          <h2 className="text-base xl:text-xl font-bold text-gray-900">
            {animal.tag_no || 'Nenurodytas ID'}
          </h2>
          <p className="text-xs xl:text-sm text-gray-600">
            {animal.species} {animal.sex && `• ${animal.sex}`} {animal.age_months && `• ${animal.age_months}`}<span className="xl:hidden">m</span><span className="hidden xl:inline"> mėn.</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 xl:p-2 hover:bg-blue-200 rounded-lg transition-colors min-w-[36px] xl:min-w-[44px] min-h-[36px] xl:min-h-[44px] touch-manipulation active:bg-blue-300"
        >
          <X className="w-5 xl:w-6 h-5 xl:h-6 text-gray-600" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Apžvalga
        </button>
        <button
          onClick={() => handleTabChange('visits')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'visits'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vizitai
        </button>
        <button
          onClick={() => handleTabChange('treatments')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'treatments'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Gydymas
        </button>
        <button
          onClick={() => handleTabChange('vaccinations')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'vaccinations'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vakcinos
        </button>
        <button
          onClick={() => handleTabChange('logs')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'logs'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Žurnalai
        </button>
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto p-3 xl:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Gyvūno informacija
                </h3>
                <button
                  onClick={() => {
                    const url = `https://app.brolisherdline.com/animals#search=${encodeURIComponent(animal.tag_no || '')}`;
                    window.open(url, '_blank');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Atidaryti brolio sistemą
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-gray-500 block mb-1">Ausies numeris</span>
                  <span className="font-bold text-gray-900 text-lg">{animal.tag_no || '-'}</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-gray-500 block mb-1">Rūšis</span>
                  <span className="font-bold text-gray-900 text-lg">{animal.species}</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-gray-500 block mb-1">Lytis</span>
                  <span className="font-bold text-gray-900 text-lg">{animal.sex || '-'}</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs text-gray-500 block mb-1">Amžius</span>
                  <span className="font-bold text-gray-900 text-lg">{animal.age_months ? `${animal.age_months} mėn.` : '-'}</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100 col-span-2">
                  <span className="text-xs text-gray-500 block mb-1">Gyvūno ID sistemoje</span>
                  <span className="font-mono text-gray-700 text-sm">{animal.id}</span>
                </div>
              </div>
            </div>

            <WithdrawalStatusCard animalId={animal.id} />

            <TeatStatusCard animalId={animal.id} />

            <GeaDailyCard animalId={animal.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Sekantis vizitas</h4>
                </div>
                {futureVisits.length > 0 ? (
                  <p className="text-sm text-gray-700">{formatDateTimeLT(futureVisits[0].visit_datetime)}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nėra suplanuota</p>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Paskutinis vizitas</h4>
                </div>
                {pastVisits.length > 0 ? (
                  <p className="text-sm text-gray-700">{formatDateTimeLT(pastVisits[0].visit_datetime)}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nebuvo vizitų</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Statistika
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-blue-600">{incompleteVisits.length}</p>
                  <p className="text-xs text-gray-600">Neužbaigti vizitai</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-green-600">{completedVisits.length}</p>
                  <p className="text-xs text-gray-600">Užbaigti vizitai</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-orange-600">{todayVisits.length}</p>
                  <p className="text-xs text-gray-600">Šiandien</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-purple-600">{futureVisits.length}</p>
                  <p className="text-xs text-gray-600">Būsimų</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm col-span-2">
                  <p className="text-3xl font-bold text-teal-600">{treatments.length}</p>
                  <p className="text-xs text-gray-600">Iš viso gydymų</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowVisitModal(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Naujas vizitas
            </button>

            {/* INCOMPLETE VISITS - TOP PRIORITY */}
            {pastIncomplete.length > 0 && (
              <div>
                <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Praleisti vizitai (Reikia atlikti)
                </h3>
                <div className="space-y-3">
                  {pastIncomplete.map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setShowVisitDetailModal(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {todayVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Šiandien ({todayVisits.length})
                </h3>

                {todayIncomplete.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Reikia atlikti</h4>
                    <div className="space-y-3">
                      {todayIncomplete.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {todayCompleted.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 mb-2 uppercase flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Atlikta šiandien
                    </h4>
                    <div className="space-y-3">
                      {todayCompleted.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {futureVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Būsimi vizitai ({futureVisits.length})
                </h3>

                {futureIncomplete.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Suplanuota</h4>
                    <div className="space-y-3">
                      {futureIncomplete.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {futureCompleted.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 mb-2 uppercase flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Atlikta iš anksto
                    </h4>
                    <div className="space-y-3">
                      {futureCompleted.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAST COMPLETED VISITS */}
            {pastCompleted.length > 0 && (
              <div className="pt-6 border-t-2 border-gray-300">
                <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Ankstesni užbaigti vizitai ({pastCompleted.length})
                </h3>
                <div className="space-y-3">
                  {pastCompleted.slice(0, 5).map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setShowVisitDetailModal(true);
                      }}
                    />
                  ))}
                  {pastCompleted.length > 5 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + dar {pastCompleted.length - 5} užbaigti vizitai
                    </p>
                  )}
                </div>
              </div>
            )}

            {visits.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nėra vizitų</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Filtrai</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
                  <input
                    type="date"
                    value={treatmentDateFrom}
                    onChange={(e) => setTreatmentDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
                  <input
                    type="date"
                    value={treatmentDateTo}
                    onChange={(e) => setTreatmentDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      placeholder="Liga, vet., pastabos..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Rasta: <strong>{filteredTreatments.length}</strong> iš {treatments.length}
                </span>
                {(treatmentDateFrom || treatmentDateTo || treatmentSearch) && (
                  <button
                    onClick={() => {
                      setTreatmentDateFrom('');
                      setTreatmentDateTo('');
                      setTreatmentSearch('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Išvalyti filtrus
                  </button>
                )}
              </div>
            </div>

            {filteredTreatments.length > 0 ? (
              filteredTreatments.map(treatment => (
                <div key={treatment.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        <div className="font-semibold text-lg text-gray-900">
                          {formatDateLT(treatment.reg_date)}
                        </div>
                      </div>
                      {treatment.disease_name && (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="w-4 h-4 mr-1.5" />
                          {treatment.disease_name}
                        </div>
                      )}
                    </div>
                    {treatment.vet_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-green-700">
                            {treatment.vet_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{treatment.vet_name}</span>
                      </div>
                    )}
                  </div>

                  {treatment.clinical_diagnosis && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-amber-900 mb-1">Klinikinis diagnozas</div>
                          <p className="text-sm text-amber-900 leading-relaxed">{treatment.clinical_diagnosis}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Withdrawal dates - MOST IMPORTANT, SHOWN FIRST */}
                  {(treatment.withdrawal_until_milk || treatment.withdrawal_until_meat) && (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-orange-900 mb-2">⚠️ Karencinės dienos</div>
                          <div className="space-y-1">
                            {treatment.withdrawal_until_milk && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">🥛 Pienas iki:</span>
                                <span className="font-bold text-blue-700">{formatDateLT(treatment.withdrawal_until_milk)}</span>
                              </div>
                            )}
                            {treatment.withdrawal_until_meat && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">🥩 Mėsa iki:</span>
                                <span className="font-bold text-red-700">{formatDateLT(treatment.withdrawal_until_meat)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single-dose medicines */}
                  {treatment.usage_items && treatment.usage_items.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pill className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Panaudoti vaistai - vienkartinės dozės ({treatment.usage_items.length})
                        </div>
                      </div>
                      <div className="space-y-2">
                        {treatment.usage_items.map((item: UsageItemWithProduct) => (
                          <div key={item.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-1">
                                  {item.product?.name || 'Nežinomas produktas'}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {item.purpose}
                                </div>
                                {item.batch_id && (
                                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-blue-200 text-gray-700">
                                    Serija: {item.batch_id.slice(0, 10)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-700">
                                  {item.qty} {item.unit}
                                </div>
                                <div className="text-xs text-gray-500">Kiekis</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-day course medicines */}
                  {treatment.treatment_courses && treatment.treatment_courses.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Gydymo kursai ({treatment.treatment_courses.length})
                        </div>
                      </div>
                      <div className="space-y-2">
                        {treatment.treatment_courses.map((course: any) => (
                          <div key={course.id} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-1">
                                  {course.product?.name || 'Nežinomas produktas'}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs mb-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                    📅 Kursas: {course.days} dienų
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                    💊 Dienos dozė: {course.daily_dose} {course.unit}
                                  </span>
                                  {course.start_date && (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                      🗓️ Pradžia: {formatDateLT(course.start_date)}
                                    </span>
                                  )}
                                </div>
                                {course.batch && (
                                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-purple-200 text-gray-700">
                                    Serija: {course.batch.lot || course.batch_id.slice(0, 10)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-purple-700">
                                  {course.total_dose} {course.unit}
                                </div>
                                <div className="text-xs text-gray-500">Visa dozė</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(treatment.notes || treatment.outcome) && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      {treatment.notes && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                            <p className="text-sm text-gray-700 leading-relaxed">{treatment.notes}</p>
                          </div>
                        </div>
                      )}

                      {treatment.outcome && (
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Rezultatas</div>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{treatment.outcome}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra gydymų</p>
                <p className="text-sm mt-1">Gydymai bus rodomi čia</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Filtrai</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
                  <input
                    type="date"
                    value={vaccinationDateFrom}
                    onChange={(e) => setVaccinationDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
                  <input
                    type="date"
                    value={vaccinationDateTo}
                    onChange={(e) => setVaccinationDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={vaccinationSearch}
                      onChange={(e) => setVaccinationSearch(e.target.value)}
                      placeholder="Vakcina, serija, atliko..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Rasta: <strong>{filteredVaccinations.length}</strong> iš {vaccinations.length}
                </span>
                {(vaccinationDateFrom || vaccinationDateTo || vaccinationSearch) && (
                  <button
                    onClick={() => {
                      setVaccinationDateFrom('');
                      setVaccinationDateTo('');
                      setVaccinationSearch('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Išvalyti filtrus
                  </button>
                )}
              </div>
            </div>

            {filteredVaccinations.length > 0 ? (
              filteredVaccinations.map(vaccination => (
                <div key={vaccination.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                        <Syringe className="w-5 h-5 text-blue-600" />
                        {vaccination.product?.name || 'Nežinoma vakcina'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateLT(vaccination.vaccination_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Dozė #{vaccination.dose_number}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Dozė</div>
                      <div className="font-semibold text-gray-900">
                        {vaccination.dose_amount} {vaccination.unit}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Serija</div>
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {vaccination.batch_id ? vaccination.batch_id.slice(0, 8) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {vaccination.next_booster_date && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Kita vakcina:</span>
                        </div>
                        <span className="font-bold text-green-700">
                          {formatDateLT(vaccination.next_booster_date)}
                        </span>
                      </div>
                    </div>
                  )}

                  {vaccination.administered_by && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700">
                          {vaccination.administered_by.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>Atliko: <span className="font-medium text-gray-900">{vaccination.administered_by}</span></span>
                    </div>
                  )}

                  {vaccination.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                          <p className="text-sm text-gray-700 leading-relaxed">{vaccination.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Syringe className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra vakcinacijų</p>
                <p className="text-sm mt-1">Pridėkite vakcinaciją per vizitą</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Gyvūno statistika
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{visits.length}</div>
                  <div className="text-xs text-gray-600">Vizitų</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-1">{treatments.length}</div>
                  <div className="text-xs text-gray-600">Gydymų</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-purple-600 mb-1">{vaccinations.length}</div>
                  <div className="text-xs text-gray-600">Vakcinacijų</div>
                </div>
              </div>
            </div>

            <AnimalAnalytics animalId={animal.id} tagNumber={animal.tag_no} />

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Pilna istorija
                </h3>
              </div>
              <div className="p-5">
                {(() => {
                  const allEvents = [
                    ...visits.map(v => ({ type: 'visit', date: v.visit_datetime, data: v })),
                    ...treatments.map(t => ({ type: 'treatment', date: t.reg_date, data: t })),
                    ...vaccinations.map(v => ({ type: 'vaccination', date: v.vaccination_date, data: v }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (allEvents.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium">Nėra įvykių</p>
                        <p className="text-sm mt-1">Istorija prasidės po pirmojo vizito</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {allEvents.map((event, idx) => {
                        if (event.type === 'visit') {
                          const visit = event.data as AnimalVisit;
                          return (
                            <div key={`visit-${visit.id}`} className="flex gap-3 group hover:bg-blue-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Vizitas</div>
                                    <div className="text-sm text-gray-600 mt-0.5">
                                      {visit.procedures.join(', ')}
                                    </div>
                                    {visit.notes && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{visit.notes}</div>
                                    )}
                                    {(visit as any).planned_medications && (visit as any).planned_medications.length > 0 && !(visit as any).medications_processed && (
                                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                        <div className="text-xs font-semibold text-amber-900 mb-1">📦 Planuojami vaistai:</div>
                                        {(visit as any).planned_medications.map((med: any, idx: number) => {
                                          const product = products.find(p => p.id === med.product_id);
                                          return (
                                            <div key={idx} className="text-xs text-amber-800">
                                              • {product?.name || 'Produktas'}: {med.qty} {med.unit}
                                            </div>
                                          );
                                        })}
                                        <div className="text-xs text-amber-600 mt-1 italic">
                                          Nusirašys kai vizitas bus užbaigtas
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateTimeLT(visit.visit_datetime)}
                                  </div>
                                </div>
                                {visit.status && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      visit.status === 'Užbaigtas' ? 'bg-green-100 text-green-800' :
                                      visit.status === 'Planuojamas' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {visit.status}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (event.type === 'treatment') {
                          const treatment = event.data as TreatmentWithDetails;
                          return (
                            <div key={`treatment-${treatment.id}`} className="flex gap-3 group hover:bg-green-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Pill className="w-5 h-5 text-green-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Gydymas</div>
                                    {treatment.disease_name && (
                                      <div className="text-sm text-gray-600 mt-0.5">{treatment.disease_name}</div>
                                    )}
                                    {treatment.notes && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{treatment.notes}</div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateLT(treatment.reg_date)}
                                  </div>
                                </div>
                                {((treatment.usage_items && treatment.usage_items.length > 0) || (treatment.treatment_courses && treatment.treatment_courses.length > 0)) && (
                                  <div className="mt-2 space-y-2">
                                    {/* Show single doses with cost */}
                                    {treatment.usage_items && treatment.usage_items.map((item, i) => {
                                      const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                                        ? item.batch.purchase_price / item.batch.received_qty
                                        : 0;
                                      const totalCost = item.qty * unitCost;
                                      return (
                                        <div key={`usage-${i}`} className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                                          <span className="text-blue-900 font-medium">
                                            {item.product?.name || 'Produktas'} - {item.qty} {item.product?.primary_pack_unit || 'vnt'}
                                          </span>
                                          {totalCost > 0 && (
                                            <span className="text-blue-700 font-bold">€{totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Show courses with cost */}
                                    {treatment.treatment_courses && treatment.treatment_courses.map((course, i) => {
                                      const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                                        ? course.batch.purchase_price / course.batch.received_qty
                                        : 0;
                                      const totalCost = course.total_quantity * unitCost;
                                      return (
                                        <div key={`course-${i}`} className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
                                          <span className="text-purple-900 font-medium">
                                            {course.product?.name || 'Produktas'} - Kursas {course.days}d ({course.total_quantity} {course.product?.primary_pack_unit || 'vnt'})
                                          </span>
                                          {totalCost > 0 && (
                                            <span className="text-purple-700 font-bold">€{totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Total treatment cost */}
                                    {(() => {
                                      const usageCost = treatment.usage_items?.reduce((sum, item) => {
                                        const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                                          ? item.batch.purchase_price / item.batch.received_qty
                                          : 0;
                                        return sum + (item.qty * unitCost);
                                      }, 0) || 0;
                                      const courseCost = treatment.treatment_courses?.reduce((sum, course) => {
                                        const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                                          ? course.batch.purchase_price / course.batch.received_qty
                                          : 0;
                                        return sum + (course.total_quantity * unitCost);
                                      }, 0) || 0;
                                      const totalCost = usageCost + courseCost;

                                      return totalCost > 0 ? (
                                        <div className="flex items-center justify-between text-xs bg-emerald-100 px-2 py-1.5 rounded font-bold border border-emerald-200">
                                          <span className="text-emerald-900">SAVIKAINA (Gydymo kaina)</span>
                                          <span className="text-emerald-700 text-sm">€{totalCost.toFixed(2)}</span>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                                {treatment.outcome && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      treatment.outcome === 'recovered' ? 'bg-green-100 text-green-800' :
                                      treatment.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                                      treatment.outcome === 'deceased' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {treatment.outcome === 'recovered' ? 'Pasveiko' :
                                       treatment.outcome === 'ongoing' ? 'Gydoma' :
                                       treatment.outcome === 'deceased' ? 'Kritęs' : treatment.outcome}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (event.type === 'vaccination') {
                          const vaccination = event.data as VaccinationWithProduct;
                          return (
                            <div key={`vaccination-${vaccination.id}`} className="flex gap-3 group hover:bg-purple-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Syringe className="w-5 h-5 text-purple-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Vakcinacija</div>
                                    {vaccination.product && (
                                      <div className="text-sm text-gray-600 mt-0.5">
                                        {vaccination.product.name}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                      Dozė: {vaccination.dose_amount} {vaccination.unit}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateLT(vaccination.vaccination_date)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            {treatments.length > 0 ? (
              treatments.map(treatment => (
                <div key={treatment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{treatment.disease_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatDateLT(treatment.reg_date)}</div>
                    </div>
                    {treatment.outcome && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        treatment.outcome === 'recovered' ? 'bg-green-100 text-green-800' :
                        treatment.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                        treatment.outcome === 'deceased' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {treatment.outcome === 'recovered' ? 'Pasveiko' :
                         treatment.outcome === 'ongoing' ? 'Gydoma' :
                         treatment.outcome === 'deceased' ? 'Kritęs' : treatment.outcome}
                      </span>
                    )}
                  </div>

                  {((treatment.usage_items && treatment.usage_items.length > 0) || (treatment.treatment_courses && treatment.treatment_courses.length > 0)) && (
                    <div className="space-y-2 mt-3">
                      {/* Single doses with cost */}
                      {treatment.usage_items && treatment.usage_items.map((item, i) => {
                        const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                          ? item.batch.purchase_price / item.batch.received_qty
                          : 0;
                        const totalCost = item.qty * unitCost;
                        return (
                          <div key={`usage-${i}`} className="flex items-center justify-between text-xs bg-blue-50 px-3 py-2 rounded-lg">
                            <span className="text-blue-900 font-medium">
                              {item.product?.name || 'Produktas'} - {item.qty} {item.product?.primary_pack_unit || 'vnt'}
                            </span>
                            {totalCost > 0 && (
                              <span className="text-blue-700 font-bold">€{totalCost.toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                      {/* Courses with cost */}
                      {treatment.treatment_courses && treatment.treatment_courses.map((course, i) => {
                        const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                          ? course.batch.purchase_price / course.batch.received_qty
                          : 0;
                        const totalCost = course.total_quantity * unitCost;
                        return (
                          <div key={`course-${i}`} className="flex items-center justify-between text-xs bg-purple-50 px-3 py-2 rounded-lg">
                            <span className="text-purple-900 font-medium">
                              {course.product?.name || 'Produktas'} - Kursas {course.days}d ({course.total_quantity} {course.product?.primary_pack_unit || 'vnt'})
                            </span>
                            {totalCost > 0 && (
                              <span className="text-purple-700 font-bold">€{totalCost.toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                      {/* Total treatment cost */}
                      {(() => {
                        const usageCost = treatment.usage_items?.reduce((sum, item) => {
                          const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                            ? item.batch.purchase_price / item.batch.received_qty
                            : 0;
                          return sum + (item.qty * unitCost);
                        }, 0) || 0;
                        const courseCost = treatment.treatment_courses?.reduce((sum, course) => {
                          const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                            ? course.batch.purchase_price / course.batch.received_qty
                            : 0;
                          return sum + (course.total_quantity * unitCost);
                        }, 0) || 0;
                        const totalCost = usageCost + courseCost;

                        return totalCost > 0 ? (
                          <div className="flex items-center justify-between text-xs bg-emerald-100 px-3 py-2 rounded-lg font-bold border-2 border-emerald-300">
                            <span className="text-emerald-900">SAVIKAINA (Gydymo kaina)</span>
                            <span className="text-emerald-700 text-sm">€{totalCost.toFixed(2)}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {(treatment.sick_teats || treatment.affected_teats) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <TeatDisplay
                        sickTeats={treatment.sick_teats || []}
                        disabledTeats={[]}
                      />
                    </div>
                  )}

                  {treatment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{treatment.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : null}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div className="space-y-4">
            {vaccinations.length > 0 ? (
              vaccinations.map((vaccination) => (
                <div key={vaccination.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {vaccination.product && (
                        <div className="font-semibold text-gray-900">{vaccination.product.name}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{formatDateLT(vaccination.vaccination_date)}</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Dozė #{vaccination.dose_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Kiekis</div>
                      <div className="text-gray-700">{vaccination.dose_amount} {vaccination.unit}</div>
                    </div>
                    {vaccination.next_booster_date && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Kitas skiepas</div>
                        <div className="text-gray-700">{formatDateLT(vaccination.next_booster_date)}</div>
                      </div>
                    )}
                  </div>

                  {vaccination.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{vaccination.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Syringe className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra vakcinacijų</p>
                <p className="text-sm mt-1">Pridėkite vakcinaciją per vizitą</p>
              </div>
            )}
          </div>
        )}

      </div>

      {showVisitModal && (
        <VisitCreateModal
          animalId={animal.id}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            loadAllData();
            setShowVisitModal(false);
          }}
        />
      )}

      {showVisitDetailModal && selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          animalId={animal.id}
          onClose={() => {
            setShowVisitDetailModal(false);
            setSelectedVisit(null);
          }}
          onSuccess={() => {
            loadAllData();
            setShowVisitDetailModal(false);
            setSelectedVisit(null);
          }}
        />
      )}
    </div>
  );
}

function VisitCard({ visit, getStatusColor, getStatusIcon, onClick }: { visit: AnimalVisit; getStatusColor: (status: VisitStatus) => string; getStatusIcon: (status: VisitStatus) => JSX.Element; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.01]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(visit.status)}`}>
            {getStatusIcon(visit.status)}
            {visit.status}
          </span>
          <span className="text-sm text-gray-600">{formatDateTimeLT(visit.visit_datetime)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {visit.procedures.map((proc, idx) => (
          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {proc}
          </span>
        ))}
      </div>
      {visit.temperature && (
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <span>{visit.temperature}°C</span>
          {visit.temperature_measured_at && (
            <span className="text-gray-500 text-xs">({formatDateTimeLT(visit.temperature_measured_at)})</span>
          )}
        </div>
      )}
      {visit.notes && (
        <p className="text-sm text-gray-700 mt-2">{visit.notes}</p>
      )}
      {visit.next_visit_required && visit.next_visit_date && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Sekantis vizitas: <span className="font-medium">{formatDateTimeLT(visit.next_visit_date)}</span>
          </p>
        </div>
      )}
      {visit.treatment_required && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <Pill className="w-3 h-3" />
          <span>Reikalingas gydymas</span>
        </div>
      )}
      {visit.vet_name && (
        <p className="text-xs text-gray-500 mt-2">Gyd.: {visit.vet_name}</p>
      )}
    </div>
  );
}

function VisitCreateModal({ animalId, onClose, onSuccess, visitToEdit }: { animalId: string; onClose: () => void; onSuccess: () => void; visitToEdit?: AnimalVisit }) {
  const { logAction } = useAuth();
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Refs for auto-scrolling to sections in modal
  const treatmentSectionRef = useRef<HTMLDivElement>(null);
  const vaccinationSectionRef = useRef<HTMLDivElement>(null);
  const preventionSectionRef = useRef<HTMLDivElement>(null);
  const temperatureSectionRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!visitToEdit;

  const [formData, setFormData] = useState({
    visit_datetime: visitToEdit?.visit_datetime.slice(0, 16) || new Date().toISOString().slice(0, 16),
    procedures: visitToEdit?.procedures || [] as VisitProcedure[],
    temperature: visitToEdit?.temperature?.toString() || '',
    temperature_measured_at: visitToEdit?.temperature_measured_at?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    status: visitToEdit?.status || 'Planuojamas' as VisitStatus,
    notes: visitToEdit?.notes || '',
    vet_name: visitToEdit?.vet_name || '',
    next_visit_required: visitToEdit?.next_visit_required || false,
    next_visit_date: visitToEdit?.next_visit_date?.slice(0, 16) || '',
    treatment_required: visitToEdit?.treatment_required || false,
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  // Treatment form data
  const [treatmentData, setTreatmentData] = useState({
    disease_id: '',
    clinical_diagnosis: '',
    tests: '',
    animal_condition: '',
    outcome: '',
    services: '',
    withdrawal_until: '',
    notes: '',
    recurring_days: [] as string[],
    medications: [] as Array<{
      product_id: string;
      batch_id: string;
      qty: string;
      unit: 'ml' | 'l' | 'g' | 'kg' | 'pcs';
      purpose: string;
      is_course: boolean;
      course_days: string;
      teat: string;
    }>,
  });

  const [sickTeats, setSickTeats] = useState<string[]>([]);
  const [disabledTeats, setDisabledTeats] = useState<string[]>([]);

  // Note: Withdrawal dates are now calculated by the database function
  // after treatment is saved, using per-medicine course durations

  // Withdrawal dates are calculated by database, no need for client-side calculation

  // Vaccination form data
  const [vaccinationData, setVaccinationData] = useState({
    vaccines: [] as Array<{
      product_id: string;
      batch_id: string;
      dose_amount: string;
      dose_number: string;
      unit: 'ml' | 'l' | 'g' | 'kg' | 'pcs';
      next_booster_date: string;
    }>,
    administered_by: '',
    notes: '',
  });

  // Prevention form data
  const [preventionData, setPreventionData] = useState({
    products: [] as Array<{
      product_id: string;
      batch_id: string;
      dose_qty: string;
      dose_unit: 'ml' | 'l' | 'g' | 'kg' | 'pcs';
      purpose: string;
    }>,
    notes: '',
  });

  const [showNewDiseaseModal, setShowNewDiseaseModal] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');

  useEffect(() => {
    loadResources();
    if (isEditMode && visitToEdit) {
      loadExistingData();
    }
  }, []);

  const loadExistingData = async () => {
    if (!visitToEdit) return;

    // Load existing treatment data if visit has Gydymas procedure
    if (visitToEdit.procedures.includes('Gydymas')) {
      const { data: treatmentRecords } = await supabase
        .from('treatments')
        .select('*, treatment_medications(*)')
        .eq('visit_id', visitToEdit.id);

      if (treatmentRecords && treatmentRecords.length > 0) {
        const treatment = treatmentRecords[0];
        setTreatmentData({
          disease_id: treatment.disease_id || '',
          clinical_diagnosis: treatment.clinical_diagnosis || '',
          tests: treatment.tests || '',
          animal_condition: treatment.animal_condition || '',
          outcome: treatment.outcome || '',
          services: treatment.services || '',
          withdrawal_until: treatment.withdrawal_until || '',
          notes: treatment.notes || '',
          recurring_days: [],
          medications: (treatment.treatment_medications || []).map((med: any) => ({
            product_id: med.product_id,
            batch_id: med.batch_id,
            qty: med.qty?.toString() || '',
            unit: med.unit || 'ml',
            purpose: med.purpose || '',
            is_course: med.is_course || false,
            course_days: med.course_days?.toString() || '',
            teat: med.teat || '',
          })),
        });
      }
    }

    // Load existing vaccination data if visit has Vakcina procedure
    if (visitToEdit.procedures.includes('Vakcina')) {
      const { data: vaccinationRecords } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('visit_id', visitToEdit.id);

      if (vaccinationRecords && vaccinationRecords.length > 0) {
        const vacc = vaccinationRecords[0];
        setVaccinationData({
          product_id: vacc.product_id || '',
          batch_id: vacc.batch_id || '',
          dose_amount: vacc.dose_amount?.toString() || '',
          dose_number: vacc.dose_number?.toString() || '1',
          unit: vacc.unit || 'ml',
          next_booster_date: vacc.next_booster_date || '',
          administered_by: vacc.administered_by || '',
          notes: vacc.notes || '',
        });
      }
    }

    // Load existing prevention data if visit has Profilaktika procedure
    if (visitToEdit.procedures.includes('Profilaktika')) {
      const { data: preventionRecords } = await supabase
        .from('preventions')
        .select('*')
        .eq('visit_id', visitToEdit.id);

      if (preventionRecords && preventionRecords.length > 0) {
        const prev = preventionRecords[0];
        setPreventionData({
          product_id: prev.product_id || '',
          batch_id: prev.batch_id || '',
          dose_qty: prev.dose_qty?.toString() || '',
          dose_unit: prev.dose_unit || 'ml',
          purpose: prev.purpose || '',
          notes: prev.notes || '',
        });
      }
    }
  };

  const loadResources = async () => {
    const [productsRes, diseasesRes, batchesRes, usersRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('diseases').select('*'),
      supabase.from('batches').select('*').order('expiry_date'),
      supabase.from('users').select('id, full_name, email').eq('role', 'vet').order('full_name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
    if (usersRes.data) setUsers(usersRes.data);
  };

  const handleCreateDisease = async () => {
    if (!newDiseaseName.trim()) {
      alert('Įveskite ligos pavadinimą');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('diseases')
        .insert({ name: newDiseaseName.trim() })
        .select()
        .single();

      if (error) throw error;

      setDiseases([...diseases, data]);
      setTreatmentData({ ...treatmentData, disease_id: data.id });
      setNewDiseaseName('');
      setShowNewDiseaseModal(false);

      await logAction('create_disease', 'diseases', data.id, null, { name: data.name });
    } catch (error: any) {
      alert('Klaida kuriant ligą: ' + error.message);
    }
  };

  const fetchStockLevel = async (productId: string) => {
    const { data, error } = await supabase
      .from('stock_by_batch')
      .select('on_hand')
      .eq('product_id', productId);

    if (error || !data) return 0;

    const total = data.reduce((sum, batch) => sum + (batch.on_hand || 0), 0);
    setStockLevels(prev => ({ ...prev, [productId]: total }));
    return total;
  };

  const getOldestBatchWithStock = async (productId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('stock_by_batch')
        .select('batch_id, on_hand, expiry_date')
        .eq('product_id', productId)
        .gt('on_hand', 0)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching batch stock:', error);
        return '';
      }

      if (data && data.length > 0) {
        return data[0].batch_id;
      }

      return '';
    } catch (error) {
      console.error('Error in getOldestBatchWithStock:', error);
      return '';
    }
  };

  const allProcedures: VisitProcedure[] = ['Temperatūra', 'Apžiūra', 'Profilaktika', 'Gydymas', 'Vakcina', 'Kita'];

  const toggleProcedure = (proc: VisitProcedure) => {
    const isAdding = !formData.procedures.includes(proc);

    if (formData.procedures.includes(proc)) {
      setFormData({ ...formData, procedures: formData.procedures.filter(p => p !== proc) });
    } else {
      setFormData({ ...formData, procedures: [...formData.procedures, proc] });

      // Auto-scroll to relevant section after a short delay (for tablet UX)
      setTimeout(() => {
        let targetRef: React.RefObject<HTMLDivElement> | null = null;

        if (proc === 'Gydymas') targetRef = treatmentSectionRef;
        else if (proc === 'Vakcina') targetRef = vaccinationSectionRef;
        else if (proc === 'Profilaktika') targetRef = preventionSectionRef;
        else if (proc === 'Temperatūra') targetRef = temperatureSectionRef;

        if (targetRef?.current && modalContentRef.current) {
          // Calculate position relative to modal container
          const modalTop = modalContentRef.current.scrollTop;
          const targetTop = targetRef.current.offsetTop;
          const modalHeight = modalContentRef.current.clientHeight;

          // Scroll within modal to position element near top (with some padding)
          modalContentRef.current.scrollTo({
            top: targetTop - 100,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.procedures.length === 0) {
      alert('Pasirinkite bent vieną procedūrą');
      return;
    }

    // Validate procedure-specific data
    if (formData.procedures.includes('Gydymas') && treatmentData.medications.length === 0) {
      alert('Gydymui reikia pasirinkti bent vieną vaistą');
      return;
    }

    if (formData.procedures.includes('Vakcina') && vaccinationData.vaccines.length === 0) {
      alert('Vakcinai reikia pasirinkti bent vieną produktą');
      return;
    }

    if (formData.procedures.includes('Profilaktika') && preventionData.products.length === 0) {
      alert('Profilaktikai reikia pasirinkti bent vieną produktą');
      return;
    }

    setLoading(true);
    try {
      let visitData;

      if (isEditMode && visitToEdit) {
        // Update existing visit
        const { data, error: visitError } = await supabase
          .from('animal_visits')
          .update({
            visit_datetime: formData.visit_datetime,
            procedures: formData.procedures,
            temperature: formData.temperature ? parseFloat(formData.temperature) : null,
            temperature_measured_at: formData.procedures.includes('Temperatūra') && formData.temperature ? formData.temperature_measured_at : null,
            status: formData.status,
            notes: formData.notes ? formData.notes : null,
            vet_name: formData.vet_name ? formData.vet_name : null,
            next_visit_required: formData.next_visit_required,
            next_visit_date: formData.next_visit_required ? formData.next_visit_date : null,
            treatment_required: formData.procedures.includes('Gydymas'),
          })
          .eq('id', visitToEdit.id)
          .select()
          .single();

        if (visitError) throw visitError;
        visitData = data;

        // Delete existing treatment/vaccination/prevention records if procedures changed
        if (visitToEdit.procedures.includes('Gydymas') && !formData.procedures.includes('Gydymas')) {
          await supabase.from('treatment_medications').delete().eq('treatment_id', (await supabase.from('treatments').select('id').eq('visit_id', visitToEdit.id).maybeSingle()).data?.id);
          await supabase.from('treatments').delete().eq('visit_id', visitToEdit.id);
        }
        if (visitToEdit.procedures.includes('Vakcina') && !formData.procedures.includes('Vakcina')) {
          await supabase.from('vaccinations').delete().eq('visit_id', visitToEdit.id);
        }
        if (visitToEdit.procedures.includes('Profilaktika') && !formData.procedures.includes('Profilaktika')) {
          await supabase.from('preventions').delete().eq('visit_id', visitToEdit.id);
        }

        await logAction('update_visit', 'animal_visits', visitData.id);
      } else {
        // Create new visit
        const { data, error: visitError } = await supabase
          .from('animal_visits')
          .insert({
            animal_id: animalId,
            visit_datetime: formData.visit_datetime,
            procedures: formData.procedures,
            temperature: formData.temperature ? parseFloat(formData.temperature) : null,
            temperature_measured_at: formData.procedures.includes('Temperatūra') && formData.temperature ? formData.temperature_measured_at : null,
            status: formData.status,
            notes: formData.notes ? formData.notes : null,
            vet_name: formData.vet_name ? formData.vet_name : null,
            next_visit_required: formData.next_visit_required,
            next_visit_date: formData.next_visit_required ? formData.next_visit_date : null,
            treatment_required: formData.procedures.includes('Gydymas'),
          })
          .select()
          .single();

        if (visitError) throw visitError;
        visitData = data;

        await logAction('create_visit', 'animal_visits', visitData.id);
      }

      // 2. If Gydymas procedure, create or update treatment
      if (formData.procedures.includes('Gydymas')) {
        const hasRecurringDays = treatmentData.recurring_days.length > 0;

        let treatmentRecord;

        if (isEditMode && visitToEdit) {
          // Check if treatment exists for this visit
          const { data: existingTreatment } = await supabase
            .from('treatments')
            .select('id')
            .eq('visit_id', visitToEdit.id)
            .maybeSingle();

          if (existingTreatment) {
            // Update existing treatment
            const { data, error: treatmentError } = await supabase
              .from('treatments')
              .update({
                reg_date: formData.visit_datetime.split('T')[0],
                disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
                clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
                tests: treatmentData.tests ? treatmentData.tests : null,
                animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
                outcome: treatmentData.outcome ? treatmentData.outcome : null,
                services: treatmentData.services ? treatmentData.services : null,
                vet_name: formData.vet_name ? formData.vet_name : null,
                notes: treatmentData.notes ? treatmentData.notes : null,
                creates_future_visits: hasRecurringDays,
                sick_teats: sickTeats,
                affected_teats: sickTeats,
              })
              .eq('id', existingTreatment.id)
              .select()
              .single();

            if (treatmentError) throw treatmentError;
            treatmentRecord = data;

            // Delete existing medications and courses
            await supabase.from('usage_items').delete().eq('treatment_id', existingTreatment.id);
            await supabase.from('treatment_courses').delete().eq('treatment_id', existingTreatment.id);
            await supabase.from('treatment_medications').delete().eq('treatment_id', existingTreatment.id);
          } else {
            // Create new treatment
            const { data, error: treatmentError } = await supabase
              .from('treatments')
              .insert({
                animal_id: animalId,
                visit_id: visitData.id,
                reg_date: formData.visit_datetime.split('T')[0],
                disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
                clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
                tests: treatmentData.tests ? treatmentData.tests : null,
                animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
                outcome: treatmentData.outcome ? treatmentData.outcome : null,
                services: treatmentData.services ? treatmentData.services : null,
                vet_name: formData.vet_name ? formData.vet_name : null,
                notes: treatmentData.notes ? treatmentData.notes : null,
                creates_future_visits: hasRecurringDays,
                sick_teats: sickTeats,
                affected_teats: sickTeats,
              })
              .select()
              .single();

            if (treatmentError) throw treatmentError;
            treatmentRecord = data;
          }
        } else {
          // Create new treatment (non-edit mode)
          const { data, error: treatmentError } = await supabase
            .from('treatments')
            .insert({
              animal_id: animalId,
              visit_id: visitData.id,
              reg_date: formData.visit_datetime.split('T')[0],
              disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
              clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
              tests: treatmentData.tests ? treatmentData.tests : null,
              animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
              outcome: treatmentData.outcome ? treatmentData.outcome : null,
              services: treatmentData.services ? treatmentData.services : null,
              vet_name: formData.vet_name ? formData.vet_name : null,
              notes: treatmentData.notes ? treatmentData.notes : null,
              creates_future_visits: hasRecurringDays,
              sick_teats: sickTeats,
              affected_teats: sickTeats,
            })
            .select()
            .single();

          if (treatmentError) throw treatmentError;
          treatmentRecord = data;
        }

        // NEW SYSTEM: Handle medication deduction based on visit status
        // If visit is "Baigtas" immediately, process medications now
        // Otherwise, store as planned_medications and process when completed

        const isCourseWithMultipleDays = treatmentData.medications.some(
          med => med.is_course && parseInt(med.course_days) > 1
        );

        for (const med of treatmentData.medications) {
          if (!med.product_id || !med.batch_id || !med.qty) {
            throw new Error('Visi vaistų laukai privalomi: produktas, serija ir kiekis');
          }

          // If this is a multi-day course
          if (med.is_course && parseInt(med.course_days) > 1) {
            const totalQty = parseFloat(med.qty);
            const days = parseInt(med.course_days);
            const dailyDose = totalQty / days;

            // Store course information for tracking
            const { error: courseError } = await supabase
              .from('treatment_courses')
              .insert({
                treatment_id: treatmentRecord.id,
                product_id: med.product_id,
                batch_id: med.batch_id,
                total_dose: totalQty,
                days: days,
                daily_dose: dailyDose,
                unit: med.unit,
                start_date: formData.visit_datetime.split('T')[0],
                teat: med.teat || null,
              });

            if (courseError) throw courseError;

            // For TODAY'S visit: Only deduct daily dose if status is "Baigtas"
            if (formData.status === 'Baigtas') {
              const { error: usageError } = await supabase
                .from('usage_items')
                .insert({
                  treatment_id: treatmentRecord.id,
                  product_id: med.product_id,
                  batch_id: med.batch_id,
                  qty: dailyDose,
                  unit: med.unit,
                  purpose: med.purpose ? med.purpose : null,
                  teat: med.teat || null,
                });

              if (usageError) throw usageError;
            }
          } else {
            // Single dose - only create usage if visit is completed
            if (formData.status === 'Baigtas') {
              const { error: usageError } = await supabase
                .from('usage_items')
                .insert({
                  treatment_id: treatmentRecord.id,
                  product_id: med.product_id,
                  batch_id: med.batch_id,
                  qty: parseFloat(med.qty),
                  unit: med.unit,
                  purpose: med.purpose ? med.purpose : null,
                  teat: med.teat || null,
                });

              if (usageError) throw usageError;
            }
          }
        }

        // Update the visit with planned medications if not completed
        if (formData.status !== 'Baigtas') {
          const plannedMeds = treatmentData.medications.map(med => {
            const dailyQty = med.is_course && parseInt(med.course_days) > 1
              ? parseFloat(med.qty) / parseInt(med.course_days)
              : parseFloat(med.qty);

            return {
              product_id: med.product_id,
              batch_id: med.batch_id,
              qty: dailyQty,
              unit: med.unit,
              purpose: med.purpose || 'Gydymas',
              teat: med.teat || null,
            };
          });

          await supabase
            .from('animal_visits')
            .update({
              planned_medications: plannedMeds,
              medications_processed: false
            })
            .eq('id', visitData.id);
        }

        // Calculate withdrawal dates using database function
        console.log('🔧 Calling calculate_withdrawal_dates for treatment:', treatmentRecord.id);
        const { data: rpcData, error: rpcError } = await supabase.rpc('calculate_withdrawal_dates', { p_treatment_id: treatmentRecord.id });

        if (rpcError) {
          console.error('❌ RPC Error calculating withdrawal dates:', rpcError);
          alert('Įspėjimas: Karencinių dienų skaičiavimas nepavyko. Klaida: ' + rpcError.message);
        } else {
          console.log('✅ Withdrawal dates calculated successfully');
        }

        // Create future visits for recurring treatments with planned medications
        if (hasRecurringDays) {
          const medicationNames = treatmentData.medications
            .map(med => products.find(p => p.id === med.product_id)?.name)
            .filter(Boolean)
            .join(', ');

          // Calculate daily doses for each medication
          const dailyMedications = treatmentData.medications.map(med => {
            const dailyQty = med.is_course && parseInt(med.course_days) > 1
              ? parseFloat(med.qty) / parseInt(med.course_days)
              : parseFloat(med.qty);

            return {
              product_id: med.product_id,
              batch_id: med.batch_id,
              qty: dailyQty,
              unit: med.unit,
              purpose: med.purpose || 'Gydymas',
              teat: med.teat || null,
            };
          });

          const futureVisits = treatmentData.recurring_days.map(dateStr => {
            return {
              animal_id: animalId,
              visit_datetime: `${dateStr}T10:00:00`,
              procedures: ['Gydymas'],
              status: 'Planuojamas',
              notes: `Pakartotinis gydymas (${treatmentData.disease_id ? diseases.find(d => d.id === treatmentData.disease_id)?.name || '' : 'liga nenurodyta'})\nVaistai: ${medicationNames}`,
              vet_name: formData.vet_name || null,
              next_visit_required: false,
              treatment_required: true,
              related_treatment_id: treatmentRecord.id,
              related_visit_id: visitData.id,
              planned_medications: dailyMedications,
              medications_processed: false,
            };
          });

          const { error: futureVisitsError } = await supabase
            .from('animal_visits')
            .insert(futureVisits);

          if (futureVisitsError) {
            console.error('Error creating future treatment visits:', futureVisitsError);
            alert('Įspėjimas: Būsimų vizitų sukūrimas nepavyko. Klaida: ' + futureVisitsError.message);
          } else {
            console.log(`✅ Created ${futureVisits.length} future treatment visits with planned medications`);
          }

          // Auto-enable "Reikia sekančio vizito" when course is created
          // The next visit should be AFTER the last course day for check-up
          const lastCourseDate = treatmentData.recurring_days[treatmentData.recurring_days.length - 1];
          const lastCourseDateObj = new Date(lastCourseDate);
          const checkupDate = new Date(lastCourseDateObj);
          checkupDate.setDate(checkupDate.getDate() + 3); // 3 days after last treatment

          await supabase
            .from('animal_visits')
            .update({
              next_visit_required: true,
              next_visit_date: checkupDate.toISOString().slice(0, 16),
            })
            .eq('id', visitData.id);

          console.log(`✅ Auto-enabled next visit for check-up on ${checkupDate.toLocaleDateString('lt')}`);
        }

        // Save disabled teats to teat_status table
        if (disabledTeats.length > 0) {
          for (const teatPosition of disabledTeats) {
            const { error: teatError } = await supabase
              .from('teat_status')
              .upsert({
                animal_id: animalId,
                teat_position: teatPosition,
                is_disabled: true,
                disabled_date: formData.visit_datetime.split('T')[0],
                disabled_reason: treatmentData.notes || 'Išjungtas per gydymą',
              }, {
                onConflict: 'animal_id,teat_position'
              });

            if (teatError) {
              console.error('Error saving teat status:', teatError);
            }
          }
          console.log('✅ Disabled teats saved');
        }

        await logAction('create_treatment', 'treatments', treatmentRecord.id);
      }

      // 3. If Vakcina procedure, create vaccinations
      if (formData.procedures.includes('Vakcina')) {
        for (const vaccine of vaccinationData.vaccines) {
          if (!vaccine.product_id || !vaccine.batch_id || !vaccine.dose_amount) {
            throw new Error('Visi vakcinacijos laukai privalomi: produktas, serija ir dozė');
          }

          const { data: vaccinationRecord, error: vaccinationError } = await supabase
            .from('vaccinations')
            .insert({
              animal_id: animalId,
              product_id: vaccine.product_id,
              batch_id: vaccine.batch_id,
              vaccination_date: formData.visit_datetime.split('T')[0],
              dose_amount: parseFloat(vaccine.dose_amount),
              dose_number: parseInt(vaccine.dose_number),
              unit: vaccine.unit,
              next_booster_date: vaccine.next_booster_date ? vaccine.next_booster_date : null,
              administered_by: vaccinationData.administered_by ? vaccinationData.administered_by : formData.vet_name,
              notes: vaccinationData.notes ? vaccinationData.notes : null,
            })
            .select()
            .single();

          if (vaccinationError) throw vaccinationError;

          await logAction('create_vaccination', 'vaccinations', vaccinationRecord.id);

          // If there's a next booster date, create a planned visit for it
          if (vaccine.next_booster_date) {
            const { error: futureVisitError } = await supabase
              .from('animal_visits')
              .insert({
                animal_id: animalId,
                visit_datetime: `${vaccine.next_booster_date}T10:00:00`,
                procedures: ['Vakcina'],
                status: 'Planuojamas',
                notes: `Pakartotinė vakcina: ${products.find(p => p.id === vaccine.product_id)?.name || 'N/A'}`,
                vet_name: vaccinationData.administered_by || formData.vet_name || null,
                next_visit_required: false,
                treatment_required: false,
              });

            if (futureVisitError) {
              console.error('Error creating future vaccination visit:', futureVisitError);
            }
          }
        }
      }

      // 4. If Profilaktika procedure, create prevention records (using biocide_usage table)
      if (formData.procedures.includes('Profilaktika')) {
        for (const product of preventionData.products) {
          if (!product.product_id || !product.batch_id || !product.dose_qty) {
            throw new Error('Visi profilaktikos laukai privalomi: produktas, serija ir kiekis');
          }

          const { data: preventionRecord, error: preventionError } = await supabase
            .from('biocide_usage')
            .insert({
              product_id: product.product_id,
              batch_id: product.batch_id,
              use_date: formData.visit_datetime.split('T')[0],
              purpose: product.purpose ? product.purpose : 'Profilaktika',
              work_scope: `Gyvūnas: ${animalId}`,
              qty: parseFloat(product.dose_qty),
              unit: product.dose_unit,
              used_by_name: formData.vet_name ? formData.vet_name : null,
            })
            .select()
            .single();

          if (preventionError) throw preventionError;

          await logAction('create_prevention', 'biocide_usage', preventionRecord.id);
        }
      }

      // Create next visit if required
      if (formData.next_visit_required && formData.next_visit_date) {
        const { data: nextVisitData, error: nextVisitError } = await supabase
          .from('animal_visits')
          .insert({
            animal_id: animalId,
            visit_datetime: formData.next_visit_date,
            procedures: formData.procedures,
            status: 'Planuojamas',
            notes: `Pakartotinis vizitas po: ${formData.procedures.join(', ')}`,
            vet_name: formData.vet_name,
            next_visit_required: false,
            treatment_required: false,
          })
          .select()
          .single();

        if (nextVisitError) {
          console.error('Error creating next visit:', nextVisitError);
          alert('Vizitas sukurtas, bet klaida kuriant sekantį vizitą: ' + nextVisitError.message);
        } else {
          await logAction('create_future_visit', 'animal_visits', nextVisitData.id, null, {
            from_visit_id: visitData.id,
            scheduled_date: formData.next_visit_date
          });
        }
      }

      alert('Vizitas ir visi susiję įrašai sėkmingai sukurti!');
      onSuccess();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalContentRef} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{isEditMode ? 'Redaguoti vizitą' : 'Naujas vizitas'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data ir laikas *
            </label>
            <input
              type="datetime-local"
              value={formData.visit_datetime}
              onChange={(e) => {
                const newDateTime = e.target.value;
                setFormData({
                  ...formData,
                  visit_datetime: newDateTime,
                  temperature_measured_at: newDateTime,
                  next_visit_date: newDateTime,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Procedūros *
            </label>
            <div className="flex flex-wrap gap-2">
              {allProcedures.map(proc => (
                <button
                  key={proc}
                  type="button"
                  onClick={() => toggleProcedure(proc)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.procedures.includes(proc)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {proc}
                </button>
              ))}
            </div>
          </div>

          {formData.procedures.includes('Temperatūra') && (
            <div ref={temperatureSectionRef} className="grid grid-cols-2 gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatūra (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: normalizeNumberInput(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="38.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matavimo laikas
                </label>
                <input
                  type="datetime-local"
                  value={formData.temperature_measured_at}
                  onChange={(e) => setFormData({ ...formData, temperature_measured_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pastabos
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Apžiūros rezultatai, pastebėjimai, būklė, papildoma informacija..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SearchableSelect
                label="Gydytojas"
                options={users.map(user => ({ value: user.full_name, label: user.full_name }))}
                value={formData.vet_name}
                onChange={(value) => setFormData({ ...formData, vet_name: value })}
                placeholder="Pasirinkite gydytoją..."
                emptyLabel="Nepasirinkta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statusas
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VisitStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Planuojamas">Planuojamas</option>
                <option value="Vykdomas">Vykdomas</option>
                <option value="Baigtas">Baigtas</option>
                <option value="Atšauktas">Atšauktas</option>
                <option value="Neįvykęs">Neįvykęs</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.next_visit_required}
                onChange={(e) => setFormData({ ...formData, next_visit_required: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Reikia sekančio vizito?</span>
            </label>

            {formData.next_visit_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sekančio vizito data *
                </label>
                <input
                  type="datetime-local"
                  value={formData.next_visit_date}
                  onChange={(e) => setFormData({ ...formData, next_visit_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required={formData.next_visit_required}
                />
              </div>
            )}
          </div>

          {/* GYDYMAS FORM */}
          {formData.procedures.includes('Gydymas') && (
            <div ref={treatmentSectionRef} className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-600" />
                Gydymo informacija
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liga</label>
                  <select
                    value={treatmentData.disease_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewDiseaseModal(true);
                      } else {
                        setTreatmentData({ ...treatmentData, disease_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Pasirinkite ligą</option>
                    {diseases.map(disease => (
                      <option key={disease.id} value={disease.id}>{disease.name}</option>
                    ))}
                    <option value="__new__">+ Sukurti naują ligą</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klinikinis diagnozas</label>
                <textarea
                  value={treatmentData.clinical_diagnosis}
                  onChange={(e) => setTreatmentData({ ...treatmentData, clinical_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kartoti gydymą būsimomis dienomis (pasirinkite datas)
                </label>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 space-y-2">
                  {treatmentData.recurring_days.map((dateStr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateStr}
                        min={formData.visit_datetime.split('T')[0]}
                        onChange={(e) => {
                          const newDays = [...treatmentData.recurring_days];
                          newDays[idx] = e.target.value;
                          setTreatmentData({
                            ...treatmentData,
                            recurring_days: newDays.sort()
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newDays = treatmentData.recurring_days.filter((_, i) => i !== idx);
                          setTreatmentData({
                            ...treatmentData,
                            recurring_days: newDays
                          });
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const baseDate = new Date(formData.visit_datetime.split('T')[0]);
                      baseDate.setDate(baseDate.getDate() + 1);
                      const nextDate = baseDate.toISOString().split('T')[0];
                      setTreatmentData({
                        ...treatmentData,
                        recurring_days: [...treatmentData.recurring_days, nextDate].sort()
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti datą
                  </button>
                  {treatmentData.recurring_days.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      Pasirinkta datų: {treatmentData.recurring_days.length}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vaistai *</label>
                <div className="space-y-3">
                  {treatmentData.medications.map((med, idx) => {
                    const selectedProduct = products.find(p => p.id === med.product_id);
                    const stockLevel = med.product_id ? stockLevels[med.product_id] : undefined;

                    const availableBatches = batches.filter(b => b.product_id === med.product_id);

                    return (
                      <div key={idx} className="bg-white p-3 rounded border-2 border-gray-300 space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <select
                              value={med.product_id}
                              onChange={async (e) => {
                                const productId = e.target.value;
                                const newMeds = [...treatmentData.medications];
                                newMeds[idx].product_id = productId;

                                if (productId) {
                                  const product = products.find(p => p.id === productId);
                                  const oldestBatchId = await getOldestBatchWithStock(productId);
                                  newMeds[idx].batch_id = oldestBatchId;
                                  newMeds[idx].unit = product?.primary_pack_unit || 'ml';
                                  fetchStockLevel(productId);
                                } else {
                                  newMeds[idx].batch_id = '';
                                  newMeds[idx].unit = 'ml';
                                }

                                setTreatmentData({ ...treatmentData, medications: newMeds });
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Pasirinkite vaistą</option>
                              {sortByLithuanian(products.filter(p => p.category === 'medicines'), 'name').map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                            {stockLevel !== undefined && (
                              <div className="text-xs text-gray-500 mt-0.5 px-1">
                                Likutis: <span className={stockLevel > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>{stockLevel.toFixed(2)}</span> {selectedProduct?.unit}
                              </div>
                            )}
                          </div>
                          <select
                            value={med.batch_id}
                            onChange={(e) => {
                              const newMeds = [...treatmentData.medications];
                              newMeds[idx].batch_id = e.target.value;
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={!med.product_id}
                          >
                            <option value="">Serija *</option>
                            {availableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Kiekis"
                            value={med.qty}
                            onChange={(e) => {
                              const newMeds = [...treatmentData.medications];
                              newMeds[idx].qty = normalizeNumberInput(e.target.value);
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <div className="col-span-2 px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm flex items-center text-gray-700 font-medium">
                            {selectedProduct?.primary_pack_unit || med.unit || 'ml'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newMeds = treatmentData.medications.filter((_, i) => i !== idx);
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Course duration checkbox and fields */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={med.is_course}
                              onChange={(e) => {
                                const newMeds = [...treatmentData.medications];
                                newMeds[idx].is_course = e.target.checked;
                                setTreatmentData({ ...treatmentData, medications: newMeds });
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-gray-700">Kursas (keli dienas)</span>
                          </label>
                          {med.is_course && (
                            <>
                              <input
                                type="number"
                                min="2"
                                placeholder="Dienų"
                                value={med.course_days}
                                onChange={(e) => {
                                  const newMeds = [...treatmentData.medications];
                                  newMeds[idx].course_days = e.target.value;
                                  setTreatmentData({ ...treatmentData, medications: newMeds });

                                  const days = parseInt(e.target.value);
                                  // Auto-populate recurring days when course duration is set
                                  if (days > 1) {
                                    // Auto-enable next visit
                                    setFormData({ ...formData, next_visit_required: true });

                                    // Generate dates for the next N days (excluding today)
                                    const baseDate = new Date(formData.visit_datetime.split('T')[0]);
                                    const futureDates: string[] = [];
                                    for (let i = 1; i < days; i++) {
                                      const futureDate = new Date(baseDate);
                                      futureDate.setDate(baseDate.getDate() + i);
                                      futureDates.push(futureDate.toISOString().split('T')[0]);
                                    }
                                    setTreatmentData({
                                      ...treatmentData,
                                      medications: newMeds,
                                      recurring_days: futureDates
                                    });
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              {parseInt(med.course_days) > 1 && med.qty && (
                                <span className="text-xs text-gray-600">
                                  = {(parseFloat(med.qty) / parseInt(med.course_days)).toFixed(2)} {med.unit} / dieną
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {selectedProduct && (selectedProduct.withdrawal_days_milk || selectedProduct.withdrawal_days_meat) && (
                          <div className="text-xs bg-amber-50 border-2 border-amber-300 rounded px-3 py-2">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span className="font-bold text-amber-900">Karencinės dienos:</span>
                            </div>
                            <div className="flex gap-4">
                              {selectedProduct.withdrawal_days_milk && (
                                <span className="text-blue-700 font-semibold">
                                  🥛 Pienas: {selectedProduct.withdrawal_days_milk} d.
                                </span>
                              )}
                              {selectedProduct.withdrawal_days_meat && (
                                <span className="text-red-700 font-semibold">
                                  🥩 Mėsa: {selectedProduct.withdrawal_days_meat} d.
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setTreatmentData({
                        ...treatmentData,
                        medications: [...treatmentData.medications, { product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'Gydymas', is_course: false, course_days: '1', teat: '' }]
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti vaistą
                  </button>
                </div>
              </div>

              {/* TEAT SELECTOR */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Spenų būsena</h5>
                <TeatSelector
                  selectedSickTeats={sickTeats}
                  selectedDisabledTeats={disabledTeats}
                  onSickTeatsChange={setSickTeats}
                  onDisabledTeatsChange={setDisabledTeats}
                />
              </div>

              <div>
                <div className="space-y-3">
                  {/* WITHDRAWAL CALCULATION PREVIEW */}
                  {treatmentData.medications.length > 0 && treatmentData.medications.some(m => m.product_id) && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
                      <h5 className="font-bold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Karencijos skaičiavimas (po išsaugojimo)
                      </h5>
                      <div className="text-sm space-y-2">
                        {treatmentData.medications
                          .filter(m => m.product_id)
                          .map((med, idx) => {
                            const product = products.find(p => p.id === med.product_id);
                            const courseDays = med.is_course ? parseInt(med.course_days) || 1 : 0;
                            const milkDays = product?.withdrawal_days_milk || 0;
                            const meatDays = product?.withdrawal_days_meat || 0;

                            return (
                              <div key={idx} className="bg-white rounded border border-amber-300 p-2">
                                <div className="font-semibold text-gray-900 mb-1">{product?.name}</div>
                                <div className="text-xs text-gray-700 space-y-0.5">
                                  {courseDays > 0 && (
                                    <div>• Kursas: {courseDays} dienų</div>
                                  )}
                                  {milkDays > 0 && (
                                    <div className="text-blue-700">
                                      • 🥛 Pienas: {courseDays} + {milkDays} + 1 = <strong>{courseDays + milkDays + 1} dienų</strong>
                                    </div>
                                  )}
                                  {meatDays > 0 && (
                                    <div className="text-red-700">
                                      • 🥩 Mėsa: {courseDays} + {meatDays} + 1 = <strong>{courseDays + meatDays + 1} dienų</strong>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        <div className="pt-2 mt-2 border-t-2 border-amber-400 text-xs text-gray-600">
                          ℹ️ Tikslios datos bus apskaičiuotos automatiškai po išsaugojimo ir bus matomos gyvūno apžvalgoje.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SYNCHRONIZATION PROTOCOL */}
          {formData.procedures.includes('Gydymas') && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Sinchronizacijos protokolas
              </h4>
              <SynchronizationProtocolComponent
                animalId={animalId}
                onProtocolCreated={() => {
                  // Protocol created successfully
                }}
              />
            </div>
          )}          {/* VAKCINA FORM */}
          {formData.procedures.includes('Vakcina') && (
            <div ref={vaccinationSectionRef} className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-purple-600" />
                Vakcinacijos informacija
              </h4>

              <div className="space-y-3">
                {vaccinationData.vaccines.map((vaccine, index) => (
                  <div key={index} className="p-3 bg-white border border-purple-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Vakcina #{index + 1}</span>
                      {vaccinationData.vaccines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newVaccines = vaccinationData.vaccines.filter((_, i) => i !== index);
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vakcina *</label>
                      <select
                        value={vaccine.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const newVaccines = [...vaccinationData.vaccines];

                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            newVaccines[index] = { ...vaccine, product_id: productId, batch_id: oldestBatchId };
                            fetchStockLevel(productId);
                          } else {
                            newVaccines[index] = { ...vaccine, product_id: '', batch_id: '' };
                          }

                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="">Pasirinkite vakciną</option>
                        {products.filter(p => p.category === 'prevention').map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                      {vaccine.product_id && stockLevels[vaccine.product_id] !== undefined && (
                        <div className="text-xs text-gray-500 mt-1 px-1">
                          Likutis: <span className={stockLevels[vaccine.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {stockLevels[vaccine.product_id].toFixed(2)}
                          </span> {products.find(p => p.id === vaccine.product_id)?.unit}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                      <select
                        value={vaccine.batch_id}
                        onChange={(e) => {
                          const newVaccines = [...vaccinationData.vaccines];
                          newVaccines[index] = { ...vaccine, batch_id: e.target.value };
                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        disabled={!vaccine.product_id}
                        required
                      >
                        <option value="">Pasirinkite seriją</option>
                        {batches.filter(b => b.product_id === vaccine.product_id).map(b => (
                          <option key={b.id} value={b.id}>
                            {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dozė *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={vaccine.dose_amount}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, dose_amount: e.target.value };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                        <select
                          value={vaccine.unit}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, unit: e.target.value as any };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="pcs">vnt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dozės Nr.</label>
                        <input
                          type="number"
                          value={vaccine.dose_number}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, dose_number: e.target.value };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pakartotinė vakcinacija (data)</label>
                      <input
                        type="date"
                        value={vaccine.next_booster_date}
                        onChange={(e) => {
                          const newVaccines = [...vaccinationData.vaccines];
                          newVaccines[index] = { ...vaccine, next_booster_date: e.target.value };
                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setVaccinationData({
                      ...vaccinationData,
                      vaccines: [...vaccinationData.vaccines, { product_id: '', batch_id: '', dose_amount: '', dose_number: '1', unit: 'ml', next_booster_date: '' }]
                    });
                  }}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti vakciną
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atliko (vardas)</label>
                <input
                  type="text"
                  value={vaccinationData.administered_by}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, administered_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Veterinaras"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={vaccinationData.notes}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </div>
          )}


          {/* PROFILAKTIKA FORM */}
          {formData.procedures.includes('Profilaktika') && (
            <div ref={preventionSectionRef} className="p-4 bg-green-50 border-2 border-green-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Profilaktikos informacija
              </h4>

              <div className="space-y-3">
                {preventionData.products.map((product, index) => (
                  <div key={index} className="p-3 bg-white border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Produktas #{index + 1}</span>
                      {preventionData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newProducts = preventionData.products.filter((_, i) => i !== index);
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Produktas *</label>
                      <select
                        value={product.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const newProducts = [...preventionData.products];

                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            newProducts[index] = { ...product, product_id: productId, batch_id: oldestBatchId };
                            fetchStockLevel(productId);
                          } else {
                            newProducts[index] = { ...product, product_id: '', batch_id: '' };
                          }

                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Pasirinkite produktą</option>
                        {products.filter(p => p.category === 'prevention' || p.category === 'biocide').map(prod => (
                          <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                      </select>
                      {product.product_id && stockLevels[product.product_id] !== undefined && (
                        <div className="text-xs text-gray-500 mt-1 px-1">
                          Likutis: <span className={stockLevels[product.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {stockLevels[product.product_id].toFixed(2)}
                          </span> {products.find(p => p.id === product.product_id)?.unit}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                      <select
                        value={product.batch_id}
                        onChange={(e) => {
                          const newProducts = [...preventionData.products];
                          newProducts[index] = { ...product, batch_id: e.target.value };
                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        disabled={!product.product_id}
                        required
                      >
                        <option value="">Pasirinkite seriją</option>
                        {batches.filter(b => b.product_id === product.product_id).map(b => (
                          <option key={b.id} value={b.id}>
                            {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={product.dose_qty}
                          onChange={(e) => {
                            const newProducts = [...preventionData.products];
                            newProducts[index] = { ...product, dose_qty: e.target.value };
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                        <select
                          value={product.dose_unit}
                          onChange={(e) => {
                            const newProducts = [...preventionData.products];
                            newProducts[index] = { ...product, dose_unit: e.target.value as any };
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="pcs">vnt</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paskirtis</label>
                      <input
                        type="text"
                        value={product.purpose}
                        onChange={(e) => {
                          const newProducts = [...preventionData.products];
                          newProducts[index] = { ...product, purpose: e.target.value };
                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Parazitų prevencija, dezinfekcija, kt."
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPreventionData({
                      ...preventionData,
                      products: [...preventionData.products, { product_id: '', batch_id: '', dose_qty: '', dose_unit: 'ml', purpose: '' }]
                    });
                  }}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti produktą
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={preventionData.notes}
                  onChange={(e) => setPreventionData({ ...preventionData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (isEditMode ? 'Saugoma...' : 'Kuriama...') : (isEditMode ? 'Išsaugoti pakeitimus' : 'Sukurti vizitą')}
            </button>
          </div>
        </form>
      </div>

      {showNewDiseaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują ligą</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ligos pavadinimas *
                </label>
                <input
                  type="text"
                  value={newDiseaseName}
                  onChange={(e) => setNewDiseaseName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Įveskite ligos pavadinimą..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateDisease();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDiseaseModal(false);
                    setNewDiseaseName('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Atšaukti
                </button>
                <button
                  type="button"
                  onClick={handleCreateDisease}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sukurti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisitDetailModal({ visit, animalId, onClose, onSuccess }: { visit: AnimalVisit; animalId: string; onClose: () => void; onSuccess: () => void }) {
  const { logAction } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(visit.notes || '');
  const [status, setStatus] = useState(visit.status);
  const [showFutureVisitForm, setShowFutureVisitForm] = useState(false);
  const [futureVisitDate, setFutureVisitDate] = useState('');
  const [futureVisitNotes, setFutureVisitNotes] = useState('');
  const [showEditMode, setShowEditMode] = useState(false);

  if (showEditMode) {
    return (
      <VisitCreateModal
        animalId={animalId}
        visitToEdit={visit}
        onClose={() => setShowEditMode(false)}
        onSuccess={() => {
          setShowEditMode(false);
          onSuccess();
        }}
      />
    );
  }

  const handleCompleteVisit = async () => {
    if (status === 'Baigtas') {
      alert('Šis vizitas jau užbaigtas');
      return;
    }

    if (!confirm('Ar tikrai norite pažymėti šį vizitą kaip užbaigtą?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('animal_visits')
        .update({
          status: 'Baigtas',
          notes: notes
        })
        .eq('id', visit.id);

      if (error) throw error;

      await logAction('complete_visit', 'animal_visits', visit.id);
      onSuccess();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('animal_visits')
        .update({
          notes: notes,
          status: status
        })
        .eq('id', visit.id);

      if (error) throw error;

      await logAction('update_visit', 'animal_visits', visit.id);
      alert('Vizitas atnaujintas!');
      onSuccess();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFutureVisit = async () => {
    if (!futureVisitDate) {
      alert('Prašome pasirinkti datą');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('animal_visits')
        .insert({
          animal_id: animalId,
          visit_datetime: futureVisitDate,
          procedures: visit.procedures,
          status: 'Planuojamas',
          notes: futureVisitNotes || `Pakartotinis vizitas po: ${visit.procedures.join(', ')}`,
          vet_name: visit.vet_name,
          next_visit_required: false,
          treatment_required: false,
        });

      if (error) throw error;

      await logAction('create_future_visit', 'animal_visits', null, null, {
        from_visit_id: visit.id,
        scheduled_date: futureVisitDate
      });

      alert('Būsimas vizitas sėkmingai sukurtas!');
      setShowFutureVisitForm(false);
      setFutureVisitDate('');
      setFutureVisitNotes('');
      onSuccess();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Baigtas': return 'bg-green-100 text-green-800 border-green-300';
      case 'Planuojamas': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Atšauktas': return 'bg-red-100 text-red-800 border-red-300';
      case 'Vykdomas': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Neįvykęs': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white border-b border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Vizito informacija</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5" />
            <span className="text-lg">{formatDateTimeLT(visit.visit_datetime)}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Key Info Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Statusas</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VisitStatus)}
                  className={`w-full px-3 py-2 rounded-lg border-2 font-medium ${getStatusColor(status)}`}
                >
                  <option value="Planuojamas">Planuojamas</option>
                  <option value="Vykdomas">Vykdomas</option>
                  <option value="Baigtas">Užbaigtas</option>
                  <option value="Atšauktas">Atšauktas</option>
                  <option value="Neįvykęs">Neįvykęs</option>
                </select>
              </div>
              {visit.vet_name && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Veterinaras</div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {visit.vet_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{visit.vet_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Section - Shows creation/update info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-blue-900 mb-2">Vizito duomenys</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sukurta:</span>
                <span className="font-medium text-gray-900">{formatDateTimeLT(visit.created_at)}</span>
              </div>
              {visit.updated_at && visit.updated_at !== visit.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Atnaujinta:</span>
                  <span className="font-medium text-gray-900">{formatDateTimeLT(visit.updated_at)}</span>
                </div>
              )}
              {status === 'Baigtas' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold">Vizitas užbaigtas</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">Procedūros</div>
            <div className="flex flex-wrap gap-2">
              {visit.procedures.map((proc, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200">
                  {proc}
                </span>
              ))}
            </div>
          </div>

          {visit.temperature && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600">Temperatūra</div>
                  <div className="text-2xl font-bold text-red-700">{visit.temperature}°C</div>
                  {visit.temperature_measured_at && (
                    <div className="text-xs text-gray-500">{formatDateTimeLT(visit.temperature_measured_at)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {visit.treatment_required && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700">
                <Pill className="w-4 h-4" />
                <span className="font-medium">Reikalingas gydymas</span>
              </div>
            </div>
          )}

          {visit.next_visit_required && visit.next_visit_date && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Sekantis vizitas</span>
                </div>
                <span className="font-bold text-green-800">{formatDateTimeLT(visit.next_visit_date)}</span>
              </div>
            </div>
          )}

          {visit.sync_step_id && <SyncStepMedicationDisplay visitId={visit.id} syncStepId={visit.sync_step_id} />}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pastabos ir komentarai
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Pridėkite pastabas apie vizitą, gydymo rezultatus, rekomendacijas..."
            />
          </div>

          {showFutureVisitForm ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Suplanuoti būsimą vizitą
                </h3>
                <button
                  onClick={() => setShowFutureVisitForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data ir laikas
                  </label>
                  <input
                    type="datetime-local"
                    value={futureVisitDate}
                    onChange={(e) => setFutureVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pastabos (neprivaloma)
                  </label>
                  <textarea
                    value={futureVisitNotes}
                    onChange={(e) => setFutureVisitNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Papildomos pastabos būsimam vizitui..."
                  />
                </div>
                <button
                  onClick={handleCreateFutureVisit}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Kuriama...' : 'Sukurti būsimą vizitą'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFutureVisitForm(true)}
              className="w-full px-4 py-2 border-2 border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Suplanuoti būsimą vizitą
            </button>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setShowEditMode(true)}
              className="w-full px-4 py-3 border-2 border-orange-400 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Redaguoti vizitą
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saugoma...' : 'Išsaugoti'}
              </button>
              {status !== 'Baigtas' && (
                <button
                  onClick={handleCompleteVisit}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {loading ? 'Užbaigiama...' : 'Užbaigti'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncStepMedicationDisplay({ visitId, syncStepId }: { visitId: string; syncStepId: string }) {
  const [stepData, setStepData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [syncStepId]);

  const loadData = async () => {
    try {
      // Load synchronization step data
      const { data: step, error: stepError } = await supabase
        .from('synchronization_steps')
        .select('*')
        .eq('id', syncStepId)
        .maybeSingle();

      if (stepError) throw stepError;
      setStepData(step);

      // If step has medication data, load product and batch info
      if (step?.batch_id) {
        const [productRes, batchRes] = await Promise.all([
          step.medication_product_id
            ? supabase.from('products').select('*').eq('id', step.medication_product_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('batches').select('*').eq('id', step.batch_id).maybeSingle()
        ]);

        if (productRes.data) setProductData(productRes.data);
        if (batchRes.data) setBatchData(batchRes.data);
      }
    } catch (error) {
      console.error('Error loading sync step medication data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">Kraunama...</div>
      </div>
    );
  }

  if (!stepData || !stepData.completed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Syringe className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Sinchronizacijos vaistai</h3>
          <p className="text-xs text-gray-600">Panaudoti vaistai šiame vizite</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-purple-200">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Vaistas</div>
            <div className="text-base font-semibold text-gray-900">{stepData.step_name}</div>
          </div>

          {stepData.dosage && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Panaudotas kiekis</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-700">{stepData.dosage}</div>
                <div className="text-lg text-gray-600">{stepData.dosage_unit}</div>
              </div>
            </div>
          )}

          {batchData && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Pakuotė / Serija</div>
              <div className="text-sm text-gray-900 font-medium">{batchData.lot || 'N/A'}</div>
            </div>
          )}

          {stepData.completed_at && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Panaudota</div>
              <div className="text-sm text-gray-700">{formatDateTimeLT(stepData.completed_at)}</div>
            </div>
          )}

          {productData && batchData?.purchase_price && batchData?.received_qty && stepData.dosage && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Savikaina:</span>
                <span className="text-lg font-bold text-purple-700">
                  €{((batchData.purchase_price / batchData.received_qty) * stepData.dosage).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
