import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisit, VisitProcedure, VisitStatus, Treatment, Product, UsageItem } from '../lib/types';
import { X, Calendar, Thermometer, Pill, Syringe, FileText, Plus, CheckCircle, XCircle, Clock, AlertCircle, Package } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';

interface Vaccination {
  id: string;
  animal_id: string;
  product_id: string;
  vaccination_date: string;
  batch_id: string | null;
  dose_qty: number;
  dose_unit: string;
  next_vaccination_date: string | null;
  vet_name: string | null;
  notes: string | null;
  created_at: string;
}

interface VaccinationWithProduct extends Vaccination {
  product?: Product;
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
}

type TabType = 'overview' | 'visits' | 'treatments' | 'vaccinations' | 'logs';

export function AnimalDetailSidebar({ animal, onClose }: AnimalDetailSidebarProps) {
  const { logAction } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('visits');
  const [visits, setVisits] = useState<AnimalVisit[]>([]);
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [animal.id]);

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
      const treatmentsWithItems = await Promise.all(
        treatmentsData.map(async (treatment: any) => {
          const { data: usageData } = await supabase
            .from('usage_items')
            .select('*, product:products(*)')
            .eq('treatment_id', treatment.id);

          return {
            ...treatment,
            disease_name: treatment.disease?.name,
            usage_items: usageData || []
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
    <div className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {animal.tag_no || 'Nenurodytas ID'}
          </h2>
          <p className="text-sm text-gray-600">
            {animal.species} {animal.sex && `• ${animal.sex}`} {animal.age_months && `• ${animal.age_months} mėn.`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Apžvalga
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'visits'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vizitai
        </button>
        <button
          onClick={() => setActiveTab('treatments')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'treatments'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Gydymas
        </button>
        <button
          onClick={() => setActiveTab('vaccinations')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'vaccinations'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vakcinos
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Žurnalai
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Informacija</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-medium">{animal.tag_no || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Rūšis:</span>
                  <span className="ml-2 font-medium">{animal.species}</span>
                </div>
                <div>
                  <span className="text-gray-600">Lytis:</span>
                  <span className="ml-2 font-medium">{animal.sex || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amžius:</span>
                  <span className="ml-2 font-medium">{animal.age_months ? `${animal.age_months} mėn.` : '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Laikytojas:</span>
                  <span className="ml-2 font-medium">{animal.holder_name || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Adresas:</span>
                  <span className="ml-2 font-medium">{animal.holder_address || '-'}</span>
                </div>
              </div>
            </div>

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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Statistika</h4>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{visits.length}</p>
                  <p className="text-gray-600">Vizitų</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{treatments.length}</p>
                  <p className="text-gray-600">Gydymų</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{futureVisits.length}</p>
                  <p className="text-gray-600">Būsimų</p>
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

            {todayVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Šiandien
                </h3>
                <div className="space-y-3">
                  {todayVisits.map(visit => (
                    <VisitCard key={visit.id} visit={visit} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                  ))}
                </div>
              </div>
            )}

            {futureVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  Ateities
                </h3>
                <div className="space-y-3">
                  {futureVisits.map(visit => (
                    <VisitCard key={visit.id} visit={visit} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                  ))}
                </div>
              </div>
            )}

            {pastVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  Praeities
                </h3>
                <div className="space-y-3">
                  {pastVisits.slice(0, 5).map(visit => (
                    <VisitCard key={visit.id} visit={visit} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                  ))}
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
            {treatments.length > 0 ? (
              treatments.map(treatment => (
                <div key={treatment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {formatDateLT(treatment.reg_date)}
                      </div>
                      {treatment.disease_name && (
                        <div className="text-sm text-red-600 font-medium">
                          Diagnozė: {treatment.disease_name}
                        </div>
                      )}
                    </div>
                    {treatment.vet_name && (
                      <div className="text-xs text-gray-500">
                        Gyd.: {treatment.vet_name}
                      </div>
                    )}
                  </div>

                  {treatment.clinical_diagnosis && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600">Klinikinis diagnozas:</span>
                      <p className="text-sm text-gray-700">{treatment.clinical_diagnosis}</p>
                    </div>
                  )}

                  {treatment.usage_items && treatment.usage_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        Panaudoti vaistai:
                      </div>
                      <div className="space-y-2">
                        {treatment.usage_items.map((item: UsageItemWithProduct) => (
                          <div key={item.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.product?.name || 'Nežinomas produktas'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {item.purpose}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                              {item.qty} {item.unit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {treatment.withdrawal_until && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-600">Nurašymas iki:</span>
                        <span className="font-medium text-orange-600">{formatDateLT(treatment.withdrawal_until)}</span>
                      </div>
                    </div>
                  )}

                  {treatment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-1">Pastabos:</div>
                      <p className="text-sm text-gray-700">{treatment.notes}</p>
                    </div>
                  )}

                  {treatment.outcome && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-1">Rezultatas:</div>
                      <p className="text-sm text-gray-700">{treatment.outcome}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Pill className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nėra gydymų</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div className="space-y-4">
            {vaccinations.length > 0 ? (
              vaccinations.map(vaccination => (
                <div key={vaccination.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-blue-600" />
                        {vaccination.product?.name || 'Nežinoma vakcina'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDateLT(vaccination.vaccination_date)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Dozė:</span>
                      <span className="font-medium text-gray-900">
                        {vaccination.dose_qty} {vaccination.dose_unit}
                      </span>
                    </div>

                    {vaccination.next_vaccination_date && (
                      <div className="flex items-center justify-between text-sm bg-green-50 rounded px-3 py-2">
                        <span className="text-gray-600">Kita vakcina:</span>
                        <span className="font-medium text-green-700">
                          {formatDateLT(vaccination.next_vaccination_date)}
                        </span>
                      </div>
                    )}

                    {vaccination.vet_name && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        Gyd.: {vaccination.vet_name}
                      </div>
                    )}

                    {vaccination.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-600 mb-1">Pastabos:</div>
                        <p className="text-sm text-gray-700">{vaccination.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Syringe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nėra vakcinacijų</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Gyvūno istorija
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Iš viso vizitų:</span>
                    <span className="text-lg font-bold text-blue-600">{visits.length}</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Iš viso gydymų:</span>
                    <span className="text-lg font-bold text-green-600">{treatments.length}</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Iš viso vakcinacijų:</span>
                    <span className="text-lg font-bold text-purple-600">{vaccinations.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Paskutiniai įvykiai</h3>
              <div className="space-y-2 text-sm">
                {visits.slice(0, 5).map(visit => (
                  <div key={visit.id} className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatDateLT(visit.visit_datetime)}</span>
                    <span>•</span>
                    <span>Vizitas ({visit.procedures.join(', ')})</span>
                  </div>
                ))}
                {treatments.slice(0, 3).map(treatment => (
                  <div key={treatment.id} className="flex items-center gap-2 text-gray-700">
                    <Pill className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatDateLT(treatment.reg_date)}</span>
                    <span>•</span>
                    <span>Gydymas{treatment.disease_name ? `: ${treatment.disease_name}` : ''}</span>
                  </div>
                ))}
                {vaccinations.slice(0, 3).map(vaccination => (
                  <div key={vaccination.id} className="flex items-center gap-2 text-gray-700">
                    <Syringe className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatDateLT(vaccination.vaccination_date)}</span>
                    <span>•</span>
                    <span>Vakcina: {vaccination.product?.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {visits.length === 0 && treatments.length === 0 && vaccinations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nėra įvykių</p>
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
    </div>
  );
}

function VisitCard({ visit, getStatusColor, getStatusIcon }: { visit: AnimalVisit; getStatusColor: (status: VisitStatus) => string; getStatusIcon: (status: VisitStatus) => JSX.Element }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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
    }>,
  });

  // Vaccination form data
  const [vaccinationData, setVaccinationData] = useState({
    product_id: '',
    batch_id: '',
    dose_qty: '',
    dose_unit: 'ml' as 'ml' | 'l' | 'g' | 'kg' | 'pcs',
    next_vaccination_date: '',
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
      supabase.from('stock_by_batch').select('*'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
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
          notes: formData.notes || null,
          vet_name: formData.vet_name || null,
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
            disease_id: treatmentData.disease_id || null,
            clinical_diagnosis: treatmentData.clinical_diagnosis || null,
            tests: treatmentData.tests || null,
            animal_condition: treatmentData.animal_condition || null,
            outcome: treatmentData.outcome || null,
            services: treatmentData.services || null,
            withdrawal_until: treatmentData.withdrawal_until || null,
            vet_name: formData.vet_name || null,
            notes: treatmentData.notes || null,
          })
          .select()
          .single();

        if (treatmentError) throw treatmentError;

        // Create usage items for medications
        for (const med of treatmentData.medications) {
          const { error: usageError } = await supabase
            .from('usage_items')
            .insert({
              treatment_id: treatmentRecord.id,
              product_id: med.product_id,
              batch_id: med.batch_id,
              qty: parseFloat(med.qty),
              unit: med.unit,
              purpose: med.purpose,
            });

          if (usageError) throw usageError;
        }

        await logAction('create_treatment', 'treatments', treatmentRecord.id);
      }

      // 3. If Vakcina procedure, create vaccination
      if (formData.procedures.includes('Vakcina')) {
        const { data: vaccinationRecord, error: vaccinationError } = await supabase
          .from('vaccinations')
          .insert({
            animal_id: animalId,
            product_id: vaccinationData.product_id,
            batch_id: vaccinationData.batch_id || null,
            vaccination_date: formData.visit_datetime.split('T')[0],
            dose_qty: parseFloat(vaccinationData.dose_qty),
            dose_unit: vaccinationData.dose_unit,
            next_vaccination_date: vaccinationData.next_vaccination_date || null,
            vet_name: formData.vet_name || null,
            notes: vaccinationData.notes || null,
          })
          .select()
          .single();

        if (vaccinationError) throw vaccinationError;

        await logAction('create_vaccination', 'vaccinations', vaccinationRecord.id);
      }

      // 4. If Profilaktika procedure, create prevention record (using biocide_usage table)
      if (formData.procedures.includes('Profilaktika')) {
        const { data: preventionRecord, error: preventionError } = await supabase
          .from('biocide_usage')
          .insert({
            product_id: preventionData.product_id,
            batch_id: preventionData.batch_id || null,
            use_date: formData.visit_datetime.split('T')[0],
            purpose: preventionData.purpose || 'Profilaktika',
            work_scope: `Gyvūnas: ${animalId}`,
            qty: parseFloat(preventionData.dose_qty),
            unit: preventionData.dose_unit,
            used_by_name: formData.vet_name || null,
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

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nurašymas iki</label>
                  <input
                    type="date"
                    value={treatmentData.withdrawal_until}
                    onChange={(e) => setTreatmentData({ ...treatmentData, withdrawal_until: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
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
                <div className="space-y-2">
                  {treatmentData.medications.map((med, idx) => (
                    <div key={idx} className="flex gap-2 bg-white p-2 rounded border border-gray-300">
                      <select
                        value={med.product_id}
                        onChange={(e) => {
                          const newMeds = [...treatmentData.medications];
                          newMeds[idx].product_id = e.target.value;
                          setTreatmentData({ ...treatmentData, medications: newMeds });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Pasirinkite vaistą</option>
                        {products.filter(p => p.category === 'medicines').map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
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
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <select
                        value={med.unit}
                        onChange={(e) => {
                          const newMeds = [...treatmentData.medications];
                          newMeds[idx].unit = e.target.value as any;
                          setTreatmentData({ ...treatmentData, medications: newMeds });
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
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
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setTreatmentData({
                        ...treatmentData,
                        medications: [...treatmentData.medications, { product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'Gydymas' }]
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti vaistą
                  </button>
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
                  onChange={(e) => setVaccinationData({ ...vaccinationData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Pasirinkite vakciną</option>
                  {products.filter(p => p.category === 'prevention').map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dozė *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vaccinationData.dose_qty}
                    onChange={(e) => setVaccinationData({ ...vaccinationData, dose_qty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                  <select
                    value={vaccinationData.dose_unit}
                    onChange={(e) => setVaccinationData({ ...vaccinationData, dose_unit: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Kita vakcina (data)</label>
                <input
                  type="date"
                  value={vaccinationData.next_vaccination_date}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, next_vaccination_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  onChange={(e) => setPreventionData({ ...preventionData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Pasirinkite produktą</option>
                  {products.filter(p => p.category === 'prevention' || p.category === 'biocide').map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
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
