import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductCategory, Unit } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { Plus, Edit2, Save, X, Pill, AlertTriangle } from 'lucide-react';

export function Products() {
  const { logAction } = useAuth();
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
    withdrawal_days_meat: '',
    withdrawal_days_milk: '',
    dosage_notes: '',
  };

  const [formData, setFormData] = useState(emptyProduct);

  useEffect(() => {
    loadProducts();
  }, []);

  useRealtimeSubscription({
    table: 'products',
    onInsert: useCallback((payload) => {
      setProducts(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
    }, []),
    onUpdate: useCallback((payload) => {
      setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    }, []),
    onDelete: useCallback((payload) => {
      setProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }, []),
  });

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
        withdrawal_days_meat: (formData.category === 'medicines' && formData.withdrawal_days_meat) ? parseInt(formData.withdrawal_days_meat) : null,
        withdrawal_days_milk: (formData.category === 'medicines' && formData.withdrawal_days_milk) ? parseInt(formData.withdrawal_days_milk) : null,
        dosage_notes: formData.dosage_notes || null,
        is_active: true,
      };

      if (editing) {
        const oldProduct = products.find(p => p.id === editing);
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editing);

        if (error) throw error;

        await logAction(
          'update_product',
          'products',
          editing,
          oldProduct,
          productData
        );

        setEditing(null);
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        await logAction(
          'create_product',
          'products',
          data.id,
          null,
          productData
        );

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
      withdrawal_days_meat: product.withdrawal_days_meat?.toString() || '',
      withdrawal_days_milk: product.withdrawal_days_milk?.toString() || '',
      dosage_notes: product.dosage_notes || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyProduct);
  };

  const formFields = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <input
        type="text"
        placeholder="Pavadinimas *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
      />

      <select
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
      >
        <option value="medicines">Vaistai</option>
        <option value="prevention">Prevencija</option>
        <option value="vakcina">Vakcina</option>
        <option value="bolusas">Bolusas</option>
        <option value="svirkstukai">Švirkštukai</option>
        <option value="hygiene">Higiena</option>
        <option value="biocide">Biocidas</option>
        <option value="technical">Techniniai</option>
        <option value="treatment_materials">Gydymo medžiagos</option>
        <option value="reproduction">Reprodukcija</option>
      </select>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Dydis"
          value={formData.primary_pack_size}
          onChange={(e) => setFormData({ ...formData, primary_pack_size: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={formData.primary_pack_unit}
          onChange={(e) => setFormData({ ...formData, primary_pack_unit: e.target.value as Unit })}
          className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ml">ml</option>
          <option value="l">L</option>
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="vnt">vnt</option>
          <option value="tablet">tabletė</option>
          <option value="bolus">bolusas</option>
          <option value="syringe">švirkštas</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="Veiklioji medžiaga"
        value={formData.active_substance}
        onChange={(e) => setFormData({ ...formData, active_substance: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
      />

      {formData.category === 'medicines' && (
        <>
          <input
            type="number"
            placeholder="Karencija: Mėsa (d.) *"
            value={formData.withdrawal_days_meat}
            onChange={(e) => setFormData({ ...formData, withdrawal_days_meat: e.target.value })}
            className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-amber-50"
          />

          <input
            type="number"
            placeholder="Karencija: Pienas (d.) *"
            value={formData.withdrawal_days_milk}
            onChange={(e) => setFormData({ ...formData, withdrawal_days_milk: e.target.value })}
            className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50"
          />
        </>
      )}

      <input
        type="text"
        placeholder="Dozavimo pastabos"
        value={formData.dosage_notes}
        onChange={(e) => setFormData({ ...formData, dosage_notes: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 col-span-2 md:col-span-1"
      />

      <div className="flex gap-2 col-span-2 md:col-span-4 justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
        >
          <Save className="w-4 h-4" />
          Išsaugoti
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
        >
          <X className="w-4 h-4" />
          Atšaukti
        </button>
      </div>
    </div>
  ), [formData, handleSave, handleCancel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Produktai</h2>
        </div>
        {!showAdd && !editing && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Naujas
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Naujas produktas</h3>
          {formFields}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Pavadinimas</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Kategorija</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Pakuotė</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">V. medžiaga</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Karencija</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Veiksmai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              editing === product.id ? (
                <tr key={product.id} className="bg-amber-50">
                  <td colSpan={6} className="px-3 py-3">
                    {formFields}
                  </td>
                </tr>
              ) : (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {product.category === 'medicines' && 'Vaistai'}
                    {product.category === 'prevention' && 'Prevencija'}
                    {product.category === 'vakcina' && 'Vakcina'}
                    {product.category === 'bolusas' && 'Bolusas'}
                    {product.category === 'svirkstukai' && 'Švirkštukai'}
                    {product.category === 'hygiene' && 'Higiena'}
                    {product.category === 'biocide' && 'Biocidas'}
                    {product.category === 'technical' && 'Techniniai'}
                    {product.category === 'treatment_materials' && 'Gydymo medž.'}
                    {product.category === 'reproduction' && 'Reprodukcija'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {product.primary_pack_size} {product.primary_pack_unit}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{product.active_substance || '-'}</td>
                  <td className="px-3 py-2">
                    {product.category === 'medicines' ? (
                      <div className="flex gap-1 text-xs">
                        {product.withdrawal_days_meat && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                            🥩 {product.withdrawal_days_meat}d
                          </span>
                        )}
                        {product.withdrawal_days_milk && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            🥛 {product.withdrawal_days_milk}d
                          </span>
                        )}
                        {!product.withdrawal_days_meat && !product.withdrawal_days_milk && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Redaguoti"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {products.some(p => p.category === 'medicines') && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">⚠️ SVARBU: Karencinės dienos</p>
            <p className="text-amber-800 text-xs mt-1">
              <strong>Vaistams (medicines)</strong> būtina nurodyti karencines dienas:<br/>
              • <strong className="text-red-700">🥩 Mėsa</strong> - kiek dienų negalima skerdžiati ir parduoti mėsos<br/>
              • <strong className="text-blue-700">🥛 Pienas</strong> - kiek dienų negalima melžti ir parduoti pieno<br/>
              Sistema automatiškai blokuos veiksmus, jei karencija dar nepasibaigusi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
