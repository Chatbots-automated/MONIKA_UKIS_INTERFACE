import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, Package, Users, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Client {
  id: string;
  client_name: string;
  personal_code: string;
}

interface ProductUsage {
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit: string;
  category: string;
}

interface ClientAnalytics {
  client_id: string | null;
  client_name: string;
  total_invoices: number;
  total_invoice_value: number;
  products: ProductUsage[];
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [analytics, setAnalytics] = useState<ClientAnalytics[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [startMonth, setStartMonth] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 7); // YYYY-MM format
  });
  const [endMonth, setEndMonth] = useState(() => new Date().toISOString().substring(0, 7));

  useEffect(() => {
    loadData();
  }, [startMonth, endMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('vic_clients')
        .select('id, client_name, personal_code')
        .order('client_name');

      setClients(clientsData || []);

      // Convert month to date range
      const startDate = `${startMonth}-01`;
      const endDate = (() => {
        const [year, month] = endMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        return `${endMonth}-${String(lastDay).padStart(2, '0')}`;
      })();

      console.log('📊 [Analytics] Loading data for date range:', { startMonth, endMonth, startDate, endDate });

      // Load invoices with date filter
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          client_id,
          invoice_date,
          total_price,
          vic_clients(id, client_name, personal_code)
        `)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .order('invoice_date', { ascending: false });

      if (invoicesError) {
        console.error('❌ [Analytics] Error loading invoices:', invoicesError);
        throw invoicesError;
      }

      console.log(`✅ [Analytics] Loaded ${invoices?.length || 0} invoices`);

      if (!invoices) {
        setAnalytics([]);
        setLoading(false);
        return;
      }

      // Load batches for these invoices
      const invoiceIds = invoices.map(inv => inv.id);
      const { data: batches } = await supabase
        .from('batches')
        .select(`
          id,
          invoice_id,
          product_id,
          quantity,
          unit,
          products(id, name, category)
        `)
        .in('invoice_id', invoiceIds);

      // Load usage data for these batches
      const batchIds = batches?.map(b => b.id) || [];
      const { data: usageItems } = await supabase
        .from('usage_items')
        .select('batch_id, quantity')
        .in('batch_id', batchIds);

      // Group by client
      const clientMap = new Map<string | null, ClientAnalytics>();

      // Initialize with unassigned
      clientMap.set(null, {
        client_id: null,
        client_name: 'Nepriskirta',
        total_invoices: 0,
        total_invoice_value: 0,
        products: []
      });

      // Process invoices
      for (const invoice of invoices) {
        const clientId = invoice.client_id;
        const clientName = invoice.vic_clients?.client_name || 'Nepriskirta';

        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            client_id: clientId,
            client_name: clientName,
            total_invoices: 0,
            total_invoice_value: 0,
            products: []
          });
        }

        const clientData = clientMap.get(clientId)!;
        clientData.total_invoices++;
        clientData.total_invoice_value += invoice.total_price || 0;

        // Get batches for this invoice
        const invoiceBatches = batches?.filter(b => b.invoice_id === invoice.id) || [];

        for (const batch of invoiceBatches) {
          // Calculate used quantity for this batch
          const batchUsage = usageItems?.filter(u => u.batch_id === batch.id) || [];
          const usedQuantity = batchUsage.reduce((sum, u) => sum + (u.quantity || 0), 0);

          if (usedQuantity > 0 && batch.products) {
            // Find or create product entry
            let productEntry = clientData.products.find(p => p.product_id === batch.product_id);
            
            if (!productEntry) {
              productEntry = {
                product_id: batch.product_id,
                product_name: batch.products.name,
                total_quantity: 0,
                unit: batch.unit,
                category: batch.products.category
              };
              clientData.products.push(productEntry);
            }

            productEntry.total_quantity += usedQuantity;
          }
        }
      }

      // Convert to array and sort
      const analyticsArray = Array.from(clientMap.values())
        .filter(c => c.total_invoices > 0 || c.products.length > 0)
        .sort((a, b) => {
          if (a.client_id === null) return 1;
          if (b.client_id === null) return -1;
          return b.total_invoice_value - a.total_invoice_value;
        });

      setAnalytics(analyticsArray);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalytics = selectedClient === 'all'
    ? analytics
    : analytics.filter(a => a.client_id === (selectedClient === 'unassigned' ? null : selectedClient));

  const exportToExcel = () => {
    const data: any[] = [];

    filteredAnalytics.forEach(client => {
      client.products.forEach(product => {
        data.push({
          'Savininkas': client.client_name,
          'Produktas': product.product_name,
          'Kategorija': product.category,
          'Panaudota': product.total_quantity,
          'Vienetas': product.unit,
          'Sąskaitų skaičius': client.total_invoices,
          'Bendra vertė': `€${client.total_invoice_value.toFixed(2)}`
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analitika');
    XLSX.writeFile(wb, `apskaita_analitika_${startMonth}_${endMonth}.xlsx`);
  };

  const totalInvoices = filteredAnalytics.reduce((sum, c) => sum + c.total_invoices, 0);
  const totalValue = filteredAnalytics.reduce((sum, c) => sum + c.total_invoice_value, 0);
  const totalProducts = filteredAnalytics.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              Ūkių Analitika
            </h2>
            <p className="text-sm text-gray-600 mt-1">Produktų panaudojimas pagal ūkius ir sąskaitų datas</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={filteredAnalytics.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Eksportuoti
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pradžios mėnuo
            </label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pabaigos mėnuo
            </label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtruoti pagal ūkį
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Visi ūkiai</option>
              <option value="unassigned">Nepriskirta</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.client_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-700">Viso sąskaitų</h3>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{totalInvoices}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-emerald-700">Bendra vertė</h3>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-900">€{totalValue.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-700">Skirtingų produktų</h3>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{totalProducts}</p>
        </div>
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kraunama analitika...</p>
        </div>
      ) : filteredAnalytics.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nėra duomenų pasirinktam laikotarpiui</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnalytics.map((clientData) => (
            <div key={clientData.client_id || 'unassigned'} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Client Header */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      {clientData.client_name}
                    </h3>
                    <div className="flex gap-6 mt-2 text-sm text-gray-600">
                      <span>Sąskaitų: <span className="font-semibold text-gray-900">{clientData.total_invoices}</span></span>
                      <span>Vertė: <span className="font-semibold text-gray-900">€{clientData.total_invoice_value.toFixed(2)}</span></span>
                      <span>Produktų: <span className="font-semibold text-gray-900">{clientData.products.length}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              {clientData.products.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produktas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorija</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Panaudota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clientData.products.map((product, idx) => (
                        <tr key={`${product.product_id}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{product.product_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-gray-900">
                              {product.total_quantity.toFixed(2)} {product.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
