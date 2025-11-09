import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, AlertCircle, Package, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface StockItem {
  batch_id: string;
  product_id: string;
  on_hand: number;
  expiry_date: string | null;
  lot: string | null;
  mfg_date: string | null;
  product_name?: string;
  category?: string;
  unit?: string;
  package_size?: number | null;
  package_count?: number | null;
}

export function Inventory() {
  const { logAction } = useAuth();
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  useRealtimeSubscription({
    table: 'batches',
    onInsert: useCallback(() => {
      loadInventory();
    }, []),
    onUpdate: useCallback(() => {
      loadInventory();
    }, []),
    onDelete: useCallback(() => {
      loadInventory();
    }, []),
  });

  useRealtimeSubscription({
    table: 'inventory_transactions',
    onInsert: useCallback(() => {
      loadInventory();
    }, []),
  });

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_by_batch')
        .select(`
          *,
          products!inner(name, category, primary_pack_unit),
          batches!inner(package_size, package_count)
        `)
        .gt('on_hand', 0);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        batch_id: item.batch_id,
        product_id: item.product_id,
        on_hand: item.on_hand,
        expiry_date: item.expiry_date,
        lot: item.lot,
        mfg_date: item.mfg_date,
        product_name: item.products?.name,
        category: item.products?.category,
        unit: item.products?.primary_pack_unit,
        package_size: item.batches?.package_size,
        package_count: item.batches?.package_count,
      })) || [];

      setInventory(formattedData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleEditClick = (item: StockItem) => {
    setEditingBatchId(item.batch_id);
    setEditValue(item.on_hand.toString());
  };

  const handleCancelEdit = () => {
    setEditingBatchId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (item: StockItem) => {
    const newAmount = parseFloat(editValue);

    if (isNaN(newAmount) || newAmount < 0) {
      alert('Prašome įvesti teisingą kiekį');
      return;
    }

    try {
      const difference = newAmount - item.on_hand;

      const { error } = await supabase
        .from('inventory_transactions')
        .insert({
          batch_id: item.batch_id,
          product_id: item.product_id,
          qty: Math.abs(difference),
          unit: item.unit,
          transaction_type: difference > 0 ? 'adjustment_in' : 'adjustment_out',
          notes: difference > 0
            ? `Atsargų padidinimas: ${item.on_hand} → ${newAmount}`
            : `Atsargų sumažinimas: ${item.on_hand} → ${newAmount}`,
        });

      if (error) throw error;

      await logAction(
        'adjust_inventory',
        'inventory_transactions',
        null,
        item.batch_id,
        {
          product_name: item.product_name,
          old_amount: item.on_hand,
          new_amount: newAmount,
          difference: difference
        }
      );

      setEditingBatchId(null);
      setEditValue('');
      loadInventory();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Klaida keičiant atsargas');
    }
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Ieškoti pagal produkto pavadinimą arba PARTIJĄ..."
            value={searchTerm}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchTerm(newValue);
              if (newValue.length >= 3) {
                logAction('search_inventory', null, null, null, { search_term: newValue });
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="all">Visos kategorijos</option>
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
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Atsargų nerasta</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produktas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LOT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Likutis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Galiojimo pabaiga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Būsena
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veiksmai
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.batch_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.lot || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingBatchId === item.batch_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 text-sm"
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                          <span className="text-gray-600 text-sm">{item.unit}</span>
                        </div>
                      ) : (
                        <div>
                          <span className={`font-medium ${item.on_hand < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {item.on_hand} {item.unit}
                          </span>
                          {item.package_size && item.package_count && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.package_count} pak. × {item.package_size} {item.unit}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired(item.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Pasibaigęs
                        </span>
                      ) : isExpiringSoon(item.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Greitai pasibaigs
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                          Geras
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingBatchId === item.batch_id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(item)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Išsaugoti"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Atšaukti"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Redaguoti kiekį"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
