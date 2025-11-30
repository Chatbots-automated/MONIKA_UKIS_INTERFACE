import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SearchableSelect } from './SearchableSelect';

interface Product {
  id: string;
  name: string;
  primary_pack_unit: string;
  withdrawal_days_milk?: number;
  withdrawal_days_meat?: number;
}

interface Batch {
  id: string;
  batch_no: string;
  available_qty: number;
}

interface ScheduledMedication {
  id: string;
  product_id: string;
  batch_id: string | null;
  unit: string;
  teat: string | null;
  purpose: string;
}

interface DateMedications {
  date: string;
  medications: ScheduledMedication[];
}

interface CourseMedicationSchedulerProps {
  animalId: string;
  onConfirm: (schedule: DateMedications[]) => void;
  onCancel: () => void;
  initialStartDate?: string;
}

export function CourseMedicationScheduler({
  animalId,
  onConfirm,
  onCancel,
  initialStartDate
}: CourseMedicationSchedulerProps) {
  const [step, setStep] = useState<'dates' | 'medications' | 'review'>('dates');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Map<string, Batch[]>>(new Map());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateSchedule, setDateSchedule] = useState<Map<string, ScheduledMedication[]>>(new Map());
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  useEffect(() => {
    loadProducts();
    if (initialStartDate) {
      const today = new Date(initialStartDate);
      setSelectedDates([today.toISOString().split('T')[0]]);
    }
  }, [initialStartDate]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('category', ['Vet Medicines', 'Vaccines', 'Supplements'])
      .order('name');

    if (!error && data) {
      setProducts(data);
    }
  };

  const loadBatchesForProduct = async (productId: string) => {
    if (batches.has(productId)) return;

    const { data } = await supabase
      .from('batches')
      .select('id, batch_no, available_qty')
      .eq('product_id', productId)
      .gt('available_qty', 0)
      .order('expiry_date', { ascending: true });

    if (data) {
      setBatches(new Map(batches.set(productId, data)));
    }
  };

  const addDate = () => {
    const lastDate = selectedDates.length > 0
      ? new Date(selectedDates[selectedDates.length - 1])
      : new Date(initialStartDate || new Date());

    lastDate.setDate(lastDate.getDate() + 1);
    const newDate = lastDate.toISOString().split('T')[0];

    if (!selectedDates.includes(newDate)) {
      setSelectedDates([...selectedDates, newDate]);
      dateSchedule.set(newDate, []);
    }
  };

  const removeDate = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
    dateSchedule.delete(dateToRemove);
    setDateSchedule(new Map(dateSchedule));
  };

  const addMedicationToDate = (date: string) => {
    const currentMeds = dateSchedule.get(date) || [];
    const newMed: ScheduledMedication = {
      id: crypto.randomUUID(),
      product_id: '',
      batch_id: null,
      unit: 'ml',
      teat: null,
      purpose: 'Gydymas'
    };
    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, [...currentMeds, newMed]);
    setDateSchedule(newSchedule);
  };

  const updateMedication = (date: string, medId: string, field: keyof ScheduledMedication, value: any) => {
    const meds = dateSchedule.get(date) || [];
    const updated = meds.map(m => {
      if (m.id === medId) {
        const updatedMed = { ...m, [field]: value };

        // Auto-load unit when product is selected
        if (field === 'product_id' && value) {
          const selectedProduct = products.find(p => p.id === value);
          if (selectedProduct?.primary_pack_unit) {
            updatedMed.unit = selectedProduct.primary_pack_unit;
          }
          loadBatchesForProduct(value);
        }

        return updatedMed;
      }
      return m;
    });

    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, updated);
    setDateSchedule(newSchedule);
  };

  const removeMedication = (date: string, medId: string) => {
    const meds = dateSchedule.get(date) || [];
    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, meds.filter(m => m.id !== medId));
    setDateSchedule(newSchedule);
  };

  const canProceedToMedications = selectedDates.length >= 2;

  const canProceedToReview = () => {
    for (const date of selectedDates) {
      const meds = dateSchedule.get(date) || [];
      if (meds.length === 0) return false;
      if (meds.some(m => !m.product_id)) return false;
    }
    return true;
  };

  const formatDateLT = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleConfirm = () => {
    const schedule: DateMedications[] = selectedDates.map(date => ({
      date,
      medications: dateSchedule.get(date) || []
    }));
    onConfirm(schedule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Gydymo kurso planavimas</h2>
            <p className="text-purple-100 text-sm mt-1">
              {step === 'dates' && 'Pasirinkite gydymo dienas'}
              {step === 'medications' && 'Priskirkite vaistus kiekvienai dienai'}
              {step === 'review' && 'Peržiūrėkite ir patvirtinkite'}
            </p>
          </div>
          <button onClick={onCancel} className="text-white hover:bg-white hover:bg-opacity-20 rounded p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center justify-center py-4 px-6 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'dates' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'dates' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span>Datos</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 'medications' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'medications' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>Vaistai</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span>Peržiūra</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'dates' && (
            <div>
              <div className="mb-4">
                <p className="text-gray-700 mb-4">
                  Pasirinkite visas dienas, kada bus atliekamas gydymas. Kursui reikia bent 2 dienų.
                </p>
                <button
                  onClick={addDate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti dieną
                </button>
              </div>

              <div className="space-y-2">
                {selectedDates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>Paspauskite "Pridėti dieną" kad pradėtumėte</p>
                  </div>
                ) : (
                  selectedDates.map((date, index) => (
                    <div key={date} className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            const newDates = [...selectedDates];
                            newDates[index] = e.target.value;
                            setSelectedDates(newDates);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                        />
                      </div>
                      {selectedDates.length > 1 && (
                        <button
                          onClick={() => removeDate(date)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 'medications' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Diena {currentDateIndex + 1} iš {selectedDates.length}
                  </h3>
                  <p className="text-sm text-gray-600">{formatDateLT(selectedDates[currentDateIndex])}</p>
                </div>
                <div className="flex gap-2">
                  {currentDateIndex > 0 && (
                    <button
                      onClick={() => setCurrentDateIndex(currentDateIndex - 1)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Atgal
                    </button>
                  )}
                  {currentDateIndex < selectedDates.length - 1 && (
                    <button
                      onClick={() => setCurrentDateIndex(currentDateIndex + 1)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Toliau
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(dateSchedule.get(selectedDates[currentDateIndex]) || []).map((med) => (
                  <div key={med.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <SearchableSelect
                        options={products.map(p => ({
                          value: p.id,
                          label: p.name
                        }))}
                        value={med.product_id}
                        onChange={(value) => updateMedication(selectedDates[currentDateIndex], med.id, 'product_id', value)}
                        placeholder="Pasirinkite produktą..."
                        label="Produktas"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                        <select
                          value={med.unit}
                          onChange={(e) => updateMedication(selectedDates[currentDateIndex], med.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="pcs">vnt</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Spenis (jei reikia)</label>
                        <select
                          value={med.teat || ''}
                          onChange={(e) => updateMedication(selectedDates[currentDateIndex], med.id, 'teat', e.target.value || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Nėra</option>
                          <option value="d1">D1 (Dešinė priekis)</option>
                          <option value="d2">D2 (Dešinė galas)</option>
                          <option value="k1">K1 (Kairė priekis)</option>
                          <option value="k2">K2 (Kairė galas)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paskirtis</label>
                        <input
                          type="text"
                          value={med.purpose}
                          onChange={(e) => updateMedication(selectedDates[currentDateIndex], med.id, 'purpose', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeMedication(selectedDates[currentDateIndex], med.id)}
                      className="mt-3 text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Pašalinti
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addMedicationToDate(selectedDates[currentDateIndex])}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti vaistą šiai dienai
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Kaip veiks kursas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Bus sukurti {selectedDates.length} vizitai</li>
                      <li>Kiekviename vizite turėsite įvesti tikslų panaudotą kiekį</li>
                      <li>Galėsite pridėti ar pašalinti vaistus bet kuriame vizite</li>
                      <li>Atsargos bus atimtos tik kai užbaigsite kiekvieną vizitą</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {selectedDates.map((date, index) => {
                  const meds = dateSchedule.get(date) || [];
                  return (
                    <div key={date} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{formatDateLT(date)}</div>
                          <div className="text-sm text-gray-600">{meds.length} vaistai</div>
                        </div>
                      </div>
                      <div className="space-y-2 ml-13">
                        {meds.map((med) => {
                          const product = products.find(p => p.id === med.product_id);
                          return (
                            <div key={med.id} className="flex items-center gap-2 text-sm bg-purple-50 px-3 py-2 rounded">
                              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <span className="font-medium">{product?.name || 'Nežinomas'}</span>
                              {med.teat && <span className="text-gray-600">({med.teat})</span>}
                              <span className="text-gray-500">- {med.unit}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Atšaukti
          </button>

          <div className="flex gap-2">
            {step === 'medications' && (
              <button
                onClick={() => setStep('dates')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Grįžti į datas
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={() => setStep('medications')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Grįžti į vaistus
              </button>
            )}

            {step === 'dates' && (
              <button
                onClick={() => setStep('medications')}
                disabled={!canProceedToMedications}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Toliau
              </button>
            )}

            {step === 'medications' && (
              <button
                onClick={() => setStep('review')}
                disabled={!canProceedToReview()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Peržiūrėti
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Patvirtinti kursą
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
