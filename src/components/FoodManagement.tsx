import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UtensilsCrossed, Users, Download, Tractor, Warehouse, Building2, Check, AlertCircle, Edit2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FoodPreference {
  id: string;
  worker_id: string;
  date: string;
  wants_lunch: boolean;
  wants_supper: boolean;
  work_location: 'farm' | 'warehouse' | 'administration';
  marked_at: string | null;
  marked_by: string | null;
  notes: string | null;
  worker_name?: string;
}

interface AdminCount {
  lunch_count: number;
  supper_count: number;
}

interface DailySummary {
  date: string;
  farm_lunch: number;
  farm_supper: number;
  warehouse_lunch: number;
  warehouse_supper: number;
  admin_lunch: number;
  admin_supper: number;
  farm_workers: FoodPreference[];
  warehouse_workers: FoodPreference[];
  total_workers: number;
  responded_count: number;
}

export function FoodManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<FoodPreference[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [adminCounts, setAdminCounts] = useState<AdminCount>({ lunch_count: 0, supper_count: 0 });
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [tempAdminCounts, setTempAdminCounts] = useState<AdminCount>({ lunch_count: 0, supper_count: 0 });

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
        loadWorkers(),
        loadAdminCounts()
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

  const loadAdminCounts = async () => {
    const today = formatDate(new Date());
    
    const { data, error } = await supabase
      .from('admin_food_counts')
      .select('*')
      .eq('date', today)
      .eq('location', 'administration')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      setAdminCounts({ lunch_count: data.lunch_count, supper_count: data.supper_count });
      setTempAdminCounts({ lunch_count: data.lunch_count, supper_count: data.supper_count });
    }
  };

  const saveAdminCounts = async () => {
    try {
      const today = formatDate(new Date());
      
      const { error } = await supabase
        .from('admin_food_counts')
        .upsert({
          date: today,
          location: 'administration',
          lunch_count: tempAdminCounts.lunch_count,
          supper_count: tempAdminCounts.supper_count,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date,location'
        });

      if (error) {
        console.error('Error saving admin counts:', error);
        alert('Klaida išsaugant administracijos skaičius: ' + error.message);
        return;
      }

      setAdminCounts(tempAdminCounts);
      setEditingAdmin(false);
    } catch (error) {
      console.error('Error saving admin counts:', error);
      alert('Klaida išsaugant administracijos skaičius');
    }
  };

  const getDailySummary = (): DailySummary => {
    const farmLunch = preferences.filter(p => p.work_location === 'farm' && p.wants_lunch);
    const farmSupper = preferences.filter(p => p.work_location === 'farm' && p.wants_supper);
    const warehouseLunch = preferences.filter(p => p.work_location === 'warehouse' && p.wants_lunch);
    const warehouseSupper = preferences.filter(p => p.work_location === 'warehouse' && p.wants_supper);
    
    return {
      date: formatDate(new Date()),
      farm_lunch: farmLunch.length,
      farm_supper: farmSupper.length,
      warehouse_lunch: warehouseLunch.length,
      warehouse_supper: warehouseSupper.length,
      admin_lunch: adminCounts.lunch_count,
      admin_supper: adminCounts.supper_count,
      farm_workers: preferences.filter(p => p.work_location === 'farm'),
      warehouse_workers: preferences.filter(p => p.work_location === 'warehouse'),
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
    
    let csv = `Pietų ir vakarienės užsakymai - ${today}\n\n`;
    
    csv += `PIETŪS\n`;
    csv += `Ferma: ${summary.farm_lunch}\n`;
    csv += `Technikos kiemas: ${summary.warehouse_lunch}\n`;
    csv += `Administracija: ${summary.admin_lunch}\n`;
    csv += `VISO PIETŲ: ${summary.farm_lunch + summary.warehouse_lunch + summary.admin_lunch}\n\n`;
    
    csv += `VAKARIENĖ\n`;
    csv += `Ferma: ${summary.farm_supper}\n`;
    csv += `Technikos kiemas: ${summary.warehouse_supper}\n`;
    csv += `Administracija: ${summary.admin_supper}\n`;
    csv += `VISO VAKARIENIŲ: ${summary.farm_supper + summary.warehouse_supper + summary.admin_supper}\n\n`;

    csv += `FERMA - PIETŪS\n`;
    summary.farm_workers.filter(w => w.wants_lunch).forEach(w => {
      csv += `${w.worker_name}\n`;
    });
    
    csv += `\nFERMA - VAKARIENĖ\n`;
    summary.farm_workers.filter(w => w.wants_supper).forEach(w => {
      csv += `${w.worker_name}\n`;
    });
    
    csv += `\nTECHNIKOS KIEMAS - PIETŪS\n`;
    summary.warehouse_workers.filter(w => w.wants_lunch).forEach(w => {
      csv += `${w.worker_name}\n`;
    });
    
    csv += `\nTECHNIKOS KIEMAS - VAKARIENĖ\n`;
    summary.warehouse_workers.filter(w => w.wants_supper).forEach(w => {
      csv += `${w.worker_name}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pietus_vakariene_${formatDate(new Date())}.csv`;
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
            <h1 className="text-2xl font-bold text-gray-900">Kas nori maisto šiandien?</h1>
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

      {/* Summary Cards - Lunch and Supper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lunch Summary */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">PIETŪS</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-green-600" />
                <span className="font-medium">Ferma</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{summary.farm_lunch}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-slate-600" />
                <span className="font-medium">Technikos kiemas</span>
              </div>
              <span className="text-2xl font-bold text-slate-600">{summary.warehouse_lunch}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">Administracija</span>
              </div>
              <span className="text-2xl font-bold text-indigo-600">{summary.admin_lunch}</span>
            </div>
            <div className="pt-3 border-t-2 border-blue-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">VISO</span>
                <span className="text-3xl font-bold text-blue-600">
                  {summary.farm_lunch + summary.warehouse_lunch + summary.admin_lunch}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Supper Summary */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-4">VAKARIENĖ</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-green-600" />
                <span className="font-medium">Ferma</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{summary.farm_supper}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-slate-600" />
                <span className="font-medium">Technikos kiemas</span>
              </div>
              <span className="text-2xl font-bold text-slate-600">{summary.warehouse_supper}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">Administracija</span>
              </div>
              <span className="text-2xl font-bold text-indigo-600">{summary.admin_supper}</span>
            </div>
            <div className="pt-3 border-t-2 border-purple-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900">VISO</span>
                <span className="text-3xl font-bold text-purple-600">
                  {summary.farm_supper + summary.warehouse_supper + summary.admin_supper}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Administration Manual Entry */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Administracija</h3>
              <p className="text-sm text-gray-600">Įveskite kiek žmonių nori maisto</p>
            </div>
          </div>
          {!editingAdmin ? (
            <button
              onClick={() => setEditingAdmin(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Redaguoti
            </button>
          ) : (
            <button
              onClick={saveAdminCounts}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pietūs</label>
            <input
              type="number"
              min="0"
              value={editingAdmin ? tempAdminCounts.lunch_count : adminCounts.lunch_count}
              onChange={(e) => setTempAdminCounts(prev => ({ ...prev, lunch_count: parseInt(e.target.value) || 0 }))}
              disabled={!editingAdmin}
              className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vakarienė</label>
            <input
              type="number"
              min="0"
              value={editingAdmin ? tempAdminCounts.supper_count : adminCounts.supper_count}
              onChange={(e) => setTempAdminCounts(prev => ({ ...prev, supper_count: parseInt(e.target.value) || 0 }))}
              disabled={!editingAdmin}
              className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Workers Without Response Warning */}
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
        {/* Farm Workers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-green-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Tractor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ferma</h3>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Pietūs ({summary.farm_lunch})</h4>
                {summary.farm_workers.filter(w => w.wants_lunch).length === 0 ? (
                  <p className="text-gray-400 text-sm">Niekas nenori</p>
                ) : (
                  <div className="space-y-1">
                    {summary.farm_workers.filter(w => w.wants_lunch).map(pref => (
                      <div key={`${pref.id}-lunch`} className="p-2 bg-blue-50 rounded border border-blue-100">
                        <p className="font-medium text-gray-900">{pref.worker_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Vakarienė ({summary.farm_supper})</h4>
                {summary.farm_workers.filter(w => w.wants_supper).length === 0 ? (
                  <p className="text-gray-400 text-sm">Niekas nenori</p>
                ) : (
                  <div className="space-y-1">
                    {summary.farm_workers.filter(w => w.wants_supper).map(pref => (
                      <div key={`${pref.id}-supper`} className="p-2 bg-purple-50 rounded border border-purple-100">
                        <p className="font-medium text-gray-900">{pref.worker_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warehouse Workers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Technikos kiemas</h3>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Pietūs ({summary.warehouse_lunch})</h4>
                {summary.warehouse_workers.filter(w => w.wants_lunch).length === 0 ? (
                  <p className="text-gray-400 text-sm">Niekas nenori</p>
                ) : (
                  <div className="space-y-1">
                    {summary.warehouse_workers.filter(w => w.wants_lunch).map(pref => (
                      <div key={`${pref.id}-lunch`} className="p-2 bg-blue-50 rounded border border-blue-100">
                        <p className="font-medium text-gray-900">{pref.worker_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-2">Vakarienė ({summary.warehouse_supper})</h4>
                {summary.warehouse_workers.filter(w => w.wants_supper).length === 0 ? (
                  <p className="text-gray-400 text-sm">Niekas nenori</p>
                ) : (
                  <div className="space-y-1">
                    {summary.warehouse_workers.filter(w => w.wants_supper).map(pref => (
                      <div key={`${pref.id}-supper`} className="p-2 bg-purple-50 rounded border border-purple-100">
                        <p className="font-medium text-gray-900">{pref.worker_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
