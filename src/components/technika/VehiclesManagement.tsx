import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Truck, Plus, Search, AlertTriangle, Calendar, User, Gauge } from 'lucide-react';

interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  status: string;
  current_mileage: number;
  current_engine_hours: number;
  insurance_expiry_date: string | null;
  technical_inspection_due_date: string | null;
  assigned_to: string | null;
  assignee: {
    full_name: string;
  } | null;
}

export function VehiclesManagement() {
  const { logAction } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select(`
        *,
        assignee:users!vehicles_assigned_to_fkey(full_name)
      `)
      .eq('is_active', true)
      .order('registration_number');

    if (data) setVehicles(data as any);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch =
      vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const daysUntil = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const vehicleTypeLabels: any = {
    tractor: 'Traktorius',
    truck: 'Sunkvežimis',
    car: 'Automobilis',
    harvester: 'Kombainas',
    sprayer: 'Purkštuvas',
    loader: 'Krautuvas',
    trailer: 'Priekaba',
    other: 'Kita',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Transporto priemonės</h3>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pridėti transportą
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal valst. numerį, markę..."
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
            <option value="active">Aktyvūs</option>
            <option value="maintenance">Aptarnavime</option>
            <option value="inactive">Neaktyvūs</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(vehicle => {
            const insuranceExpiring = isExpiringSoon(vehicle.insurance_expiry_date);
            const insuranceExpired = isExpired(vehicle.insurance_expiry_date);
            const taExpiring = isExpiringSoon(vehicle.technical_inspection_due_date);
            const taExpired = isExpired(vehicle.technical_inspection_due_date);
            const hasWarnings = insuranceExpiring || insuranceExpired || taExpiring || taExpired;

            return (
              <div
                key={vehicle.id}
                className={`border rounded-lg p-4 ${
                  hasWarnings ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-slate-600" />
                    <span className="font-bold text-gray-800">{vehicle.registration_number}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      vehicle.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : vehicle.status === 'maintenance'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {vehicle.status === 'active' ? 'Aktyvus' : vehicle.status === 'maintenance' ? 'Aptarnavimas' : 'Neaktyvus'}
                  </span>
                </div>

                <h4 className="font-medium text-gray-800 mb-1">
                  {vehicle.make} {vehicle.model}
                </h4>
                <p className="text-sm text-gray-600 mb-3">{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type} · {vehicle.year}</p>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Gauge className="w-4 h-4" />
                    <span>{vehicle.current_mileage?.toLocaleString()} km</span>
                    {vehicle.current_engine_hours > 0 && <span>· {vehicle.current_engine_hours} mval.</span>}
                  </div>

                  {vehicle.assignee && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{vehicle.assignee.full_name}</span>
                    </div>
                  )}

                  {vehicle.insurance_expiry_date && (
                    <div className={`flex items-center gap-2 ${insuranceExpired ? 'text-red-600' : insuranceExpiring ? 'text-amber-600' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>Draudimas: {vehicle.insurance_expiry_date}</span>
                    </div>
                  )}

                  {vehicle.technical_inspection_due_date && (
                    <div className={`flex items-center gap-2 ${taExpired ? 'text-red-600' : taExpiring ? 'text-amber-600' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>TA: {vehicle.technical_inspection_due_date}</span>
                    </div>
                  )}
                </div>

                {hasWarnings && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reikia dėmesio</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Transporto priemonių nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viso transporto" value={vehicles.length.toString()} color="blue" />
        <StatCard
          title="Aktyvūs"
          value={vehicles.filter(v => v.status === 'active').length.toString()}
          color="green"
        />
        <StatCard
          title="Aptarnavime"
          value={vehicles.filter(v => v.status === 'maintenance').length.toString()}
          color="amber"
        />
        <StatCard
          title="Reikia dėmesio"
          value={vehicles.filter(v => isExpiringSoon(v.insurance_expiry_date) || isExpiringSoon(v.technical_inspection_due_date)).length.toString()}
          color="red"
        />
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
