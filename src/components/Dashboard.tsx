import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, getDaysUntilExpiry } from '../lib/utils';
import { AlertTriangle, Package, TrendingDown, Clock, Plus, FileText, Syringe } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  expiringSoon: number;
  totalValue: number;
}

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalValue: 0,
  });
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: stockData } = await supabase
        .from('stock_by_product')
        .select('*');

      const { data: batchesData } = await supabase
        .from('stock_by_batch')
        .select(`
          *,
          batches!inner(expiry_date, purchase_price),
          products!inner(name)
        `)
        .gt('on_hand', 0)
        .not('batches.expiry_date', 'is', null)
        .order('batches(expiry_date)', { ascending: true })
        .limit(5);

      const totalProducts = stockData?.length || 0;
      const lowStock = stockData?.filter(p => p.on_hand < 10).length || 0;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSoon = batchesData?.filter(b => {
        const expiryDate = b.batches?.expiry_date ? new Date(b.batches.expiry_date) : null;
        return expiryDate && expiryDate <= thirtyDaysFromNow;
      }).length || 0;

      const { data: batchValueData } = await supabase
        .from('stock_by_batch')
        .select(`
          on_hand,
          batches!inner(purchase_price)
        `)
        .gt('on_hand', 0);

      const totalValue = batchValueData?.reduce((sum, item) =>
        sum + (item.on_hand || 0) * (item.batches?.purchase_price || 0), 0
      ) || 0;

      setStats({ totalProducts, lowStock, expiringSoon, totalValue });
      setExpiringBatches(batchesData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => onNavigate('receive')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Priėmimas
        </button>
        <button
          onClick={() => onNavigate('treatment')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Syringe className="w-5 h-5" />
          Gydymas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => onNavigate('inventory')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Iš viso produktų</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mažos atsargos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStock}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Greitai pasibaigs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.expiringSoon}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 relative group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bendra vertė</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrencyLT(stats.totalValue)}</p>
              <p className="text-xs text-gray-500 mt-1">On-hand kiekis × kaina</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Greitai pasibaigiantys</h3>
          </div>
        </div>
        <div className="p-6">
          {expiringBatches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nėra greitai pasibaigiančių partijų</p>
          ) : (
            <div className="space-y-3">
              {expiringBatches.map((batch) => {
                const daysUntilExpiry = getDaysUntilExpiry(batch.batches?.expiry_date);

                return (
                  <div key={batch.batch_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{batch.products?.name}</p>
                      <p className="text-sm text-gray-600">LOT: {batch.lot || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {batch.on_hand} vnt.
                      </p>
                      {daysUntilExpiry !== null && (
                        <p className={`text-xs font-medium ${daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 14 ? 'text-orange-600' : 'text-amber-600'}`}>
                          {daysUntilExpiry <= 0 ? 'Pasibaigęs' : `Pasibaigs po ${daysUntilExpiry} d.`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
