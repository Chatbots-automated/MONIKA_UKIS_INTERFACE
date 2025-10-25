import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Vaccination, Product, Animal, Batch, Unit } from '../lib/types';
import { Plus, Syringe, Check } from 'lucide-react';

export function Vaccinations() {
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [formData, setFormData] = useState({
    animal_id: '',
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

  const loadData = async () => {
    try {
      const [vacsRes, prodsRes, animalsRes, batchesRes] = await Promise.all([
        supabase.from('vaccinations').select('*').order('vaccination_date', { ascending: false }),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('animals').select('*').order('tag_no'),
        supabase.from('batches').select('*'),
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

  const handleSave = async () => {
    if (!formData.product_id || !formData.dose_amount) {
      alert('Užpildykite privalumus laukus');
      return;
    }

    try {
      const { error } = await supabase.from('vaccinations').insert({
        animal_id: formData.animal_id || null,
        product_id: formData.product_id,
        batch_id: formData.batch_id || null,
        vaccination_date: formData.vaccination_date,
        next_booster_date: formData.next_booster_date || null,
        dose_number: parseInt(formData.dose_number),
        dose_amount: parseFloat(formData.dose_amount),
        unit: formData.unit,
        administered_by: formData.administered_by || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowAdd(false);
      setFormData({
        animal_id: '',
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
    }
  };

  if (loading) return <div className="text-center py-8">Kraunama...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold">Vakcinacijos</h2>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Nauja
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Nauja vakcinacija</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={formData.animal_id} onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Gyvūnas</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.tag_no}</option>)}
            </select>
            <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Vakcina *</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Dozė *" value={formData.dose_amount} onChange={(e) => setFormData({ ...formData, dose_amount: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={formData.vaccination_date} onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <div className="flex gap-2 col-span-2 md:col-span-4 justify-end">
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Check className="w-4 h-4" />
                Išsaugoti
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-300 rounded-lg text-sm">Atšaukti</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Gyvūnas</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Vakcina</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Dozė</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vaccinations.map((vac: any) => (
              <tr key={vac.id}>
                <td className="px-3 py-2">{animals.find(a => a.id === vac.animal_id)?.tag_no || 'N/A'}</td>
                <td className="px-3 py-2">{products.find(p => p.id === vac.product_id)?.name}</td>
                <td className="px-3 py-2">{vac.dose_amount} {vac.unit}</td>
                <td className="px-3 py-2 text-xs">{vac.vaccination_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
