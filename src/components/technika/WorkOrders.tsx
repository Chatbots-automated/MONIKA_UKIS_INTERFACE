import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Plus, Search, Eye, Edit, Trash2, X, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { WorkOrderDetailSidebar } from './WorkOrderDetailSidebar';

interface WorkOrder {
  id: string;
  work_order_number: string;
  vehicle_id: string | null;
  tool_id: string | null;
  order_type: string;
  priority: string;
  description: string;
  scheduled_date: string | null;
  started_date: string | null;
  completed_date: string | null;
  status: string;
  assigned_to: string | null;
  odometer_reading: number | null;
  engine_hours: number | null;
  labor_hours: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  vehicle: {
    registration_number: string;
    make: string;
    model: string;
  } | null;
  tool: {
    name: string;
  } | null;
  assignee: {
    full_name: string;
  } | null;
}

interface WorkOrderForm {
  vehicle_id: string;
  tool_id: string;
  order_type: string;
  priority: string;
  description: string;
  scheduled_date: string;
  assigned_to: string;
  odometer_reading: string;
  engine_hours: string;
  labor_hours: string;
  labor_cost: string;
  parts_cost: string;
  notes: string;
}

interface Vehicle {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  current_mileage: number;
  current_engine_hours: number;
}

interface Tool {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

export function WorkOrders() {
  const { user, logAction } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [viewingWorkOrder, setViewingWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [workOrderForm, setWorkOrderForm] = useState<WorkOrderForm>({
    vehicle_id: '',
    tool_id: '',
    order_type: 'corrective',
    priority: 'medium',
    description: '',
    scheduled_date: '',
    assigned_to: '',
    odometer_reading: '',
    engine_hours: '',
    labor_hours: '',
    labor_cost: '',
    parts_cost: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [workOrdersRes, vehiclesRes, toolsRes, usersRes] = await Promise.all([
      supabase
        .from('maintenance_work_orders')
        .select(`
          *,
          vehicle:vehicles(registration_number, make, model),
          tool:equipment_tools(name),
          assignee:users!maintenance_work_orders_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, registration_number, make, model, current_mileage, current_engine_hours')
        .eq('is_active', true)
        .order('registration_number'),
      supabase
        .from('equipment_tools')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('users')
        .select('id, full_name')
        .order('full_name'),
    ]);

    if (workOrdersRes.data) setWorkOrders(workOrdersRes.data as any);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (toolsRes.data) setTools(toolsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
  };

  const handleOpenWorkOrderModal = (workOrder?: WorkOrder) => {
    if (workOrder) {
      setEditingWorkOrder(workOrder);
      setWorkOrderForm({
        vehicle_id: workOrder.vehicle_id || '',
        tool_id: workOrder.tool_id || '',
        order_type: workOrder.order_type,
        priority: workOrder.priority,
        description: workOrder.description,
        scheduled_date: workOrder.scheduled_date || '',
        assigned_to: workOrder.assigned_to || '',
        odometer_reading: workOrder.odometer_reading?.toString() || '',
        engine_hours: workOrder.engine_hours?.toString() || '',
        labor_hours: workOrder.labor_hours?.toString() || '',
        labor_cost: workOrder.labor_cost?.toString() || '',
        parts_cost: workOrder.parts_cost?.toString() || '',
        notes: workOrder.notes || '',
      });
    } else {
      setEditingWorkOrder(null);
      setWorkOrderForm({
        vehicle_id: '',
        tool_id: '',
        order_type: 'corrective',
        priority: 'medium',
        description: '',
        scheduled_date: '',
        assigned_to: '',
        odometer_reading: '',
        engine_hours: '',
        labor_hours: '',
        labor_cost: '',
        parts_cost: '',
        notes: '',
      });
    }
    setShowWorkOrderModal(true);
  };

  const handleSaveWorkOrder = async () => {
    if (!workOrderForm.description) {
      alert('Prašome įvesti aprašymą');
      return;
    }

    if (!workOrderForm.vehicle_id && !workOrderForm.tool_id) {
      alert('Prašome pasirinkti transportą arba įrankį');
      return;
    }

    try {
      const laborCost = parseFloat(workOrderForm.labor_cost) || 0;
      const partsCost = parseFloat(workOrderForm.parts_cost) || 0;
      const totalCost = laborCost + partsCost;

      const workOrderData = {
        vehicle_id: workOrderForm.vehicle_id || null,
        tool_id: workOrderForm.tool_id || null,
        order_type: workOrderForm.order_type,
        priority: workOrderForm.priority,
        description: workOrderForm.description,
        scheduled_date: workOrderForm.scheduled_date || null,
        assigned_to: workOrderForm.assigned_to || null,
        odometer_reading: workOrderForm.odometer_reading ? parseFloat(workOrderForm.odometer_reading) : null,
        engine_hours: workOrderForm.engine_hours ? parseFloat(workOrderForm.engine_hours) : null,
        labor_hours: workOrderForm.labor_hours ? parseFloat(workOrderForm.labor_hours) : null,
        labor_cost: laborCost || null,
        parts_cost: partsCost || null,
        total_cost: totalCost || null,
        notes: workOrderForm.notes || null,
      };

      if (editingWorkOrder) {
        const { error } = await supabase
          .from('maintenance_work_orders')
          .update(workOrderData)
          .eq('id', editingWorkOrder.id);

        if (error) throw error;
        await logAction('update_work_order', 'maintenance_work_orders', editingWorkOrder.id);
        alert('Aptarnavimas sėkmingai atnaujintas');
      } else {
        const { data: woNumber } = await supabase.rpc('generate_work_order_number');

        const { data, error } = await supabase
          .from('maintenance_work_orders')
          .insert({
            work_order_number: woNumber,
            ...workOrderData,
            status: 'pending',
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        await logAction('create_work_order', 'maintenance_work_orders', data.id);
        alert('Aptarnavimas sėkmingai sukurtas');
      }

      setShowWorkOrderModal(false);
      setEditingWorkOrder(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleChangeStatus = async (workOrder: WorkOrder, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'in_progress' && !workOrder.started_date) {
        updateData.started_date = new Date().toISOString();
      } else if (newStatus === 'completed' && !workOrder.completed_date) {
        updateData.completed_date = new Date().toISOString();

        if (workOrder.vehicle_id && workOrder.odometer_reading && workOrder.engine_hours) {
          await supabase
            .from('vehicles')
            .update({
              current_mileage: workOrder.odometer_reading,
              current_engine_hours: workOrder.engine_hours,
            })
            .eq('id', workOrder.vehicle_id);
        }
      }

      const { error } = await supabase
        .from('maintenance_work_orders')
        .update(updateData)
        .eq('id', workOrder.id);

      if (error) throw error;

      await logAction('change_work_order_status', 'maintenance_work_orders', workOrder.id, null, {
        from: workOrder.status,
        to: newStatus,
      });

      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleDeleteWorkOrder = async (workOrder: WorkOrder) => {
    if (!confirm(`Ar tikrai norite ištrinti aptarnavimą ${workOrder.work_order_number}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_work_orders')
        .delete()
        .eq('id', workOrder.id);

      if (error) throw error;
      await logAction('delete_work_order', 'maintenance_work_orders', workOrder.id);
      alert('Aptarnavimas ištrintas');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleViewDetails = (workOrder: WorkOrder) => {
    setSelectedWorkOrderId(workOrder.id);
    setShowSidebar(true);
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch =
      wo.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.vehicle?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.tool?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || wo.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'Laukiama',
    in_progress: 'Vykdoma',
    completed: 'Užbaigta',
    cancelled: 'Atšaukta',
  };

  const priorityLabels: Record<string, string> = {
    urgent: 'Skubu',
    high: 'Aukštas',
    medium: 'Vidutinis',
    low: 'Žemas',
  };

  const orderTypeLabels: Record<string, string> = {
    preventive: 'Prevencinė priežiūra',
    corrective: 'Gedimo taisymas',
    inspection: 'Patikra',
    emergency: 'Neatidėliotina',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Remonto darbai</h3>
          <button
            onClick={() => handleOpenWorkOrderModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Naujas remonto darbas
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi statusai</option>
            <option value="pending">Laukiama</option>
            <option value="in_progress">Vykdoma</option>
            <option value="completed">Užbaigta</option>
            <option value="cancelled">Atšaukta</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi prioritetai</option>
            <option value="urgent">Skubu</option>
            <option value="high">Aukštas</option>
            <option value="medium">Vidutinis</option>
            <option value="low">Žemas</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredWorkOrders.map(wo => (
            <div key={wo.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-gray-800">{wo.work_order_number}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(wo.status)}`}>
                      {statusLabels[wo.status]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(wo.priority)}`}>
                      {priorityLabels[wo.priority]}
                    </span>
                  </div>

                  <h4 className="font-medium text-gray-800 mb-2">{wo.description}</h4>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                    {wo.vehicle && (
                      <div>
                        <span className="font-medium">Transportas:</span> {wo.vehicle.registration_number} - {wo.vehicle.make} {wo.vehicle.model}
                      </div>
                    )}
                    {wo.tool && (
                      <div>
                        <span className="font-medium">Įrankis:</span> {wo.tool.name}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Tipas:</span> {orderTypeLabels[wo.order_type]}
                    </div>
                    {wo.assigned_to && (
                      <div>
                        <span className="font-medium">Atsakingas:</span> {wo.assignee?.full_name}
                      </div>
                    )}
                    {wo.scheduled_date && (
                      <div>
                        <span className="font-medium">Planuojama:</span> {new Date(wo.scheduled_date).toLocaleDateString('lt-LT')}
                      </div>
                    )}
                    {wo.total_cost && (
                      <div>
                        <span className="font-medium">Kaina:</span> €{wo.total_cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(wo)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                    Peržiūrėti
                  </button>
                  {wo.status === 'pending' && (
                    <button
                      onClick={() => handleChangeStatus(wo, 'in_progress')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      <Clock className="w-4 h-4" />
                      Pradėti
                    </button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button
                      onClick={() => handleChangeStatus(wo, 'completed')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Užbaigti
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenWorkOrderModal(wo)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4" />
                    Redaguoti
                  </button>
                  <button
                    onClick={() => handleDeleteWorkOrder(wo)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aptarnavimų nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Viso aptarnavimų"
          value={workOrders.length.toString()}
          color="blue"
        />
        <StatCard
          title="Laukiama"
          value={workOrders.filter(w => w.status === 'pending').length.toString()}
          color="yellow"
        />
        <StatCard
          title="Vykdoma"
          value={workOrders.filter(w => w.status === 'in_progress').length.toString()}
          color="blue"
        />
        <StatCard
          title="Užbaigta"
          value={workOrders.filter(w => w.status === 'completed').length.toString()}
          color="green"
        />
        <StatCard
          title="Bendra kaina"
          value={`€${workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0).toFixed(2)}`}
          color="emerald"
        />
      </div>

      {showWorkOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingWorkOrder ? 'Redaguoti aptarnavimą' : 'Naujas aptarnavimas'}
              </h3>
              <button onClick={() => setShowWorkOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportas</label>
                <select
                  value={workOrderForm.vehicle_id}
                  onChange={e => {
                    const vehicle = vehicles.find(v => v.id === e.target.value);
                    setWorkOrderForm({
                      ...workOrderForm,
                      vehicle_id: e.target.value,
                      tool_id: '',
                      odometer_reading: vehicle?.current_mileage.toString() || '',
                      engine_hours: vehicle?.current_engine_hours.toString() || '',
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite transportą</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Įrankis</label>
                <select
                  value={workOrderForm.tool_id}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, tool_id: e.target.value, vehicle_id: '' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite įrankį</option>
                  {tools.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipas *</label>
                <select
                  value={workOrderForm.order_type}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, order_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="preventive">Prevencinė priežiūra</option>
                  <option value="corrective">Gedimo taisymas</option>
                  <option value="inspection">Patikra</option>
                  <option value="emergency">Neatidėliotina</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioritetas *</label>
                <select
                  value={workOrderForm.priority}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="low">Žemas</option>
                  <option value="medium">Vidutinis</option>
                  <option value="high">Aukštas</option>
                  <option value="urgent">Skubu</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas *</label>
                <textarea
                  value={workOrderForm.description}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Detalus darbo aprašymas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planuojama data</label>
                <input
                  type="date"
                  value={workOrderForm.scheduled_date}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, scheduled_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atsakingas</label>
                <select
                  value={workOrderForm.assigned_to}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, assigned_to: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Nepriskirtas</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {workOrderForm.vehicle_id && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rida (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={workOrderForm.odometer_reading}
                      onChange={e => setWorkOrderForm({ ...workOrderForm, odometer_reading: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motovalandos</label>
                    <input
                      type="number"
                      step="0.1"
                      value={workOrderForm.engine_hours}
                      onChange={e => setWorkOrderForm({ ...workOrderForm, engine_hours: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Darbo valandos</label>
                <input
                  type="number"
                  step="0.1"
                  value={workOrderForm.labor_hours}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, labor_hours: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Darbo kaina (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={workOrderForm.labor_cost}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, labor_cost: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dalių kaina (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={workOrderForm.parts_cost}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, parts_cost: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bendra kaina (€)</label>
                <input
                  type="text"
                  value={((parseFloat(workOrderForm.labor_cost) || 0) + (parseFloat(workOrderForm.parts_cost) || 0)).toFixed(2)}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 font-semibold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={workOrderForm.notes}
                  onChange={e => setWorkOrderForm({ ...workOrderForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowWorkOrderModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveWorkOrder}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <Save className="w-4 h-4" />
                {editingWorkOrder ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && viewingWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Aptarnavimo detalės</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Numeris</p>
                  <p className="font-semibold">{viewingWorkOrder.work_order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statusas</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusColor(viewingWorkOrder.status)}`}>
                    {statusLabels[viewingWorkOrder.status]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prioritetas</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${getPriorityColor(viewingWorkOrder.priority)}`}>
                    {priorityLabels[viewingWorkOrder.priority]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipas</p>
                  <p className="font-medium">{orderTypeLabels[viewingWorkOrder.order_type]}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-1">Aprašymas</p>
                <p className="font-medium">{viewingWorkOrder.description}</p>
              </div>

              {viewingWorkOrder.vehicle && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Transportas</p>
                  <p className="font-medium">
                    {viewingWorkOrder.vehicle.registration_number} - {viewingWorkOrder.vehicle.make} {viewingWorkOrder.vehicle.model}
                  </p>
                </div>
              )}

              {viewingWorkOrder.tool && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Įrankis</p>
                  <p className="font-medium">{viewingWorkOrder.tool.name}</p>
                </div>
              )}

              {viewingWorkOrder.assignee && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Atsakingas</p>
                  <p className="font-medium">{viewingWorkOrder.assignee.full_name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {viewingWorkOrder.scheduled_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Planuojama data</p>
                    <p className="font-medium">{new Date(viewingWorkOrder.scheduled_date).toLocaleDateString('lt-LT')}</p>
                  </div>
                )}
                {viewingWorkOrder.started_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pradėta</p>
                    <p className="font-medium">{new Date(viewingWorkOrder.started_date).toLocaleDateString('lt-LT')}</p>
                  </div>
                )}
                {viewingWorkOrder.completed_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Užbaigta</p>
                    <p className="font-medium">{new Date(viewingWorkOrder.completed_date).toLocaleDateString('lt-LT')}</p>
                  </div>
                )}
              </div>

              {(viewingWorkOrder.odometer_reading || viewingWorkOrder.engine_hours) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewingWorkOrder.odometer_reading && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Rida</p>
                      <p className="font-medium">{viewingWorkOrder.odometer_reading.toLocaleString()} km</p>
                    </div>
                  )}
                  {viewingWorkOrder.engine_hours && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Motovalandos</p>
                      <p className="font-medium">{viewingWorkOrder.engine_hours} mval.</p>
                    </div>
                  )}
                </div>
              )}

              {(viewingWorkOrder.labor_hours || viewingWorkOrder.labor_cost || viewingWorkOrder.parts_cost) && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Kainos</p>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingWorkOrder.labor_hours && (
                      <div>
                        <p className="text-xs text-gray-500">Darbo valandos</p>
                        <p className="font-medium">{viewingWorkOrder.labor_hours} val.</p>
                      </div>
                    )}
                    {viewingWorkOrder.labor_cost && (
                      <div>
                        <p className="text-xs text-gray-500">Darbo kaina</p>
                        <p className="font-medium">€{viewingWorkOrder.labor_cost.toFixed(2)}</p>
                      </div>
                    )}
                    {viewingWorkOrder.parts_cost && (
                      <div>
                        <p className="text-xs text-gray-500">Dalių kaina</p>
                        <p className="font-medium">€{viewingWorkOrder.parts_cost.toFixed(2)}</p>
                      </div>
                    )}
                    {viewingWorkOrder.total_cost && (
                      <div>
                        <p className="text-xs text-gray-500">Bendra</p>
                        <p className="font-semibold text-lg">€{viewingWorkOrder.total_cost.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingWorkOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">Pastabos</p>
                  <p className="text-gray-700">{viewingWorkOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Uždaryti
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedWorkOrderId && (
        <WorkOrderDetailSidebar
          workOrderId={selectedWorkOrderId}
          isOpen={showSidebar}
          onClose={() => {
            setShowSidebar(false);
            setSelectedWorkOrderId(null);
          }}
          onWorkOrderUpdate={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
