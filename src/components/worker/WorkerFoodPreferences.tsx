import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { UtensilsCrossed, Check, X, Clock, ChevronRight, ChevronLeft } from 'lucide-react';

interface WorkerFoodPreferencesProps {
  workLocation: 'farm' | 'warehouse' | 'administration';
}

interface FoodPreference {
  id?: string;
  date: string;
  wants_lunch: boolean;
  wants_supper: boolean;
  marked_at?: string;
  notes?: string;
}

export function WorkerFoodPreferences({ workLocation }: WorkerFoodPreferencesProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, FoodPreference>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');

  useEffect(() => {
    loadPreferences();
  }, [user, currentWeekStart]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getWeekDates(): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = formatDate(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = formatDate(endDate);

      const { data, error } = await supabase
        .from('worker_food_preferences')
        .select('*')
        .eq('worker_id', user.id)
        .gte('date', startDate)
        .lte('date', endDateStr);

      if (error) throw error;

      const prefsMap: Record<string, FoodPreference> = {};
      data?.forEach(pref => {
        prefsMap[pref.date] = {
          id: pref.id,
          date: pref.date,
          wants_lunch: pref.wants_lunch,
          wants_supper: pref.wants_supper,
          marked_at: pref.marked_at,
          notes: pref.notes
        };
      });

      setPreferences(prefsMap);
    } catch (error) {
      console.error('Error loading food preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFoodPreference = async (date: string, mealType: 'lunch' | 'supper', wants: boolean) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const currentPref = preferences[date] || { wants_lunch: false, wants_supper: false };
      
      const { data, error} = await supabase
        .from('worker_food_preferences')
        .upsert({
          worker_id: user.id,
          date: date,
          wants_lunch: mealType === 'lunch' ? wants : currentPref.wants_lunch,
          wants_supper: mealType === 'supper' ? wants : currentPref.wants_supper,
          work_location: workLocation,
          marked_at: new Date().toISOString(),
          marked_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'worker_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        [date]: {
          id: data.id,
          date: data.date,
          wants_lunch: data.wants_lunch,
          wants_supper: data.wants_supper,
          marked_at: data.marked_at,
          notes: data.notes
        }
      }));
    } catch (error) {
      console.error('Error saving food preference:', error);
      alert('Klaida išsaugant pasirinkimą');
    } finally {
      setSaving(false);
    }
  };

  const setWeekPreferences = async (mealType: 'lunch' | 'supper' | 'both', wants: boolean) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const weekDates = getWeekDates();
      const updates = weekDates.map(date => {
        const dateStr = formatDate(date);
        const currentPref = preferences[dateStr] || { wants_lunch: false, wants_supper: false };
        
        return {
          worker_id: user.id,
          date: dateStr,
          wants_lunch: mealType === 'lunch' || mealType === 'both' ? wants : currentPref.wants_lunch,
          wants_supper: mealType === 'supper' || mealType === 'both' ? wants : currentPref.wants_supper,
          work_location: workLocation,
          marked_at: new Date().toISOString(),
          marked_by: user.id,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('worker_food_preferences')
        .upsert(updates, {
          onConflict: 'worker_id,date'
        });

      if (error) throw error;

      await loadPreferences();
    } catch (error) {
      console.error('Error setting week preferences:', error);
      alert('Klaida išsaugant savaitės pasirinkimus');
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const today = formatDate(new Date());
  const todayPreference = preferences[today];

  const weekDates = getWeekDates();
  const dayNames = ['Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis', 'Sekmadienis'];

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
            <h2 className="text-2xl font-bold text-gray-900">Pietūs ir vakarienė</h2>
            <p className="text-sm text-gray-600">Pažymėkite, ko norite šiandien</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'today'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Šiandien
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Savaitė
          </button>
        </div>
      </div>

      {/* Today View */}
      {viewMode === 'today' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Šiandien - {new Date().toLocaleDateString('lt-LT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</h3>
              </div>
            </div>

            {/* Lunch */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-700 mb-3">Pietūs</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleFoodPreference(today, 'lunch', true)}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    todayPreference?.wants_lunch
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      todayPreference?.wants_lunch ? 'bg-blue-500' : 'bg-gray-200'
                    }`}>
                      <Check className={`w-6 h-6 ${todayPreference?.wants_lunch ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className="font-semibold">Taip</span>
                  </div>
                </button>

                <button
                  onClick={() => toggleFoodPreference(today, 'lunch', false)}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    todayPreference && !todayPreference.wants_lunch
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      todayPreference && !todayPreference.wants_lunch ? 'bg-gray-400' : 'bg-gray-200'
                    }`}>
                      <X className={`w-6 h-6 ${todayPreference && !todayPreference.wants_lunch ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className="font-semibold">Ne</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Supper */}
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">Vakarienė</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleFoodPreference(today, 'supper', true)}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    todayPreference?.wants_supper
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      todayPreference?.wants_supper ? 'bg-purple-500' : 'bg-gray-200'
                    }`}>
                      <Check className={`w-6 h-6 ${todayPreference?.wants_supper ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className="font-semibold">Taip</span>
                  </div>
                </button>

                <button
                  onClick={() => toggleFoodPreference(today, 'supper', false)}
                  disabled={saving}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    todayPreference && !todayPreference.wants_supper
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      todayPreference && !todayPreference.wants_supper ? 'bg-gray-400' : 'bg-gray-200'
                    }`}>
                      <X className={`w-6 h-6 ${todayPreference && !todayPreference.wants_supper ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className="font-semibold">Ne</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">
                  {currentWeekStart.toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' })} - {
                    weekDates[6].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric', year: 'numeric' })
                  }
                </h3>
                <button
                  onClick={goToCurrentWeek}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                >
                  Grįžti į šią savaitę
                </button>
              </div>

              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bulk Actions */}
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Nustatyti visai savaitei:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWeekPreferences('lunch', true)}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Pietūs: Taip
                </button>
                <button
                  onClick={() => setWeekPreferences('lunch', false)}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Pietūs: Ne
                </button>
                <button
                  onClick={() => setWeekPreferences('supper', true)}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Vakarienė: Taip
                </button>
                <button
                  onClick={() => setWeekPreferences('supper', false)}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Vakarienė: Ne
                </button>
              </div>
              <button
                onClick={() => setWeekPreferences('both', true)}
                disabled={saving}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 inline mr-2" />
                Abu: Taip visą savaitę
              </button>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid gap-3">
            {weekDates.map((date, index) => {
              const dateStr = formatDate(date);
              const pref = preferences[dateStr];
              const isToday = dateStr === today;
              const isPast = date < new Date(today);

              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 ${
                    isToday ? 'border-orange-400 bg-orange-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {dayNames[index]}
                        </h4>
                        {isToday && (
                          <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-medium rounded">
                            Šiandien
                          </span>
                        )}
                        {isPast && (
                          <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-medium rounded">
                            Praėjęs
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {date.toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' })}
                      </p>
                      {pref?.marked_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Pažymėta: {new Date(pref.marked_at).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-medium text-gray-600 w-16">Pietūs:</span>
                        <button
                          onClick={() => toggleFoodPreference(dateStr, 'lunch', true)}
                          disabled={saving}
                          className={`flex-1 px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                            pref?.wants_lunch
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Taip
                        </button>
                        <button
                          onClick={() => toggleFoodPreference(dateStr, 'lunch', false)}
                          disabled={saving}
                          className={`flex-1 px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                            pref && !pref.wants_lunch
                              ? 'bg-gray-400 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Ne
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-medium text-gray-600 w-16">Vakarienė:</span>
                        <button
                          onClick={() => toggleFoodPreference(dateStr, 'supper', true)}
                          disabled={saving}
                          className={`flex-1 px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                            pref?.wants_supper
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Taip
                        </button>
                        <button
                          onClick={() => toggleFoodPreference(dateStr, 'supper', false)}
                          disabled={saving}
                          className={`flex-1 px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                            pref && !pref.wants_supper
                              ? 'bg-gray-400 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Ne
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
