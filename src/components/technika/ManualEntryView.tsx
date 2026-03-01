import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, User, Copy, Trash2, AlertTriangle, BarChart3, Edit2, Save, X } from 'lucide-react';

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
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkEndTime, setBulkEndTime] = useState('');
  const [showBulkFill, setShowBulkFill] = useState(false);

  // Peržiūra tab state
  const [viewWorker, setViewWorker] = useState<string>('');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<SavedEntry | null>(null);

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

  const copyFromPreviousDay = (currentDate: string) => {
    const currentIndex = dayEntries.findIndex(d => d.date === currentDate);
    if (currentIndex <= 0) return;
    const prevDay = dayEntries[currentIndex - 1];
    if (!prevDay.start_time || !prevDay.end_time) {
      alert('Ankstesnė diena neturi laiko įrašų');
      return;
    }
    updateDayEntry(currentDate, 'start_time', prevDay.start_time);
    updateDayEntry(currentDate, 'end_time', prevDay.end_time);
  };

  const applyBulkFill = () => {
    if (!bulkStartTime || !bulkEndTime) {
      alert('Įveskite pradžios ir pabaigos laiką');
      return;
    }
    const normalizedStart = normalizeTimeToHHMM(bulkStartTime);
    const normalizedEnd = normalizeTimeToHHMM(bulkEndTime);
    if (!normalizedStart || !normalizedEnd) {
      alert('Neteisingas laiko formatas');
      return;
    }
    setDayEntries(prev =>
      prev.map(d => {
        const date = new Date(d.date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (skipWeekends && isWeekend) return d;
        return { ...d, start_time: normalizedStart, end_time: normalizedEnd };
      })
    );
    setShowBulkFill(false);
    setBulkStartTime('');
    setBulkEndTime('');
  };

  const clearAllTimes = () => {
    if (!confirm('Ar tikrai norite išvalyti visus laikus?')) return;
    setDayEntries(prev => prev.map(d => ({ ...d, start_time: '', end_time: '' })));
  };

  const isUnusualHours = (hours: number): boolean => {
    return hours > 0 && (hours < 4 || hours > 12);
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    try {
      const normalizedStart = normalizeTimeToHHMM(editingEntry.start_time);
      const normalizedEnd = normalizeTimeToHHMM(editingEntry.end_time);
      
      if (!normalizedStart || !normalizedEnd) {
        alert('Neteisingas laiko formatas');
        return;
      }

      await supabase
        .from('manual_time_entries')
        .update({
          start_time: normalizedStart,
          end_time: normalizedEnd,
        })
        .eq('id', editingEntry.id);

      await supabase
        .from('worker_schedules')
        .update({
          shift_start: normalizedStart,
          shift_end: normalizedEnd,
          notes: `${calculateHours(normalizedStart, normalizedEnd).toFixed(2)}h`,
        })
        .eq('worker_id', editingEntry.worker_id)
        .eq('date', editingEntry.entry_date);

      await logAction('update_manual_entry', 'manual_time_entries', editingEntry.id);
      
      setEditingEntryId(null);
      setEditingEntry(null);
      loadSavedEntries();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
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
  const avgHoursPerDay = filledDays > 0 ? totalHours / filledDays : 0;
  const unusualDaysCount = dayEntries.filter(d => {
    const h = calculateHours(d.start_time, d.end_time);
    return isUnusualHours(h);
  }).length;

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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipWeekends"
                checked={skipWeekends}
                onChange={e => setSkipWeekends(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="skipWeekends" className="text-sm text-gray-700 cursor-pointer">
                Praleisti savaitgalius
              </label>
            </div>
            <button
              onClick={() => setShowBulkFill(!showBulkFill)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Užpildyti visas dienas
            </button>
            <button
              onClick={clearAllTimes}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Išvalyti
            </button>
          </div>

          {showBulkFill && (
            <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-3">Užpildyti visas dienas tuo pačiu laiku</h4>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pradžia</label>
                  <input
                    type="text"
                    value={bulkStartTime}
                    onChange={e => setBulkStartTime(e.target.value)}
                    onBlur={() => setBulkStartTime(normalizeTimeToHHMM(bulkStartTime))}
                    placeholder="08:00"
                    className="w-28 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pabaiga</label>
                  <input
                    type="text"
                    value={bulkEndTime}
                    onChange={e => setBulkEndTime(e.target.value)}
                    onBlur={() => setBulkEndTime(normalizeTimeToHHMM(bulkEndTime))}
                    placeholder="17:00"
                    className="w-28 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <button
                  onClick={applyBulkFill}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Pritaikyti
                </button>
                <button
                  onClick={() => {
                    setShowBulkFill(false);
                    setBulkStartTime('');
                    setBulkEndTime('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Atšaukti
                </button>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                {skipWeekends ? '✓ Savaitgaliai bus praleisti' : 'Užpildys visas dienas įskaitant savaitgalius'}
              </p>
            </div>
          )}

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
                      <th className="px-4 py-2 text-left font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((day, index) => {
                      const date = new Date(day.date);
                      const dayName = DAY_NAMES[date.getDay()];
                      const hours = calculateHours(day.start_time, day.end_time);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const unusual = isUnusualHours(hours);
                      return (
                        <tr key={day.date} className={`border-b border-gray-100 hover:bg-blue-50/50 ${isWeekend ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`text-xs uppercase ${isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>{dayName}</span>{' '}
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
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${hours > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                              </span>
                              {unusual && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" title="Neįprastas valandų skaičius (<4h arba >12h)" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {index > 0 && (
                              <button
                                onClick={() => copyFromPreviousDay(day.date)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="Kopijuoti iš ankstesnės dienos"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Monthly Statistics */}
              {filledDays > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <div className="text-xs text-blue-700 font-medium">Užpildyta dienų</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{filledDays}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <div className="text-xs text-green-700 font-medium">Viso valandų</div>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{totalHours.toFixed(1)}h</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <div className="text-xs text-purple-700 font-medium">Vidutiniškai/dieną</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{avgHoursPerDay.toFixed(1)}h</div>
                  </div>
                  {unusualDaysCount > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <div className="text-xs text-orange-700 font-medium">Neįprastos dienos</div>
                      </div>
                      <div className="text-2xl font-bold text-orange-900">{unusualDaysCount}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end">
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
                        <th className="px-4 py-2 text-left font-semibold text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedEntries.map(entry => {
                        const date = new Date(entry.entry_date);
                        const dayName = DAY_NAMES[date.getDay()];
                        const isEditing = editingEntryId === entry.id;
                        const unusual = isUnusualHours(entry.hours_worked);
                        
                        return (
                          <tr key={entry.id} className={`border-b border-gray-100 ${unusual ? 'bg-orange-50/50' : ''}`}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-gray-500 text-xs uppercase">{dayName}</span>{' '}
                              {date.toLocaleDateString('lt-LT', { day: 'numeric', month: 'short' })}
                            </td>
                            {isEditing && editingEntry ? (
                              <>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={editingEntry.start_time}
                                    onChange={e => setEditingEntry({ ...editingEntry, start_time: e.target.value })}
                                    onBlur={() => setEditingEntry({ ...editingEntry, start_time: normalizeTimeToHHMM(editingEntry.start_time) })}
                                    className="w-28 px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={editingEntry.end_time}
                                    onChange={e => setEditingEntry({ ...editingEntry, end_time: e.target.value })}
                                    onBlur={() => setEditingEntry({ ...editingEntry, end_time: normalizeTimeToHHMM(editingEntry.end_time) })}
                                    className="w-28 px-2 py-1.5 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-semibold text-blue-700">
                                    {calculateHours(editingEntry.start_time, editingEntry.end_time).toFixed(1)}h
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={saveEditedEntry}
                                      className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                      title="Išsaugoti"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingEntryId(null);
                                        setEditingEntry(null);
                                      }}
                                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      title="Atšaukti"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-mono">{entry.start_time}</td>
                                <td className="px-4 py-3 font-mono">{entry.end_time}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-green-700">{entry.hours_worked.toFixed(1)}h</span>
                                    {unusual && (
                                      <AlertTriangle className="w-4 h-4 text-orange-500" title="Neįprastas valandų skaičius (<4h arba >12h)" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => {
                                      setEditingEntryId(entry.id);
                                      setEditingEntry({ ...entry });
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="Redaguoti"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Monthly Statistics for Peržiūra */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <div className="text-xs text-blue-700 font-medium">Darbo dienų</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{savedEntries.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <div className="text-xs text-green-700 font-medium">Viso valandų</div>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {savedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0).toFixed(1)}h
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <div className="text-xs text-purple-700 font-medium">Vidutiniškai/dieną</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {(savedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0) / savedEntries.length).toFixed(1)}h
                    </div>
                  </div>
                  {savedEntries.filter(e => isUnusualHours(e.hours_worked)).length > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <div className="text-xs text-orange-700 font-medium">Neįprastos dienos</div>
                      </div>
                      <div className="text-2xl font-bold text-orange-900">
                        {savedEntries.filter(e => isUnusualHours(e.hours_worked)).length}
                      </div>
                    </div>
                  )}
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
