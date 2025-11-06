import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisit, VisitProcedure, VisitStatus, Treatment, Product, UsageItem } from '../lib/types';
import { X, Calendar, Thermometer, Pill, Syringe, FileText, Plus, CheckCircle, XCircle, Clock, AlertCircle, Package, Check, Filter, Search, ExternalLink } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';

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

export function AnimalDetailSidebar({ animal, onClose, defaultTab = 'visits' }: AnimalDetailSidebarProps) {
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
      setProducts(data);
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
  });

  const pastVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate < today && visitDate.toDateString() !== today.toDateString();
  });

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
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {/* Show single doses */}
                                    {treatment.usage_items && treatment.usage_items.slice(0, 2).map((item, i) => (
                                      <span key={`usage-${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                        {item.product?.name || 'Produktas'}
                                      </span>
                                    ))}
                                    {/* Show courses */}
                                    {treatment.treatment_courses && treatment.treatment_courses.slice(0, 2).map((course, i) => (
                                      <span key={`course-${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                        {course.product?.name || 'Produktas'} ({course.days}d)
                                      </span>
                                    ))}
                                    {/* Show "more" indicator */}
                                    {((treatment.usage_items?.length || 0) + (treatment.treatment_courses?.length || 0)) > 2 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                        +{((treatment.usage_items?.length || 0) + (treatment.treatment_courses?.length || 0)) - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else {
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
                                    <div className="text-sm text-gray-600 mt-0.5">
                                      {vaccination.product?.name || 'Nežinoma vakcina'}
                                    </div>
                                    {vaccination.notes && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{vaccination.notes}</div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateLT(vaccination.vaccination_date)}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                    Dozė #{vaccination.dose_number}
                                  </span>
                                  {vaccination.next_booster_date && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                      Kita: {formatDateLT(vaccination.next_booster_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
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

function VisitCreateModal({ animalId, onClose, onSuccess }: { animalId: string; onClose: () => void; onSuccess: () => void }) {
  const { logAction } = useAuth();
  const [formData, setFormData] = useState({
    visit_datetime: new Date().toISOString().slice(0, 16),
    procedures: [] as VisitProcedure[],
    temperature: '',
    temperature_measured_at: new Date().toISOString().slice(0, 16),
    status: 'Planuojamas' as VisitStatus,
    notes: '',
    vet_name: '',
    next_visit_required: false,
    next_visit_date: '',
    treatment_required: false,
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

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
    medications: [] as Array<{
      product_id: string;
      batch_id: string;
      qty: string;
      unit: 'ml' | 'l' | 'g' | 'kg' | 'pcs';
      purpose: string;
      is_course: boolean;
      course_days: string;
    }>,
  });

  // Note: Withdrawal dates are now calculated by the database function
  // after treatment is saved, using per-medicine course durations

  // Withdrawal dates are calculated by database, no need for client-side calculation

  // Vaccination form data
  const [vaccinationData, setVaccinationData] = useState({
    product_id: '',
    batch_id: '',
    dose_amount: '',
    dose_number: '1',
    unit: 'ml' as 'ml' | 'l' | 'g' | 'kg' | 'pcs',
    next_booster_date: '',
    administered_by: '',
    notes: '',
  });

  // Prevention form data
  const [preventionData, setPreventionData] = useState({
    product_id: '',
    batch_id: '',
    dose_qty: '',
    dose_unit: 'ml' as 'ml' | 'l' | 'g' | 'kg' | 'pcs',
    purpose: '',
    notes: '',
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    const [productsRes, diseasesRes, batchesRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('diseases').select('*'),
      supabase.from('batches').select('*').order('expiry_date'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
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
    if (formData.procedures.includes(proc)) {
      setFormData({ ...formData, procedures: formData.procedures.filter(p => p !== proc) });
    } else {
      setFormData({ ...formData, procedures: [...formData.procedures, proc] });
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

    if (formData.procedures.includes('Vakcina') && !vaccinationData.product_id) {
      alert('Vakcinai reikia pasirinkti produktą');
      return;
    }

    if (formData.procedures.includes('Profilaktika') && !preventionData.product_id) {
      alert('Profilaktikai reikia pasirinkti produktą');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the visit
      const { data: visitData, error: visitError } = await supabase
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

      await logAction('create_visit', 'animal_visits', visitData.id);

      // 2. If Gydymas procedure, create treatment
      if (formData.procedures.includes('Gydymas')) {
        const { data: treatmentRecord, error: treatmentError } = await supabase
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
          })
          .select()
          .single();

        if (treatmentError) throw treatmentError;

        // Create usage items or courses for medications
        for (const med of treatmentData.medications) {
          if (!med.product_id || !med.batch_id || !med.qty) {
            throw new Error('Visi vaistų laukai privalomi: produktas, serija ir kiekis');
          }

          // If this is a multi-day course, create a course entry
          if (med.is_course && parseInt(med.course_days) > 1) {
            const totalQty = parseFloat(med.qty);
            const days = parseInt(med.course_days);
            const dailyDose = totalQty / days;

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
              });

            if (courseError) throw courseError;
          } else {
            // Single dose - create normal usage item
            const { error: usageError } = await supabase
              .from('usage_items')
              .insert({
                treatment_id: treatmentRecord.id,
                product_id: med.product_id,
                batch_id: med.batch_id,
                qty: parseFloat(med.qty),
                unit: med.unit,
                purpose: med.purpose ? med.purpose : null,
              });

            if (usageError) throw usageError;
          }
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

        await logAction('create_treatment', 'treatments', treatmentRecord.id);
      }

      // 3. If Vakcina procedure, create vaccination
      if (formData.procedures.includes('Vakcina')) {
        if (!vaccinationData.product_id || !vaccinationData.batch_id || !vaccinationData.dose_amount) {
          throw new Error('Visi vakcinacijos laukai privalomi: produktas, serija ir dozė');
        }

        const { data: vaccinationRecord, error: vaccinationError } = await supabase
          .from('vaccinations')
          .insert({
            animal_id: animalId,
            product_id: vaccinationData.product_id,
            batch_id: vaccinationData.batch_id,
            vaccination_date: formData.visit_datetime.split('T')[0],
            dose_amount: parseFloat(vaccinationData.dose_amount),
            dose_number: parseInt(vaccinationData.dose_number),
            unit: vaccinationData.unit,
            next_booster_date: vaccinationData.next_booster_date ? vaccinationData.next_booster_date : null,
            administered_by: vaccinationData.administered_by ? vaccinationData.administered_by : formData.vet_name,
            notes: vaccinationData.notes ? vaccinationData.notes : null,
          })
          .select()
          .single();

        if (vaccinationError) throw vaccinationError;

        await logAction('create_vaccination', 'vaccinations', vaccinationRecord.id);

        // If there's a next booster date, create a planned visit for it
        if (vaccinationData.next_booster_date) {
          const { error: futureVisitError } = await supabase
            .from('animal_visits')
            .insert({
              animal_id: animalId,
              visit_datetime: `${vaccinationData.next_booster_date}T10:00:00`,
              procedures: ['Vakcina'],
              status: 'Planuojamas',
              notes: `Pakartotinė vakcina: ${products.find(p => p.id === vaccinationData.product_id)?.name || 'N/A'}`,
              vet_name: vaccinationData.administered_by || formData.vet_name || null,
              next_visit_required: false,
              treatment_required: false,
            });

          if (futureVisitError) {
            console.error('Error creating future vaccination visit:', futureVisitError);
          }
        }
      }

      // 4. If Profilaktika procedure, create prevention record (using biocide_usage table)
      if (formData.procedures.includes('Profilaktika')) {
        if (!preventionData.product_id || !preventionData.batch_id || !preventionData.dose_qty) {
          throw new Error('Visi profilaktikos laukai privalomi: produktas, serija ir kiekis');
        }

        const { data: preventionRecord, error: preventionError } = await supabase
          .from('biocide_usage')
          .insert({
            product_id: preventionData.product_id,
            batch_id: preventionData.batch_id,
            use_date: formData.visit_datetime.split('T')[0],
            purpose: preventionData.purpose ? preventionData.purpose : 'Profilaktika',
            work_scope: `Gyvūnas: ${animalId}`,
            qty: parseFloat(preventionData.dose_qty),
            unit: preventionData.dose_unit,
            used_by_name: formData.vet_name ? formData.vet_name : null,
          })
          .select()
          .single();

        if (preventionError) throw preventionError;

        await logAction('create_prevention', 'biocide_usage', preventionRecord.id);
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
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Naujas vizitas</h3>
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
              onChange={(e) => setFormData({ ...formData, visit_datetime: e.target.value })}
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
            <div className="grid grid-cols-2 gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatūra (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
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
              placeholder="Papildoma informacija..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gydytojas
              </label>
              <input
                type="text"
                value={formData.vet_name}
                onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Vardas Pavardė"
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
            <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-600" />
                Gydymo informacija
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liga</label>
                  <select
                    value={treatmentData.disease_id}
                    onChange={(e) => setTreatmentData({ ...treatmentData, disease_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Pasirinkite ligą</option>
                    {diseases.map(disease => (
                      <option key={disease.id} value={disease.id}>{disease.name}</option>
                    ))}
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
                                  const oldestBatchId = await getOldestBatchWithStock(productId);
                                  newMeds[idx].batch_id = oldestBatchId;
                                  fetchStockLevel(productId);
                                } else {
                                  newMeds[idx].batch_id = '';
                                }

                                setTreatmentData({ ...treatmentData, medications: newMeds });
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Pasirinkite vaistą</option>
                              {products.filter(p => p.category === 'medicines').map(product => (
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
                              newMeds[idx].qty = e.target.value;
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={med.unit}
                            onChange={(e) => {
                              const newMeds = [...treatmentData.medications];
                              newMeds[idx].unit = e.target.value as any;
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="ml">ml</option>
                            <option value="l">l</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="pcs">vnt</option>
                          </select>
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
                        <div className="flex items-center gap-3">
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
                        medications: [...treatmentData.medications, { product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'Gydymas', is_course: false, course_days: '1' }]
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti vaistą
                  </button>

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

          {/* VAKCINA FORM */}
          {formData.procedures.includes('Vakcina') && (
            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-purple-600" />
                Vakcinacijos informacija
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vakcina *</label>
                <select
                  value={vaccinationData.product_id}
                  onChange={async (e) => {
                    const productId = e.target.value;

                    if (productId) {
                      const oldestBatchId = await getOldestBatchWithStock(productId);
                      setVaccinationData({ ...vaccinationData, product_id: productId, batch_id: oldestBatchId });
                      fetchStockLevel(productId);
                    } else {
                      setVaccinationData({ ...vaccinationData, product_id: '', batch_id: '' });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Pasirinkite vakciną</option>
                  {products.filter(p => p.category === 'prevention').map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
                {vaccinationData.product_id && stockLevels[vaccinationData.product_id] !== undefined && (
                  <div className="text-xs text-gray-500 mt-1 px-1">
                    Likutis: <span className={stockLevels[vaccinationData.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                      {stockLevels[vaccinationData.product_id].toFixed(2)}
                    </span> {products.find(p => p.id === vaccinationData.product_id)?.unit}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                <select
                  value={vaccinationData.batch_id}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled={!vaccinationData.product_id}
                  required
                >
                  <option value="">Pasirinkite seriją</option>
                  {batches.filter(b => b.product_id === vaccinationData.product_id).map(b => (
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
                    value={vaccinationData.dose_amount}
                    onChange={(e) => setVaccinationData({ ...vaccinationData, dose_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                  <select
                    value={vaccinationData.unit}
                    onChange={(e) => setVaccinationData({ ...vaccinationData, unit: e.target.value as any })}
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
                    value={vaccinationData.dose_number}
                    onChange={(e) => setVaccinationData({ ...vaccinationData, dose_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pakartotinė vakcinacija (data)</label>
                <input
                  type="date"
                  value={vaccinationData.next_booster_date}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, next_booster_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
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
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Profilaktikos informacija
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produktas *</label>
                <select
                  value={preventionData.product_id}
                  onChange={async (e) => {
                    const productId = e.target.value;

                    if (productId) {
                      const oldestBatchId = await getOldestBatchWithStock(productId);
                      setPreventionData({ ...preventionData, product_id: productId, batch_id: oldestBatchId });
                      fetchStockLevel(productId);
                    } else {
                      setPreventionData({ ...preventionData, product_id: '', batch_id: '' });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Pasirinkite produktą</option>
                  {products.filter(p => p.category === 'prevention' || p.category === 'biocide').map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
                {preventionData.product_id && stockLevels[preventionData.product_id] !== undefined && (
                  <div className="text-xs text-gray-500 mt-1 px-1">
                    Likutis: <span className={stockLevels[preventionData.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                      {stockLevels[preventionData.product_id].toFixed(2)}
                    </span> {products.find(p => p.id === preventionData.product_id)?.unit}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                <select
                  value={preventionData.batch_id}
                  onChange={(e) => setPreventionData({ ...preventionData, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  disabled={!preventionData.product_id}
                  required
                >
                  <option value="">Pasirinkite seriją</option>
                  {batches.filter(b => b.product_id === preventionData.product_id).map(b => (
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
                    value={preventionData.dose_qty}
                    onChange={(e) => setPreventionData({ ...preventionData, dose_qty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                  <select
                    value={preventionData.dose_unit}
                    onChange={(e) => setPreventionData({ ...preventionData, dose_unit: e.target.value as any })}
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
                  value={preventionData.purpose}
                  onChange={(e) => setPreventionData({ ...preventionData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Parazitų prevencija, dezinfekcija, kt."
                />
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
              {loading ? 'Kuriama...' : 'Sukurti vizitą'}
            </button>
          </div>
        </form>
      </div>
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
  );
}
