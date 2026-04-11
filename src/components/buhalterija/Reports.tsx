import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  Package,
  Building2,
  FileText,
  DollarSign
} from 'lucide-react';

interface ReportData {
  suppliers: Array<{ name: string; total: number; count: number; avgAmount: number }>;
  categories: Array<{ category: string; total: number; count: number }>;
  monthly: Array<{ month: string; total: number; count: number }>;
  costCenters: Array<{ name: string; total: number }>;
  taxSummary: { totalVAT: number; totalNet: number; totalGross: number };
}

export function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedModule, setSelectedModule] = useState<'all' | 'veterinarija' | 'technika'>('all');
  const [activeReport, setActiveReport] = useState<'suppliers' | 'categories' | 'monthly' | 'tax'>('suppliers');

  useEffect(() => {
    loadReportData();
  }, [dateRange, selectedModule]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load invoices based on filters
      const vetQuery = supabase
        .from('invoices')
        .select('invoice_date, supplier_name, total_gross, total_net, total_vat')
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end);

      const techQuery = supabase
        .from('equipment_invoices')
        .select('invoice_date, supplier_name, total_gross, total_net, total_vat')
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end);

      const [{ data: vetInvoices }, { data: techInvoices }] = await Promise.all([
        vetQuery,
        techQuery
      ]);

      let allInvoices = [
        ...(vetInvoices || []).map(inv => ({ ...inv, module: 'veterinarija' })),
        ...(techInvoices || []).map(inv => ({ ...inv, module: 'technika' }))
      ];

      if (selectedModule !== 'all') {
        allInvoices = allInvoices.filter(inv => inv.module === selectedModule);
      }

      // Supplier analysis
      const supplierMap = new Map<string, { total: number; count: number }>();
      allInvoices.forEach(inv => {
        const existing = supplierMap.get(inv.supplier_name) || { total: 0, count: 0 };
        supplierMap.set(inv.supplier_name, {
          total: existing.total + (inv.total_gross || 0),
          count: existing.count + 1
        });
      });
      const suppliers = Array.from(supplierMap.entries())
        .map(([name, data]) => ({
          name,
          total: data.total,
          count: data.count,
          avgAmount: data.total / data.count
        }))
        .sort((a, b) => b.total - a.total);

      // Monthly breakdown
      const monthlyMap = new Map<string, { total: number; count: number }>();
      allInvoices.forEach(inv => {
        const monthKey = new Date(inv.invoice_date).toLocaleDateString('lt-LT', { 
          year: 'numeric', 
          month: 'long' 
        });
        const existing = monthlyMap.get(monthKey) || { total: 0, count: 0 };
        monthlyMap.set(monthKey, {
          total: existing.total + (inv.total_gross || 0),
          count: existing.count + 1
        });
      });
      const monthly = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Tax summary
      const taxSummary = {
        totalVAT: allInvoices.reduce((sum, inv) => sum + (inv.total_vat || 0), 0),
        totalNet: allInvoices.reduce((sum, inv) => sum + (inv.total_net || 0), 0),
        totalGross: allInvoices.reduce((sum, inv) => sum + (inv.total_gross || 0), 0)
      };

      setReportData({
        suppliers,
        categories: [], // Will implement with category data
        monthly,
        costCenters: [], // Will implement with cost center data
        taxSummary
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    let filename = '';

    switch (activeReport) {
      case 'suppliers':
        csvContent = 'Tiekėjas,Bendra suma,Sąskaitų skaičius,Vidutinė suma\n';
        reportData.suppliers.forEach(s => {
          csvContent += `"${s.name}",${s.total.toFixed(2)},${s.count},${s.avgAmount.toFixed(2)}\n`;
        });
        filename = 'tiekeju_ataskaita.csv';
        break;
      case 'monthly':
        csvContent = 'Mėnuo,Bendra suma,Sąskaitų skaičius\n';
        reportData.monthly.forEach(m => {
          csvContent += `"${m.month}",${m.total.toFixed(2)},${m.count}\n`;
        });
        filename = 'menesine_ataskaita.csv';
        break;
      case 'tax':
        csvContent = 'Rodiklis,Suma\n';
        csvContent += `"Bendra suma (su PVM)",${reportData.taxSummary.totalGross.toFixed(2)}\n`;
        csvContent += `"Suma be PVM",${reportData.taxSummary.totalNet.toFixed(2)}\n`;
        csvContent += `"PVM suma",${reportData.taxSummary.totalVAT.toFixed(2)}\n`;
        filename = 'pvm_ataskaita.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Ataskaitos</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Eksportuoti
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Periodo pradžia
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Periodo pabaiga
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Modulis
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">Visi</option>
              <option value="veterinarija">Veterinarija</option>
              <option value="technika">Technika</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveReport('suppliers')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeReport === 'suppliers'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Tiekėjai
        </button>
        <button
          onClick={() => setActiveReport('monthly')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeReport === 'monthly'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Mėnesinis
        </button>
        <button
          onClick={() => setActiveReport('tax')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeReport === 'tax'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          PVM ataskaita
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeReport === 'suppliers' && reportData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiekėjų analizė</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiekėjas</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bendra suma</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sąskaitų sk.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vidutinė suma</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dalis (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.suppliers.map((supplier, idx) => {
                    const totalSum = reportData.suppliers.reduce((sum, s) => sum + s.total, 0);
                    const percentage = (supplier.total / totalSum) * 100;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier.name}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          €{supplier.total.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{supplier.count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          €{supplier.avgAmount.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">Viso:</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      €{reportData.suppliers.reduce((sum, s) => sum + s.total, 0).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {reportData.suppliers.reduce((sum, s) => sum + s.count, 0)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'monthly' && reportData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mėnesinė analizė</h3>
            <div className="space-y-4">
              {reportData.monthly.map((month, idx) => {
                const maxTotal = Math.max(...reportData.monthly.map(m => m.total));
                const percentage = (month.total / maxTotal) * 100;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{month.month}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          €{month.total.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">({month.count} sąsk.)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Vidutinis mėnuo</p>
                  <p className="text-lg font-bold text-blue-600">
                    €{(reportData.monthly.reduce((sum, m) => sum + m.total, 0) / reportData.monthly.length).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Didžiausias</p>
                  <p className="text-lg font-bold text-green-600">
                    €{Math.max(...reportData.monthly.map(m => m.total)).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mažiausias</p>
                  <p className="text-lg font-bold text-amber-600">
                    €{Math.min(...reportData.monthly.map(m => m.total)).toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'tax' && reportData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PVM ataskaita</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <p className="text-sm text-blue-600 font-medium mb-2">Bendra suma (su PVM)</p>
                <p className="text-3xl font-bold text-blue-900">
                  €{reportData.taxSummary.totalGross.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <p className="text-sm text-green-600 font-medium mb-2">Suma be PVM</p>
                <p className="text-3xl font-bold text-green-900">
                  €{reportData.taxSummary.totalNet.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <p className="text-sm text-purple-600 font-medium mb-2">PVM suma</p>
                <p className="text-3xl font-bold text-purple-900">
                  €{reportData.taxSummary.totalVAT.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-6 p-6 bg-gray-50 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-4">PVM detalizacija</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600">Vidutinis PVM tarifas</span>
                  <span className="font-semibold text-gray-900">
                    {((reportData.taxSummary.totalVAT / reportData.taxSummary.totalNet) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-600">PVM dalis bendrojoje sumoje</span>
                  <span className="font-semibold text-gray-900">
                    {((reportData.taxSummary.totalVAT / reportData.taxSummary.totalGross) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
