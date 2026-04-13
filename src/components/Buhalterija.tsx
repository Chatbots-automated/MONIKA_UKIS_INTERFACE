import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Package, Calendar, Building2, ChevronDown, ChevronRight, Download, User, Car, Wrench, Warehouse as WarehouseIcon, DollarSign, FileCheck, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { SecretarySystemExport } from './technika/SecretarySystemExport';
import { WriteOffActs } from './WriteOffActs';
import { Dashboard } from './buhalterija/Dashboard';
import { Reports } from './buhalterija/Reports';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_net: number;
  total_vat: number;
  total_gross: number;
  pdf_url?: string;
  created_at: string;
  module: 'veterinarija' | 'technika';
  items?: any[];
}

export function Buhalterija() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'writeoffs' | 'reports'>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<'all' | 'veterinarija' | 'technika'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingInvoiceId, setExportingInvoiceId] = useState<string | null>(null);
  const [exportingInvoiceModule, setExportingInvoiceModule] = useState<'veterinarija' | 'technika'>('technika');

  useEffect(() => {
    loadInvoices();
  }, [filterModule]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Load veterinarija invoices WITHOUT items initially (faster)
      const { data: vetInvoices, error: vetError } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(100); // Limit to last 100 invoices

      // Load technika invoices WITHOUT nested data initially (much faster)
      const { data: techInvoices, error: techError} = await supabase
        .from('equipment_invoices')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(100); // Limit to last 100 invoices

      // Don't load items/batches initially - load them on-demand when invoice is expanded

      if (vetError) console.error('Error loading vet invoices:', vetError);
      if (techError) console.error('Error loading tech invoices:', techError);

      const allInvoices: Invoice[] = [];

      // Add veterinarija invoices with items
      if (vetInvoices) {
        allInvoices.push(...vetInvoices.map(inv => ({
          ...inv,
          module: 'veterinarija' as const,
          items: inv.invoice_items || [],
        })));
      }

      // Add technika invoices
      if (techInvoices) {
        allInvoices.push(...techInvoices.map(inv => ({
          ...inv,
          module: 'technika' as const,
          items: inv.equipment_invoice_items || [],
        })));
      }

      // Sort by date
      allInvoices.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());

      // Apply filter
      if (filterModule !== 'all') {
        setInvoices(allInvoices.filter(inv => inv.module === filterModule));
      } else {
        setInvoices(allInvoices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (invoiceId: string, module: 'veterinarija' | 'technika') => {
    try {
      if (module === 'veterinarija') {
        // Load vet invoice items and batches
        const { data: items, error: itemsError } = await supabase
          .from('invoice_items')
          .select(`
            id,
            product_id,
            description,
            sku,
            quantity,
            unit_price,
            total_price,
            batch_id,
            products(id, name, category)
          `)
          .eq('invoice_id', invoiceId);

        if (itemsError) {
          console.error('Error loading vet invoice items:', itemsError);
          return;
        }

        if (items) {
          // Load batches for each item
          for (const item of items) {
            if (item.batch_id) {
              const { data: batch } = await supabase
                .from('batches')
                .select('id, product_id, batch_number, lot, received_qty, qty_left, purchase_price, expiry_date')
                .eq('id', item.batch_id)
                .single();
              
              item.batches = batch ? [batch] : [];
            } else {
              item.batches = [];
            }
          }

          // Update the invoice in state
          setInvoices(prev => prev.map(inv => 
            inv.id === invoiceId ? { ...inv, items } : inv
          ));
        }
      } else {
        // Load technika invoice items, assignments, and batches
        const { data: items, error: itemsError } = await supabase
          .from('equipment_invoice_items')
          .select(`
            id,
            description,
            quantity,
            unit_price,
            total_price,
            product_id,
            equipment_products(name, product_code, unit_type),
            equipment_invoice_item_assignments(
              id,
              assignment_type,
              assigned_at,
              notes,
              cost_center_id,
              worker_id,
              vehicle_id,
              compartment_id,
              tool_id,
              cost_centers(name),
              worker:users!worker_id(full_name),
              vehicles(registration_number, make, model),
              equipment_shelf_compartments(compartment_code, equipment_shelves(shelf_number, name)),
              tools(name, tool_number)
            )
          `)
          .eq('invoice_id', invoiceId);

        if (itemsError) {
          console.error('Error loading technika invoice items:', itemsError);
          return;
        }

        if (items) {
          // Load batches for this invoice
          const { data: batches } = await supabase
            .from('equipment_batches')
            .select('id, product_id, batch_number, received_qty, qty_left, purchase_price, expiry_date')
            .eq('invoice_id', invoiceId);

          // Assign batches to items
          if (batches) {
            for (const item of items) {
              item.batches = batches.filter((b: any) => b.product_id === item.product_id);
            }
          }

          // Update the invoice in state
          setInvoices(prev => prev.map(inv => 
            inv.id === invoiceId ? { ...inv, items } : inv
          ));
        }
      }
    } catch (error) {
      console.error('Error loading invoice details:', error);
    }
  };

  const handleToggleExpand = async (invoiceId: string, module: 'veterinarija' | 'technika') => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
    } else {
      setExpandedInvoice(invoiceId);
      // Always load details when expanding (to ensure fresh data)
      await loadInvoiceDetails(invoiceId, module);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (!invoice.pdf_url) {
      alert('Sąskaitos failas nerastas');
      return;
    }
    window.open(invoice.pdf_url, '_blank');
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canExport = user?.role === 'admin' || user?.role === 'buhaltere';

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-3 font-medium transition-all rounded-lg ${
              activeTab === 'dashboard'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">Apžvalga</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 px-4 py-3 font-medium transition-all rounded-lg ${
              activeTab === 'invoices'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">Sąskaitos</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('writeoffs')}
            className={`flex-1 px-4 py-3 font-medium transition-all rounded-lg ${
              activeTab === 'writeoffs'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileCheck className="w-5 h-5" />
              <span className="hidden sm:inline">Nurašymo aktai</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-4 py-3 font-medium transition-all rounded-lg ${
              activeTab === 'reports'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="hidden sm:inline">Ataskaitos</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && <Dashboard />}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Visos sąskaitos</h2>
            {canExport && selectedInvoices.size > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Eksportuoti ({selectedInvoices.size})
              </button>
            )}
          </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterModule('all')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visos ({invoices.length})
          </button>
          <button
            onClick={() => setFilterModule('veterinarija')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'veterinarija'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Veterinarija
          </button>
          <button
            onClick={() => setFilterModule('technika')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'technika'
                ? 'bg-slate-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Technika
          </button>
        </div>

        <input
          type="text"
          placeholder="Ieškoti pagal numerį ar tiekėją..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Iš viso sąskaitų</p>
          <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Bendra suma (neto)</p>
          <p className="text-2xl font-bold text-green-600">
            €{filteredInvoices.reduce((sum, inv) => sum + (inv.total_net || 0), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Bendra suma (bruto)</p>
          <p className="text-2xl font-bold text-blue-600">
            €{filteredInvoices.reduce((sum, inv) => sum + (inv.total_gross || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Kraunama...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Sąskaitų nerasta</p>
          </div>
        ) : (
          filteredInvoices.map(invoice => (
            <div key={invoice.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {canExport && (
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(invoice.id)}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        className="mt-1"
                      />
                    )}
                  <button
                    onClick={() => handleToggleExpand(invoice.id, invoice.module)}
                    className="flex-1 text-left"
                  >
                      <div className="flex items-center gap-3">
                        {expandedInvoice === invoice.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              invoice.module === 'veterinarija'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {invoice.module === 'veterinarija' ? 'Veterinarija' : 'Technika'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {invoice.supplier_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(invoice.invoice_date).toLocaleDateString('lt-LT')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Suma (bruto)</p>
                          <p className="text-lg font-bold text-blue-600">€{invoice.total_gross.toFixed(2)}</p>
                        </div>
                      </div>
                    </button>
                    {invoice.pdf_url && (
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Atsisiųsti sąskaitą"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    {canExport && (
                      <button
                        onClick={() => {
                          setExportingInvoiceId(invoice.id);
                          setExportingInvoiceModule(invoice.module);
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-sm text-sm"
                        title="Eksportuoti į sekretorės sistemą"
                      >
                        <FileText className="w-4 h-4" />
                        Eksportuoti
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Invoice Details */}
              {expandedInvoice === invoice.id && (
                <div className="border-t bg-gray-50 p-4">
                  {/* Veterinarija Invoice Items */}
                  {invoice.module === 'veterinarija' && invoice.items && invoice.items.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Prekės</h4>
                      <div className="space-y-3">
                        {invoice.items.map((item: any) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.products?.name || item.description}
                                  </p>
                                  {item.sku && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      SKU: {item.sku}
                                    </p>
                                  )}
                                  {item.products?.category && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                      {item.products.category}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-sm text-gray-600">Kiekis</p>
                                  <p className="font-medium text-gray-900">{item.quantity}</p>
                                  <p className="text-sm text-gray-600 mt-2">Suma</p>
                                  <p className="font-bold text-green-600">€{item.total_price.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Batches for this item */}
                            {item.batches && item.batches.length > 0 && (
                              <div className="border-t bg-blue-50 px-3 py-2">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Partijos:</p>
                                {item.batches.map((batch: any) => {
                                  const usedQty = batch.received_qty - batch.qty_left;
                                  const usagePercent = (usedQty / batch.received_qty) * 100;
                                  
                                  return (
                                    <div key={batch.id} className="bg-white rounded p-2 mb-2 last:mb-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-900">
                                          {batch.batch_number || batch.lot || 'N/A'}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                          €{batch.purchase_price?.toFixed(2) || '0.00'}/vnt
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Panaudota: {usedQty.toFixed(1)}</span>
                                        <span>Likutis: {batch.qty_left.toFixed(1)}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                          }`}
                                          style={{ width: `${usagePercent}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technika Invoice Items and Assignments */}
                  {invoice.module === 'technika' && invoice.items && invoice.items.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Prekės ir priskyrimas</h4>
                      <div className="space-y-3">
                        {invoice.items.map((item: any) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.equipment_products?.name || item.description}
                                  </p>
                                  {item.equipment_products?.product_code && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Kodas: {item.equipment_products.product_code}
                                    </p>
                                  )}
                                  
                                  {/* Assignments */}
                                  {item.equipment_invoice_item_assignments && item.equipment_invoice_item_assignments.length > 0 ? (
                                    <div className="mt-2 space-y-1">
                                      {item.equipment_invoice_item_assignments.map((assignment: any) => (
                                        <div key={assignment.id} className="flex items-center gap-2 text-sm">
                                          {assignment.assignment_type === 'worker' && assignment.worker && (
                                            <>
                                              <User className="w-4 h-4 text-blue-600" />
                                              <span className="text-gray-700">
                                                Darbuotojas: {assignment.worker.full_name}
                                              </span>
                                            </>
                                          )}
                                          {assignment.assignment_type === 'vehicle' && assignment.vehicles && (
                                            <>
                                              <Car className="w-4 h-4 text-purple-600" />
                                              <span className="text-gray-700">
                                                Transportas: {assignment.vehicles.registration_number} ({assignment.vehicles.make} {assignment.vehicles.model})
                                              </span>
                                            </>
                                          )}
                                          {assignment.assignment_type === 'cost_center' && assignment.cost_centers && (
                                            <>
                                              <DollarSign className="w-4 h-4 text-green-600" />
                                              <span className="text-gray-700">
                                                Kaštų centras: {assignment.cost_centers.name}
                                              </span>
                                            </>
                                          )}
                                          {assignment.assignment_type === 'shelf' && assignment.equipment_shelf_compartments && (
                                            <>
                                              <WarehouseIcon className="w-4 h-4 text-indigo-600" />
                                              <span className="text-gray-700">
                                                Stalažas: {assignment.equipment_shelf_compartments.equipment_shelves?.shelf_number} - {assignment.equipment_shelf_compartments.compartment_code}
                                              </span>
                                            </>
                                          )}
                                          {assignment.assignment_type === 'tool' && assignment.tools && (
                                            <>
                                              <Wrench className="w-4 h-4 text-orange-600" />
                                              <span className="text-gray-700">
                                                Įrankis: {assignment.tools.name} ({assignment.tools.tool_number})
                                              </span>
                                            </>
                                          )}
                                          {assignment.assignment_type === 'stock' && (
                                            <>
                                              <Package className="w-4 h-4 text-amber-600" />
                                              <span className="text-gray-700">
                                                Atsarginės dalys (Sandėlis)
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-amber-600 mt-2">⚠ Nepriskirta</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-sm text-gray-600">Kiekis</p>
                                  <p className="font-medium text-gray-900">
                                    {item.quantity} {item.equipment_products?.unit_type || 'vnt'}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-2">Suma</p>
                                  <p className="font-bold text-green-600">€{item.total_price.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Batches for this item */}
                            {item.batches && item.batches.length > 0 && (
                              <div className="border-t bg-slate-50 px-3 py-2">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Partijos:</p>
                                {item.batches.map((batch: any) => {
                                  const usedQty = batch.received_qty - batch.qty_left;
                                  const usagePercent = (usedQty / batch.received_qty) * 100;
                                  
                                  return (
                                    <div key={batch.id} className="bg-white rounded p-2 mb-2 last:mb-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-900">
                                          {batch.batch_number || 'N/A'}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                          €{batch.purchase_price?.toFixed(2) || '0.00'}/vnt
                                        </span>
                                      </div>
                                      {batch.expiry_date && (
                                        <p className="text-xs text-gray-500 mb-1">
                                          Galioja: {new Date(batch.expiry_date).toLocaleDateString('lt-LT')}
                                        </p>
                                      )}
                                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Panaudota: {usedQty.toFixed(1)}</span>
                                        <span>Likutis: {batch.qty_left.toFixed(1)}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                          }`}
                                          style={{ width: `${usagePercent}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Single Invoice Export Modal */}
      {exportingInvoiceId && canExport && (
        <SecretarySystemExport
          invoiceId={exportingInvoiceId}
          invoiceModule={exportingInvoiceModule}
          onClose={() => setExportingInvoiceId(null)}
          onExportComplete={() => {
            setExportingInvoiceId(null);
            alert('Sąskaita sėkmingai eksportuota!');
          }}
        />
      )}

          {/* Bulk Export Modal */}
          {showExportModal && canExport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Eksportuoti sąskaitas</h3>
                <p className="text-gray-600 mb-4">Pasirinkta sąskaitų: {selectedInvoices.size}</p>
                <p className="text-sm text-amber-600 mb-4">
                  Masinis eksportavimas bus įgyvendintas ateityje. Kol kas eksportuokite sąskaitas po vieną.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Uždaryti
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Write-Off Acts Tab */}
      {activeTab === 'writeoffs' && (
        <WriteOffActs />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && <Reports />}
    </div>
  );
}
