import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UtensilsCrossed, Users, Download, Tractor, Warehouse, Check, AlertCircle } from 'lucide-react';

interface FoodPreference {
  id: string;
  worker_id: string;
  date: string;
  wants_food: boolean;
  work_location: 'farm' | 'warehouse';
  marked_at: string | null;
  marked_by: string | null;
  notes: string | null;
  worker_name?: string;
}

interface DailySummary {
  date: string;
  farm_count: number;
  warehouse_count: number;
  farm_workers: FoodPreference[];
  warehouse_workers: FoodPreference[];
  total_workers: number;
  responded_count: number;
}

export function FoodManagement() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<FoodPreference[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPreferences(),
        loadWorkers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    const today = formatDate(new Date());
    
    const { data, error } = await supabase
      .from('worker_food_preferences')
      .select(`
        *,
        worker:users!worker_id(full_name, work_location)
      `)
      .eq('date', today);

    if (error) throw error;

    const prefsWithNames = data?.map(pref => ({
      ...pref,
      worker_name: pref.worker?.full_name || 'Unknown',
      work_location: pref.work_location || pref.worker?.work_location || 'warehouse'
    })) || [];

    setPreferences(prefsWithNames);
  };

  const loadWorkers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['farm_worker', 'warehouse_worker'])
      .order('full_name');

    if (error) throw error;
    setAllWorkers(data || []);
  };

  const getDailySummary = (): DailySummary => {
    const farmWorkers = preferences.filter(p => p.work_location === 'farm' && p.wants_food);
    const warehouseWorkers = preferences.filter(p => p.work_location === 'warehouse' && p.wants_food);
    
    return {
      date: formatDate(new Date()),
      farm_count: farmWorkers.length,
      warehouse_count: warehouseWorkers.length,
      farm_workers: farmWorkers,
      warehouse_workers: warehouseWorkers,
      total_workers: allWorkers.length,
      responded_count: preferences.length
    };
  };

  const getWorkersWithoutResponse = () => {
    const respondedWorkerIds = new Set(preferences.map(p => p.worker_id));
    return allWorkers.filter(w => !respondedWorkerIds.has(w.id));
  };

  const exportToCSV = () => {
    const summary = getDailySummary();
    const today = new Date().toLocaleDateString('lt-LT');
    
    let csv = `Pietų užsakymai - ${today}\n\n`;
    
    csv += `FERMA (${summary.farm_count})\n`;
    csv += `Vardas\n`;
    summary.farm_workers.forEach(w => {
      csv += `${w.worker_name}\n`;
    });
    
    csv += `\nTECHNIKOS KIEMAS (${summary.warehouse_count})\n`;
    csv += `Vardas\n`;
    summary.warehouse_workers.forEach(w => {
      csv += `${w.worker_name}\n`;
    });

    csv += `\nVISO: ${summary.farm_count + summary.warehouse_count}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pietūs_${formatDate(new Date())}.csv`;
    link.click();
  };

  const summary = getDailySummary();
  const workersWithoutResponse = getWorkersWithoutResponse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kas nori pietų šiandien?</h1>
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('lt-LT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
              <Tractor className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ferma</h3>
              <p className="text-4xl font-bold text-green-600">{summary.farm_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
              <Warehouse className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Technikos kiemas</h3>
              <p className="text-4xl font-bold text-slate-600">{summary.warehouse_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">VISO PIETŲ</p>
              <p className="text-5xl font-bold text-orange-600">
                {summary.farm_count + summary.warehouse_count}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workers Without Response */}
      {workersWithoutResponse.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Neatsakė {workersWithoutResponse.length} darbuotojai
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {workersWithoutResponse.map(worker => (
                  <div key={worker.id} className="text-sm text-yellow-800">
                    <span className="font-medium">{worker.full_name}</span>
                    <span className="text-yellow-600 ml-2">
                      ({worker.work_location === 'farm' ? 'Ferma' : 'Technikos kiemas'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workers Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Farm Workers List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-green-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Tractor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ferma</h3>
                <p className="text-sm text-gray-600">{summary.farm_count} žmonės</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {summary.farm_workers.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">Niekas nenori pietų</p>
            ) : (
              <div className="space-y-2">
                {summary.farm_workers.map(pref => (
                  <div key={pref.id} className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <p className="font-semibold text-gray-900 text-lg">{pref.worker_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Workers List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Technikos kiemas</h3>
                <p className="text-sm text-gray-600">{summary.warehouse_count} žmonės</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {summary.warehouse_workers.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">Niekas nenori pietų</p>
            ) : (
              <div className="space-y-2">
                {summary.warehouse_workers.map(pref => (
                  <div key={pref.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-gray-900 text-lg">{pref.worker_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
