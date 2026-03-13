import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Calendar, AlertCircle, Check, ArrowRight, X, Save } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { SearchableSelect } from './SearchableSelect';
import { fetchAllRows } from '../lib/helpers';

interface Treatment {
  id: string;
  reg_date: string;
  first_symptoms_date: string | null;
  withdrawal_until_meat: string | null;
  withdrawal_until_milk: string | null;
  animal_id: string;
  disease_id: string | null;
  clinical_diagnosis: string | null;
  vet_name: string | null;
  notes: string | null;
  created_at: string;
}

interface TreatmentWithDetails extends Treatment {
  animal_tag: string;
  species: string;
  holder_name: string | null;
  disease_name: string | null;
  products_used: any[];
  courses: any[];
  pending_visits: any[];
}

interface Animal {
  id: string;
  tag_no: string;
  species: string;
  holder_name: string | null;
}

export function TreatmentTransfer() {
  const { user, logAction } = useAuth();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newAnimalId, setNewAnimalId] = useState('');

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!user?.email) {
      setAuthError('Vartotojas nerastas');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('verify_password', {
        p_email: user.email,
        p_password: password,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setAuthError('Neteisingas slaptažodis');
        return;
      }

      setAuthenticated(true);
      setPassword('');
    } catch (error: any) {
      setAuthError('Autentifikavimo klaida');
      console.error('Auth error:', error);
    }
  };

  const loadAnimals = async () => {
    console.log('Loading animals...');
    try {
      const data = await fetchAllRows<Animal>(
        'animals',
        'id, tag_no, species, holder_name',
        'tag_no',
        [{ column: 'active', value: true }]
      );
      console.log('Loaded animals:', data.length);
      setAnimals(data);
    } catch (error) {
      console.error('Error loading animals:', error);
      setAnimals([]);
    }
  };

  const loadTreatments = async () => {
    setLoading(true);
    try {
      // Only load treatments with ACTIVE withdrawal periods (karencija)
      let query = supabase
        .from('treatments')
        .select(`
          *,
          animals!inner(tag_no, species, holder_name),
          diseases(name)
        `)
        .or(`withdrawal_until_meat.gte.${new Date().toISOString().split('T')[0]},withdrawal_until_milk.gte.${new Date().toISOString().split('T')[0]}`)
        .order('reg_date', { ascending: false });

      if (dateFrom) {
        query = query.gte('reg_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('reg_date', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const treatmentsWithDetails = await Promise.all(
        (data || []).map(async (treatment: any) => {
          // Load usage items
          const { data: usageItems } = await supabase
            .from('usage_items')
            .select(`
              qty,
              unit,
              products(name, withdrawal_days_milk, withdrawal_days_meat)
            `)
            .eq('treatment_id', treatment.id);

          // Load courses
          const { data: courses } = await supabase
            .from('treatment_courses')
            .select(`
              id,
              days,
              status,
              start_date,
              products(name)
            `)
            .eq('treatment_id', treatment.id);

          // Load pending visits
          const courseIds = courses?.map(c => c.id) || [];
          let pendingVisitsQuery = supabase
            .from('animal_visits')
            .select('*')
            .eq('animal_id', treatment.animal_id)
            .in('status', ['Planuojamas', 'Vykdomas']);

          if (courseIds.length > 0) {
            pendingVisitsQuery = pendingVisitsQuery.or(
              `related_treatment_id.eq.${treatment.id},course_id.in.(${courseIds.join(',')})`
            );
          } else {
            pendingVisitsQuery = pendingVisitsQuery.eq('related_treatment_id', treatment.id);
          }

          const { data: pendingVisits } = await pendingVisitsQuery;

          return {
            id: treatment.id,
            reg_date: treatment.reg_date,
            first_symptoms_date: treatment.first_symptoms_date,
            withdrawal_until_meat: treatment.withdrawal_until_meat,
            withdrawal_until_milk: treatment.withdrawal_until_milk,
            animal_id: treatment.animal_id,
            disease_id: treatment.disease_id,
            clinical_diagnosis: treatment.clinical_diagnosis,
            vet_name: treatment.vet_name,
            notes: treatment.notes,
            created_at: treatment.created_at,
            animal_tag: treatment.animals.tag_no,
            species: treatment.animals.species,
            holder_name: treatment.animals.holder_name,
            disease_name: treatment.diseases?.name || null,
            products_used: usageItems || [],
            courses: courses || [],
            pending_visits: pendingVisits || [],
          };
        })
      );

      const filtered = treatmentsWithDetails.filter((t) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          t.animal_tag?.toLowerCase().includes(search) ||
          t.holder_name?.toLowerCase().includes(search) ||
          t.disease_name?.toLowerCase().includes(search)
        );
      });

      setTreatments(filtered);
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadAnimals();
      loadTreatments();
    }
  }, [authenticated, dateFrom, dateTo]);

  useEffect(() => {
    if (authenticated && searchTerm !== undefined) {
      const timer = setTimeout(() => {
        loadTreatments();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const handleStartTransfer = (treatment: TreatmentWithDetails) => {
    setTransferringId(treatment.id);
    setNewAnimalId('');
    setSuccessMessage('');
    console.log('Available animals:', animals.length);
  };

  const handleCancel = () => {
    setTransferringId(null);
    setNewAnimalId('');
  };

  const handleTransfer = async () => {
    if (!transferringId || !newAnimalId) return;

    const treatment = treatments.find((t) => t.id === transferringId);
    if (!treatment) return;

    const newAnimal = animals.find((a) => a.id === newAnimalId);
    if (!newAnimal) return;

    const confirmMessage = `⚠️ KRITINIS VEIKSMAS ⚠️

Ar tikrai norite PERKELTI šį gydymą į kitą gyvūną?

SENAS GYVŪNAS:
  • Numeris: ${treatment.animal_tag}
  • Rūšis: ${treatment.species}
  • Liga: ${treatment.disease_name || 'N/A'}
  • Produktai: ${treatment.products_used.map(p => p.products?.name).join(', ') || 'N/A'}

NAUJAS GYVŪNAS:
  • Numeris: ${newAnimal.tag_no}
  • Rūšis: ${newAnimal.species}

KAS BUS PERKELTA:
  • Gydymas ir visi jo duomenys
  • ${treatment.courses.length} gydymo kursai
  • ${treatment.pending_visits.length} būsimi/planuojami apsilankymai
  • Karencijos laikotarpis

SVARBU:
  • Senas gyvūnas NETEKS karencijos laikotarpio
  • Naujas gyvūnas ĮGIS karencijos laikotarpį
  • Užbaigti apsilankymai liks prie seno gyvūno (istoriniai įrašai)
  • Šis veiksmas yra NEGRĮŽTAMAS

Ar tikrai tęsti?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('transfer_treatment_to_animal', {
        p_treatment_id: transferringId,
        p_old_animal_id: treatment.animal_id,
        p_new_animal_id: newAnimalId,
        p_reason: 'Treatment transferred via admin interface',
      });

      if (error) throw error;

      console.log('Transfer result:', data);

      await logAction(
        'transfer_treatment',
        'treatments',
        transferringId,
        {
          old_animal_id: treatment.animal_id,
          old_animal_tag: treatment.animal_tag,
        },
        {
          new_animal_id: newAnimalId,
          new_animal_tag: newAnimal.tag_no,
          affected_visits: data.affected_visits,
          result: data,
        }
      );

      setSuccessMessage(`Gydymas sėkmingai perkeltas! Perkelta ${data.affected_visits} būsimų apsilankymų.`);
      setTransferringId(null);
      setNewAnimalId('');
      await loadTreatments();

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      alert('Klaida perkeliant gydymą: ' + error.message);
      console.error('Transfer error:', error);
    } finally {
      setSaving(false);
    }
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWithdrawalStatus = (meatDate: string | null, milkDate: string | null) => {
    const meatDays = getDaysUntil(meatDate);
    const milkDays = getDaysUntil(milkDate);

    const maxDays = Math.max(meatDays || -1, milkDays || -1);

    if (maxDays < 0) return { text: 'Laisvas', color: 'text-green-600 bg-green-50' };
    if (maxDays === 0) return { text: 'Baigiasi šiandien', color: 'text-orange-600 bg-orange-50' };
    if (maxDays <= 3) return { text: `Liko ${maxDays} d.`, color: 'text-orange-600 bg-orange-50' };
    return { text: `Liko ${maxDays} d.`, color: 'text-blue-600 bg-blue-50' };
  };

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            ŽURNALAS - Gydymų perkėlimas
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Įveskite savo slaptažodį norėdami tęsti
          </p>
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slaptažodis
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Autentifikuoti
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ieškoti pagal gyvūną, savininką..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Data nuo"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Data iki"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Rasta gydymų: <span className="font-semibold text-gray-900">{treatments.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : treatments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Gydymų nerasta. Pakeiskite paieškos parametrus.
          </div>
        ) : (
          <div className="space-y-4">
            {treatments.map((treatment) => {
              const isTransferring = transferringId === treatment.id;
              const status = getWithdrawalStatus(
                treatment.withdrawal_until_meat,
                treatment.withdrawal_until_milk
              );

              return (
                <div
                  key={treatment.id}
                  className={`border-2 rounded-lg p-4 transition-colors ${
                    isTransferring ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {treatment.animal_tag}
                        </h3>
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {treatment.species}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        {treatment.disease_name && (
                          <div>
                            <span className="font-medium">Liga:</span> {treatment.disease_name}
                          </div>
                        )}
                        {treatment.holder_name && (
                          <div>
                            <span className="font-medium">Savininkas:</span> {treatment.holder_name}
                          </div>
                        )}
                        {treatment.vet_name && (
                          <div>
                            <span className="font-medium">Veterinaras:</span> {treatment.vet_name}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Būsimi apsilankymai:</span> {treatment.pending_visits.length}
                        </div>
                      </div>
                    </div>
                    {!isTransferring && (
                      <button
                        onClick={() => handleStartTransfer(treatment)}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Perkelti
                      </button>
                    )}
                  </div>

                  {isTransferring ? (
                    <div className="space-y-4 mt-4 pt-4 border-t border-blue-200">
                      <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-900 mb-2">Perkėlimo informacija</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Bus perkelta {treatment.courses.length} gydymo kursų</li>
                          <li>• Bus perkelta {treatment.pending_visits.length} būsimų apsilankymų</li>
                          <li>• Karencijos laikotarpis bus perkeltas naujam gyvūnui</li>
                          <li>• Užbaigti apsilankymai liks prie seno gyvūno</li>
                        </ul>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Naujas gyvūnas * ({animals.filter(a => a.id !== treatment.animal_id).length} available)
                        </label>
                        {animals.length === 0 ? (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Gyvūnų sąrašas neįkeltas. Pabandykite perkrauti puslapį.
                          </div>
                        ) : (
                          <SearchableSelect
                            options={animals
                              .filter(a => a.id !== treatment.animal_id)
                              .map(a => ({
                                value: a.id,
                                label: `${a.tag_no} (${a.species})${a.holder_name ? ` - ${a.holder_name}` : ''}`
                              }))}
                            value={newAnimalId}
                            onChange={setNewAnimalId}
                            placeholder="Pasirinkite gyvūną..."
                          />
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Atšaukti
                        </button>
                        <button
                          onClick={handleTransfer}
                          disabled={saving || !newAnimalId}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Perkeliama...' : 'Perkelti gydymą'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Reg. data:</span>
                          <div className="font-medium text-gray-900">
                            {treatment.reg_date ? formatDateLT(treatment.reg_date) : 'N/A'}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Simptomai:</span>
                          <div className="font-medium text-gray-900">
                            {treatment.first_symptoms_date ? formatDateLT(treatment.first_symptoms_date) : 'N/A'}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Mėsa iki:</span>
                          <div className="font-medium text-gray-900">
                            {treatment.withdrawal_until_meat ? formatDateLT(treatment.withdrawal_until_meat) : 'N/A'}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Pienas iki:</span>
                          <div className="font-medium text-gray-900">
                            {treatment.withdrawal_until_milk ? formatDateLT(treatment.withdrawal_until_milk) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {treatment.products_used.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-700 mb-2">Panaudoti produktai:</div>
                          <div className="flex flex-wrap gap-2">
                            {treatment.products_used.map((item: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                              >
                                {item.products?.name || 'N/A'}
                                {(item.products?.withdrawal_days_milk || item.products?.withdrawal_days_meat) && 
                                  ` (M:${item.products.withdrawal_days_milk || 0}d / P:${item.products.withdrawal_days_meat || 0}d)`
                                }
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {treatment.courses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-700 mb-2">Gydymo kursai:</div>
                          <div className="flex flex-wrap gap-2">
                            {treatment.courses.map((course: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                              >
                                {course.products?.name || 'N/A'} - {course.days}d ({course.status})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
