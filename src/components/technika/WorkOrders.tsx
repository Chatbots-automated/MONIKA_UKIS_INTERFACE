import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ClipboardList, Plus, Search, Truck, AlertCircle } from 'lucide-react';

interface WorkOrder {
  id: string;
  work_order_number: string;
  order_type: string;
  priority: string;
  description: string;
  scheduled_date: string;
  status: string;
  total_cost: number;
  vehicle: {
    registration_number: string;
    make: string;
    model: string;
  };
}

export function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    const { data } = await supabase
      .from('maintenance_work_orders')
      .select(`
        *,
        vehicle:vehicles(registration_number, make, model)
      `)
      .order('scheduled_date', { ascending: false })
      .limit(50);

    if (data) setWorkOrders(data as any);
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch =
      order.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const priorityLabels: any = {
    low: { label: 'Žemas', color: 'bg-gray-100 text-gray-700' },
    medium: { label: 'Vidutinis', color: 'bg-blue-100 text-blue-700' },
    high: { label: 'Aukštas', color: 'bg-amber-100 text-amber-700' },
    critical: { label: 'Kritinis', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Aptarnavimų užsakymai</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <Plus className="w-4 h-4" />
            Naujas užsakymas
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti užsakymų..."
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
            <option value="pending">Laukiantys</option>
            <option value="in_progress">Vykdomi</option>
            <option value="completed">Užbaigti</option>
            <option value="cancelled">Atšaukti</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredOrders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-slate-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-semibold text-gray-800">{order.work_order_number}</p>
                    <p className="text-sm text-gray-600">{order.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${priorityLabels[order.priority].color}`}>
                    {priorityLabels[order.priority].label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status === 'pending' ? 'Laukiantis' :
                     order.status === 'in_progress' ? 'Vykdomas' :
                     order.status === 'completed' ? 'Užbaigtas' : 'Atšauktas'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="w-4 h-4" />
                  <span>{order.vehicle.registration_number} · {order.vehicle.make} {order.vehicle.model}</span>
                </div>
                <div className="text-gray-600">
                  Data: {order.scheduled_date}
                </div>
                {order.total_cost > 0 && (
                  <div className="font-semibold text-gray-800">
                    €{order.total_cost.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Užsakymų nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viso užsakymų" value={workOrders.length.toString()} color="blue" />
        <StatCard title="Laukiantys" value={workOrders.filter(o => o.status === 'pending').length.toString()} color="amber" />
        <StatCard title="Vykdomi" value={workOrders.filter(o => o.status === 'in_progress').length.toString()} color="blue" />
        <StatCard title="Užbaigti" value={workOrders.filter(o => o.status === 'completed').length.toString()} color="green" />
      </div>
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
