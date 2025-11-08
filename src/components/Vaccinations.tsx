import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Animal, Batch, Unit } from '../lib/types';
import { Syringe, Check, Search, CheckSquare, Square, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface VaccinationGroup {
  date: string;
  dateLabel: string;
  vaccinations: any[];
}

export function Vaccinations() {
  const { logAction } = useAuth();
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [showMassVaccination, setShowMassVaccination] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vacDateFrom, setVacDateFrom] = useState('');
  const [vacDateTo, setVacDateTo] = useState('');
  const [vacSearch, setVacSearch] = useState('');

  const [massVaccinationData, setMassVaccinationData] = useState({
    product_id: '',
    batch_id: '',
    vaccination_date: new Date().toISOString().split('T')[0],
    next_booster_date: '',
    dose_number: '1',
    dose_amount: '',
    unit: 'ml' as Unit,
    administered_by: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSubscription({
    table: 'vaccinations',
    onInsert: useCallback(() => {
      loadData();
    }, []),
    onUpdate: useCallback(() => {
      loadData();
    }, []),
    onDelete: useCallback(() => {
      loadData();
    }, []),
  });

  const loadData = async () => {
    try {
      const [vacsRes, prodsRes, animalsRes, batchesRes] = await Promise.all([
        supabase.from('vaccinations').select('*').order('vaccination_date', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).eq('category', 'prevention').order('name'),
        supabase.from('animals').select('*').eq('active', true).order('tag_no'),
        supabase.from('batches').select('*').order('expiry_date', { ascending: false }),
      ]);

      setVaccinations(vacsRes.data || []);
      setProducts(prodsRes.data || []);
      setAnimals(animalsRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const handleToggleAnimal = (animalId: string) => {
    const newSelected = new Set(selectedAnimals);
    if (newSelected.has(animalId)) {
      newSelected.delete(animalId);
    } else {
      newSelected.add(animalId);
    }
    setSelectedAnimals(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedAnimals.size === filteredAnimals.length) {
      setSelectedAnimals(new Set());
    } else {
      setSelectedAnimals(new Set(filteredAnimals.map(a => a.id)));
    }
  };

  const handleMassVaccinate = async () => {
    if (!massVaccinationData.product_id || !massVaccinationData.dose_amount) {
      alert('Pasirinkite vakciną ir įveskite dozę');
      return;
    }

    if (selectedAnimals.size === 0) {
      alert('Pasirinkite bent vieną gyvūną');
      return;
    }

    setSaving(true);

    try {
      const vaccinationEntries = Array.from(selectedAnimals).map(animalId => ({
        animal_id: animalId,
        product_id: massVaccinationData.product_id,
        batch_id: massVaccinationData.batch_id || null,
        vaccination_date: massVaccinationData.vaccination_date,
        next_booster_date: massVaccinationData.next_booster_date || null,
        dose_number: parseInt(massVaccinationData.dose_number),
        dose_amount: parseFloat(massVaccinationData.dose_amount),
        unit: massVaccinationData.unit,
        administered_by: massVaccinationData.administered_by || null,
        notes: massVaccinationData.notes || null,
      }));

      const { error } = await supabase.from('vaccinations').insert(vaccinationEntries);

      if (error) throw error;

      const selectedProduct = products.find(p => p.id === massVaccinationData.product_id);
      await logAction(
        'create_mass_vaccination',
        'vaccinations',
        null,
        null,
        {
          animal_count: selectedAnimals.size,
          product_id: massVaccinationData.product_id,
          product_name: selectedProduct?.name || 'N/A',
          batch_id: massVaccinationData.batch_id,
          vaccination_date: massVaccinationData.vaccination_date,
          dose_amount: massVaccinationData.dose_amount,
          dose_number: massVaccinationData.dose_number,
        }
      );

      // If there's a next booster date, create planned visits for all vaccinated animals
      if (massVaccinationData.next_booster_date) {
        const futureVisits = Array.from(selectedAnimals).map(animalId => ({
          animal_id: animalId,
          visit_datetime: `${massVaccinationData.next_booster_date}T10:00:00`,
          procedures: ['Vakcina'],
          status: 'Planuojamas',
          notes: `Pakartotinė vakcina: ${selectedProduct?.name || 'N/A'}`,
          vet_name: massVaccinationData.administered_by || null,
          next_visit_required: false,
          treatment_required: false,
        }));

        const { error: futureVisitsError } = await supabase
          .from('animal_visits')
          .insert(futureVisits);

        if (futureVisitsError) {
          console.error('Error creating future vaccination visits:', futureVisitsError);
        }
      }

      alert(`Sėkmingai vakcinuota ${selectedAnimals.size} gyvūnų!`);

      setSelectedAnimals(new Set());
      setShowMassVaccination(false);
      setMassVaccinationData({
        product_id: '',
        batch_id: '',
        vaccination_date: new Date().toISOString().split('T')[0],
        next_booster_date: '',
        dose_number: '1',
        dose_amount: '',
        unit: 'ml',
        administered_by: '',
        notes: '',
      });

      await loadData();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDateLabel = (dateStr: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const vacDate = new Date(dateStr);
    vacDate.setHours(0, 0, 0, 0);

    if (vacDate.getTime() === today.getTime()) {
      return 'Šiandien';
    } else if (vacDate.getTime() === yesterday.getTime()) {
      return 'Vakar';
    } else {
      const daysDiff = Math.floor((today.getTime() - vacDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0 && daysDiff < 7) {
        return `Prieš ${daysDiff} d.`;
      }
      return dateStr;
    }
  };

  const groupVaccinationsByDate = (): VaccinationGroup[] => {
    const grouped = new Map<string, any[]>();

    vaccinations.forEach(vac => {
      const date = vac.vaccination_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(vac);
    });

    return Array.from(grouped.entries()).map(([date, vacs]) => ({
      date,
      dateLabel: getDateLabel(date),
      vaccinations: vacs,
    }));
  };

  const filteredAnimals = animals.filter(a =>
    a.tag_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.holder_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVaccinations = vaccinations.filter(vac => {
    let match = true;

    if (vacDateFrom) {
      match = match && vac.vaccination_date >= vacDateFrom;
    }

    if (vacDateTo) {
      match = match && vac.vaccination_date <= vacDateTo;
    }

    if (vacSearch) {
      const search = vacSearch.toLowerCase();
      const animal = animals.find(a => a.id === vac.animal_id);
      const product = products.find(p => p.id === vac.product_id);

      match = match && (
        animal?.tag_no?.toLowerCase().includes(search) ||
        animal?.holder_name?.toLowerCase().includes(search) ||
        product?.name?.toLowerCase().includes(search) ||
        vac.administered_by?.toLowerCase().includes(search) ||
        vac.notes?.toLowerCase().includes(search) ||
        vac.batch_id?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const availableBatches = batches.filter(b => b.product_id === massVaccinationData.product_id);

  const groupVaccinationsByDateFiltered = (): VaccinationGroup[] => {
    const grouped = new Map<string, any[]>();

    filteredVaccinations.forEach(vac => {
      const date = vac.vaccination_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(vac);
    });

    return Array.from(grouped.entries()).map(([date, vacs]) => ({
      date,
      dateLabel: getDateLabel(date),
      vaccinations: vacs,
    }));
  };

  const groupedVaccinations = groupVaccinationsByDateFiltered();

  if (loading) return <div className="text-center py-8">Kraunama...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Syringe className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Vakcinacijos</h2>
        </div>
        <button
          onClick={() => setShowMassVaccination(!showMassVaccination)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Syringe className="w-5 h-5" />
          Masinė vakcinacija
        </button>
      </div>

      {showMassVaccination && (
        <div className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Masinė vakcinacija</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vakcina *
              </label>
              <select
                value={massVaccinationData.product_id}
                onChange={async (e) => {
                  const productId = e.target.value;

                  if (productId) {
                    const oldestBatchId = await getOldestBatchWithStock(productId);
                    setMassVaccinationData({ ...massVaccinationData, product_id: productId, batch_id: oldestBatchId });
                  } else {
                    setMassVaccinationData({ ...massVaccinationData, product_id: '', batch_id: '' });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pasirinkite vakciną</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {massVaccinationData.product_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partija
                </label>
                <select
                  value={massVaccinationData.batch_id}
                  onChange={(e) => setMassVaccinationData({ ...massVaccinationData, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pasirinkite partiją</option>
                  {availableBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.lot} (Galioja iki: {b.expiry_date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dozė *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={massVaccinationData.dose_amount}
                  onChange={(e) => setMassVaccinationData({ ...massVaccinationData, dose_amount: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="2.5"
                />
                <select
                  value={massVaccinationData.unit}
                  onChange={(e) => setMassVaccinationData({ ...massVaccinationData, unit: e.target.value as Unit })}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vakcinacijos data
              </label>
              <input
                type="date"
                value={massVaccinationData.vaccination_date}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, vaccination_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kita vakcinacija
              </label>
              <input
                type="date"
                value={massVaccinationData.next_booster_date}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, next_booster_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dozės numeris
              </label>
              <input
                type="number"
                value={massVaccinationData.dose_number}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, dose_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vakcinavo
              </label>
              <input
                type="text"
                value={massVaccinationData.administered_by}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, administered_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Vardas Pavardė"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pastabos
              </label>
              <textarea
                value={massVaccinationData.notes}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Papildoma informacija..."
              />
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Pasirinkta gyvūnų: <span className="text-blue-600 font-bold">{selectedAnimals.size}</span>
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ieškoti gyvūno..."
                  className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors" onClick={handleToggleAll}>
                {selectedAnimals.size === filteredAnimals.length && filteredAnimals.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs font-semibold text-gray-700">
                  {selectedAnimals.size === filteredAnimals.length && filteredAnimals.length > 0 ? 'Atžymėti visus' : 'Pažymėti visus'}
                </span>
              </div>

              {filteredAnimals.map(animal => (
                <div
                  key={animal.id}
                  onClick={() => handleToggleAnimal(animal.id)}
                  className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                    selectedAnimals.has(animal.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {selectedAnimals.has(animal.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{animal.tag_no}</p>
                    <p className="text-xs text-gray-500">{animal.holder_name}</p>
                  </div>
                  <span className="text-xs text-gray-500">{animal.species}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowMassVaccination(false);
                setSelectedAnimals(new Set());
              }}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Atšaukti
            </button>
            <button
              onClick={handleMassVaccinate}
              disabled={saving || selectedAnimals.size === 0 || !massVaccinationData.product_id || !massVaccinationData.dose_amount}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-5 h-5" />
              {saving ? 'Išsaugoma...' : `Vakcinuoti (${selectedAnimals.size})`}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-900">Vakcinacijų istorija</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Filtrai</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
              <input
                type="date"
                value={vacDateFrom}
                onChange={(e) => setVacDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
              <input
                type="date"
                value={vacDateTo}
                onChange={(e) => setVacDateTo(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vacSearch}
                  onChange={(e) => setVacSearch(e.target.value)}
                  placeholder="Gyvūnas, vakcina, serija..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Rasta: <strong>{filteredVaccinations.length}</strong> iš {vaccinations.length}
            </span>
            {(vacDateFrom || vacDateTo || vacSearch) && (
              <button
                onClick={() => {
                  setVacDateFrom('');
                  setVacDateTo('');
                  setVacSearch('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Išvalyti filtrus
              </button>
            )}
          </div>
        </div>

        {groupedVaccinations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8 text-center">
            <Syringe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nėra vakcinacijų</p>
          </div>
        ) : (
          groupedVaccinations.map(group => (
            <div key={group.date} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{group.dateLabel}</h4>
                  <p className="text-sm text-gray-600">{group.date}</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-blue-200 shadow-sm">
                  <Syringe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">
                    {group.vaccinations.length} vakcinacij{group.vaccinations.length === 1 ? 'a' : 'os'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gyvūnas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vakcina</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dozė</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Kita vakcina</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vakcinavo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.vaccinations.map((vac: any) => (
                      <tr key={vac.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {animals.find(a => a.id === vac.animal_id)?.tag_no || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {products.find(p => p.id === vac.product_id)?.name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <span className="font-medium">{vac.dose_amount} {vac.unit}</span>
                          {vac.dose_number > 1 && <span className="ml-1 text-xs text-gray-500">(#{vac.dose_number})</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {vac.next_booster_date || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {vac.administered_by || <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
