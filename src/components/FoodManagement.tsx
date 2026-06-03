import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UtensilsCrossed, Users, Download, Tractor, Warehouse, Building2, Check, AlertCircle, Edit2, Save, History, Calendar, Filter, X } from 'lucide-react';
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

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export function FoodManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<FoodPreference[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [adminCounts, setAdminCounts] = useState<AdminCount>({ lunch_count: 0, supper_count: 0 });
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [tempAdminCounts, setTempAdminCounts] = useState<AdminCount>({ lunch_count: 0, supper_count: 0 });
  
  // History view state
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<FoodPreference[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return formatDate(date);
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => formatDate(new Date()));
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

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
      .in('role', ['farm_worker', 'warehouse_worker', 'administracija'])
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

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    try {
      let query = supabase
        .from('worker_food_preferences')
        .select(`
          *,
          worker:users!worker_id(full_name, work_location)
        `)
        .gte('date', historyStartDate)
        .lte('date', historyEndDate)
        .order('date', { ascending: false });

      if (selectedWorkerFilter !== 'all') {
        query = query.eq('worker_id', selectedWorkerFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const historyWithNames = data?.map(pref => ({
        ...pref,
        worker_name: pref.worker?.full_name || 'Unknown',
        work_location: pref.work_location || pref.worker?.work_location || 'warehouse'
      })) || [];

      setHistoryData(historyWithNames);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistoryData();
    }
  }, [showHistory, historyStartDate, historyEndDate, selectedWorkerFilter]);

  const getDailySummary = (): DailySummary => {
    const farmLunch = preferences.filter(p => p.work_location === 'farm' && p.wants_lunch);
    const farmSupper = preferences.filter(p => p.work_location === 'farm' && p.wants_supper);
    const warehouseLunch = preferences.filter(p => p.work_location === 'warehouse' && p.wants_lunch);
    const warehouseSupper = preferences.filter(p => p.work_location === 'warehouse' && p.wants_supper);
    const administracijaLunch = preferences.filter(p => p.work_location === 'administration' && p.wants_lunch);
    const administracijaSupper = preferences.filter(p => p.work_location === 'administration' && p.wants_supper);
    
    // Combine administracija worker responses with manual admin counts
    const totalAdminLunch = administracijaLunch.length + adminCounts.lunch_count;
    const totalAdminSupper = administracijaSupper.length + adminCounts.supper_count;
    
    return {
      date: formatDate(new Date()),
      farm_lunch: farmLunch.length,
      farm_supper: farmSupper.length,
      warehouse_lunch: warehouseLunch.length,
      warehouse_supper: warehouseSupper.length,
      admin_lunch: totalAdminLunch,
      admin_supper: totalAdminSupper,
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

  const groupHistoryByDate = () => {
    const grouped: { [date: string]: FoodPreference[] } = {};
    
    historyData.forEach(pref => {
      if (!grouped[pref.date]) {
        grouped[pref.date] = [];
      }
      grouped[pref.date].push(pref);
    });

    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showHistory 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <History className="w-5 h-5" />
            {showHistory ? 'Slėpti istoriją' : 'Rodyti istoriją'}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Eksportuoti
          </button>
        </div>
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Istorija</h2>
                <p className="text-sm text-gray-600">Filtruokite pagal datas ir darbuotojus</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Nuo datos
              </label>
              <input
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Iki datos
              </label>
              <input
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Darbuotojas
              </label>
              <select
                value={selectedWorkerFilter}
                onChange={(e) => setSelectedWorkerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Visi darbuotojai</option>
                {allWorkers.map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* History Data */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nėra duomenų pagal pasirinktus filtrus</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {groupHistoryByDate().map(([date, prefs]) => {
                const lunchCount = prefs.filter(p => p.wants_lunch).length;
                const supperCount = prefs.filter(p => p.wants_supper).length;
                
                return (
                  <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {new Date(date + 'T00:00:00').toLocaleDateString('lt-LT', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          <p className="text-sm text-gray-600">{prefs.length} atsakymų</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Pietūs</p>
                            <p className="text-2xl font-bold text-blue-600">{lunchCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Vakarienė</p>
                            <p className="text-2xl font-bold text-purple-600">{supperCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Farm */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Tractor className="w-4 h-4 text-green-600" />
                            <h4 className="font-semibold text-gray-900">Ferma</h4>
                          </div>
                          <div className="space-y-2">
                            {prefs.filter(p => p.work_location === 'farm').map(pref => (
                              <div key={pref.id} className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                                <p className="font-medium">{pref.worker_name}</p>
                                <div className="flex gap-2 mt-1">
                                  {pref.wants_lunch && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                      Pietūs
                                    </span>
                                  )}
                                  {pref.wants_supper && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                      Vakarienė
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {prefs.filter(p => p.work_location === 'farm').length === 0 && (
                              <p className="text-xs text-gray-400">Nėra duomenų</p>
                            )}
                          </div>
                        </div>

                        {/* Warehouse */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Warehouse className="w-4 h-4 text-slate-600" />
                            <h4 className="font-semibold text-gray-900">Technikos kiemas</h4>
                          </div>
                          <div className="space-y-2">
                            {prefs.filter(p => p.work_location === 'warehouse').map(pref => (
                              <div key={pref.id} className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                                <p className="font-medium">{pref.worker_name}</p>
                                <div className="flex gap-2 mt-1">
                                  {pref.wants_lunch && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                      Pietūs
                                    </span>
                                  )}
                                  {pref.wants_supper && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                      Vakarienė
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {prefs.filter(p => p.work_location === 'warehouse').length === 0 && (
                              <p className="text-xs text-gray-400">Nėra duomenų</p>
                            )}
                          </div>
                        </div>

                        {/* Administration */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <h4 className="font-semibold text-gray-900">Administracija</h4>
                          </div>
                          <div className="space-y-2">
                            {prefs.filter(p => p.work_location === 'administration').map(pref => (
                              <div key={pref.id} className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                                <p className="font-medium">{pref.worker_name}</p>
                                <div className="flex gap-2 mt-1">
                                  {pref.wants_lunch && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                      Pietūs
                                    </span>
                                  )}
                                  {pref.wants_supper && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                      Vakarienė
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {prefs.filter(p => p.work_location === 'administration').length === 0 && (
                              <p className="text-xs text-gray-400">Nėra duomenų</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                      ({worker.work_location === 'farm' ? 'Ferma' : worker.work_location === 'administration' ? 'Administracija' : 'Technikos kiemas'})
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
