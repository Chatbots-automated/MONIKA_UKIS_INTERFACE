import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, User, ChevronDown } from 'lucide-react';

interface Worker {
  id: string;
  full_name: string;
  work_location?: string;
}

interface DayEntry {
  date: string;
  start_time: string;
  end_time: string;
}

interface SavedEntry {
  id: string;
  worker_id: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  hours_worked: number;
  notes: string;
  worker?: { full_name: string };
}

interface ManualEntryViewProps {
  workLocation: 'farm' | 'warehouse';
}

const DAY_NAMES = ['Sk', 'Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št'];

function normalizeTimeToHHMM(value: string): string {
  const v = value.trim();
  if (!v) return '';
  let h = 0, m = 0;
  const match = v.match(/^(\d{1,2}):(\d{1,2})$/);
  if (match) {
    h = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
  } else {
    const digits = v.replace(/\D/g, '');
    if (digits.length < 3) return v;
    h = parseInt(digits.slice(0, 2) || '0', 10);
    m = parseInt(digits.slice(2, 4) || '0', 10);
  }
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

function getDaysInMonth(year: number, month: number): DayEntry[] {
  const days: DayEntry[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, start_time: '', end_time: '' });
  }
  return days;
}

export function ManualEntryView({ workLocation }: ManualEntryViewProps) {
  const { logAction } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeTab, setActiveTab] = useState<'ivesti' | 'perziura'>('ivesti');

  // Įvesti tab state
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Peržiūra tab state
  const [viewWorker, setViewWorker] = useState<string>('');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);

  useEffect(() => {
    loadWorkers();
  }, [workLocation]);

  useEffect(() => {
    if (selectedWorker && selectedMonth) {
      const days = getDaysInMonth(selectedMonth.getFullYear(), selectedMonth.getMonth());
      setDayEntries(days);
      loadExistingEntriesForMonth();
    } else {
      setDayEntries([]);
    }
  }, [selectedWorker, selectedMonth]);

  const loadExistingEntriesForMonth = async () => {
    if (!selectedWorker) return;
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    let manualQuery = supabase
      .from('manual_time_entries')
      .select('entry_date, start_time, end_time')
      .eq('worker_id', selectedWorker)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0]);

    const { data: manualData } = await manualQuery;

    if (manualData && manualData.length > 0) {
      setDayEntries(prev =>
        prev.map(d => {
          const existing = manualData.find((m: any) => m.entry_date === d.date);
          return existing ? { ...d, start_time: existing.start_time?.slice(0, 5) || '', end_time: existing.end_time?.slice(0, 5) || '' } : d;
        })
      );
      return;
    }

    const scheduleQuery = supabase
      .from('worker_schedules')
      .select('date, shift_start, shift_end')
      .eq('worker_id', selectedWorker)
      .eq('schedule_type', 'work')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (workLocation) {
      scheduleQuery.eq('work_location', workLocation);
    }

    const { data: scheduleData } = await scheduleQuery;

    if (scheduleData && scheduleData.length > 0) {
      setDayEntries(prev =>
        prev.map(d => {
          const existing = scheduleData.find((s: any) => s.date === d.date);
          return existing ? { ...d, start_time: existing.shift_start?.slice(0, 5) || '', end_time: existing.shift_end?.slice(0, 5) || '' } : d;
        })
      );
    }
  };

  useEffect(() => {
    if (activeTab === 'perziura' && viewWorker && viewMonth) {
      loadSavedEntries();
    }
  }, [activeTab, viewWorker, viewMonth]);

  const loadWorkers = async () => {
    const query = supabase
      .from('users')
      .select('id, full_name, work_location')
      .order('full_name');
    if (workLocation) {
      query.or(`work_location.eq.${workLocation},work_location.eq.both`);
    }
    const { data } = await query;
    if (data) {
      setWorkers(data);
      if (!selectedWorker && data.length > 0) setSelectedWorker(data[0].id);
      if (!viewWorker && data.length > 0) setViewWorker(data[0].id);
    }
  };

  const loadSavedEntries = async () => {
    if (!viewWorker) return;
    const startDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const endDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);

    let manualQuery = supabase
      .from('manual_time_entries')
      .select(`*, worker:users!worker_id(full_name)`)
      .eq('worker_id', viewWorker)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: true });

    const { data: manualData, error: manualError } = await manualQuery;

    if (!manualError && manualData && manualData.length > 0) {
      setSavedEntries(manualData);
      return;
    }

    const scheduleQuery = supabase
      .from('worker_schedules')
      .select(`id, worker_id, date, shift_start, shift_end, notes, users!worker_id(full_name)`)
      .eq('worker_id', viewWorker)
      .eq('schedule_type', 'work')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (workLocation) {
      scheduleQuery.eq('work_location', workLocation);
    }

    const { data: scheduleData, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      setSavedEntries([]);
      return;
    }

    const transformed = (scheduleData || []).map((s: any) => {
      const hours = calculateHours(s.shift_start, s.shift_end);
      let workerName = 'Unknown';
      if (s.users) {
        workerName = typeof s.users === 'object' && s.users?.full_name ? s.users.full_name : s.users?.[0]?.full_name || 'Unknown';
      }
      return {
        id: s.id,
        worker_id: s.worker_id,
        entry_date: s.date,
        start_time: s.shift_start,
        end_time: s.shift_end,
        hours_worked: Math.abs(hours),
        notes: s.notes || '',
        worker: { full_name: workerName },
      };
    });
    setSavedEntries(transformed);
  };

  const updateDayEntry = (date: string, field: 'start_time' | 'end_time', value: string) => {
    setDayEntries(prev =>
      prev.map(d => (d.date === date ? { ...d, [field]: value } : d))
    );
  };

  const handleTimeBlur = (date: string, field: 'start_time' | 'end_time') => {
    setDayEntries(prev =>
      prev.map(d => {
        if (d.date !== date) return d;
        const val = field === 'start_time' ? d.start_time : d.end_time;
        const normalized = normalizeTimeToHHMM(val);
        return normalized ? { ...d, [field]: normalized } : d;
      })
    );
  };

  const saveEntries = async () => {
    if (!selectedWorker) {
      alert('Pasirinkite darbuotoją');
      return;
    }

    const validEntries = dayEntries.filter(d => d.start_time && d.end_time);
    if (validEntries.length === 0) {
      alert('Įveskite bent vieną dieną su pradžios ir pabaigos laiku');
      return;
    }

    setSaving(true);
    try {
      const datesToSave = validEntries.map(e => e.date);

      await supabase.from('worker_schedules').delete().eq('worker_id', selectedWorker).in('date', datesToSave);
      await supabase.from('manual_time_entries').delete().eq('worker_id', selectedWorker).in('entry_date', datesToSave);

      const schedulesToInsert = validEntries.map(entry => ({
        worker_id: selectedWorker,
        date: entry.date,
        shift_start: entry.start_time,
        shift_end: entry.end_time,
        schedule_type: 'work',
        notes: `${calculateHours(entry.start_time, entry.end_time).toFixed(2)}h`,
        work_location: workLocation,
      }));

      const { error: scheduleError } = await supabase
        .from('worker_schedules')
        .insert(schedulesToInsert);

      if (scheduleError) throw scheduleError;

      const timeEntriesToInsert = validEntries.map(entry => ({
        worker_id: selectedWorker,
        entry_date: entry.date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        notes: 'Įvesta iš lapų',
      }));

      await supabase.from('manual_time_entries').insert(timeEntriesToInsert);

      await logAction('create_manual_schedules', 'worker_schedules', null, null, {
        count: schedulesToInsert.length,
        worker_id: selectedWorker,
        month: selectedMonth.toISOString(),
      });

      alert('Grafikai sėkmingai išsaugoti!');
      setDayEntries(prev => prev.map(d => ({ ...d, start_time: '', end_time: '' })));
      if (activeTab === 'perziura' && viewWorker === selectedWorker) {
        loadSavedEntries();
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const totalHours = dayEntries.reduce(
    (sum, d) => sum + calculateHours(d.start_time, d.end_time),
    0
  );
  const filledDays = dayEntries.filter(d => d.start_time && d.end_time).length;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ivesti')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'ivesti'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Įvesti iš lapų
        </button>
        <button
          onClick={() => setActiveTab('perziura')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'perziura'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Peržiūra
        </button>
      </div>

      {activeTab === 'ivesti' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Surašyti iš lapų</h3>
          <p className="text-sm text-gray-600 mb-6">
            Pasirinkite darbuotoją ir mėnesį. Dienos bus automatiškai užpildytos – įveskite tik pradžios ir pabaigos laiką klaviatūra (pvz. 08:10–18:53).
          </p>

          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas</label>
              <select
                value={selectedWorker}
                onChange={e => setSelectedWorker(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pasirinkite darbuotoją</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mėnuo</label>
              <input
                type="month"
                value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={e => {
                  const [y, m] = e.target.value.split('-');
                  setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {selectedWorker && dayEntries.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Data</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Pradžia</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Pabaiga</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Valandos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map(day => {
                      const date = new Date(day.date);
                      const dayName = DAY_NAMES[date.getDay()];
                      const hours = calculateHours(day.start_time, day.end_time);
                      return (
                        <tr key={day.date} className="border-b border-gray-100 hover:bg-blue-50/50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-gray-500 text-xs uppercase">{dayName}</span>{' '}
                            {date.toLocaleDateString('lt-LT', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={day.start_time}
                              onChange={e => updateDayEntry(day.date, 'start_time', e.target.value)}
                              onBlur={() => handleTimeBlur(day.date, 'start_time')}
                              placeholder="08:10"
                              className="w-28 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                              title="24h formatas, pvz. 08:10 arba 18:53"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={day.end_time}
                              onChange={e => updateDayEntry(day.date, 'end_time', e.target.value)}
                              onBlur={() => handleTimeBlur(day.date, 'end_time')}
                              placeholder="18:53"
                              className="w-28 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                              title="24h formatas, pvz. 08:10 arba 18:53"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <span className={`font-semibold ${hours > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                              {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Užpildyta dienų: <strong>{filledDays}</strong> · Viso valandų: <strong>{totalHours.toFixed(1)}h</strong>
                </div>
                <button
                  onClick={saveEntries}
                  disabled={filledDays === 0 || saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  {saving ? 'Išsaugoma...' : `Išsaugoti (${filledDays})`}
                </button>
              </div>
            </>
          )}

          {!selectedWorker && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Pasirinkite darbuotoją ir mėnesį</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Peržiūra</h3>
          <p className="text-sm text-gray-600 mb-6">
            Pasirinkite darbuotoją ir mėnesį, kad peržiūrėtumėte įvestas valandas.
          </p>

          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas</label>
              <select
                value={viewWorker}
                onChange={e => setViewWorker(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pasirinkite darbuotoją</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mėnuo</label>
              <input
                type="month"
                value={`${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={e => {
                  const [y, m] = e.target.value.split('-');
                  setViewMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {viewWorker ? (
            savedEntries.length > 0 ? (
              <>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Data</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Pradžia</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Pabaiga</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Valandos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedEntries.map(entry => {
                        const date = new Date(entry.entry_date);
                        const dayName = DAY_NAMES[date.getDay()];
                        return (
                          <tr key={entry.id} className="border-b border-gray-100">
                            <td className="px-4 py-3">
                              <span className="text-gray-500 text-xs uppercase">{dayName}</span>{' '}
                              {date.toLocaleDateString('lt-LT', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="px-4 py-3 font-mono">{entry.start_time}</td>
                            <td className="px-4 py-3 font-mono">{entry.end_time}</td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-green-700">{entry.hours_worked.toFixed(1)}h</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-lg font-bold text-blue-900">
                  Viso: {savedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0).toFixed(1)}h
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nėra įrašų šiam darbuotojui ir mėnesiui</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Pasirinkite darbuotoją ir mėnesį</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
