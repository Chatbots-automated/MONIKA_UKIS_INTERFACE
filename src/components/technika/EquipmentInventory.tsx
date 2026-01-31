import { Package, Plus, Search, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { EquipmentReceiveStock } from './EquipmentReceiveStock';

interface Batch {
  id: string;
  batch_number: string;
  received_qty: number;
  qty_left: number;
  purchase_price: number;
  product: {
    name: string;
    unit_type: string;
  };
  location: {
    name: string;
  } | null;
}

type Tab = 'inventory' | 'receive';

export function EquipmentInventory() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('inventory');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const { data } = await supabase
      .from('equipment_batches')
      .select(`
        *,
        product:equipment_products(name, unit_type),
        location:equipment_locations(name)
      `)
      .gt('qty_left', 0)
      .order('product(name)');

    if (data) setBatches(data as any);
  };

  const filteredBatches = batches.filter(batch =>
    batch.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline-block mr-2" />
              Atsargos
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'receive'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4 inline-block mr-2" />
              Priimti atsargas
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'inventory' && (
            <>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ieškoti produkto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredBatches.map(batch => (
                  <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-gray-800">{batch.product.name}</p>
                          <p className="text-sm text-gray-600">
                            Partija: {batch.batch_number || 'N/A'} · {batch.location?.name || 'Sandėlis'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          {batch.qty_left} {batch.product.unit_type}
                        </p>
                        <p className="text-sm text-gray-600">iš {batch.received_qty}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredBatches.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Atsargų nerasta</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <StatCard title="Produktų tipų" value={new Set(batches.map(b => b.product.name)).size.toString()} />
                <StatCard title="Partijų" value={batches.length.toString()} />
                <StatCard
                  title="Bendra vertė"
                  value={`€${batches.reduce((sum, b) => sum + b.qty_left * (b.purchase_price || 0), 0).toFixed(2)}`}
                />
              </div>
            </>
          )}

          {activeTab === 'receive' && <EquipmentReceiveStock />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
