import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductCategory, Unit } from '../lib/types';
import { Plus, Edit2, Save, X, Pill } from 'lucide-react';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyProduct = {
    name: '',
    category: 'medicines' as ProductCategory,
    primary_pack_unit: 'ml' as Unit,
    primary_pack_size: '',
    active_substance: '',
    registration_code: '',
    withdrawal_days: '',
    dosage_notes: '',
  };

  const [formData, setFormData] = useState(emptyProduct);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        primary_pack_unit: formData.primary_pack_unit,
        primary_pack_size: formData.primary_pack_size ? parseFloat(formData.primary_pack_size) : null,
        active_substance: formData.active_substance || null,
        registration_code: formData.registration_code || null,
        withdrawal_days: formData.withdrawal_days ? parseInt(formData.withdrawal_days) : null,
        dosage_notes: formData.dosage_notes || null,
        is_active: true,
      };

      if (editing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editing);

        if (error) throw error;
        setEditing(null);
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        setShowAdd(false);
      }

      setFormData(emptyProduct);
      await loadProducts();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditing(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      primary_pack_unit: product.primary_pack_unit,
      primary_pack_size: product.primary_pack_size?.toString() || '',
      active_substance: product.active_substance || '',
      registration_code: product.registration_code || '',
      withdrawal_days: product.withdrawal_days?.toString() || '',
      dosage_notes: product.dosage_notes || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyProduct);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-lg">
            <Pill className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Produktų katalogas</h2>
            <p className="text-sm text-gray-600">Valdyti vaistus, higieną ir kitas prekes</p>
          </div>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti produktą
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Naujas produktas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Produkto pavadinimas *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />

            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="medicines">Vaistai</option>
              <option value="prevention">Prevencija</option>
              <option value="hygiene">Higiena</option>
              <option value="biocide">Biocidas</option>
              <option value="technical">Techniniai</option>
              <option value="treatment_materials">Gydymo medžiagos</option>
              <option value="reproduction">Reprodukcija</option>
            </select>

            <select
              value={formData.primary_pack_unit}
              onChange={(e) => setFormData({ ...formData, primary_pack_unit: e.target.value as Unit })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="ml">ml</option>
              <option value="l">L</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="pcs">pcs</option>
            </select>

            <input
              type="number"
              placeholder="Pakuotės dydis"
              value={formData.primary_pack_size}
              onChange={(e) => setFormData({ ...formData, primary_pack_size: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Veiklioji medžiaga"
              value={formData.active_substance}
              onChange={(e) => setFormData({ ...formData, active_substance: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Registracijos kodas"
              value={formData.registration_code}
              onChange={(e) => setFormData({ ...formData, registration_code: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />

            <input
              type="number"
              placeholder="Karencinės dienos"
              value={formData.withdrawal_days}
              onChange={(e) => setFormData({ ...formData, withdrawal_days: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Dozavimo pastabos"
              value={formData.dosage_notes}
              onChange={(e) => setFormData({ ...formData, dosage_notes: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti produktą
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pavadinimas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorija</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vienetas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karencija</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  {editing === product.id ? (
                    <>
                      <td className="px-6 py-4" colSpan={5}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          />
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="medicines">Vaistai</option>
                            <option value="prevention">Prevencija</option>
                            <option value="hygiene">Higiena</option>
                            <option value="biocide">Biocidas</option>
                            <option value="technical">Techniniai</option>
                            <option value="treatment_materials">Gydymo medžiagos</option>
                            <option value="reproduction">Reprodukcija</option>
                          </select>
                          <select
                            value={formData.primary_pack_unit}
                            onChange={(e) => setFormData({ ...formData, primary_pack_unit: e.target.value as Unit })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="ml">ml</option>
                            <option value="l">L</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="pcs">pcs</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Karencinės dienos"
                            value={formData.withdrawal_days}
                            onChange={(e) => setFormData({ ...formData, withdrawal_days: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleSave}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.active_substance && (
                          <div className="text-sm text-gray-500">{product.active_substance}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.primary_pack_unit}
                        {product.primary_pack_size && ` (${product.primary_pack_size})`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.withdrawal_days ? `${product.withdrawal_days} d.` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
