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
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Users,
  Droplet,
  Trash2,
  FileText,
  Calendar,
  Stethoscope,
  ArrowUpRight,
  ArrowDownRight,
  Pill
} from 'lucide-react';
import { formatCurrencyLT, formatDateLT, getDaysUntil, formatDateTimeLT, formatNumberLT } from '../lib/formatters';

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
  totalAnimals: number;
  totalSuppliers: number;
  biocidesThisMonth: number;
  wasteThisMonth: number;
  ownerMedsThisMonth: number;
  totalBatches: number;
  avgBatchValue: number;
}

interface CategoryStock {
  category: string;
  count: number;
  value: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  total_used: number;
  usage_count: number;
}

interface StockAlert {
  type: 'expired' | 'expiring' | 'low' | 'zero';
  product_name: string;
  batch_lot: string | null;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface MonthlyTrend {
  month: string;
  treatments: number;
  received: number;
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
    totalAnimals: 0,
    totalSuppliers: 0,
    biocidesThisMonth: 0,
    wasteThisMonth: 0,
    ownerMedsThisMonth: 0,
    totalBatches: 0,
    avgBatchValue: 0,
  });
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStock[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
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
        batchValue,
        animalsCount,
        suppliersCount,
        biocidesCount,
        wasteCount,
        ownerMedsCount,
        allBatches,
        usageData
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
        supabase.from('batches').select('id, purchase_price, received_qty'),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('biocide_usage').select('id', { count: 'exact', head: true }).gte('use_date', monthStart),
        supabase.from('medical_waste').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('owner_med_admin').select('id', { count: 'exact', head: true }).gte('first_admin_date', monthStart),
        supabase.from('batches').select('id, created_at'),
        supabase.from('usage_items').select(`
          qty,
          products!inner(id, name)
        `).gte('created_at', monthStart)
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

      // Calculate total value efficiently by fetching all usage data at once
      const { data: allUsageData } = await supabase
        .from('usage_items')
        .select('batch_id, qty');

      // Create a map of batch_id to total usage
      const usageByBatch = new Map<string, number>();
      allUsageData?.forEach(item => {
        const batchId = item.batch_id;
        const currentUsage = usageByBatch.get(batchId) || 0;
        usageByBatch.set(batchId, currentUsage + (item.qty || 0));
      });

      // Calculate total value using the batches data we already have
      let totalValue = 0;
      if (batchValue.data) {
        for (const batch of batchValue.data) {
          const totalUsed = usageByBatch.get(batch.id) || 0;
          const onHand = (batch.received_qty || 0) - totalUsed;
          const unitPrice = batch.received_qty > 0 ? (batch.purchase_price || 0) / batch.received_qty : 0;
          const batchValue = unitPrice * onHand;
          totalValue += batchValue;
        }
      }

      const totalBatches = allBatches.data?.length || 0;
      const avgBatchValue = totalBatches > 0 ? totalValue / totalBatches : 0;

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

      const productUsageMap = new Map<string, { name: string; total: number; count: number }>();
      usageData.data?.forEach(item => {
        const productId = item.products?.id;
        const productName = item.products?.name;
        if (productId && productName) {
          const existing = productUsageMap.get(productId) || { name: productName, total: 0, count: 0 };
          productUsageMap.set(productId, {
            name: productName,
            total: existing.total + (item.qty || 0),
            count: existing.count + 1
          });
        }
      });

      const topProductsList: TopProduct[] = Array.from(productUsageMap.entries())
        .map(([id, data]) => ({
          product_id: id,
          product_name: data.name,
          total_used: data.total,
          usage_count: data.count
        }))
        .sort((a, b) => b.total_used - a.total_used)
        .slice(0, 5);

      const alerts: StockAlert[] = [];

      batches.forEach(batch => {
        const daysUntil = getDaysUntil(batch.batches?.expiry_date);
        if (daysUntil !== null && daysUntil < 0) {
          alerts.push({
            type: 'expired',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigęs ${Math.abs(daysUntil)} dienų`,
            severity: 'critical'
          });
        } else if (daysUntil !== null && daysUntil <= 7) {
          alerts.push({
            type: 'expiring',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigs po ${daysUntil} dienų`,
            severity: 'critical'
          });
        } else if (daysUntil !== null && daysUntil <= 14) {
          alerts.push({
            type: 'expiring',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigs po ${daysUntil} dienų`,
            severity: 'warning'
          });
        }
      });

      stockData.data?.forEach(product => {
        if (product.on_hand === 0) {
          alerts.push({
            type: 'zero',
            product_name: product.name,
            batch_lot: null,
            details: 'Atsargų nėra',
            severity: 'warning'
          });
        } else if (product.on_hand < 10) {
          alerts.push({
            type: 'low',
            product_name: product.name,
            batch_lot: null,
            details: `Likutis: ${product.on_hand} vnt.`,
            severity: 'info'
          });
        }
      });

      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      const last6Months: MonthlyTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [treatmentsRes, batchesRes] = await Promise.all([
          supabase.from('treatments').select('id', { count: 'exact', head: true })
            .gte('reg_date', monthStart).lte('reg_date', monthEnd),
          supabase.from('batches').select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart).lte('created_at', monthEnd)
        ]);

        last6Months.push({
          month: date.toLocaleDateString('lt-LT', { month: 'short' }),
          treatments: treatmentsRes.count || 0,
          received: batchesRes.count || 0
        });
      }

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
        totalAnimals: animalsCount.count || 0,
        totalSuppliers: suppliersCount.count || 0,
        biocidesThisMonth: biocidesCount.count || 0,
        wasteThisMonth: wasteCount.count || 0,
        ownerMedsThisMonth: ownerMedsCount.count || 0,
        totalBatches,
        avgBatchValue,
      });
      setExpiringBatches(expiringList);
      setCategoryStats(categoryStatsArray);
      setRecentTreatments(recentTreatmentsData.data || []);
      setRecentBatches(recentBatchesData.data || []);
      setTopProducts(topProductsList);
      setStockAlerts(alerts.slice(0, 10));
      setMonthlyTrends(last6Months);
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'expiring':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-yellow-600" />;
      case 'zero':
        return <Package className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
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
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagrindinis</h1>
          <p className="text-sm text-gray-600 mt-1.5">Realaus laiko sistema · {formatDateTimeLT(new Date().toISOString())}</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4" />
            Priimti
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-md hover:shadow-lg">
            <Syringe className="w-4 h-4" />
            Gydymas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Produktai</p>
              </div>
              <p className="text-4xl font-bold mb-2">{stats.totalProducts}</p>
              <div className="flex items-center gap-4 text-xs opacity-90">
                <span>{stats.totalBatches} partijų</span>
                <span>·</span>
                <span className="text-red-200">{stats.zeroStock} be atsargų</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              <Package className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Mažos atsargos</p>
              </div>
              <p className="text-4xl font-bold mb-2">{stats.lowStock}</p>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <AlertTriangle className="w-3 h-3" />
                <span>Reikia užsakyti</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingDown className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Greitai baigsis</p>
              </div>
              <p className="text-4xl font-bold mb-2">{stats.expiringSoon}</p>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <span>{stats.expiredBatches} jau pasibaigę</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Euro className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Bendra vertė</p>
              </div>
              <p className="text-4xl font-bold mb-2">{formatCurrencyLT(stats.totalValue)}</p>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <TrendingUp className="w-3 h-3" />
                <span>Vid. {formatCurrencyLT(stats.avgBatchValue)}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              <Euro className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAnimals}</p>
              <p className="text-xs text-gray-600">Gyvūnai</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.recentReceived}</p>
              <p className="text-xs text-gray-600">Priimta 7d</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-50 p-2.5 rounded-lg">
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
              <p className="text-xs text-gray-600">Tiekėjai</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-2.5 rounded-lg">
              <Droplet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.biocidesThisMonth}</p>
              <p className="text-xs text-gray-600">Biocidai</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2.5 rounded-lg">
              <Trash2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.wasteThisMonth}</p>
              <p className="text-xs text-gray-600">Atliekos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-lg">
              <Pill className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.ownerMedsThisMonth}</p>
              <p className="text-xs text-gray-600">Sav. vaistai</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-blue-100 hover:border-blue-200 transition-all">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-md">
              <Syringe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Gydymai</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Šiandien</span>
                <span className="text-3xl font-bold text-blue-600">{stats.treatmentsToday}</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Šią savaitę</span>
              <span className="text-xl font-bold text-gray-900">{stats.treatmentsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Šį mėnesį</span>
              <span className="text-xl font-bold text-gray-900">{stats.treatmentsThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-emerald-100 hover:border-emerald-200 transition-all">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-md">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Kategorijos</h3>
          </div>
          <div className="space-y-3">
            {categoryStats.slice(0, 5).map((cat, idx) => (
              <div key={cat.category} className="flex items-center justify-between group hover:bg-emerald-50 rounded-lg p-2 -m-2 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-gray-700">{getCategoryLabel(cat.category)}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{cat.count}</span>
              </div>
            ))}
            {categoryStats.length > 5 && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">+{categoryStats.length - 5} kategorijos</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-purple-100 hover:border-purple-200 transition-all">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Top Produktai</h3>
          </div>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((product, idx) => (
              <div key={product.product_id} className="flex items-center gap-3 hover:bg-purple-50 rounded-lg p-2 -m-2 transition-colors">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                  <p className="text-xs text-gray-500">{formatNumberLT(product.total_used)} vnt.</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nėra duomenų</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Veiklos statistika (6 mėnesiai)</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {monthlyTrends.map((trend, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-16">{trend.month}</span>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Syringe className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-gray-600">Gydymai: {trend.treatments}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((trend.treatments / Math.max(...monthlyTrends.map(t => t.treatments), 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <PackagePlus className="w-3 h-3 text-emerald-600" />
                          <span className="text-xs text-gray-600">Priėmimas: {trend.received}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((trend.received / Math.max(...monthlyTrends.map(t => t.received), 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Top produktai</h3>
            </div>
          </div>
          <div className="p-6">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Nėra duomenų</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={product.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                      <p className="text-xs text-gray-600">
                        {formatNumberLT(product.total_used)} vnt. · {product.usage_count}× panaudota
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Atsargų įspėjimai</h3>
              <span className="ml-auto text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {stockAlerts.length}
              </span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {stockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nėra įspėjimų</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stockAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.product_name}</p>
                      {alert.batch_lot && (
                        <p className="text-xs opacity-75">LOT: {alert.batch_lot}</p>
                      )}
                      <p className="text-xs opacity-75 mt-0.5">{alert.details}</p>
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
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Greitai pasibaigiantys</h3>
              <span className="ml-auto text-sm text-gray-500">30 dienų</span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {expiringBatches.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Visi produktai galioja</p>
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
                          : 'bg-yellow-50 border-yellow-200'
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div key={treatment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
              <span className="ml-auto text-sm text-gray-500">7 dienos</span>
            </div>
          </div>
          <div className="p-6">
            {recentBatches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nėra naujų partijų</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.map((batch) => (
                  <div key={batch.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
  );
}
