import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Supplier } from '../lib/types';
import { Plus, Check } from 'lucide-react';

export function ReceiveStock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    lot: '',
    mfg_date: '',
    expiry_date: '',
    supplier_id: '',
    doc_title: 'Invoice',
    doc_number: '',
    doc_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    currency: 'EUR',
    received_qty: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('batches').insert({
        product_id: formData.product_id,
        lot: formData.lot || null,
        mfg_date: formData.mfg_date || null,
        expiry_date: formData.expiry_date || null,
        supplier_id: formData.supplier_id || null,
        doc_title: formData.doc_title,
        doc_number: formData.doc_number || null,
        doc_date: formData.doc_date || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        currency: formData.currency,
        received_qty: parseFloat(formData.received_qty),
      });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        product_id: '',
        lot: '',
        mfg_date: '',
        expiry_date: '',
        supplier_id: '',
        doc_title: 'Invoice',
        doc_number: '',
        doc_date: new Date().toISOString().split('T')[0],
        purchase_price: '',
        currency: 'EUR',
        received_qty: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-50 p-2 rounded-lg">
            <Plus className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Priėmimo registravimas</h2>
            <p className="text-sm text-gray-600">Pridėti naują partiją į atsargas</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Atsargos sėkmingai priimtos!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produktas *
              </label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="">Pasirinkite produktą...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PARTIJA / Serijos numeris
              </label>
              <input
                type="text"
                value={formData.lot}
                onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="PARTIJA-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priimtas kiekis *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.received_qty}
                onChange={(e) => setFormData({ ...formData, received_qty: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gamybos data
              </label>
              <input
                type="date"
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Galiojimo pabaiga
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiekėjas
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Pasirinkite tiekėją...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento pavadinimas
              </label>
              <input
                type="text"
                value={formData.doc_title}
                onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Sąskaita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento numeris
              </label>
              <input
                type="text"
                value={formData.doc_number}
                onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="S-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento data
              </label>
              <input
                type="date"
                value={formData.doc_date}
                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pirkimo kaina
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="25.50"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registruojama...' : 'Registruoti priėmimą'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
