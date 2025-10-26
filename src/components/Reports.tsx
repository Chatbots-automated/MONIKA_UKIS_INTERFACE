import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText,
  Download,
  Calendar,
  Activity,
  TrendingUp,
  AlertTriangle,
  Syringe,
  Package,
  DollarSign,
  PieChart,
  BarChart3,
  Users
} from 'lucide-react';

interface AnalyticsData {
  totalAnimals: number;
  activeAnimals: number;
  totalTreatments: number;
  totalVaccinations: number;
  totalProductValue: number;
  lowStockProducts: number;
  expiringSoon: number;
  animalsInWithdrawal: number;
  topDiseases: Array<{ name: string; count: number }>;
  topProducts: Array<{ name: string; usage: number }>;
  treatmentsByMonth: Array<{ month: string; count: number }>;
  vaccinationsByMonth: Array<{ month: string; count: number }>;
  outcomeStats: Array<{ outcome: string; count: number }>;
  inventoryByCategory: Array<{ category: string; value: number }>;
}

type ReportType = 'analytics' | 'drug_journal' | 'treated_animals' | 'owner_meds' | 'biocide_journal' | 'medical_waste';

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('analytics');
  const [data, setData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (reportType === 'analytics') {
      loadAnalytics();
    } else {
      loadReport();
    }
  }, [reportType]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        animalsRes,
        treatmentsRes,
        vaccinationsRes,
        productsRes,
        batchesRes,
        diseasesRes,
        usageRes,
        withdrawalRes,
      ] = await Promise.all([
        supabase.from('animals').select('id, active'),
        supabase.from('treatments').select('id, reg_date, outcome, disease_id').gte('reg_date', sixMonthsAgo),
        supabase.from('vaccinations').select('id, vaccination_date').gte('vaccination_date', sixMonthsAgo),
        supabase.from('products').select('id, name, category, is_active'),
        supabase.from('batches').select('id, product_id, expiry_date, received_qty, purchase_price'),
        supabase.from('diseases').select('id, name'),
        supabase.from('usage_items').select('product_id, qty, treatment_id'),
        supabase.from('treatments').select('withdrawal_until_meat, withdrawal_until_milk').or(`withdrawal_until_meat.gte.${today},withdrawal_until_milk.gte.${today}`),
      ]);

      const animals = animalsRes.data || [];
      const treatments = treatmentsRes.data || [];
      const vaccinations = vaccinationsRes.data || [];
      const products = productsRes.data || [];
      const batches = batchesRes.data || [];
      const diseases = diseasesRes.data || [];
      const usage = usageRes.data || [];

      const totalAnimals = animals.length;
      const activeAnimals = animals.filter(a => a.active).length;
      const totalTreatments = treatments.length;
      const totalVaccinations = vaccinations.length;

      const totalProductValue = batches.reduce((sum, b) => {
        const price = parseFloat(b.purchase_price || 0);
        const qty = parseFloat(b.received_qty || 0);
        return sum + (price * qty);
      }, 0);

      const stockByProduct = new Map<string, number>();
      batches.forEach(b => {
        const current = stockByProduct.get(b.product_id) || 0;
        stockByProduct.set(b.product_id, current + parseFloat(b.received_qty || 0));
      });
      usage.forEach(u => {
        const current = stockByProduct.get(u.product_id) || 0;
        stockByProduct.set(u.product_id, current - parseFloat(u.qty || 0));
      });
      const lowStockProducts = Array.from(stockByProduct.values()).filter(qty => qty < 10).length;

      const expiryThreshold = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiringSoon = batches.filter(b => b.expiry_date && b.expiry_date <= expiryThreshold && b.expiry_date >= today).length;

      const animalsInWithdrawal = withdrawalRes.data?.length || 0;

      const diseaseCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.disease_id) {
          const count = diseaseCount.get(t.disease_id) || 0;
          diseaseCount.set(t.disease_id, count + 1);
        }
      });
      const topDiseases = Array.from(diseaseCount.entries())
        .map(([diseaseId, count]) => ({
          name: diseases.find(d => d.id === diseaseId)?.name || 'Unknown',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const productUsage = new Map<string, number>();
      usage.forEach(u => {
        const count = productUsage.get(u.product_id) || 0;
        productUsage.set(u.product_id, count + parseFloat(u.qty || 0));
      });
      const topProducts = Array.from(productUsage.entries())
        .map(([productId, usage]) => ({
          name: products.find(p => p.id === productId)?.name || 'Unknown',
          usage: Math.round(usage * 10) / 10,
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const treatmentsByMonth = new Map<string, number>();
      treatments.forEach(t => {
        const month = t.reg_date?.substring(0, 7) || '';
        const count = treatmentsByMonth.get(month) || 0;
        treatmentsByMonth.set(month, count + 1);
      });
      const treatmentsMonthly = Array.from(treatmentsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const vaccinationsByMonth = new Map<string, number>();
      vaccinations.forEach(v => {
        const month = v.vaccination_date?.substring(0, 7) || '';
        const count = vaccinationsByMonth.get(month) || 0;
        vaccinationsByMonth.set(month, count + 1);
      });
      const vaccinationsMonthly = Array.from(vaccinationsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const outcomeCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.outcome) {
          const count = outcomeCount.get(t.outcome) || 0;
          outcomeCount.set(t.outcome, count + 1);
        }
      });
      const outcomeStats = Array.from(outcomeCount.entries())
        .map(([outcome, count]) => ({ outcome, count }));

      const categoryValue = new Map<string, number>();
      batches.forEach(b => {
        const product = products.find(p => p.id === b.product_id);
        if (product) {
          const value = parseFloat(b.purchase_price || 0) * parseFloat(b.received_qty || 0);
          const current = categoryValue.get(product.category) || 0;
          categoryValue.set(product.category, current + value);
        }
      });
      const inventoryByCategory = Array.from(categoryValue.entries())
        .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      setAnalytics({
        totalAnimals,
        activeAnimals,
        totalTreatments,
        totalVaccinations,
        totalProductValue: Math.round(totalProductValue * 100) / 100,
        lowStockProducts,
        expiringSoon,
        animalsInWithdrawal,
        topDiseases,
        topProducts,
        treatmentsByMonth: treatmentsMonthly,
        vaccinationsByMonth: vaccinationsMonthly,
        outcomeStats,
        inventoryByCategory,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let query;

      switch (reportType) {
        case 'drug_journal':
          query = supabase.from('vw_vet_drug_journal').select('*');
          break;
        case 'treated_animals':
          query = supabase.from('vw_treated_animals').select('*');
          if (dateFrom) query = query.gte('reg_date', dateFrom);
          if (dateTo) query = query.lte('reg_date', dateTo);
          break;
        case 'owner_meds':
          query = supabase.from('vw_owner_admin_meds').select('*');
          if (dateFrom) query = query.gte('first_admin_date', dateFrom);
          if (dateTo) query = query.lte('first_admin_date', dateTo);
          break;
        case 'biocide_journal':
          query = supabase.from('vw_biocide_journal').select('*');
          if (dateFrom) query = query.gte('use_date', dateFrom);
          if (dateTo) query = query.lte('use_date', dateTo);
          break;
        case 'medical_waste':
          query = supabase.from('vw_medical_waste').select('*');
          if (dateFrom) query = query.gte('date', dateFrom);
          if (dateTo) query = query.lte('date', dateTo);
          break;
        default:
          return;
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const renderAnalytics = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{analytics.activeAnimals}</span>
            </div>
            <p className="text-blue-100 text-sm">Aktyvūs gyvūnai</p>
            <p className="text-blue-200 text-xs mt-1">Iš viso: {analytics.totalAnimals}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{analytics.totalTreatments}</span>
            </div>
            <p className="text-green-100 text-sm">Gydymai (6 mėn.)</p>
            <p className="text-green-200 text-xs mt-1">Pastarieji pusmetis</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Syringe className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{analytics.totalVaccinations}</span>
            </div>
            <p className="text-purple-100 text-sm">Vakcinacijos (6 mėn.)</p>
            <p className="text-purple-200 text-xs mt-1">Pastarieji pusmetis</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">€{analytics.totalProductValue.toLocaleString()}</span>
            </div>
            <p className="text-orange-100 text-sm">Atsargų vertė</p>
            <p className="text-orange-200 text-xs mt-1">Visi produktai</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-xl shadow-sm border-2 p-6 ${analytics.lowStockProducts > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${analytics.lowStockProducts > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Package className={`w-6 h-6 ${analytics.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${analytics.lowStockProducts > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {analytics.lowStockProducts}
                </p>
                <p className={`text-sm ${analytics.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  Maža atsargų
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Produktai su mažiau nei 10 vienetų</p>
          </div>

          <div className={`rounded-xl shadow-sm border-2 p-6 ${analytics.expiringSoon > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${analytics.expiringSoon > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${analytics.expiringSoon > 0 ? 'text-yellow-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${analytics.expiringSoon > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
                  {analytics.expiringSoon}
                </p>
                <p className={`text-sm ${analytics.expiringSoon > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  Baigiasi galiojimas
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Partijos su galiojimo laiku {'<'} 90 d.</p>
          </div>

          <div className={`rounded-xl shadow-sm border-2 p-6 ${analytics.animalsInWithdrawal > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${analytics.animalsInWithdrawal > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Calendar className={`w-6 h-6 ${analytics.animalsInWithdrawal > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${analytics.animalsInWithdrawal > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                  {analytics.animalsInWithdrawal}
                </p>
                <p className={`text-sm ${analytics.animalsInWithdrawal > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  Karantinas
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Gyvūnai su aktyviu karantinu</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-red-200">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Dažniausios ligos (6 mėn.)</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topDiseases.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topDiseases.map((disease, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{disease.name}</span>
                          <span className="text-sm font-bold text-gray-700">{disease.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all"
                            style={{ width: `${(disease.count / analytics.topDiseases[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Dažniausiai naudojami produktai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                          <span className="text-sm font-bold text-gray-700">{product.usage}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(product.usage / analytics.topProducts[0].usage) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Gydymai per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.treatmentsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.treatmentsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-green-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(item.count / Math.max(...analytics.treatmentsByMonth.map(t => t.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Vakcinacijos per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.vaccinationsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.vaccinationsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-purple-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(item.count / Math.max(...analytics.vaccinationsByMonth.map(v => v.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Gydymo rezultatai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.outcomeStats.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.outcomeStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className={`text-sm font-medium capitalize ${
                        stat.outcome === 'recovered' ? 'text-green-700' :
                        stat.outcome === 'ongoing' ? 'text-yellow-700' :
                        stat.outcome === 'died' ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {stat.outcome === 'recovered' ? 'Pasveiko' :
                         stat.outcome === 'ongoing' ? 'Tęsiasi' :
                         stat.outcome === 'died' ? 'Žuvo' : stat.outcome}
                      </span>
                      <span className="text-lg font-bold text-gray-900">{stat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-bold text-gray-900">Atsargų vertė pagal kategoriją</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.inventoryByCategory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.inventoryByCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {cat.category}
                      </span>
                      <span className="text-lg font-bold text-gray-900">€{cat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No data available for this report
        </div>
      );
    }

    const headers = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ataskaitos ir analitika</h2>
            <p className="text-sm text-gray-600">Peržiūrėkite analitikos duomenis ir generuokite ataskaitas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="analytics">Analitika</option>
            <option value="drug_journal">Veterinarinių vaistų žurnalas</option>
            <option value="treated_animals">Gydomų gyvūnų registras</option>
            <option value="owner_meds">Savininko duodami vaistai</option>
            <option value="biocide_journal">Biocidų žurnalas</option>
            <option value="medical_waste">Medicininių atliekų žurnalas</option>
          </select>

          {reportType !== 'analytics' && (
            <>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nuo"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Iki"
                />
              </div>

              <button
                onClick={loadReport}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Generuoti ataskaitą
              </button>
            </>
          )}
        </div>

        {reportType !== 'analytics' && data.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Eksportuoti CSV
            </button>
          </div>
        )}
      </div>

      {reportType === 'analytics' ? (
        renderAnalytics()
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {renderTable()}
        </div>
      )}
    </div>
  );
}
