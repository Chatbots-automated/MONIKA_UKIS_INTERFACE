import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { UtensilsCrossed, Check, X, Clock, ChevronRight, ChevronLeft } from 'lucide-react';

interface WorkerFoodPreferencesProps {
  workLocation: 'farm' | 'warehouse';
}

interface FoodPreference {
  id?: string;
  date: string;
  wants_food: boolean;
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
          wants_food: pref.wants_food,
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

  const toggleFoodPreference = async (date: string, wantsFood: boolean) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('worker_food_preferences')
        .upsert({
          worker_id: user.id,
          date: date,
          wants_food: wantsFood,
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
          wants_food: data.wants_food,
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

  const setWeekPreferences = async (wantsFood: boolean) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const weekDates = getWeekDates();
      const updates = weekDates.map(date => ({
        worker_id: user.id,
        date: formatDate(date),
        wants_food: wantsFood,
        work_location: workLocation,
        marked_at: new Date().toISOString(),
        marked_by: user.id,
        updated_at: new Date().toISOString()
      }));

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
            <h2 className="text-2xl font-bold text-gray-900">Pietūs</h2>
            <p className="text-sm text-gray-600">Pažymėkite, ar norite pietų</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Šiandien - {new Date().toLocaleDateString('lt-LT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
              {todayPreference?.marked_at && (
                <p className="text-sm text-gray-500 mt-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Pažymėta: {new Date(todayPreference.marked_at).toLocaleString('lt-LT')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => toggleFoodPreference(today, true)}
              disabled={saving}
              className={`p-6 rounded-xl border-2 transition-all ${
                todayPreference?.wants_food
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  todayPreference?.wants_food ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <Check className={`w-8 h-8 ${todayPreference?.wants_food ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <span className="text-lg font-semibold">Noriu pietų</span>
              </div>
            </button>

            <button
              onClick={() => toggleFoodPreference(today, false)}
              disabled={saving}
              className={`p-6 rounded-xl border-2 transition-all ${
                todayPreference && !todayPreference.wants_food
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  todayPreference && !todayPreference.wants_food ? 'bg-red-500' : 'bg-gray-200'
                }`}>
                  <X className={`w-8 h-8 ${todayPreference && !todayPreference.wants_food ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <span className="text-lg font-semibold">Nenoriu pietų</span>
              </div>
            </button>
          </div>

          {!todayPreference && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Svarbu:</strong> Jei nepažymėsite iki 10:00, pietūs nebus paruošti.
              </p>
            </div>
          )}
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
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setWeekPreferences(true)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 inline mr-2" />
                Noriu pietų visą savaitę
              </button>
              <button
                onClick={() => setWeekPreferences(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-2" />
                Nenoriu pietų visą savaitę
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleFoodPreference(dateStr, true)}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          pref?.wants_food
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Check className="w-4 h-4 inline mr-1" />
                        Taip
                      </button>
                      <button
                        onClick={() => toggleFoodPreference(dateStr, false)}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          pref && !pref.wants_food
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        Ne
                      </button>
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
