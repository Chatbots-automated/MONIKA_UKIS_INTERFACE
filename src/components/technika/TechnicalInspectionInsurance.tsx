import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  registration_number: string | null;
  ta_expiry_date: string | null;
  insurance_expiry_date: string | null;
}

type FilterType = 'all' | 'ta_soon' | 'insurance_soon' | 'expired';

export function TechnicalInspectionInsurance() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchVehicles();
    }
  }, [user?.id]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, name, type, registration_number, ta_expiry_date, insurance_expiry_date')
        .eq('user_id', user?.id)
        .in('type', ['cylinder', 'semi_trailer', 'car_light'])
        .order('name');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date: string | null): number | null => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysUntil: number | null): string => {
    if (daysUntil === null) return 'gray';
    if (daysUntil < 0) return 'red';
    if (daysUntil <= 30) return 'orange';
    if (daysUntil <= 60) return 'yellow';
    return 'green';
  };

  const getStatusText = (daysUntil: number | null): string => {
    if (daysUntil === null) return 'Nenustatyta';
    if (daysUntil < 0) return `Pasibaigė prieš ${Math.abs(daysUntil)} d.`;
    if (daysUntil === 0) return 'Baigiasi šiandien';
    if (daysUntil === 1) return 'Baigiasi rytoj';
    return `Baigiasi po ${daysUntil} d.`;
  };

  const vehicleTypeLabels: any = {
    cylinder: 'Cilindras',
    semi_trailer: 'Puspriekabė',
    car_light: 'Lengvasis automobilis',
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const taDays = getDaysUntil(vehicle.ta_expiry_date);
    const insuranceDays = getDaysUntil(vehicle.insurance_expiry_date);

    switch (filter) {
      case 'ta_soon':
        return taDays !== null && taDays <= 60 && taDays >= 0;
      case 'insurance_soon':
        return insuranceDays !== null && insuranceDays <= 60 && insuranceDays >= 0;
      case 'expired':
        return (taDays !== null && taDays < 0) || (insuranceDays !== null && insuranceDays < 0);
      default:
        return true;
    }
  });

  const stats = {
    total: vehicles.length,
    needsRenewal: vehicles.filter((v) => {
      const taDays = getDaysUntil(v.ta_expiry_date);
      const insuranceDays = getDaysUntil(v.insurance_expiry_date);
      return (taDays !== null && taDays <= 60 && taDays >= 0) || (insuranceDays !== null && insuranceDays <= 60 && insuranceDays >= 0);
    }).length,
    expired: vehicles.filter((v) => {
      const taDays = getDaysUntil(v.ta_expiry_date);
      const insuranceDays = getDaysUntil(v.insurance_expiry_date);
      return (taDays !== null && taDays < 0) || (insuranceDays !== null && insuranceDays < 0);
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Iš viso</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Shield className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Reikia atnaujinti</p>
              <p className="text-3xl font-bold mt-1">{stats.needsRenewal}</p>
            </div>
            <Calendar className="w-12 h-12 text-amber-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Pasibaigę</p>
              <p className="text-3xl font-bold mt-1">{stats.expired}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-200 opacity-80" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Techninės apžiūros ir draudimai</h3>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Visi ({vehicles.length})</option>
              <option value="ta_soon">TA baigiasi netrukus</option>
              <option value="insurance_soon">Draudimas baigiasi netrukus</option>
              <option value="expired">Pasibaigę</option>
            </select>
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'all'
                ? 'Nėra registruotų transporto priemonių'
                : 'Nerasta transporto priemonių pagal pasirinktą filtrą'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Pavadinimas</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipas</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Valst. numeris</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">TA galiojimas</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">TA būklė</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Draudimo galiojimas</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Draudimo būklė</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const taDays = getDaysUntil(vehicle.ta_expiry_date);
                  const insuranceDays = getDaysUntil(vehicle.insurance_expiry_date);
                  const taColor = getStatusColor(taDays);
                  const insuranceColor = getStatusColor(insuranceDays);

                  return (
                    <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{vehicle.name}</td>
                      <td className="py-3 px-4 text-gray-600">{vehicleTypeLabels[vehicle.type] || vehicle.type}</td>
                      <td className="py-3 px-4 text-gray-600">{vehicle.registration_number || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {vehicle.ta_expiry_date
                          ? new Date(vehicle.ta_expiry_date).toLocaleDateString('lt-LT')
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            taColor === 'red' ? 'bg-red-100 text-red-800' :
                            taColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                            taColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            taColor === 'green' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getStatusText(taDays)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {vehicle.insurance_expiry_date
                          ? new Date(vehicle.insurance_expiry_date).toLocaleDateString('lt-LT')
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            insuranceColor === 'red' ? 'bg-red-100 text-red-800' :
                            insuranceColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                            insuranceColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            insuranceColor === 'green' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getStatusText(insuranceDays)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Priminimas</p>
            <p>Šiame sąraše rodomos tik transporto priemonės, kurioms reikalinga techninė apžiūra ir draudimas: cilindrai, puspriekabės ir lengvieji automobiliai.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
