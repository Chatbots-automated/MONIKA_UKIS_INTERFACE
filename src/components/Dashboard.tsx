import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Clock,
  Syringe,
  Plus,
  Euro,
  Activity,
  PackagePlus,
  Calendar,
  ShieldAlert,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { formatCurrencyLT, formatDateLT, getDaysUntil, formatDateTimeLT } from '../lib/formatters';

interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  expiringSoon: number;
  totalValue: number;
  treatmentsToday: number;
  treatmentsThisWeek: number;
  treatmentsThisMonth: number;
  recentReceived: number;
  zeroStock: number;
  expiredBatches: number;
}

interface CategoryStock {
  category: string;
  count: number;
  value: number;
}

interface RecentActivity {
  id: string;
  type: 'treatment' | 'receive' | 'biocide' | 'waste';
  description: string;
  timestamp: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalValue: 0,
    treatmentsToday: 0,
    treatmentsThisWeek: 0,
    treatmentsThisMonth: 0,
    recentReceived: 0,
    zeroStock: 0,
    expiredBatches: 0,
  });
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStock[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        stockData,
        batchesData,
        treatmentsToday,
        treatmentsWeek,
        treatmentsMonth,
        recentTreatmentsData,
        recentBatchesData,
        categoryData,
        batchValue
      ] = await Promise.all([
        supabase.from('stock_by_product').select('*'),
        supabase.from('stock_by_batch').select(`
          *,
          batches!inner(expiry_date, purchase_price),
          products!inner(name)
        `).gt('on_hand', 0).not('batches.expiry_date', 'is', null),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).gte('reg_date', todayStart),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).gte('reg_date', weekStart),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).gte('reg_date', monthStart),
        supabase.from('treatments').select(`
          id,
          reg_date,
          animals(tag_no, species),
          diseases(name)
        `).order('reg_date', { ascending: false }).limit(5),
        supabase.from('batches').select(`
          id,
          created_at,
          received_qty,
          lot,
          products!inner(name)
        `).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(5),
        supabase.from('stock_by_product').select('category, on_hand'),
        supabase.from('batches').select('purchase_price, received_qty')
      ]);

      const totalProducts = stockData.data?.length || 0;
      const lowStock = stockData.data?.filter(p => p.on_hand > 0 && p.on_hand < 10).length || 0;
      const zeroStock = stockData.data?.filter(p => p.on_hand === 0).length || 0;

      const batches = batchesData.data || [];
      const expiringSoon = batches.filter(b => {
        const expiryDate = b.batches?.expiry_date ? new Date(b.batches.expiry_date) : null;
        return expiryDate && expiryDate <= new Date(thirtyDaysFromNow);
      }).length;

      const expiredBatches = batches.filter(b => {
        const daysUntil = getDaysUntil(b.batches?.expiry_date);
        return daysUntil !== null && daysUntil < 0;
      }).length;

      const expiringList = batches
        .filter(b => {
          const expiryDate = b.batches?.expiry_date ? new Date(b.batches.expiry_date) : null;
          return expiryDate && expiryDate <= new Date(thirtyDaysFromNow);
        })
        .sort((a, b) => {
          const dateA = a.batches?.expiry_date ? new Date(a.batches.expiry_date).getTime() : 0;
          const dateB = b.batches?.expiry_date ? new Date(b.batches.expiry_date).getTime() : 0;
          return dateA - dateB;
        })
        .slice(0, 10);

      const totalValue = batchValue.data?.reduce((sum, b) =>
        sum + (b.purchase_price || 0) * (b.received_qty || 0), 0
      ) || 0;

      const categoryMap = new Map<string, { count: number; value: number }>();
      categoryData.data?.forEach(item => {
        const existing = categoryMap.get(item.category) || { count: 0, value: 0 };
        categoryMap.set(item.category, {
          count: existing.count + (item.on_hand > 0 ? 1 : 0),
          value: existing.value + item.on_hand
        });
      });

      const categoryStatsArray: CategoryStock[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value
      }));

      const recentReceived = recentBatchesData.data?.length || 0;

      setStats({
        totalProducts,
        lowStock,
        expiringSoon,
        totalValue,
        treatmentsToday: treatmentsToday.count || 0,
        treatmentsThisWeek: treatmentsWeek.count || 0,
        treatmentsThisMonth: treatmentsMonth.count || 0,
        recentReceived,
        zeroStock,
        expiredBatches,
      });
      setExpiringBatches(expiringList);
      setCategoryStats(categoryStatsArray);
      setRecentTreatments(recentTreatmentsData.data || []);
      setRecentBatches(recentBatchesData.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      medicines: 'Vaistai',
      prevention: 'Prevencija',
      reproduction: 'Reprodukcija',
      treatment_materials: 'Gyd. medžiagos',
      hygiene: 'Higiena',
      biocide: 'Biocidai',
      technical: 'Techniniai'
    };
    return labels[category] || category;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagrindinis</h1>
          <p className="text-sm text-gray-600 mt-1">VetStock valdymo sistema</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
            <Plus className="w-4 h-4" />
            Priimti
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <Syringe className="w-4 h-4" />
            Gydymas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Iš viso produktų</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.zeroStock} be atsargų</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mažos atsargos</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.lowStock}</p>
              <p className="text-xs text-gray-500 mt-1">Reikia užsakyti</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Greitai pasibaigs</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiringSoon}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.expiredBatches} jau pasibaigę</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bendra vertė</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrencyLT(stats.totalValue)}</p>
              <p className="text-xs text-gray-500 mt-1">Atsargų vertė</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <Euro className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Syringe className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Gydymai</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šiandien</span>
              <span className="text-2xl font-bold text-blue-600">{stats.treatmentsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šią savaitę</span>
              <span className="text-lg font-semibold text-gray-700">{stats.treatmentsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šį mėnesį</span>
              <span className="text-lg font-semibold text-gray-700">{stats.treatmentsThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6 border border-emerald-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <PackagePlus className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Priėmimas</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Per 7 dienas</span>
              <span className="text-2xl font-bold text-emerald-600">{stats.recentReceived}</span>
            </div>
            <div className="text-xs text-gray-600 mt-3">
              Naujausios partijos užregistruotos sistemoje
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-600 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Kategorijos</h3>
          </div>
          <div className="space-y-2">
            {categoryStats.slice(0, 3).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{getCategoryLabel(cat.category)}</span>
                <span className="font-semibold text-purple-600">{cat.count}</span>
              </div>
            ))}
            {categoryStats.length > 3 && (
              <p className="text-xs text-gray-600 mt-2">+{categoryStats.length - 3} daugiau</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Greitai pasibaigiantys</h3>
              <span className="ml-auto text-sm text-gray-500">Artimiausi 30 dienų</span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {expiringBatches.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nėra greitai pasibaigiančių partijų</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringBatches.map((batch) => {
                  const daysUntilExpiry = getDaysUntil(batch.batches?.expiry_date);
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                  return (
                    <div
                      key={batch.batch_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isExpired
                          ? 'bg-red-50 border-red-200'
                          : daysUntilExpiry !== null && daysUntilExpiry <= 7
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{batch.products?.name}</p>
                        <p className="text-sm text-gray-600">LOT: {batch.lot || 'N/A'}</p>
                        <p className="text-xs text-gray-500">Galioja: {formatDateLT(batch.batches?.expiry_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{batch.on_hand} vnt.</p>
                        {daysUntilExpiry !== null && (
                          <p className={`text-xs font-semibold ${
                            isExpired ? 'text-red-600' : daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {isExpired ? 'PASIBAIGĘS' : `Po ${daysUntilExpiry} d.`}
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

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Paskutiniai gydymai</h3>
              </div>
            </div>
            <div className="p-6">
              {recentTreatments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nėra įrašų</p>
              ) : (
                <div className="space-y-3">
                  {recentTreatments.map((treatment) => (
                    <div key={treatment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Syringe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {treatment.animals?.species || 'Gyvūnas'} #{treatment.animals?.tag_no || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600">{treatment.diseases?.name || 'Liga nenurodyta'}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateLT(treatment.reg_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Naujos partijos</h3>
                <span className="ml-auto text-sm text-gray-500">Per 7 dienas</span>
              </div>
            </div>
            <div className="p-6">
              {recentBatches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nėra naujų partijų</p>
              ) : (
                <div className="space-y-3">
                  {recentBatches.map((batch) => (
                    <div key={batch.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <PackagePlus className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{batch.products?.name}</p>
                        <p className="text-xs text-gray-600">LOT: {batch.lot || 'N/A'} · {batch.received_qty} vnt.</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTimeLT(batch.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
