import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Search, Edit, Trash2, X, Save, AlertTriangle, CheckCircle } from 'lucide-react';

interface MaintenanceSchedule {
  id: string;
  schedule_name: string;
  vehicle_id: string;
  maintenance_type: string;
  interval_value: number;
  interval_type: string;
  last_performed_date: string | null;
  last_performed_mileage: number | null;
  last_performed_hours: number | null;
  next_due_date: string | null;
  next_due_mileage: number | null;
  next_due_hours: number | null;
  is_active: boolean;
  notes: string | null;
  vehicle: {
    registration_number: string;
    make: string;
    model: string;
    current_mileage: number;
    current_engine_hours: number;
  };
}

interface ScheduleForm {
  schedule_name: string;
  vehicle_id: string;
  maintenance_type: string;
  interval_value: string;
  interval_type: string;
  last_performed_date: string;
  last_performed_mileage: string;
  last_performed_hours: string;
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

export function MaintenanceSchedules() {
  const { user, logAction } = useAuth();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [servicingSchedule, setServicingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    schedule_name: '',
    vehicle_id: '',
    maintenance_type: 'date',
    interval_value: '',
    interval_type: 'days',
    last_performed_date: '',
    last_performed_mileage: '',
    last_performed_hours: '',
    notes: '',
  });
  const [serviceForm, setServiceForm] = useState({
    service_date: new Date().toISOString().split('T')[0],
    current_mileage: '',
    current_hours: '',
    notes: '',
    items: [] as Array<{ product_id: string; batch_id: string; quantity: string; product_name?: string }>,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [schedulesRes, vehiclesRes, productsRes] = await Promise.all([
      supabase
        .from('maintenance_schedules')
        .select(`
          *,
          vehicle:vehicles(registration_number, make, model, current_mileage, current_engine_hours)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, registration_number, make, model, current_mileage, current_engine_hours')
        .eq('is_active', true)
        .order('registration_number'),
      supabase
        .from('equipment_warehouse_stock')
        .select('product_id, product_name, unit_type, total_qty')
        .gt('total_qty', 0)
        .order('product_name'),
    ]);

    if (schedulesRes.data) setSchedules(schedulesRes.data as any);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
  };

  const handleOpenScheduleModal = (schedule?: MaintenanceSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({
        schedule_name: schedule.schedule_name,
        vehicle_id: schedule.vehicle_id,
        maintenance_type: schedule.maintenance_type,
        interval_value: schedule.interval_value.toString(),
        interval_type: schedule.interval_type,
        last_performed_date: schedule.last_performed_date || '',
        last_performed_mileage: schedule.last_performed_mileage?.toString() || '',
        last_performed_hours: schedule.last_performed_hours?.toString() || '',
        notes: schedule.notes || '',
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        schedule_name: '',
        vehicle_id: '',
        maintenance_type: 'date',
        interval_value: '',
        interval_type: 'days',
        last_performed_date: '',
        last_performed_mileage: '',
        last_performed_hours: '',
        notes: '',
      });
    }
    setShowScheduleModal(true);
  };

  const calculateNextDue = (form: ScheduleForm) => {
    const intervalValue = parseFloat(form.interval_value);

    if (form.maintenance_type === 'date' && form.last_performed_date) {
      const lastDate = new Date(form.last_performed_date);
      const nextDate = new Date(lastDate);

      if (form.interval_type === 'days') {
        nextDate.setDate(nextDate.getDate() + intervalValue);
      } else if (form.interval_type === 'months') {
        nextDate.setMonth(nextDate.getMonth() + intervalValue);
      } else if (form.interval_type === 'years') {
        nextDate.setFullYear(nextDate.getFullYear() + intervalValue);
      }

      return { next_due_date: nextDate.toISOString().split('T')[0] };
    } else if (form.maintenance_type === 'mileage' && form.last_performed_mileage) {
      const lastMileage = parseFloat(form.last_performed_mileage);
      return { next_due_mileage: lastMileage + intervalValue };
    } else if (form.maintenance_type === 'hours' && form.last_performed_hours) {
      const lastHours = parseFloat(form.last_performed_hours);
      return { next_due_hours: lastHours + intervalValue };
    }

    return {};
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.schedule_name || !scheduleForm.vehicle_id || !scheduleForm.interval_value) {
      alert('Prašome užpildyti privalomas laukas');
      return;
    }

    try {
      const nextDue = calculateNextDue(scheduleForm);

      const scheduleData = {
        schedule_name: scheduleForm.schedule_name,
        vehicle_id: scheduleForm.vehicle_id,
        maintenance_type: scheduleForm.maintenance_type,
        interval_value: parseFloat(scheduleForm.interval_value),
        interval_type: scheduleForm.interval_type,
        last_performed_date: scheduleForm.last_performed_date || null,
        last_performed_mileage: scheduleForm.last_performed_mileage ? parseFloat(scheduleForm.last_performed_mileage) : null,
        last_performed_hours: scheduleForm.last_performed_hours ? parseFloat(scheduleForm.last_performed_hours) : null,
        notes: scheduleForm.notes || null,
        ...nextDue,
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('maintenance_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        await logAction('update_maintenance_schedule', 'maintenance_schedules', editingSchedule.id);
        alert('Grafikas sėkmingai atnaujintas');
      } else {
        const { data, error } = await supabase
          .from('maintenance_schedules')
          .insert({ ...scheduleData, is_active: true, created_by: user?.id || null })
          .select()
          .single();

        if (error) throw error;
        await logAction('create_maintenance_schedule', 'maintenance_schedules', data.id);
        alert('Grafikas sėkmingai sukurtas');
      }

      setShowScheduleModal(false);
      setEditingSchedule(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleDeleteSchedule = async (schedule: MaintenanceSchedule) => {
    if (!confirm(`Ar tikrai norite ištrinti grafiką "${schedule.schedule_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ is_active: false })
        .eq('id', schedule.id);

      if (error) throw error;
      await logAction('delete_maintenance_schedule', 'maintenance_schedules', schedule.id);
      alert('Grafikas ištrintas');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleOpenServiceModal = (schedule: MaintenanceSchedule) => {
    setServicingSchedule(schedule);
    setServiceForm({
      service_date: new Date().toISOString().split('T')[0],
      current_mileage: schedule.vehicle.current_mileage?.toString() || '',
      current_hours: schedule.vehicle.current_engine_hours?.toString() || '',
      notes: '',
      items: [],
    });
    setShowServiceModal(true);
  };

  const loadBatchesForProduct = async (productId: string) => {
    const { data } = await supabase
      .from('equipment_batches')
      .select('*')
      .eq('product_id', productId)
      .gt('qty_left', 0)
      .order('created_at', { ascending: true });

    if (data) setBatches(data);
  };

  const handleAddServiceItem = () => {
    setServiceForm({
      ...serviceForm,
      items: [...serviceForm.items, { product_id: '', batch_id: '', quantity: '1' }],
    });
  };

  const handleRemoveServiceItem = (index: number) => {
    setServiceForm({
      ...serviceForm,
      items: serviceForm.items.filter((_, i) => i !== index),
    });
  };

  const handleServiceItemChange = (index: number, field: string, value: string) => {
    const newItems = [...serviceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id' && value) {
      const product = products.find(p => p.product_id === value);
      if (product) {
        newItems[index].product_name = product.product_name;
      }
      loadBatchesForProduct(value);
    }

    setServiceForm({ ...serviceForm, items: newItems });
  };

  const handleSaveService = async () => {
    if (!servicingSchedule || !serviceForm.service_date) {
      alert('Prašome užpildyti privalomas laukas');
      return;
    }

    try {
      const { data: woNumber } = await supabase.rpc('generate_work_order_number');

      const { data: workOrder, error: workOrderError } = await supabase
        .from('maintenance_work_orders')
        .insert({
          work_order_number: woNumber,
          schedule_id: servicingSchedule.id,
          vehicle_id: servicingSchedule.vehicle_id,
          work_order_type: 'scheduled',
          priority: 'medium',
          status: 'completed',
          completed_date: serviceForm.service_date,
          description: `${servicingSchedule.schedule_name} - ${servicingSchedule.vehicle.registration_number}`,
          work_performed: serviceForm.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (workOrderError) throw workOrderError;

      for (const item of serviceForm.items) {
        if (item.product_id && item.batch_id && parseFloat(item.quantity) > 0) {
          const { data: issuanceNumber } = await supabase.rpc('generate_equipment_issuance_number');

          const { data: issuance, error: issuanceError } = await supabase
            .from('equipment_issuances')
            .insert({
              issuance_number: issuanceNumber,
              issued_to: null,
              issued_to_name: `Aptarnavimas: ${servicingSchedule.vehicle.registration_number}`,
              issued_by: user?.id,
              issue_date: serviceForm.service_date,
              status: 'issued',
              notes: `Naudota aptarnavime: ${workOrder.work_order_number}`,
              created_by: user?.id,
            })
            .select()
            .single();

          if (issuanceError) throw issuanceError;

          const selectedProduct = products.find(p => p.product_id === item.product_id);
          const selectedBatch = batches.find(b => b.id === item.batch_id);

          const { error: itemError } = await supabase
            .from('equipment_issuance_items')
            .insert({
              issuance_id: issuance.id,
              batch_id: item.batch_id,
              product_id: item.product_id,
              quantity: parseFloat(item.quantity),
              unit_price: selectedBatch?.purchase_price || 0,
            });

          if (itemError) throw itemError;
        }
      }

      const newMileage = serviceForm.current_mileage ? parseFloat(serviceForm.current_mileage) : null;
      const newHours = serviceForm.current_hours ? parseFloat(serviceForm.current_hours) : null;

      await supabase
        .from('vehicles')
        .update({
          current_mileage: newMileage || servicingSchedule.vehicle.current_mileage,
          current_engine_hours: newHours || servicingSchedule.vehicle.current_engine_hours,
        })
        .eq('id', servicingSchedule.vehicle_id);

      const updateData: any = {
        last_performed_date: serviceForm.service_date,
      };

      if (servicingSchedule.maintenance_type === 'mileage' && newMileage) {
        updateData.last_performed_mileage = newMileage;
        updateData.next_due_mileage = newMileage + servicingSchedule.interval_value;
      } else if (servicingSchedule.maintenance_type === 'hours' && newHours) {
        updateData.last_performed_hours = newHours;
        updateData.next_due_hours = newHours + servicingSchedule.interval_value;
      } else if (servicingSchedule.maintenance_type === 'date') {
        const nextDate = new Date(serviceForm.service_date);
        if (servicingSchedule.interval_type === 'days') {
          nextDate.setDate(nextDate.getDate() + servicingSchedule.interval_value);
        } else if (servicingSchedule.interval_type === 'months') {
          nextDate.setMonth(nextDate.getMonth() + servicingSchedule.interval_value);
        } else if (servicingSchedule.interval_type === 'years') {
          nextDate.setFullYear(nextDate.getFullYear() + servicingSchedule.interval_value);
        }
        updateData.next_due_date = nextDate.toISOString().split('T')[0];
      }

      await supabase
        .from('maintenance_schedules')
        .update(updateData)
        .eq('id', servicingSchedule.id);

      await logAction('complete_maintenance', 'maintenance_work_orders', workOrder.id);

      alert('Aptarnavimas sėkmingai įrašytas');
      setShowServiceModal(false);
      setServicingSchedule(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const getProgressPercentage = (schedule: MaintenanceSchedule) => {
    if (schedule.maintenance_type === 'date' && schedule.last_performed_date && schedule.next_due_date) {
      const lastDate = new Date(schedule.last_performed_date).getTime();
      const nextDate = new Date(schedule.next_due_date).getTime();
      const now = Date.now();

      const progress = ((now - lastDate) / (nextDate - lastDate)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } else if (schedule.maintenance_type === 'mileage' && schedule.last_performed_mileage && schedule.next_due_mileage) {
      const progress = ((schedule.vehicle.current_mileage - schedule.last_performed_mileage) /
        (schedule.next_due_mileage - schedule.last_performed_mileage)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } else if (schedule.maintenance_type === 'hours' && schedule.last_performed_hours && schedule.next_due_hours) {
      const progress = ((schedule.vehicle.current_engine_hours - schedule.last_performed_hours) /
        (schedule.next_due_hours - schedule.last_performed_hours)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
    return 0;
  };

  const isDueOrOverdue = (schedule: MaintenanceSchedule) => {
    const progress = getProgressPercentage(schedule);
    return progress >= 100;
  };

  const isApproachingDue = (schedule: MaintenanceSchedule) => {
    const progress = getProgressPercentage(schedule);
    return progress >= 80 && progress < 100;
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch =
      schedule.schedule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || schedule.maintenance_type === filterType;

    return matchesSearch && matchesType;
  });

  const scheduleTypeLabels: Record<string, string> = {
    date: 'Pagal datą',
    mileage: 'Pagal ridą',
    hours: 'Pagal motovalandas',
  };

  const intervalUnitLabels: Record<string, string> = {
    days: 'd.',
    months: 'mėn.',
    years: 'm.',
    km: 'km',
    hours: 'mval.',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Planiniai aptarnavimai</h3>
          <button
            onClick={() => handleOpenScheduleModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Naujas grafikas
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
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi tipai</option>
            <option value="date">Pagal datą</option>
            <option value="mileage">Pagal ridą</option>
            <option value="hours">Pagal motovalandas</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map(schedule => {
            const progress = getProgressPercentage(schedule);
            const overdue = isDueOrOverdue(schedule);
            const approaching = isApproachingDue(schedule);

            return (
              <div
                key={schedule.id}
                className={`border rounded-lg p-4 ${
                  overdue ? 'border-red-300 bg-red-50' : approaching ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{schedule.schedule_name}</h4>
                    <p className="text-sm text-gray-600">
                      {schedule.vehicle.registration_number} - {schedule.vehicle.make} {schedule.vehicle.model}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    overdue ? 'bg-red-100 text-red-700' : approaching ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {overdue ? 'Reikia aptarnauti' : approaching ? 'Netrukus' : 'OK'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <p>Tipas: {scheduleTypeLabels[schedule.maintenance_type]}</p>
                  <p>Intervalas: {schedule.interval_value} {intervalUnitLabels[schedule.interval_type]}</p>

                  {schedule.maintenance_type === 'date' && schedule.next_due_date && (
                    <p>Kitas aptarnavimas: {new Date(schedule.next_due_date).toLocaleDateString('lt-LT')}</p>
                  )}
                  {schedule.maintenance_type === 'mileage' && schedule.next_due_mileage && (
                    <p>
                      Rida: {schedule.vehicle.current_mileage?.toLocaleString()} / {schedule.next_due_mileage.toLocaleString()} km
                    </p>
                  )}
                  {schedule.maintenance_type === 'hours' && schedule.next_due_hours && (
                    <p>
                      Valandos: {schedule.vehicle.current_engine_hours} / {schedule.next_due_hours} mval.
                    </p>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Pažanga</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        overdue ? 'bg-red-600' : approaching ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {overdue && (
                    <button
                      onClick={() => handleOpenServiceModal(schedule)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aptarnauti
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenScheduleModal(schedule)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Redaguoti
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(schedule)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSchedules.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Grafikų nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viso grafikų" value={schedules.length.toString()} color="blue" />
        <StatCard
          title="Reikia aptarnauti"
          value={schedules.filter(s => isDueOrOverdue(s)).length.toString()}
          color="red"
        />
        <StatCard
          title="Netrukus"
          value={schedules.filter(s => isApproachingDue(s)).length.toString()}
          color="amber"
        />
        <StatCard
          title="OK"
          value={schedules.filter(s => !isDueOrOverdue(s) && !isApproachingDue(s)).length.toString()}
          color="green"
        />
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSchedule ? 'Redaguoti grafiką' : 'Naujas grafikas'}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas *</label>
                <input
                  type="text"
                  value={scheduleForm.schedule_name}
                  onChange={e => setScheduleForm({ ...scheduleForm, schedule_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="pvz. Alyvos keitimas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportas *</label>
                <select
                  value={scheduleForm.vehicle_id}
                  onChange={e => setScheduleForm({ ...scheduleForm, vehicle_id: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Aptarnavimo tipas *</label>
                <select
                  value={scheduleForm.maintenance_type}
                  onChange={e => setScheduleForm({
                    ...scheduleForm,
                    maintenance_type: e.target.value,
                    interval_type: e.target.value === 'date' ? 'days' : e.target.value === 'mileage' ? 'km' : 'hours'
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="date">Pagal datą</option>
                  <option value="mileage">Pagal ridą</option>
                  <option value="hours">Pagal motovalandas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intervalas *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scheduleForm.interval_value}
                    onChange={e => setScheduleForm({ ...scheduleForm, interval_value: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vienetai</label>
                  <select
                    value={scheduleForm.interval_type}
                    onChange={e => setScheduleForm({ ...scheduleForm, interval_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {scheduleForm.maintenance_type === 'date' && (
                      <>
                        <option value="days">Dienos</option>
                        <option value="months">Mėnesiai</option>
                        <option value="years">Metai</option>
                      </>
                    )}
                    {scheduleForm.maintenance_type === 'mileage' && <option value="km">Kilometrai</option>}
                    {scheduleForm.maintenance_type === 'hours' && <option value="hours">Motovalandos</option>}
                  </select>
                </div>
              </div>

              {scheduleForm.maintenance_type === 'date' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paskutinio aptarnavimo data</label>
                  <input
                    type="date"
                    value={scheduleForm.last_performed_date}
                    onChange={e => setScheduleForm({ ...scheduleForm, last_performed_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}

              {scheduleForm.maintenance_type === 'mileage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rida per paskutinį aptarnavimą (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scheduleForm.last_performed_mileage}
                    onChange={e => setScheduleForm({ ...scheduleForm, last_performed_mileage: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}

              {scheduleForm.maintenance_type === 'hours' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motovalandos per paskutinį aptarnavimą</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scheduleForm.last_performed_hours}
                    onChange={e => setScheduleForm({ ...scheduleForm, last_performed_hours: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <Save className="w-4 h-4" />
                {editingSchedule ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showServiceModal && servicingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Aptarnauti: {servicingSchedule.schedule_name}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-gray-800">{servicingSchedule.vehicle.registration_number}</p>
              <p className="text-sm text-gray-600">{servicingSchedule.vehicle.make} {servicingSchedule.vehicle.model}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aptarnavimo data *</label>
                  <input
                    type="date"
                    value={serviceForm.service_date}
                    onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                {servicingSchedule.maintenance_type === 'mileage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dabartinė rida (km)</label>
                    <input
                      type="number"
                      value={serviceForm.current_mileage}
                      onChange={(e) => setServiceForm({ ...serviceForm, current_mileage: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}
                {servicingSchedule.maintenance_type === 'hours' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dabartinės motovalandos</label>
                    <input
                      type="number"
                      value={serviceForm.current_hours}
                      onChange={(e) => setServiceForm({ ...serviceForm, current_hours: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Aprašykite atliktus darbus..."
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">Naudotos prekės</h4>
                  <button
                    onClick={handleAddServiceItem}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti prekę
                  </button>
                </div>

                <div className="space-y-3">
                  {serviceForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Produktas</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleServiceItemChange(index, 'product_id', e.target.value)}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Pasirinkite produktą</option>
                          {products.map(product => (
                            <option key={product.product_id} value={product.product_id}>
                              {product.product_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {item.product_id && (
                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partija</label>
                          <select
                            value={item.batch_id}
                            onChange={(e) => handleServiceItemChange(index, 'batch_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                          >
                            <option value="">Pasirinkite partiją</option>
                            {batches.filter(b => b.product_id === item.product_id).map(batch => (
                              <option key={batch.id} value={batch.id}>
                                {batch.batch_number} - Likutis: {batch.qty_left}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleServiceItemChange(index, 'quantity', e.target.value)}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>

                      <div className="col-span-1">
                        <button
                          onClick={() => handleRemoveServiceItem(index)}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveService}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Užbaigti aptarnavimą
              </button>
            </div>
          </div>
        </div>
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
