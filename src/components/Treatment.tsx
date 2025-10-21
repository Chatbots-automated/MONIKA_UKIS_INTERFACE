import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Animal, Disease, StockByBatch, Unit } from '../lib/types';
import { Syringe, Plus, Trash2, Check } from 'lucide-react';

interface UsageLine {
  id: string;
  product_id: string;
  batch_id: string;
  qty: string;
  unit: Unit;
  purpose: string;
}

export function Treatment() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<(StockByBatch & { products?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    reg_date: new Date().toISOString().split('T')[0],
    animal_id: '',
    disease_id: '',
    first_symptoms_date: '',
    animal_condition: '',
    tests: '',
    clinical_diagnosis: '',
    services: '',
    outcome: '',
    vet_name: '',
    notes: '',
  });

  const [usageItems, setUsageItems] = useState<UsageLine[]>([
    { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [animalsRes, diseasesRes, productsRes, batchesRes] = await Promise.all([
      supabase.from('animals').select('*').order('tag_no'),
      supabase.from('diseases').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('stock_by_batch').select(`
        *,
        products!inner(name)
      `).gt('on_hand', 0),
    ]);

    if (animalsRes.data) setAnimals(animalsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
  };

  const addUsageLine = () => {
    setUsageItems([
      ...usageItems,
      { id: Date.now().toString(), product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
    ]);
  };

  const removeUsageLine = (id: string) => {
    if (usageItems.length > 1) {
      setUsageItems(usageItems.filter(item => item.id !== id));
    }
  };

  const updateUsageLine = (id: string, field: keyof UsageLine, value: string) => {
    setUsageItems(usageItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const suggestFIFOBatch = async (productId: string) => {
    if (!productId) return null;

    const { data, error } = await supabase.rpc('fn_fifo_batch', { p_product_id: productId });

    if (error) {
      console.error('FIFO error:', error);
      return null;
    }

    return data;
  };

  const handleProductChange = async (lineId: string, productId: string) => {
    updateUsageLine(lineId, 'product_id', productId);

    const product = products.find(p => p.id === productId);
    if (product) {
      updateUsageLine(lineId, 'unit', product.primary_pack_unit);
    }

    const suggestedBatch = await suggestFIFOBatch(productId);
    if (suggestedBatch) {
      updateUsageLine(lineId, 'batch_id', suggestedBatch);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          reg_date: formData.reg_date,
          animal_id: formData.animal_id || null,
          disease_id: formData.disease_id || null,
          first_symptoms_date: formData.first_symptoms_date || null,
          animal_condition: formData.animal_condition || null,
          tests: formData.tests || null,
          clinical_diagnosis: formData.clinical_diagnosis || null,
          services: formData.services || null,
          outcome: formData.outcome || null,
          vet_name: formData.vet_name || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (treatmentError) throw treatmentError;

      const usageInserts = usageItems
        .filter(item => item.product_id && item.batch_id && item.qty)
        .map(item => ({
          treatment_id: treatment.id,
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: parseFloat(item.qty),
          unit: item.unit,
          purpose: item.purpose,
        }));

      if (usageInserts.length > 0) {
        const { error: usageError } = await supabase
          .from('usage_items')
          .insert(usageInserts);

        if (usageError) throw usageError;
      }

      setSuccess(true);
      setFormData({
        reg_date: new Date().toISOString().split('T')[0],
        animal_id: '',
        disease_id: '',
        first_symptoms_date: '',
        animal_condition: '',
        tests: '',
        clinical_diagnosis: '',
        services: '',
        outcome: '',
        vet_name: '',
        notes: '',
      });
      setUsageItems([
        { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
      ]);

      setTimeout(() => setSuccess(false), 3000);
      await loadData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBatches = (productId: string) => {
    return batches.filter(b => b.product_id === productId);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Syringe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Treatment & Write-off</h2>
            <p className="text-sm text-gray-600">Record treatment and decrease inventory</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Treatment recorded successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Date *
                </label>
                <input
                  type="date"
                  value={formData.reg_date}
                  onChange={(e) => setFormData({ ...formData, reg_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Symptoms Date
                </label>
                <input
                  type="date"
                  value={formData.first_symptoms_date}
                  onChange={(e) => setFormData({ ...formData, first_symptoms_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animal
                </label>
                <select
                  value={formData.animal_id}
                  onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select animal...</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.tag_no} - {animal.species} ({animal.holder_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disease
                </label>
                <select
                  value={formData.disease_id}
                  onChange={(e) => setFormData({ ...formData, disease_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select disease...</option>
                  {diseases.map((disease) => (
                    <option key={disease.id} value={disease.id}>
                      {disease.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animal Condition
                </label>
                <textarea
                  value={formData.animal_condition}
                  onChange={(e) => setFormData({ ...formData, animal_condition: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Describe animal condition..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tests Performed
                </label>
                <textarea
                  value={formData.tests}
                  onChange={(e) => setFormData({ ...formData, tests: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="List tests performed..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical Diagnosis
                </label>
                <textarea
                  value={formData.clinical_diagnosis}
                  onChange={(e) => setFormData({ ...formData, clinical_diagnosis: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Enter diagnosis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services Provided
                </label>
                <input
                  type="text"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Services..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outcome
                </label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Treatment outcome..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Veterinarian Name
                </label>
                <input
                  type="text"
                  value={formData.vet_name}
                  onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dr. Name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Products Used</h3>
              <button
                type="button"
                onClick={addUsageLine}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="space-y-4">
              {usageItems.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductChange(item.id, e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select product...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.batch_id}
                      onChange={(e) => updateUsageLine(item.id, 'batch_id', e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!item.product_id}
                    >
                      <option value="">Select batch...</option>
                      {getAvailableBatches(item.product_id).map((batch) => (
                        <option key={batch.batch_id} value={batch.batch_id}>
                          LOT: {batch.lot || 'N/A'} (Available: {batch.on_hand})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => updateUsageLine(item.id, 'qty', e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Quantity"
                    />

                    <select
                      value={item.unit}
                      onChange={(e) => updateUsageLine(item.id, 'unit', e.target.value as Unit)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ml">ml</option>
                      <option value="l">L</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>

                  {usageItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUsageLine(item.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Record Treatment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
