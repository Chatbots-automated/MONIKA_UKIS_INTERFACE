import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Package, 
  AlertCircle,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  totalSpending: number;
  monthlySpending: number;
  invoiceCount: number;
  pendingWriteOffs: number;
  topSuppliers: Array<{ name: string; total: number; count: number }>;
  categoryBreakdown: Array<{ category: string; total: number; percentage: number }>;
  moduleComparison: { veterinarija: number; technika: number };
  monthlyTrend: Array<{ month: string; amount: number }>;
  recentActivity: Array<{ date: string; description: string; amount: number; type: string }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      let periodStart: Date;
      switch (selectedPeriod) {
        case 'month':
          periodStart = startOfMonth;
          break;
        case 'quarter':
          periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          periodStart = startOfYear;
          break;
      }

      // Load veterinarija invoices
      const { data: vetInvoices } = await supabase
        .from('invoices')
        .select('invoice_date, supplier_name, total_gross, total_net, total_vat')
        .gte('invoice_date', periodStart.toISOString())
        .order('invoice_date', { ascending: false });

      // Load technika invoices
      const { data: techInvoices } = await supabase
        .from('equipment_invoices')
        .select('invoice_date, supplier_name, total_gross, total_net, total_vat')
        .gte('invoice_date', periodStart.toISOString())
        .order('invoice_date', { ascending: false });

      // Load write-off acts
      const { data: writeOffActs } = await supabase
        .from('write_off_acts')
        .select('status, total_amount')
        .eq('status', 'draft');

      // Calculate stats
      const allInvoices = [
        ...(vetInvoices || []).map(inv => ({ ...inv, module: 'veterinarija' })),
        ...(techInvoices || []).map(inv => ({ ...inv, module: 'technika' }))
      ];

      const totalSpending = allInvoices.reduce((sum, inv) => sum + (inv.total_gross || 0), 0);
      const monthlySpending = allInvoices
        .filter(inv => new Date(inv.invoice_date) >= startOfMonth)
        .reduce((sum, inv) => sum + (inv.total_gross || 0), 0);

      // Top suppliers
      const supplierMap = new Map<string, { total: number; count: number }>();
      allInvoices.forEach(inv => {
        const existing = supplierMap.get(inv.supplier_name) || { total: 0, count: 0 };
        supplierMap.set(inv.supplier_name, {
          total: existing.total + (inv.total_gross || 0),
          count: existing.count + 1
        });
      });
      const topSuppliers = Array.from(supplierMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Module comparison
      const moduleComparison = {
        veterinarija: allInvoices
          .filter(inv => inv.module === 'veterinarija')
          .reduce((sum, inv) => sum + (inv.total_gross || 0), 0),
        technika: allInvoices
          .filter(inv => inv.module === 'technika')
          .reduce((sum, inv) => sum + (inv.total_gross || 0), 0)
      };

      // Monthly trend (last 6 months)
      const monthlyTrend: Array<{ month: string; amount: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthInvoices = allInvoices.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate >= monthDate && invDate <= monthEnd;
        });
        const monthTotal = monthInvoices.reduce((sum, inv) => sum + (inv.total_gross || 0), 0);
        monthlyTrend.push({
          month: monthDate.toLocaleDateString('lt-LT', { month: 'short', year: 'numeric' }),
          amount: monthTotal
        });
      }

      // Recent activity (last 10 invoices)
      const recentActivity = allInvoices
        .slice(0, 10)
        .map(inv => ({
          date: inv.invoice_date,
          description: `Sąskaita nuo ${inv.supplier_name}`,
          amount: inv.total_gross || 0,
          type: inv.module
        }));

      setStats({
        totalSpending,
        monthlySpending,
        invoiceCount: allInvoices.length,
        pendingWriteOffs: writeOffActs?.length || 0,
        topSuppliers,
        categoryBreakdown: [], // Will implement with category data
        moduleComparison,
        monthlyTrend,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Nepavyko užkrauti duomenų</p>
      </div>
    );
  }

  const previousMonthSpending = stats.monthlyTrend[stats.monthlyTrend.length - 2]?.amount || 0;
  const currentMonthSpending = stats.monthlyTrend[stats.monthlyTrend.length - 1]?.amount || 0;
  const monthlyChange = previousMonthSpending > 0 
    ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Finansinė apžvalga</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mėnuo
          </button>
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'quarter'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Ketvirtis
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === 'year'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Metai
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spending */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Bendros išlaidos</p>
          <p className="text-3xl font-bold text-gray-900">€{stats.totalSpending.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}</p>
          <div className="mt-3 flex items-center gap-2">
            {monthlyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(monthlyChange).toFixed(1)}% {monthlyChange >= 0 ? 'daugiau' : 'mažiau'}
            </span>
          </div>
        </div>

        {/* Monthly Spending */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-gray-700" />
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Šio mėnesio</p>
          <p className="text-3xl font-bold text-gray-900">€{stats.monthlySpending.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}</p>
          <p className="text-sm mt-3 text-gray-500">
            {new Date().toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Invoice Count */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <FileText className="w-6 h-6 text-gray-700" />
            </div>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Sąskaitų skaičius</p>
          <p className="text-3xl font-bold text-gray-900">{stats.invoiceCount}</p>
          <p className="text-sm mt-3 text-gray-500">
            Vidutinė suma: €{(stats.totalSpending / stats.invoiceCount).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Pending Write-offs */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Laukiantys aktai</p>
          <p className="text-3xl font-bold text-gray-900">{stats.pendingWriteOffs}</p>
          <p className="text-sm mt-3 text-gray-500">
            Reikia patvirtinimo
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Išlaidų tendencija</h3>
          </div>
          <div className="space-y-3">
            {stats.monthlyTrend.map((month, idx) => {
              const maxAmount = Math.max(...stats.monthlyTrend.map(m => m.amount));
              const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{month.month}</span>
                    <span className="font-semibold text-gray-900">
                      €{month.amount.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-700 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module Comparison */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Modulių palyginimas</h3>
          </div>
          <div className="space-y-4">
            {/* Veterinarija */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Veterinarija</span>
                <span className="text-sm font-bold text-green-600">
                  €{stats.moduleComparison.veterinarija.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ 
                    width: `${(stats.moduleComparison.veterinarija / stats.totalSpending) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {((stats.moduleComparison.veterinarija / stats.totalSpending) * 100).toFixed(1)}% bendros sumos
              </p>
            </div>

            {/* Technika */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Technika</span>
                <span className="text-sm font-bold text-slate-600">
                  €{stats.moduleComparison.technika.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-slate-600 h-3 rounded-full"
                  style={{ 
                    width: `${(stats.moduleComparison.technika / stats.totalSpending) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {((stats.moduleComparison.technika / stats.totalSpending) * 100).toFixed(1)}% bendros sumos
              </p>
            </div>

            {/* Comparison */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Skirtumas:</span>
                <span className={`font-semibold ${
                  stats.moduleComparison.veterinarija > stats.moduleComparison.technika 
                    ? 'text-green-600' 
                    : 'text-slate-600'
                }`}>
                  €{Math.abs(stats.moduleComparison.veterinarija - stats.moduleComparison.technika).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pagrindiniai tiekėjai</h3>
          <div className="space-y-3">
            {stats.topSuppliers.map((supplier, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-xs text-gray-500">{supplier.count} sąskaitos</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  €{supplier.total.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Paskutinė veikla</h3>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleDateString('lt-LT')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    €{activity.amount.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs text-gray-500 capitalize">{activity.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
