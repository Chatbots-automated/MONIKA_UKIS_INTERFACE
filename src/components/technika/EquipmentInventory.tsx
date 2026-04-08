import { Package, Plus, Search, Upload, Users, ArrowRight, User, CornerUpLeft, Warehouse, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { EquipmentReceiveStock } from './EquipmentReceiveStock';
import { ShelvesManagement } from './ShelvesManagement';

interface WarehouseStock {
  product_id: string;
  product_name: string;
  product_code: string;
  unit_type: string;
  category_name: string;
  total_qty: number;
  total_value: number;
  batch_count: number;
  avg_price: number;
}

interface ItemOnLoan {
  item_id: string;
  issuance_id: string;
  issuance_number: string;
  issued_to: string;
  issued_to_name: string;
  issue_date: string;
  expected_return_date: string;
  product_name: string;
  unit_type: string;
  quantity_issued: number;
  quantity_returned: number;
  quantity_outstanding: number;
  value_outstanding: number;
  batch_id: string;
  item_type: 'equipment' | 'tool';
  tool_number?: string;
  serial_number?: string;
}

interface Batch {
  id: string;
  batch_number: string;
  qty_left: number;
  purchase_price: number;
  product: {
    id: string;
    name: string;
    unit_type: string;
  };
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

type Tab = 'inventory' | 'receive' | 'issue' | 'on-loan' | 'shelves';

interface EquipmentInventoryProps {
  locationFilter?: 'farm' | 'warehouse';
}

export function EquipmentInventory({ locationFilter }: EquipmentInventoryProps = {}) {
  const { user, logAction } = useAuth();
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
  const [itemsOnLoan, setItemsOnLoan] = useState<ItemOnLoan[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WarehouseStock | null>(null);
  const [selectedLoanItem, setSelectedLoanItem] = useState<ItemOnLoan | null>(null);
  const [issueForm, setIssueForm] = useState({
    issued_to: '',
    issued_to_name: '',
    batch_id: '',
    quantity: '1',
    expected_return_date: '',
    notes: '',
    assignmentType: '',
    workerId: '',
    vehicleId: '',
    costCenterId: '',
    compartmentId: '',
    toolId: '',
  });
  
  // Assignment data
  const [workers, setWorkers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [returnForm, setReturnForm] = useState({
    quantity: '1',
    notes: '',
  });

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('equipment-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_issuances' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_issuance_items' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_batches' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [locationFilter]);

  const loadData = async () => {
    // Fetch all stock data with product info
    const stockQuery = supabase
      .from('equipment_warehouse_stock')
      .select('*');

    // Fetch all loans data with product info
    const loansQuery = supabase
      .from('equipment_issuance_items')
      .select(`
        id,
        issuance_id,
        batch_id,
        quantity,
        quantity_returned,
        unit_price,
        equipment_issuances!inner(
          issuance_number,
          issue_date,
          expected_return_date,
          status,
          issued_to,
          issued_to_name,
          issued_to_user:users!equipment_issuances_issued_to_fkey(full_name)
        ),
        equipment_products(
          id,
          name,
          unit_type
        ),
        product_id
      `)
      .in('equipment_issuances.status', ['issued', 'partial_return']);

    const [stockRes, loansRes, toolsRes, usersRes, workersRes, vehiclesRes, costCentersRes, shelvesRes, compartmentsRes, toolsListRes] = await Promise.all([
      stockQuery,
      loansQuery,
      supabase
        .from('tools')
        .select(`
          id,
          tool_number,
          name,
          serial_number,
          current_holder,
          product:equipment_products(name, unit_type),
          holder:users!tools_current_holder_fkey(full_name)
        `)
        .eq('is_available', false),
      supabase.from('users').select('id, full_name, email').order('full_name'),
      supabase.from('users').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('*').eq('is_active', true).order('registration_number'),
      supabase.from('cost_centers').select('*').eq('is_active', true).order('name'),
      supabase.from('equipment_shelves').select('*').eq('is_active', true).order('shelf_number'),
      supabase.from('equipment_shelf_compartments').select('*').eq('is_active', true).order('compartment_code'),
      supabase.from('tools').select('*').order('name'),
    ]);

    // Set stock data
    if (stockRes.data) {
      setWarehouseStock(stockRes.data);
    }
    
    // Set assignment data
    if (workersRes.data) setWorkers(workersRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (costCentersRes.data) setCostCenters(costCentersRes.data);
    if (shelvesRes.data) setShelves(shelvesRes.data);
    if (compartmentsRes.data) setCompartments(compartmentsRes.data);
    if (toolsListRes.data) setTools(toolsListRes.data);

    const allLoans: ItemOnLoan[] = [];

    if (loansRes.data) {
      const equipmentLoans = loansRes.data
        .filter((item: any) => {
          const hasOutstanding = parseFloat(item.quantity || 0) > parseFloat(item.quantity_returned || 0);
          return hasOutstanding;
        })
        .map((item: any) => ({
          item_id: item.id,
          issuance_id: item.issuance_id,
          issuance_number: item.equipment_issuances?.issuance_number || 'N/A',
          issued_to: item.equipment_issuances?.issued_to || '',
          issued_to_name: item.equipment_issuances?.issued_to_user?.full_name || item.equipment_issuances?.issued_to_name || 'N/A',
          issue_date: item.equipment_issuances?.issue_date || '',
          expected_return_date: item.equipment_issuances?.expected_return_date || '',
          product_name: item.equipment_products?.name || 'N/A',
          unit_type: item.equipment_products?.unit_type || 'pcs',
          quantity_issued: parseFloat(item.quantity || 0),
          quantity_returned: parseFloat(item.quantity_returned || 0),
          quantity_outstanding: parseFloat(item.quantity || 0) - parseFloat(item.quantity_returned || 0),
          value_outstanding: (parseFloat(item.quantity || 0) - parseFloat(item.quantity_returned || 0)) * parseFloat(item.unit_price || 0),
          batch_id: item.batch_id,
          item_type: 'equipment' as const,
        }));
      allLoans.push(...equipmentLoans);
    }

    if (toolsRes.data) {
      const toolLoans = toolsRes.data.map((tool: any) => ({
        item_id: tool.id,
        issuance_id: tool.id,
        issuance_number: tool.tool_number || 'N/A',
        issued_to: tool.current_holder || '',
        issued_to_name: tool.holder?.full_name || 'N/A',
        issue_date: new Date().toISOString(),
        expected_return_date: '',
        product_name: tool.name || tool.product?.name || 'N/A',
        unit_type: 'vnt',
        quantity_issued: 1,
        quantity_returned: 0,
        quantity_outstanding: 1,
        value_outstanding: 0,
        batch_id: '',
        item_type: 'tool' as const,
        tool_number: tool.tool_number,
        serial_number: tool.serial_number,
      }));
      allLoans.push(...toolLoans);
    }

    setItemsOnLoan(allLoans);
    if (usersRes.data) setUsers(usersRes.data);
  };

  const loadBatchesForProduct = async (productId: string) => {
    const { data } = await supabase
      .from('equipment_batches')
      .select(`
        id,
        batch_number,
        qty_left,
        purchase_price,
        product:equipment_products(id, name, unit_type)
      `)
      .eq('product_id', productId)
      .gt('qty_left', 0)
      .order('created_at');

    if (data) setBatches(data as any);
  };

  const handleOpenIssueModal = async (product: WarehouseStock) => {
    setSelectedProduct(product);
    await loadBatchesForProduct(product.product_id);
    setShowIssueModal(true);
  };

  const handleIssueItems = async () => {
    if (!issueForm.batch_id || !issueForm.quantity) {
      alert('Prašome pasirinkti partiją ir kiekį');
      return;
    }

    if (!issueForm.issued_to && !issueForm.issued_to_name) {
      alert('Prašome pasirinkti darbuotoją arba įvesti vardą');
      return;
    }

    const quantity = parseFloat(issueForm.quantity);
    const selectedBatch = batches.find(b => b.id === issueForm.batch_id);

    if (!selectedBatch) {
      alert('Partija nerasta');
      return;
    }

    if (quantity > selectedBatch.qty_left) {
      alert('Nepakanka atsargų. Turimas kiekis: ' + selectedBatch.qty_left);
      return;
    }

    try {
      const { data: issuanceNumber } = await supabase.rpc('generate_equipment_issuance_number');

      const { data: issuance, error: issuanceError } = await supabase
        .from('equipment_issuances')
        .insert({
          issuance_number: issuanceNumber,
          issued_to: issueForm.issued_to || null,
          issued_to_name: issueForm.issued_to_name || null,
          issued_by: user?.id || null,
          expected_return_date: issueForm.expected_return_date || null,
          notes: issueForm.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (issuanceError) throw issuanceError;

      const { error: itemError } = await supabase
        .from('equipment_issuance_items')
        .insert({
          issuance_id: issuance.id,
          batch_id: issueForm.batch_id,
          product_id: selectedProduct?.product_id,
          quantity: quantity,
          unit_price: selectedBatch.purchase_price,
        });

      if (itemError) throw itemError;

      await logAction('issue_equipment', 'equipment_issuances', issuance.id);

      alert('Prekės sėkmingai išduotos');
      setShowIssueModal(false);
      setIssueForm({
        issued_to: '',
        issued_to_name: '',
        batch_id: '',
        quantity: '1',
        expected_return_date: '',
        notes: '',
      });
      setSelectedProduct(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida išduodant prekes: ${error.message}`);
    }
  };

  const handleOpenReturnModal = (item: ItemOnLoan) => {
    setSelectedLoanItem(item);
    setReturnForm({
      quantity: item.quantity_outstanding.toString(),
      notes: '',
    });
    setShowReturnModal(true);
  };

  const handleReturnItems = async () => {
    if (!selectedLoanItem) {
      alert('Nepasirinkta prekė');
      return;
    }

    if (!confirm(`Ar tikrai norite grąžinti "${selectedLoanItem.product_name}"?`)) {
      return;
    }

    try {
      if (selectedLoanItem.item_type === 'tool') {
        console.log('Returning tool:', selectedLoanItem.item_id);

        await supabase
          .from('tool_movements')
          .insert({
            tool_id: selectedLoanItem.item_id,
            movement_type: 'return',
            from_holder: selectedLoanItem.issued_to,
            movement_date: new Date().toISOString(),
            notes: returnForm.notes || null,
            recorded_by: user?.id || null,
          });

        const { data: updatedTool, error: toolError } = await supabase
          .from('tools')
          .update({
            is_available: true,
            current_holder: null,
          })
          .eq('id', selectedLoanItem.item_id)
          .select()
          .single();

        if (toolError) {
          console.error('Tool update error:', toolError);
          throw toolError;
        }

        console.log('Tool returned successfully:', updatedTool);

        await logAction('return_tool', 'tools', selectedLoanItem.item_id, null, {
          tool_number: selectedLoanItem.tool_number,
          from_holder: selectedLoanItem.issued_to
        });

        setShowReturnModal(false);
        setSelectedLoanItem(null);
        setReturnForm({ quantity: '1', notes: '' });

        // Force immediate reload
        await loadData();

        alert('Įrankis sėkmingai grąžintas');
      } else {
        if (!returnForm.quantity) {
          alert('Prašome įvesti kiekį');
          return;
        }

        const returnQty = parseFloat(returnForm.quantity);

        if (returnQty <= 0) {
          alert('Grąžinamas kiekis turi būti didesnis už 0');
          return;
        }

        if (returnQty > selectedLoanItem.quantity_outstanding) {
          alert(`Negalite grąžinti daugiau nei ${selectedLoanItem.quantity_outstanding} ${selectedLoanItem.unit_type}`);
          return;
        }

        const newQuantityReturned = selectedLoanItem.quantity_returned + returnQty;
        const isFullyReturned = newQuantityReturned >= selectedLoanItem.quantity_issued;

        const { error: itemError } = await supabase
          .from('equipment_issuance_items')
          .update({
            quantity_returned: newQuantityReturned,
          })
          .eq('id', selectedLoanItem.item_id);

        if (itemError) throw itemError;

        const { data: allItems } = await supabase
          .from('equipment_issuance_items')
          .select('quantity, quantity_returned')
          .eq('issuance_id', selectedLoanItem.issuance_id);

        let newIssuanceStatus = 'returned';
        if (allItems) {
          const hasOutstanding = allItems.some((item: any) =>
            parseFloat(item.quantity) > parseFloat(item.quantity_returned || 0)
          );
          if (hasOutstanding) {
            newIssuanceStatus = 'partial_return';
          }
        }

        const { error: issuanceError } = await supabase
          .from('equipment_issuances')
          .update({
            status: newIssuanceStatus,
            actual_return_date: isFullyReturned ? new Date().toISOString().split('T')[0] : null,
          })
          .eq('id', selectedLoanItem.issuance_id);

        if (issuanceError) throw issuanceError;

        await logAction('return_equipment', 'equipment_issuances', selectedLoanItem.issuance_id, null, {
          product_name: selectedLoanItem.product_name,
          quantity: returnQty
        });

        setShowReturnModal(false);
        setReturnForm({ quantity: '1', notes: '' });
        setSelectedLoanItem(null);

        // Force immediate reload
        await loadData();

        alert('Prekės sėkmingai grąžintos');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida grąžinant: ${error.message}`);
    }
  };

  const filteredStock = warehouseStock.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLoans = itemsOnLoan.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.issued_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('shelves')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'shelves'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Warehouse className="w-4 h-4 inline-block mr-2" />
              Stalažai
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline-block mr-2" />
              Sandėlis
            </button>
            <button
              onClick={() => setActiveTab('on-loan')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'on-loan'
                  ? 'border-slate-600 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Išduotos prekės
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
                {filteredStock.map(item => (
                  <div key={item.product_id} className="border border-gray-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Package className="w-5 h-5 text-slate-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            {item.category_name} · {item.batch_count} partijos · Vidutinė kaina: €{item.avg_price?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">
                            {item.total_qty} {item.unit_type}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vertė: €{item.total_value?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenIssueModal(item)}
                          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Išduoti
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredStock.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Atsargų nerasta</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <StatCard title="Produktų tipų" value={warehouseStock.length.toString()} />
                <StatCard title="Bendra vertė" value={`€${warehouseStock.reduce((sum, item) => sum + (item.total_value || 0), 0).toFixed(2)}`} />
                <StatCard title="Išduotų prekių" value={itemsOnLoan.length.toString()} />
              </div>
            </>
          )}

          {activeTab === 'on-loan' && (
            <>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ieškoti pagal produktą ar darbuotoją..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredLoans.map((item, idx) => (
                  <div key={idx} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <User className="w-5 h-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {item.product_name}
                            {item.item_type === 'tool' && item.tool_number && ` · ${item.tool_number}`}
                            {item.item_type === 'tool' && item.serial_number && ` · SN: ${item.serial_number}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            Išduota: {item.issued_to_name}
                            {item.item_type === 'equipment' && (
                              <>
                                {' · '}{new Date(item.issue_date).toLocaleDateString('lt-LT')}
                                {item.expected_return_date && ` · Grąžinti iki: ${new Date(item.expected_return_date).toLocaleDateString('lt-LT')}`}
                              </>
                            )}
                            {item.item_type === 'tool' && ' · Įrankis'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">
                            {item.quantity_outstanding} {item.unit_type}
                          </p>
                          {item.item_type === 'equipment' && (
                            <p className="text-sm text-gray-600">
                              iš {item.quantity_issued} · €{item.value_outstanding?.toFixed(2) || '0.00'}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenReturnModal(item)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                          Grąžinti
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredLoans.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nėra išduotų prekių</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'receive' && <EquipmentReceiveStock onReceived={loadData} />}

          {activeTab === 'shelves' && <ShelvesManagement />}
        </div>
      </div>

      {showIssueModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Išduoti: {selectedProduct.product_name}
              </h3>
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setIssueForm({
                    issued_to: '',
                    issued_to_name: '',
                    batch_id: '',
                    quantity: '1',
                    expected_return_date: '',
                    notes: '',
                    assignmentType: '',
                    workerId: '',
                    vehicleId: '',
                    costCenterId: '',
                    compartmentId: '',
                    toolId: '',
                  });
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Turima:</span> {selectedProduct.total_qty} {selectedProduct.unit_type}
                </div>
                <div>
                  <span className="font-medium">Vidutinė kaina:</span> €{selectedProduct.avg_price?.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Partijų:</span> {selectedProduct.batch_count}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Batch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partija *</label>
                <select
                  value={issueForm.batch_id}
                  onChange={e => setIssueForm({ ...issueForm, batch_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite partiją</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number || 'N/A'} - Turima: {batch.qty_left} {batch.product.unit_type} (€{batch.purchase_price}/vnt)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kiekis * ({selectedProduct.unit_type})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={issueForm.quantity}
                  onChange={e => setIssueForm({ ...issueForm, quantity: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Assignment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kam išduoti?</label>
                
                {/* Worker and Vehicle Assignment */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-3">Priskirti darbuotojui arba transportui</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIssueForm({ ...issueForm, assignmentType: 'worker' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        issueForm.assignmentType === 'worker'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">Darbuotojui</p>
                        <p className="text-xs text-gray-500 mt-1">Asmeninės priemonės</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setIssueForm({ ...issueForm, assignmentType: 'vehicle' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        issueForm.assignmentType === 'vehicle'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">Transportui</p>
                        <p className="text-xs text-gray-500 mt-1">Traktoriui, sunkvežimiui</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* General Categories */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => setIssueForm({ ...issueForm, assignmentType: 'tool' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      issueForm.assignmentType === 'tool'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">Įrankiui/Įrangai</p>
                      <p className="text-xs text-gray-500 mt-1">Melžimo įrangai ir kt.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setIssueForm({ ...issueForm, assignmentType: 'shelf' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      issueForm.assignmentType === 'shelf'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">Stalažui</p>
                      <p className="text-xs text-gray-500 mt-1">Sandėlio stalažui</p>
                    </div>
                  </button>
                </div>

                {costCenters.length > 0 && (
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Arba kaštų centrui</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {costCenters.filter(c => !c.parent_id).map(center => (
                        <button
                          key={center.id}
                          onClick={() => setIssueForm({ ...issueForm, assignmentType: 'cost_center', costCenterId: center.id })}
                          className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                            issueForm.assignmentType === 'cost_center' && issueForm.costCenterId === center.id
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: center.color }}
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">{center.name}</p>
                              {center.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{center.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Worker Selection */}
              {issueForm.assignmentType === 'worker' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasirinkite darbuotoją</label>
                  <select
                    value={issueForm.workerId}
                    onChange={(e) => setIssueForm({ ...issueForm, workerId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Pasirinkite darbuotoją --</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vehicle Selection */}
              {issueForm.assignmentType === 'vehicle' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasirinkite transporto priemonę</label>
                  
                  {vehicles.filter(v => v.vehicle_category === 'tractor').length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Traktoriai</p>
                      <select
                        value={issueForm.vehicleId}
                        onChange={(e) => setIssueForm({ ...issueForm, vehicleId: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">-- Pasirinkite traktorių --</option>
                        {vehicles
                          .filter(v => v.vehicle_category === 'tractor')
                          .map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {vehicles.filter(v => v.vehicle_category === 'heavy_transport').length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Sunkvežimiai</p>
                      <select
                        value={issueForm.vehicleId}
                        onChange={(e) => setIssueForm({ ...issueForm, vehicleId: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">-- Pasirinkite sunkvežimį --</option>
                        {vehicles
                          .filter(v => v.vehicle_category === 'heavy_transport')
                          .map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Tool Selection */}
              {issueForm.assignmentType === 'tool' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasirinkite įrankį/įrangą</label>
                  <select
                    value={issueForm.toolId}
                    onChange={(e) => setIssueForm({ ...issueForm, toolId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Pasirinkite --</option>
                    {tools.map(tool => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} ({tool.tool_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Shelf Selection */}
              {issueForm.assignmentType === 'shelf' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasirinkite stalažo skyrių</label>
                  
                  {shelves.map(shelf => {
                    const shelfCompartments = compartments.filter(c => c.shelf_id === shelf.id);
                    if (shelfCompartments.length === 0) return null;

                    return (
                      <div key={shelf.id} className="border border-gray-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Stalažas {shelf.shelf_number} - {shelf.name}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {shelfCompartments.map(compartment => (
                            <button
                              key={compartment.id}
                              onClick={() => setIssueForm({ ...issueForm, compartmentId: compartment.id })}
                              className={`p-2 border-2 rounded transition-all text-left ${
                                issueForm.compartmentId === compartment.id
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <span className="font-medium text-sm">{compartment.compartment_code}</span>
                              {compartment.vehicle_category && (
                                <span className="ml-1 text-xs">
                                  {compartment.vehicle_category === 'tractor' ? '🚜' : '🚛'}
                                </span>
                              )}
                              {compartment.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{compartment.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {issueForm.assignmentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                  <textarea
                    value={issueForm.notes}
                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Papildoma informacija..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setIssueForm({
                    issued_to: '',
                    issued_to_name: '',
                    batch_id: '',
                    quantity: '1',
                    expected_return_date: '',
                    notes: '',
                    assignmentType: '',
                    workerId: '',
                    vehicleId: '',
                    costCenterId: '',
                    compartmentId: '',
                    toolId: '',
                  });
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleIssueItems}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Išsaugoti
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && selectedLoanItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Grąžinti: {selectedLoanItem.product_name}
            </h3>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Išduota:</span>
                  <span className="font-medium">{selectedLoanItem.issued_to_name}</span>
                </div>
                {selectedLoanItem.item_type === 'tool' && selectedLoanItem.tool_number && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Įrankio numeris:</span>
                    <span className="font-medium">{selectedLoanItem.tool_number}</span>
                  </div>
                )}
                {selectedLoanItem.item_type === 'tool' && selectedLoanItem.serial_number && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Serijos numeris:</span>
                    <span className="font-medium">{selectedLoanItem.serial_number}</span>
                  </div>
                )}
                {selectedLoanItem.item_type === 'equipment' && (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Išduotas kiekis:</span>
                      <span className="font-medium">{selectedLoanItem.quantity_issued} {selectedLoanItem.unit_type}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Jau grąžinta:</span>
                      <span className="font-medium">{selectedLoanItem.quantity_returned} {selectedLoanItem.unit_type}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t border-amber-300">
                      <span className="text-gray-900">Likutis:</span>
                      <span className="text-amber-700">{selectedLoanItem.quantity_outstanding} {selectedLoanItem.unit_type}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedLoanItem.item_type === 'equipment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grąžinamas kiekis ({selectedLoanItem.unit_type})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedLoanItem.quantity_outstanding}
                    value={returnForm.quantity}
                    onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimalus kiekis: {selectedLoanItem.quantity_outstanding} {selectedLoanItem.unit_type}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pastabos (neprivaloma)
                </label>
                <textarea
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Būklė, pastabos..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnForm({ quantity: '1', notes: '' });
                  setSelectedLoanItem(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleReturnItems}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Grąžinti
              </button>
            </div>
          </div>
        </div>
      )}
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
