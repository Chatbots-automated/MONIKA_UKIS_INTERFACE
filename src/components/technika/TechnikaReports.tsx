import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  TrendingUp,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';

interface ProductHistory {
  product_id: string;
  product_name: string;
  product_code: string;
  category_name: string;
  unit_type: string;
  current_stock: number;
  total_received: number;
  total_spent: number;
  total_issued: number;
  avg_price: number;
  batches: any[];
  issuances: any[];
  invoices: any[];
}

interface CategoryStats {
  category: string;
  total_value: number;
  total_qty: number;
  item_count: number;
  issued_value: number;
}

interface WorkerStats {
  worker_id: string;
  worker_name: string;
  items_count: number;
  total_value: number;
  outstanding_items: any[];
}

export function TechnikaReports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'workers' | 'categories' | 'timeline'>('overview');
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [productHistory, setProductHistory] = useState<ProductHistory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats[]>([]);
  const [overviewStats, setOverviewStats] = useState({
    totalInventoryValue: 0,
    itemsOnLoan: 0,
    loanValue: 0,
    monthlySpending: 0,
    lowStockItems: 0,
    totalProducts: 0,
  });

  const [dateFilter, setDateFilter] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    loadData();
  }, [dateFilter]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('name');
    if (data) setCategories(data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProductHistory(),
        loadCategoryStats(),
        loadWorkerStats(),
        loadOverviewStats(),
      ]);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductHistory = async () => {
    const { data: products } = await supabase
      .from('equipment_products')
      .select(`
        *,
        equipment_categories(name)
      `)
      .eq('is_active', true)
      .order('name');

    if (!products) return;

    const productHistories = await Promise.all(
      products.map(async (product) => {
        const { data: batches } = await supabase
          .from('equipment_batches')
          .select(`
            *,
            equipment_invoices(invoice_number, invoice_date, supplier_name)
          `)
          .eq('product_id', product.id)
          .order('created_at', { ascending: false });

        const { data: issuanceItems } = await supabase
          .from('equipment_issuance_items')
          .select(`
            *,
            equipment_issuances(
              issuance_number,
              issue_date,
              issued_to_name,
              status,
              users(full_name)
            )
          `)
          .eq('product_id', product.id)
          .order('created_at', { ascending: false });

        const totalReceived = batches?.reduce((sum, b) => sum + parseFloat(b.received_qty || 0), 0) || 0;
        const totalSpent = batches?.reduce((sum, b) => sum + parseFloat(b.purchase_price || 0) * parseFloat(b.received_qty || 0), 0) || 0;
        const totalIssued = issuanceItems?.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0) || 0;
        const currentStock = batches?.reduce((sum, b) => sum + parseFloat(b.qty_left || 0), 0) || 0;
        const avgPrice = totalReceived > 0 ? totalSpent / totalReceived : 0;

        return {
          product_id: product.id,
          product_name: product.name,
          product_code: product.product_code || '',
          category_name: product.equipment_categories?.name || 'Nėra kategorijos',
          unit_type: product.unit_type || 'vnt',
          current_stock: currentStock,
          total_received: totalReceived,
          total_spent: totalSpent,
          total_issued: totalIssued,
          avg_price: avgPrice,
          batches: batches || [],
          issuances: issuanceItems || [],
          invoices: batches?.map(b => b.equipment_invoices).filter(Boolean) || [],
        };
      })
    );

    setProductHistory(productHistories);
  };

  const loadCategoryStats = async () => {
    const { data: stats } = await supabase
      .from('equipment_batches')
      .select(`
        product_id,
        qty_left,
        purchase_price,
        received_qty,
        equipment_products!inner(
          category_id,
          equipment_categories(name)
        )
      `)
      .gte('created_at', dateFilter.from)
      .lte('created_at', dateFilter.to + 'T23:59:59');

    if (!stats) return;

    const categoryMap = new Map<string, CategoryStats>();

    stats.forEach((item: any) => {
      const categoryName = item.equipment_products?.equipment_categories?.name || 'Nėra kategorijos';
      const value = parseFloat(item.qty_left || 0) * parseFloat(item.purchase_price || 0);
      const received = parseFloat(item.received_qty || 0);

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category: categoryName,
          total_value: 0,
          total_qty: 0,
          item_count: 0,
          issued_value: 0,
        });
      }

      const cat = categoryMap.get(categoryName)!;
      cat.total_value += value;
      cat.total_qty += parseFloat(item.qty_left || 0);
      cat.item_count++;
    });

    setCategoryStats(Array.from(categoryMap.values()));
  };

  const loadWorkerStats = async () => {
    const { data: issuances } = await supabase
      .from('equipment_issuances')
      .select(`
        *,
        equipment_issuance_items(
          quantity,
          quantity_returned,
          unit_price,
          equipment_products(name, unit_type)
        ),
        users(full_name)
      `)
      .in('status', ['issued', 'partial_return'])
      .gte('issue_date', dateFilter.from)
      .lte('issue_date', dateFilter.to + 'T23:59:59');

    if (!issuances) return;

    const workerMap = new Map<string, WorkerStats>();

    issuances.forEach((issuance: any) => {
      const workerId = issuance.issued_to || 'unknown';
      const workerName = issuance.users?.full_name || issuance.issued_to_name || 'Nežinomas';

      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          worker_id: workerId,
          worker_name: workerName,
          items_count: 0,
          total_value: 0,
          outstanding_items: [],
        });
      }

      const worker = workerMap.get(workerId)!;

      issuance.equipment_issuance_items?.forEach((item: any) => {
        const outstanding = parseFloat(item.quantity || 0) - parseFloat(item.quantity_returned || 0);
        if (outstanding > 0) {
          worker.items_count++;
          worker.total_value += outstanding * parseFloat(item.unit_price || 0);
          worker.outstanding_items.push({
            product_name: item.equipment_products?.name,
            quantity: outstanding,
            unit_type: item.equipment_products?.unit_type,
            issuance_number: issuance.issuance_number,
            issue_date: issuance.issue_date,
          });
        }
      });
    });

    setWorkerStats(Array.from(workerMap.values()).filter(w => w.items_count > 0));
  };

  const loadOverviewStats = async () => {
    const { data: warehouseStock } = await supabase
      .from('equipment_warehouse_stock')
      .select('*');

    const { data: itemsOnLoan } = await supabase
      .from('equipment_items_on_loan')
      .select('*');

    const { data: monthlyInvoices } = await supabase
      .from('equipment_invoices')
      .select('total_net')
      .gte('invoice_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .lte('invoice_date', new Date().toISOString().split('T')[0]);

    const totalInventoryValue = warehouseStock?.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0) || 0;
    const itemsOnLoanCount = itemsOnLoan?.length || 0;
    const loanValue = itemsOnLoan?.reduce((sum, item) => sum + parseFloat(item.value_outstanding || 0), 0) || 0;
    const monthlySpending = monthlyInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_net || 0), 0) || 0;
    const lowStockItems = warehouseStock?.filter(item => parseFloat(item.total_qty || 0) < 5).length || 0;
    const totalProducts = warehouseStock?.length || 0;

    setOverviewStats({
      totalInventoryValue,
      itemsOnLoan: itemsOnLoanCount,
      loanValue,
      monthlySpending,
      lowStockItems,
      totalProducts,
    });
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredProducts = categoryFilter === 'all'
    ? productHistory
    : productHistory.filter(p => p.category_name === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Nuo:</label>
            <input
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Iki:</label>
            <input
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Apžvalga', icon: BarChart3 },
              { id: 'items', label: 'Prekių istorija', icon: Package },
              { id: 'workers', label: 'Darbuotojai', icon: Users },
              { id: 'categories', label: 'Kategorijos', icon: Filter },
              { id: 'timeline', label: 'Laiko juosta', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Kraunami duomenys...</p>
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Bendras sandėlio turtas"
                  value={`€${overviewStats.totalInventoryValue.toFixed(2)}`}
                  icon={DollarSign}
                  trend={null}
                  color="blue"
                />
                <StatCard
                  title="Išduota prekių"
                  value={overviewStats.itemsOnLoan.toString()}
                  icon={ArrowUpRight}
                  subtext={`Vertė: €${overviewStats.loanValue.toFixed(2)}`}
                  color="orange"
                />
                <StatCard
                  title="Šio mėnesio išlaidos"
                  value={`€${overviewStats.monthlySpending.toFixed(2)}`}
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Mažos atsargos"
                  value={overviewStats.lowStockItems.toString()}
                  icon={AlertTriangle}
                  subtext="Prekių su < 5 vnt."
                  color="red"
                />
                <StatCard
                  title="Produktų kataloge"
                  value={overviewStats.totalProducts.toString()}
                  icon={Package}
                  color="purple"
                />
                <StatCard
                  title="Vidutinė partijos vertė"
                  value={overviewStats.totalProducts > 0
                    ? `€${(overviewStats.totalInventoryValue / overviewStats.totalProducts).toFixed(2)}`
                    : '€0.00'}
                  icon={BarChart3}
                  color="indigo"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Top 5 Kategorijos pagal vertę</h3>
                  <div className="space-y-3">
                    {categoryStats
                      .sort((a, b) => b.total_value - a.total_value)
                      .slice(0, 5)
                      .map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{cat.category}</span>
                          <span className="font-semibold text-gray-900">€{cat.total_value.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Top 5 Darbuotojai pagal išduotų prekių vertę</h3>
                  <div className="space-y-3">
                    {workerStats
                      .sort((a, b) => b.total_value - a.total_value)
                      .slice(0, 5)
                      .map((worker, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{worker.worker_name}</span>
                          <span className="font-semibold text-gray-900">
                            €{worker.total_value.toFixed(2)} ({worker.items_count})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Prekių istorija ir sekimas</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">Visos kategorijos</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => exportToCSV(
                      filteredProducts.map(p => ({
                        'Pavadinimas': p.product_name,
                        'Kodas': p.product_code,
                        'Kategorija': p.category_name,
                        'Dabartinės atsargos': p.current_stock,
                        'Gauta iš viso': p.total_received,
                        'Išleista iš viso': p.total_spent.toFixed(2),
                        'Išduota': p.total_issued,
                        'Vid. kaina': p.avg_price.toFixed(2),
                      })),
                      'prekiu_istorija'
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Eksportuoti
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isExpanded = expandedProduct === product.product_id;
                  return (
                    <div key={product.product_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedProduct(isExpanded ? null : product.product_id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{product.product_name}</div>
                            <div className="text-sm text-gray-600">
                              {product.product_code} • {product.category_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <div className="text-gray-600">Atsargos</div>
                            <div className="font-semibold text-gray-900">
                              {product.current_stock} {product.unit_type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600">Gauta</div>
                            <div className="font-semibold text-gray-900">
                              {product.total_received} {product.unit_type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600">Išleista</div>
                            <div className="font-semibold text-gray-900">€{product.total_spent.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-600">Išduota</div>
                            <div className="font-semibold text-gray-900">
                              {product.total_issued} {product.unit_type}
                            </div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Batches/Receipts */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Pajamavimo istorija ({product.batches.length})
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {product.batches.map((batch) => (
                                  <div key={batch.id} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                                    <div className="flex justify-between mb-1">
                                      <span className="font-medium text-gray-900">
                                        {batch.equipment_invoices?.invoice_number || 'N/A'}
                                      </span>
                                      <span className="text-gray-600">
                                        {new Date(batch.created_at).toLocaleDateString('lt-LT')}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-gray-700">
                                      <span>
                                        Kiekis: {batch.received_qty} {product.unit_type}
                                      </span>
                                      <span>
                                        Likutis: {batch.qty_left} {product.unit_type}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-gray-700 mt-1">
                                      <span>
                                        Kaina: €{parseFloat(batch.purchase_price || 0).toFixed(2)}
                                      </span>
                                      <span className="font-medium">
                                        Suma: €{(parseFloat(batch.purchase_price || 0) * parseFloat(batch.received_qty || 0)).toFixed(2)}
                                      </span>
                                    </div>
                                    {batch.equipment_invoices?.supplier_name && (
                                      <div className="text-gray-600 mt-1">
                                        Tiekėjas: {batch.equipment_invoices.supplier_name}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Issuances/Distribution */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Išdavimo istorija ({product.issuances.length})
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {product.issuances.map((issuance) => (
                                  <div key={issuance.id} className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                                    <div className="flex justify-between mb-1">
                                      <span className="font-medium text-gray-900">
                                        {issuance.equipment_issuances?.issuance_number || 'N/A'}
                                      </span>
                                      <span className="text-gray-600">
                                        {new Date(issuance.created_at).toLocaleDateString('lt-LT')}
                                      </span>
                                    </div>
                                    <div className="text-gray-700">
                                      Kam: {issuance.equipment_issuances?.users?.full_name || issuance.equipment_issuances?.issued_to_name || 'N/A'}
                                    </div>
                                    <div className="flex justify-between text-gray-700 mt-1">
                                      <span>
                                        Kiekis: {issuance.quantity} {product.unit_type}
                                      </span>
                                      <span>
                                        Grąžinta: {issuance.quantity_returned} {product.unit_type}
                                      </span>
                                    </div>
                                    {issuance.unit_price && (
                                      <div className="text-gray-700 mt-1">
                                        Vertė: €{(parseFloat(issuance.quantity || 0) * parseFloat(issuance.unit_price || 0)).toFixed(2)}
                                      </div>
                                    )}
                                    <div className="mt-1">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        issuance.equipment_issuances?.status === 'issued'
                                          ? 'bg-orange-100 text-orange-800'
                                          : issuance.equipment_issuances?.status === 'returned'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {issuance.equipment_issuances?.status === 'issued' ? 'Išduota' :
                                         issuance.equipment_issuances?.status === 'returned' ? 'Grąžinta' :
                                         issuance.equipment_issuances?.status === 'partial_return' ? 'Dalinai grąžinta' : 'Prarasta'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-sm text-gray-600">Vidutinė kaina</div>
                                <div className="text-lg font-bold text-gray-900">€{product.avg_price.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Iš viso gauta</div>
                                <div className="text-lg font-bold text-green-600">
                                  +{product.total_received} {product.unit_type}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Iš viso išduota</div>
                                <div className="text-lg font-bold text-orange-600">
                                  -{product.total_issued} {product.unit_type}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Dabartinis likutis</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {product.current_stock} {product.unit_type}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && activeTab === 'workers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Darbuotojų išduotų prekių suvestinė</h3>
                <button
                  onClick={() => exportToCSV(
                    workerStats.map(w => ({
                      'Darbuotojas': w.worker_name,
                      'Prekių skaičius': w.items_count,
                      'Bendra vertė': w.total_value.toFixed(2),
                    })),
                    'darbuotoju_suvestine'
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Eksportuoti
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workerStats.map((worker) => (
                  <div key={worker.worker_id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{worker.worker_name}</h4>
                        <p className="text-sm text-gray-600">
                          {worker.items_count} prekės • €{worker.total_value.toFixed(2)}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {worker.outstanding_items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">{item.product_name}</span>
                            <span className="text-gray-700">
                              {item.quantity} {item.unit_type}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{item.issuance_number}</span>
                            <span>{new Date(item.issue_date).toLocaleDateString('lt-LT')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Kategorijų statistika</h3>
                <button
                  onClick={() => exportToCSV(
                    categoryStats.map(c => ({
                      'Kategorija': c.category,
                      'Bendra vertė': c.total_value.toFixed(2),
                      'Kiekis': c.total_qty,
                      'Prekių skaičius': c.item_count,
                    })),
                    'kategoriju_statistika'
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Eksportuoti
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStats.map((cat, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="font-semibold text-gray-900 mb-3">{cat.category}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Bendra vertė</span>
                        <span className="font-medium text-gray-900">€{cat.total_value.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Kiekis</span>
                        <span className="font-medium text-gray-900">{cat.total_qty.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Skirtingų prekių</span>
                        <span className="font-medium text-gray-900">{cat.item_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'timeline' && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Laiko juosta (coming soon)</h3>
              <p className="text-gray-600">
                Čia bus rodomi laiko grafikai ir tendencijos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  trend?: number | null;
  subtext?: string;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo';
}

function StatCard({ title, value, icon: Icon, trend, subtext, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtext && <p className="text-xs text-gray-600">{subtext}</p>}
      {trend !== null && trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend >= 0 ? (
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  );
}
