import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Trash2, X, Edit2, AlertCircle, Users, FileText, Plus, ChevronDown } from 'lucide-react';

interface Worker {
  id: string;
  full_name: string;
  work_location?: string;
}

interface Schedule {
  id: string;
  worker_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  schedule_type: string;
  notes: string;
  work_location?: string;
}

interface WorkerSchedulesProps {
  workLocation?: 'farm' | 'warehouse';
}

const SCHEDULE_TYPES = [
  { value: 'work', label: 'Darbas', color: 'bg-green-500', lightColor: 'bg-green-100', borderColor: 'border-green-600' },
  { value: 'off', label: 'Poilsis', color: 'bg-gray-400', lightColor: 'bg-gray-100', borderColor: 'border-gray-500' },
  { value: 'vacation', label: 'Atostogos', color: 'bg-blue-500', lightColor: 'bg-blue-100', borderColor: 'border-blue-600' },
  { value: 'sick', label: 'Liga', color: 'bg-red-500', lightColor: 'bg-red-100', borderColor: 'border-red-600' },
  { value: 'training', label: 'Mokymai', color: 'bg-purple-500', lightColor: 'bg-purple-100', borderColor: 'border-purple-600' },
];

export function WorkerSchedules({ workLocation }: WorkerSchedulesProps = {}) {
  const { logAction } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedScheduleType, setSelectedScheduleType] = useState('work');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: string; hour: number; dayIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: string; hour: number; dayIndex: number } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hoveredScheduleId, setHoveredScheduleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'multi' | 'view-entries'>('single');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [multiLayout, setMultiLayout] = useState<'rows' | 'overlay'>('rows');
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Manual entry from papers
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntries, setManualEntries] = useState<Array<{
    id: string;
    worker_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }>>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // View saved time entries
  const [savedTimeEntries, setSavedTimeEntries] = useState<Array<{
    id: string;
    worker_id: string;
    entry_date: string;
    start_time: string;
    end_time: string;
    hours_worked: number;
    notes: string;
    worker?: { full_name: string };
  }>>([]);
  const [viewEntriesMonth, setViewEntriesMonth] = useState(new Date());
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [workerDetailMonth, setWorkerDetailMonth] = useState<{ [workerId: string]: Date }>({});

  // Worker colors for overlay mode
  const workerColors = [
    { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-900', light: 'bg-blue-50' },
    { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-900', light: 'bg-green-50' },
    { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-900', light: 'bg-purple-50' },
    { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-900', light: 'bg-orange-50' },
    { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-900', light: 'bg-pink-50' },
    { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-900', light: 'bg-teal-50' },
    { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-indigo-900', light: 'bg-indigo-50' },
    { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-900', light: 'bg-rose-50' },
  ];

  // Load work hours from localStorage or use defaults
  const [workStartHour, setWorkStartHour] = useState(() => {
    const saved = localStorage.getItem('workerSchedules_startHour');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [workEndHour, setWorkEndHour] = useState(() => {
    const saved = localStorage.getItem('workerSchedules_endHour');
    return saved ? parseInt(saved, 10) : 18;
  });

  // Save work hours to localStorage when they change
  useEffect(() => {
    localStorage.setItem('workerSchedules_startHour', workStartHour.toString());
  }, [workStartHour]);

  useEffect(() => {
    localStorage.setItem('workerSchedules_endHour', workEndHour.toString());
  }, [workEndHour]);

  // Generate hours array based on work hours
  const HOURS = Array.from({ length: workEndHour - workStartHour }, (_, i) => workStartHour + i);

  useEffect(() => {
    loadData();
  }, [currentDate, workLocation]);

  useEffect(() => {
    if (viewMode === 'view-entries') {
      loadSavedTimeEntries();
    }
  }, [viewMode, viewEntriesMonth]);

  const loadData = async () => {
    // Load workers - filter by work_location if specified
    const workersQuery = supabase
      .from('users')
      .select('id, full_name, work_location')
      .order('full_name');
    
    if (workLocation) {
      workersQuery.or(`work_location.eq.${workLocation},work_location.eq.both`);
    }
    
    const workersRes = await workersQuery;

    // Load schedules - filter by work_location if specified
    const schedulesQuery = supabase
      .from('worker_schedules')
      .select('*')
      .order('date', { ascending: true });
    
    if (workLocation) {
      schedulesQuery.eq('work_location', workLocation);
    }
    
    const schedulesRes = await schedulesQuery;

    if (workersRes.data) {
      setWorkers(workersRes.data);
      if (!selectedWorker && workersRes.data.length > 0) {
        setSelectedWorker(workersRes.data[0].id);
      }
    }
    if (schedulesRes.data) setSchedules(schedulesRes.data);
  };

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const parseTime = (timeStr: string | null): { hour: number; minute: number } => {
    if (!timeStr) return { hour: 0, minute: 0 };
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0], 10) || 0,
      minute: parseInt(parts[1], 10) || 0
    };
  };

  const getSchedulesForCell = (date: Date, hour: number, workerId?: string) => {
    const dateKey = formatDateKey(date);
    return schedules.filter(s => {
      const targetWorkerId = workerId || selectedWorker;
      if (s.worker_id !== targetWorkerId || s.date !== dateKey) return false;
      const start = parseTime(s.shift_start);
      const end = parseTime(s.shift_end);

      const cellStart = hour;
      const cellEnd = hour + 1;
      const scheduleStart = start.hour + start.minute / 60;
      const scheduleEnd = end.hour + end.minute / 60;

      return scheduleStart < cellEnd && scheduleEnd > cellStart;
    });
  };

  const handleMouseDown = (date: Date, hour: number, dayIndex: number, e: React.MouseEvent) => {
    // Don't start drag if clicking on a schedule block
    if ((e.target as HTMLElement).closest('[data-schedule-block]')) {
      return;
    }
    
    if (!selectedWorker) {
      alert('Prašome pasirinkti darbuotoją');
      return;
    }
    setIsDragging(true);
    setHoveredScheduleId(null);
    setDeleteConfirmId(null);
    const dateKey = formatDateKey(date);
    setDragStart({ date: dateKey, hour, dayIndex });
    setDragEnd({ date: dateKey, hour, dayIndex });
  };

  const handleMouseEnter = (date: Date, hour: number, dayIndex: number) => {
    if (isDragging && dragStart) {
      const dateKey = formatDateKey(date);
      setDragEnd({ date: dateKey, hour, dayIndex });
    }
  };

  const handleMouseUp = async () => {
    if (isDragging && dragStart && dragEnd && selectedWorker) {
      const schedules = [];

      if (dragStart.dayIndex === dragEnd.dayIndex) {
        const startHour = Math.min(dragStart.hour, dragEnd.hour);
        const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;

        schedules.push({
          worker_id: selectedWorker,
          date: dragStart.date,
          shift_start: `${String(startHour).padStart(2, '0')}:00`,
          shift_end: `${String(endHour).padStart(2, '0')}:00`,
          schedule_type: selectedScheduleType,
          notes: '',
        });
      } else {
        const minDayIndex = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
        const maxDayIndex = Math.max(dragStart.dayIndex, dragEnd.dayIndex);
        const dates = getWeekDates();

        for (let i = minDayIndex; i <= maxDayIndex; i++) {
          const currentDate = formatDateKey(dates[i]);
          let startHour, endHour;

          if (i === minDayIndex) {
            startHour = dragStart.dayIndex === minDayIndex ? dragStart.hour : dragEnd.hour;
            endHour = workEndHour;
          } else if (i === maxDayIndex) {
            startHour = workStartHour;
            endHour = (dragStart.dayIndex === maxDayIndex ? dragStart.hour : dragEnd.hour) + 1;
          } else {
            startHour = workStartHour;
            endHour = workEndHour;
          }

          if (startHour < endHour) {
            schedules.push({
              worker_id: selectedWorker,
              date: currentDate,
              shift_start: `${String(startHour).padStart(2, '0')}:00`,
              shift_end: `${String(endHour).padStart(2, '0')}:00`,
              schedule_type: selectedScheduleType,
              notes: '',
              work_location: workLocation || 'warehouse',
            });
          }
        }
      }

      try {
        const { error } = await supabase.from('worker_schedules').insert(schedules);
        if (error) throw error;

        await logAction('add_worker_schedule', 'worker_schedules', undefined, undefined, {
          worker_id: selectedWorker,
          dates: schedules.map(s => s.date).join(', '),
          count: schedules.length
        });
        loadData();
      } catch (error: any) {
        console.error('Error:', error);
        alert(`Klaida: ${error.message}`);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isCellInDragRange = (hour: number, dayIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    const minDayIndex = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
    const maxDayIndex = Math.max(dragStart.dayIndex, dragEnd.dayIndex);

    if (dayIndex < minDayIndex || dayIndex > maxDayIndex) return false;

    if (minDayIndex === maxDayIndex) {
      const minHour = Math.min(dragStart.hour, dragEnd.hour);
      const maxHour = Math.max(dragStart.hour, dragEnd.hour);
      return hour >= minHour && hour <= maxHour;
    }

    if (dayIndex === minDayIndex) {
      const startHour = dragStart.dayIndex === minDayIndex ? dragStart.hour : dragEnd.hour;
      return hour >= startHour;
    }

    if (dayIndex === maxDayIndex) {
      const endHour = dragStart.dayIndex === maxDayIndex ? dragStart.hour : dragEnd.hour;
      return hour <= endHour;
    }

    return true;
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase.from('worker_schedules').delete().eq('id', scheduleId);
      if (error) throw error;

      await logAction('delete_worker_schedule', 'worker_schedules', scheduleId);
      setDeleteConfirmId(null);
      setShowEditModal(false);
      setEditingSchedule(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      const { error } = await supabase
        .from('worker_schedules')
        .update({
          shift_start: editingSchedule.shift_start,
          shift_end: editingSchedule.shift_end,
          schedule_type: editingSchedule.schedule_type,
          notes: editingSchedule.notes,
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;
      await logAction('update_worker_schedule', 'worker_schedules', editingSchedule.id, undefined, {
        shift_start: editingSchedule.shift_start,
        shift_end: editingSchedule.shift_end,
        schedule_type: editingSchedule.schedule_type,
        notes: editingSchedule.notes,
      });
      setShowEditModal(false);
      setEditingSchedule(null);
      setDeleteConfirmId(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  // Manual entry functions
  const calculateHoursFromTimes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  };

  const addManualEntry = () => {
    setManualEntries([
      ...manualEntries,
      {
        id: `temp-${Date.now()}`,
        worker_id: selectedWorker || workers[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
      },
    ]);
  };

  const updateManualEntry = (id: string, field: string, value: any) => {
    setManualEntries(manualEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeManualEntry = (id: string) => {
    setManualEntries(manualEntries.filter(entry => entry.id !== id));
  };

  const calculateTotalHours = (entries: typeof manualEntries, workerId?: string) => {
    const filtered = workerId ? entries.filter(e => e.worker_id === workerId) : entries;
    return filtered.reduce((sum, e) => sum + calculateHoursFromTimes(e.start_time, e.end_time), 0);
  };

  const calculateWeekHours = (entries: typeof manualEntries, workerId?: string) => {
    const filtered = workerId ? entries.filter(e => e.worker_id === workerId) : entries;
    
    // Group by week
    const weekGroups: { [key: string]: typeof manualEntries } = {};
    filtered.forEach(entry => {
      const date = new Date(entry.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekGroups[weekKey]) weekGroups[weekKey] = [];
      weekGroups[weekKey].push(entry);
    });
    
    return Object.entries(weekGroups).map(([weekStart, weekEntries]) => ({
      weekStart,
      hours: weekEntries.reduce((sum, e) => sum + calculateHoursFromTimes(e.start_time, e.end_time), 0),
    }));
  };

  const calculateTotalDays = (entries: typeof manualEntries, workerId?: string) => {
    const filtered = workerId ? entries.filter(e => e.worker_id === workerId) : entries;
    return filtered.length;
  };

  const loadSavedTimeEntries = async () => {
    try {
      console.log('Loading entries for month:', viewEntriesMonth.toISOString().split('T')[0]);

      const startDate = new Date(viewEntriesMonth.getFullYear(), viewEntriesMonth.getMonth(), 1);
      const endDate = new Date(viewEntriesMonth.getFullYear(), viewEntriesMonth.getMonth() + 1, 0);

      // Try to load from manual_time_entries first
      let manualQuery = supabase
        .from('manual_time_entries')
        .select(`
          *,
          worker:users!worker_id(full_name)
        `)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0]);

      const { data: manualData, error: manualError } = await manualQuery.order('entry_date', { ascending: false });

      if (!manualError && manualData && manualData.length > 0) {
        console.log('Loaded from manual_time_entries:', manualData);
        setSavedTimeEntries(manualData);
        return;
      }

      // Fallback: Load from worker_schedules if manual_time_entries doesn't exist or is empty
      let scheduleQuery = supabase
        .from('worker_schedules')
        .select(`
          id,
          worker_id,
          date,
          shift_start,
          shift_end,
          notes,
          users!worker_id(full_name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('schedule_type', 'work');

      // Filter by location if specified
      if (workLocation) {
        scheduleQuery = scheduleQuery.eq('work_location', workLocation);
      }

      const { data: scheduleData, error: scheduleError } = await scheduleQuery.order('date', { ascending: false });

      if (scheduleError) throw scheduleError;

      console.log('Raw schedule data:', scheduleData);

      // Transform worker_schedules data to match manual_time_entries format
      const transformedData = (scheduleData || []).map(schedule => {
        const hours = calculateHoursFromTimes(schedule.shift_start, schedule.shift_end);
        
        // Handle the worker data - it might be nested differently
        let workerName = 'Unknown';
        if (schedule.users) {
          if (typeof schedule.users === 'object' && schedule.users.full_name) {
            workerName = schedule.users.full_name;
          } else if (Array.isArray(schedule.users) && schedule.users[0]?.full_name) {
            workerName = schedule.users[0].full_name;
          }
        }
        
        return {
          id: schedule.id,
          worker_id: schedule.worker_id,
          entry_date: schedule.date,
          start_time: schedule.shift_start,
          end_time: schedule.shift_end,
          hours_worked: Math.abs(hours), // Ensure positive hours
          notes: schedule.notes || '',
          worker: { full_name: workerName },
        };
      });

      console.log('Transformed entries:', transformedData);
      setSavedTimeEntries(transformedData);
    } catch (error: any) {
      console.error('Error loading time entries:', error);
      setSavedTimeEntries([]);
    }
  };

  const saveManualEntries = async () => {
    if (manualEntries.length === 0) {
      alert('Pridėkite bent vieną įrašą');
      return;
    }

    // Validate all entries have times
    const invalidEntries = manualEntries.filter(e => !e.start_time || !e.end_time);
    if (invalidEntries.length > 0) {
      alert('Prašome užpildyti visus pradžios ir pabaigos laikus');
      return;
    }

    try {
      // Insert into worker_schedules for calendar display
      const schedulesToInsert = manualEntries.map(entry => ({
        worker_id: entry.worker_id,
        date: entry.date,
        shift_start: entry.start_time,
        shift_end: entry.end_time,
        schedule_type: 'work',
        notes: `${calculateHoursFromTimes(entry.start_time, entry.end_time).toFixed(2)}h`,
        work_location: workLocation || null,
      }));

      const { error: scheduleError } = await supabase
        .from('worker_schedules')
        .insert(schedulesToInsert);

      if (scheduleError) throw scheduleError;

      // Also insert into manual_time_entries for future worker access
      const timeEntriesToInsert = manualEntries.map(entry => ({
        worker_id: entry.worker_id,
        entry_date: entry.date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        notes: `Įvesta iš lapų`,
      }));

      const { error: timeError } = await supabase
        .from('manual_time_entries')
        .insert(timeEntriesToInsert);

      if (timeError) {
        console.error('⚠️ Warning: Could not save to manual_time_entries:', timeError);
        console.error('⚠️ Make sure you run the migration: 20260218_create_manual_time_entries.sql');
        // Don't fail the whole operation if this table doesn't exist yet
      } else {
        console.log('✅ Successfully saved to manual_time_entries');
      }

      await logAction('create_manual_schedules', 'worker_schedules', null, null, {
        count: schedulesToInsert.length,
        month: selectedMonth.toISOString(),
      });

      alert('Grafikai sėkmingai išsaugoti!');
      setShowManualEntryModal(false);
      setManualEntries([]);
      loadData();
      
      // Reload time entries if we're in view mode
      if (viewMode === 'view-entries') {
        loadSavedTimeEntries();
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const dates = getWeekDates();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-slate-600" />
            <h3 className="text-xl font-bold text-gray-800">Darbuotojų grafikai</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManualEntryModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <FileText className="w-4 h-4" />
              Surašyti iš lapų
            </button>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  viewMode === 'single'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Vienas</span>
              </button>
              <button
                onClick={() => setViewMode('multi')}
                className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  viewMode === 'multi'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Visi</span>
              </button>
              <button
                onClick={() => setViewMode('view-entries')}
                className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  viewMode === 'view-entries'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Peržiūra</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'view-entries' ? (
          // View Saved Time Entries - Grouped by Worker
          <div>
            {/* Month Filter */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Mėnuo:</label>
                <input
                  type="month"
                  value={`${viewEntriesMonth.getFullYear()}-${String(viewEntriesMonth.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setViewEntriesMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-base"
                />
              </div>
              <div className="text-sm text-gray-600">
                Viso valandų: <span className="font-bold text-blue-900 text-lg">
                  {savedTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0).toFixed(1)}h
                </span>
              </div>
            </div>

            {/* Workers List */}
            {savedTimeEntries.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nėra įrašų šiam mėnesiui</p>
                <p className="text-sm text-gray-500 mt-2">Naudokite "Surašyti iš lapų" norėdami pridėti įrašus</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Group entries by worker */}
                {Array.from(new Set(savedTimeEntries.map(e => e.worker_id))).map(workerId => {
                  const allWorkerEntries = savedTimeEntries.filter(e => e.worker_id === workerId);
                  const workerName = allWorkerEntries[0]?.worker?.full_name || 'Unknown';
                  const isExpanded = expandedWorker === workerId;
                  
                  // Get the filter month for this worker (default to main month)
                  const filterMonth = workerDetailMonth[workerId] || viewEntriesMonth;
                  
                  // Filter entries by the selected month for this worker
                  const workerEntries = allWorkerEntries.filter(e => {
                    const entryDate = new Date(e.entry_date);
                    return entryDate.getMonth() === filterMonth.getMonth() && 
                           entryDate.getFullYear() === filterMonth.getFullYear();
                  });
                  
                  const totalHours = workerEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
                  const totalDays = workerEntries.length;

                  return (
                    <div key={workerId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {/* Worker Header - Clickable */}
                      <button
                        onClick={() => setExpandedWorker(isExpanded ? null : workerId)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-gray-900 text-lg">{workerName}</h4>
                            <p className="text-sm text-gray-600">
                              {totalDays} {totalDays === 1 ? 'diena' : totalDays < 10 ? 'dienos' : 'dienų'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-900">{totalHours.toFixed(1)}h</div>
                            <div className="text-xs text-gray-500">viso valandų</div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {/* Month Filter for this worker */}
                          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <label className="text-sm font-medium text-gray-700">Filtruoti mėnesį:</label>
                              <input
                                type="month"
                                value={`${filterMonth.getFullYear()}-${String(filterMonth.getMonth() + 1).padStart(2, '0')}`}
                                onChange={(e) => {
                                  const [year, month] = e.target.value.split('-');
                                  setWorkerDetailMonth({
                                    ...workerDetailMonth,
                                    [workerId]: new Date(parseInt(year), parseInt(month) - 1, 1),
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm"
                              />
                            </div>
                            <div className="text-sm text-gray-600">
                              Rodoma: <span className="font-bold text-blue-900">{totalHours.toFixed(1)}h</span> / {totalDays} d.
                            </div>
                          </div>

                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pradžia</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pabaiga</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Valandos</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pastabos</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {workerEntries.map((entry) => {
                                const date = new Date(entry.entry_date);
                                const dayName = date.toLocaleDateString('lt-LT', { weekday: 'short' });
                                
                                return (
                                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 uppercase font-medium">{dayName}</span>
                                        <span className="text-sm text-gray-900">
                                          {date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-700 font-mono">{entry.start_time}</span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-700 font-mono">{entry.end_time}</span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                        {entry.hours_worked.toFixed(1)}h
                                      </span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm text-gray-600">{entry.notes || '-'}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {viewMode === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas</label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="">Pasirinkite darbuotoją</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Darbuotojai</label>
                <button
                  onClick={() => {
                    if (selectedWorkers.length === workers.length) {
                      setSelectedWorkers([]);
                    } else {
                      setSelectedWorkers(workers.map(w => w.id));
                    }
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  {selectedWorkers.length === workers.length ? 'Atžymėti visus' : 'Žymėti visus'}
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg px-3 py-2 max-h-24 overflow-y-auto bg-white">
                {workers.map(worker => (
                  <label key={worker.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(worker.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkers([...selectedWorkers, worker.id]);
                        } else {
                          setSelectedWorkers(selectedWorkers.filter(id => id !== worker.id));
                        }
                      }}
                      className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-sm">{worker.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'multi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Išdėstymas</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMultiLayout('rows')}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    multiLayout === 'rows'
                      ? 'border-slate-600 bg-slate-50 text-slate-900'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Eilutės
                </button>
                <button
                  onClick={() => setMultiLayout('overlay')}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    multiLayout === 'overlay'
                      ? 'border-slate-600 bg-slate-50 text-slate-900'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Sluoksniai
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grafiko tipas</label>
            <select
              value={selectedScheduleType}
              onChange={(e) => setSelectedScheduleType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {SCHEDULE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Darbo pradžia</label>
            <select
              value={workStartHour}
              onChange={(e) => {
                const newStart = parseInt(e.target.value, 10);
                if (newStart < workEndHour) {
                  setWorkStartHour(newStart);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h} disabled={h >= workEndHour}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Darbo pabaiga</label>
            <select
              value={workEndHour}
              onChange={(e) => {
                const newEnd = parseInt(e.target.value, 10);
                if (newEnd > workStartHour) {
                  setWorkEndHour(newEnd);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                <option key={h} value={h} disabled={h <= workStartHour}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className={`flex-1 p-3 rounded-lg border-2 ${SCHEDULE_TYPES.find(t => t.value === selectedScheduleType)?.lightColor} ${SCHEDULE_TYPES.find(t => t.value === selectedScheduleType)?.borderColor}`}>
              <div className="text-xs text-gray-600 mb-1">Braižykite norėdami pridėti</div>
              <div className="font-semibold text-gray-900">
                {SCHEDULE_TYPES.find(t => t.value === selectedScheduleType)?.label}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-semibold text-gray-800">
            {dates[0].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' })} - {dates[6].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {(viewMode === 'single' && selectedWorker) || (viewMode === 'multi' && selectedWorkers.length > 0) ? (
          viewMode === 'single' ? (
            <div
              ref={timelineRef}
              className="border border-gray-300 rounded-lg overflow-hidden"
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
            <div className="flex">
              <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-300">
                <div className="h-12 border-b border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                  Laikas
                </div>
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="h-12 border-b border-gray-200 flex items-center justify-center text-xs text-gray-600"
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max">
                  {dates.map((date, dateIdx) => (
                    <div key={dateIdx} className="flex-1 min-w-[120px] border-r border-gray-300 last:border-r-0">
                      <div className="h-12 border-b border-gray-300 flex flex-col items-center justify-center bg-gray-50 px-2">
                        <div className="text-xs font-semibold text-gray-700">
                          {['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'][date.getDay()]}
                        </div>
                        <div className="text-sm text-gray-600">{date.getDate()}</div>
                      </div>

                      <div className="relative">
                        {HOURS.map(hour => {
                          const cellSchedules = getSchedulesForCell(date, hour);
                          const isInDragRange = isCellInDragRange(hour, dateIdx);
                          const scheduleTypeColor = SCHEDULE_TYPES.find(t => t.value === selectedScheduleType);

                          return (
                            <div
                              key={hour}
                              className={`h-12 border-b border-gray-200 relative transition-colors ${
                                isInDragRange
                                  ? scheduleTypeColor?.lightColor
                                  : cellSchedules.length === 0 ? 'hover:bg-blue-50 cursor-cell' : ''
                              }`}
                              onMouseDown={(e) => handleMouseDown(date, hour, dateIdx, e)}
                              onMouseEnter={() => handleMouseEnter(date, hour, dateIdx)}
                            >
                              {cellSchedules.map(schedule => {
                                const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                                const start = parseTime(schedule.shift_start);
                                const end = parseTime(schedule.shift_end);

                                const scheduleStartInHours = start.hour + start.minute / 60;
                                const scheduleEndInHours = end.hour + end.minute / 60;
                                const cellStartInHours = hour;

                                // Show the schedule in the first visible cell it appears in
                                const scheduleStartHour = Math.floor(scheduleStartInHours);
                                const firstVisibleHour = Math.max(scheduleStartHour, workStartHour);
                                const isFirstCell = firstVisibleHour === hour;

                                if (!isFirstCell) return null;

                                // Calculate visual properties
                                const visualStartInHours = Math.max(scheduleStartInHours, workStartHour);
                                const visualEndInHours = Math.min(scheduleEndInHours, workEndHour);
                                const durationInHours = visualEndInHours - visualStartInHours;
                                const heightInPixels = durationInHours * 48;
                                const topOffset = (visualStartInHours - cellStartInHours) * 48;
                                const isHovered = hoveredScheduleId === schedule.id;
                                const isDeleting = deleteConfirmId === schedule.id;
                                const startsBeforeVisible = scheduleStartInHours < workStartHour;
                                const endsAfterVisible = scheduleEndInHours > workEndHour;

                                return (
                                  <div
                                    key={schedule.id}
                                    data-schedule-block="true"
                                    className={`absolute inset-x-1 ${scheduleType?.color} text-white rounded-md px-2 py-1 text-xs font-medium shadow-md border-l-4 ${scheduleType?.borderColor} cursor-pointer z-10 transition-all ${
                                      isHovered ? 'ring-2 ring-white ring-opacity-50 scale-[1.02] shadow-lg' : ''
                                    } ${isDeleting ? 'ring-2 ring-red-400' : ''}`}
                                    style={{
                                      top: `${topOffset}px`,
                                      height: `${heightInPixels}px`,
                                      minHeight: '36px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      if (!isDragging) {
                                        setHoveredScheduleId(schedule.id);
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation();
                                      setHoveredScheduleId(null);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDragging) {
                                        setEditingSchedule(schedule);
                                        setShowEditModal(true);
                                      }
                                    }}
                                  >
                                    {isDeleting ? (
                                      <div className="flex flex-col items-center justify-center h-full gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <div className="text-[10px] font-bold">Ištrinti?</div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSchedule(schedule.id);
                                            }}
                                            className="px-2 py-0.5 bg-white text-red-600 rounded text-[10px] font-bold hover:bg-red-50"
                                          >
                                            Taip
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirmId(null);
                                            }}
                                            className="px-2 py-0.5 bg-white bg-opacity-20 rounded text-[10px] hover:bg-opacity-30"
                                          >
                                            Ne
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start justify-between h-full gap-1">
                                        <div className="flex-1 min-w-0 pt-0.5">
                                          <div className="font-semibold truncate text-[11px]">
                                            {startsBeforeVisible && '↑ '}
                                            {scheduleType?.label}
                                            {endsAfterVisible && ' ↓'}
                                          </div>
                                          <div className="text-[10px] opacity-90 mt-0.5">
                                            {schedule.shift_start.substring(0, 5)} - {schedule.shift_end.substring(0, 5)}
                                          </div>
                                          {schedule.notes && (
                                            <div className="text-[9px] opacity-75 truncate mt-0.5" title={schedule.notes}>
                                              {schedule.notes}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingSchedule(schedule);
                                              setShowEditModal(true);
                                            }}
                                            className={`p-1 hover:bg-white hover:bg-opacity-20 rounded transition-all ${
                                              isHovered ? 'opacity-100' : 'opacity-0'
                                            }`}
                                            title="Redaguoti"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirmId(schedule.id);
                                            }}
                                            className={`p-1 hover:bg-red-500 hover:bg-opacity-30 rounded transition-all ${
                                              isHovered ? 'opacity-100' : 'opacity-0'
                                            }`}
                                            title="Ištrinti"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          ) : (
            // Multi-worker view
            multiLayout === 'rows' ? (
              // Rows layout - each worker in separate row
              <div className="border border-gray-300 rounded-lg overflow-auto" style={{ maxHeight: '70vh' }}>
                <div className="flex">
                {/* Worker names column */}
                <div className="sticky left-0 z-20 bg-white border-r border-gray-300">
                  <div className="w-40 h-12 border-b border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-50">
                    Darbuotojas
                  </div>
                  {selectedWorkers.map(workerId => {
                    const worker = workers.find(w => w.id === workerId);
                    const rowHeight = HOURS.length * 48;
                    return (
                      <div 
                        key={workerId} 
                        className="w-40 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 flex items-center" 
                        style={{ height: `${rowHeight}px` }}
                      >
                        <span className="truncate">{worker?.full_name}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 overflow-x-auto">
                  <div className="flex min-w-max">
                    {dates.map((date, dateIdx) => (
                      <div key={dateIdx} className="flex-1 min-w-[120px] border-r border-gray-300 last:border-r-0">
                        <div className="h-12 border-b border-gray-300 flex flex-col items-center justify-center bg-gray-50 px-2">
                          <div className="text-xs font-semibold text-gray-700">
                            {['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'][date.getDay()]}
                          </div>
                          <div className="text-sm text-gray-600">{date.getDate()}</div>
                        </div>

                        {selectedWorkers.map(workerId => (
                          <div 
                            key={`${workerId}-${dateIdx}`} 
                            className="relative border-b border-gray-200" 
                            style={{ height: `${HOURS.length * 48}px` }}
                          >
                            {HOURS.map(hour => {
                              const cellSchedules = getSchedulesForCell(date, hour, workerId);
                              const cellTop = (hour - workStartHour) * 48;
                              
                              return (
                                <div 
                                  key={hour} 
                                  className="absolute inset-x-0 border-t border-gray-100 first:border-t-0" 
                                  style={{ top: `${cellTop}px`, height: '48px' }}
                                >
                                  {cellSchedules.map(schedule => {
                                    const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                                    const start = parseTime(schedule.shift_start);
                                    const end = parseTime(schedule.shift_end);

                                    const scheduleStartInHours = start.hour + start.minute / 60;
                                    const scheduleEndInHours = end.hour + end.minute / 60;

                                    // Show the schedule in the first visible cell it appears in
                                    const scheduleStartHour = Math.floor(scheduleStartInHours);
                                    const firstVisibleHour = Math.max(scheduleStartHour, workStartHour);
                                    const isFirstCell = firstVisibleHour === hour;
                                    if (!isFirstCell) return null;

                                    // Calculate visual properties
                                    const visualStartInHours = Math.max(scheduleStartInHours, workStartHour);
                                    const visualEndInHours = Math.min(scheduleEndInHours, workEndHour);
                                    const durationInHours = visualEndInHours - visualStartInHours;
                                    const heightInPixels = durationInHours * 48;
                                    const topOffset = (visualStartInHours - hour) * 48;
                                    const startsBeforeVisible = scheduleStartInHours < workStartHour;
                                    const endsAfterVisible = scheduleEndInHours > workEndHour;

                                    return (
                                      <div
                                        key={schedule.id}
                                        className={`absolute inset-x-1 ${scheduleType?.color} text-white rounded px-2 py-1 text-[10px] font-medium shadow-sm border-l-2 ${scheduleType?.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
                                        style={{
                                          top: `${topOffset}px`,
                                          height: `${heightInPixels}px`,
                                          minHeight: '20px'
                                        }}
                                        onClick={() => {
                                          setEditingSchedule(schedule);
                                          setShowEditModal(true);
                                        }}
                                        title={`${workers.find((w: Worker) => w.id === workerId)?.full_name}\n${scheduleType?.label}\n${schedule.shift_start.substring(0, 5)} - ${schedule.shift_end.substring(0, 5)}`}
                                      >
                                        <div className="truncate font-semibold leading-tight">
                                          {startsBeforeVisible && '↑ '}
                                          {scheduleType?.label}
                                          {endsAfterVisible && ' ↓'}
                                        </div>
                                        {heightInPixels > 30 && (
                                          <div className="text-[9px] opacity-90 truncate">
                                            {schedule.shift_start.substring(0, 5)} - {schedule.shift_end.substring(0, 5)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              // Overlay layout - all workers on same grid with different colors
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="flex">
                  {/* Time column */}
                  <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-300">
                    <div className="h-12 border-b border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                      Laikas
                    </div>
                    {HOURS.map(hour => (
                      <div
                        key={hour}
                        className="h-12 border-b border-gray-200 flex items-center justify-center text-xs text-gray-600"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex min-w-max">
                      {dates.map((date, dateIdx) => (
                        <div key={dateIdx} className="flex-1 min-w-[120px] border-r border-gray-300 last:border-r-0">
                          <div className="h-12 border-b border-gray-300 flex flex-col items-center justify-center bg-gray-50 px-2">
                            <div className="text-xs font-semibold text-gray-700">
                              {['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'][date.getDay()]}
                            </div>
                            <div className="text-sm text-gray-600">{date.getDate()}</div>
                          </div>

                          <div className="relative">
                            {HOURS.map(hour => {
                              // Collect all schedules from all selected workers for this cell
                              const allCellSchedules = selectedWorkers.flatMap((workerId, workerIndex) => {
                                const schedules = getSchedulesForCell(date, hour, workerId);
                                return schedules.map(schedule => ({ ...schedule, workerId, workerIndex }));
                              });

                              return (
                                <div
                                  key={hour}
                                  className="h-12 border-b border-gray-200 relative"
                                >
                                  {allCellSchedules.map((scheduleWithWorker) => {
                                    const schedule = scheduleWithWorker;
                                    const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                                    const start = parseTime(schedule.shift_start);
                                    const end = parseTime(schedule.shift_end);

                                    const scheduleStartInHours = start.hour + start.minute / 60;
                                    const scheduleEndInHours = end.hour + end.minute / 60;

                                    const scheduleStartHour = Math.floor(scheduleStartInHours);
                                    const firstVisibleHour = Math.max(scheduleStartHour, workStartHour);
                                    const isFirstCell = firstVisibleHour === hour;
                                    if (!isFirstCell) return null;

                                    const visualStartInHours = Math.max(scheduleStartInHours, workStartHour);
                                    const visualEndInHours = Math.min(scheduleEndInHours, workEndHour);
                                    const durationInHours = visualEndInHours - visualStartInHours;
                                    const heightInPixels = durationInHours * 48;
                                    const topOffset = (visualStartInHours - hour) * 48;
                                    const startsBeforeVisible = scheduleStartInHours < workStartHour;
                                    const endsAfterVisible = scheduleEndInHours > workEndHour;
                                    
                                    // Use worker color instead of schedule type color
                                    const workerColor = workerColors[schedule.workerIndex % workerColors.length];
                                    const worker = workers.find(w => w.id === schedule.workerId);
                                    
                                    return (
                                      <div
                                        key={schedule.id}
                                        className={`absolute inset-x-1 ${workerColor.bg} text-white rounded-md px-2 py-1 text-xs font-medium shadow-md border-l-4 ${workerColor.border} cursor-pointer z-10 transition-all hover:shadow-lg hover:scale-[1.02]`}
                                        style={{
                                          top: `${topOffset}px`,
                                          height: `${heightInPixels}px`,
                                          minHeight: '36px',
                                          opacity: 0.9
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSchedule(schedule);
                                          setShowEditModal(true);
                                        }}
                                        title={`${worker?.full_name}\n${scheduleType?.label}\n${schedule.shift_start.substring(0, 5)} - ${schedule.shift_end.substring(0, 5)}`}
                                      >
                                        <div className="font-semibold truncate text-[11px]">
                                          {startsBeforeVisible && '↑ '}
                                          {worker?.full_name}
                                          {endsAfterVisible && ' ↓'}
                                        </div>
                                        <div className="text-[10px] opacity-90 mt-0.5 truncate">
                                          {scheduleType?.label}
                                        </div>
                                        {heightInPixels > 50 && (
                                          <div className="text-[10px] opacity-90 mt-0.5">
                                            {schedule.shift_start.substring(0, 5)} - {schedule.shift_end.substring(0, 5)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend for overlay view */}
                <div className="border-t border-gray-300 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Darbuotojai:</div>
                  <div className="flex flex-wrap gap-3">
                    {selectedWorkers.map((workerId, index) => {
                      const worker = workers.find(w => w.id === workerId);
                      const color = workerColors[index % workerColors.length];
                      return (
                        <div key={workerId} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.bg} border-2 ${color.border}`}></div>
                          <span className="text-sm text-gray-700">{worker?.full_name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )
        ) : (
          <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
            {viewMode === 'single' ? (
              <>
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Pasirinkite darbuotoją iš sąrašo</p>
              </>
            ) : (
              <>
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Pasirinkite darbuotojus iš sąrašo</p>
              </>
            )}
          </div>
        )}

        {viewMode === 'single' && selectedWorker && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3 text-sm">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
              <div className="flex-1">
                <div className="font-semibold mb-2 text-blue-900">Kaip naudotis grafiku:</div>
                <div className="grid md:grid-cols-2 gap-3 text-blue-800">
                  <div>
                    <div className="font-medium text-blue-900 mb-1">Pridėti grafiką:</div>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li>• Pasirinkite grafiko tipą viršuje</li>
                      <li>• Spustelėkite ir tempkite kalendoriuje</li>
                      <li>• Galite brėžti per kelias dienas</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-blue-900 mb-1">Redaguoti/Ištrinti:</div>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li>• Užveskite pelę ant grafiko</li>
                      <li>• Spauskite <Edit2 className="w-3 h-3 inline" /> redaguoti</li>
                      <li>• Spauskite <Trash2 className="w-3 h-3 inline" /> ištrinti</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {showEditModal && editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Redaguoti grafiką</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSchedule(null);
                  setDeleteConfirmId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas</label>
                <input
                  type="text"
                  value={workers.find(w => w.id === editingSchedule.worker_id)?.full_name || ''}
                  disabled
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="text"
                  value={new Date(editingSchedule.date).toLocaleDateString('lt-LT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  disabled
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grafiko tipas</label>
                <select
                  value={editingSchedule.schedule_type}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, schedule_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  {SCHEDULE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pradžia</label>
                  <input
                    type="time"
                    value={editingSchedule.shift_start}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, shift_start: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pabaiga</label>
                  <input
                    type="time"
                    value={editingSchedule.shift_end}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, shift_end: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={editingSchedule.notes || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })}
                  placeholder="Pridėti pastabas (nebūtina)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            {deleteConfirmId === editingSchedule.id ? (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Ar tikrai norite ištrinti šį grafiką?</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Atšaukti
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(editingSchedule.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Taip, ištrinti
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-2 mt-6">
                <button
                  onClick={() => setDeleteConfirmId(editingSchedule.id)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Ištrinti
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSchedule(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Atšaukti
                  </button>
                  <button
                    onClick={handleUpdateSchedule}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                  >
                    Išsaugoti
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Surašyti iš lapų</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Įveskite darbuotojų darbo valandas pagal popierinių lapų duomenis
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowManualEntryModal(false);
                    setManualEntries([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Month Selector */}
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Mėnuo:</label>
                <input
                  type="month"
                  value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-6">
              {/* Add Entry Button */}
              <button
                onClick={addManualEntry}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Pridėti įrašą
              </button>

              {/* Entries List */}
              {manualEntries.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Pradėkite įvesti darbuotojų darbo laiką</p>
                  <p className="text-sm text-gray-500 mt-2">Spauskite "Pridėti įrašą" ir įveskite pradžios bei pabaigos laiką</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {manualEntries.map((entry, index) => {
                    const worker = workers.find(w => w.id === entry.worker_id);
                    const hours = calculateHoursFromTimes(entry.start_time, entry.end_time);
                    
                    return (
                      <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {/* Entry Number */}
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>

                          {/* Worker */}
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={entry.worker_id}
                              onChange={(e) => updateManualEntry(entry.id, 'worker_id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.full_name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Date */}
                          <div className="flex-shrink-0">
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(e) => updateManualEntry(entry.id, 'date', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Start Time */}
                          <div className="flex-shrink-0">
                            <input
                              type="time"
                              value={entry.start_time}
                              onChange={(e) => updateManualEntry(entry.id, 'start_time', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="08:00"
                            />
                          </div>

                          <span className="text-gray-400">→</span>

                          {/* End Time */}
                          <div className="flex-shrink-0">
                            <input
                              type="time"
                              value={entry.end_time}
                              onChange={(e) => updateManualEntry(entry.id, 'end_time', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="17:00"
                            />
                          </div>

                          {/* Calculated Hours */}
                          <div className="flex-shrink-0 w-20 text-center">
                            <div className={`px-3 py-2 rounded text-sm font-bold ${
                              hours < 0 
                                ? 'bg-red-50 border border-red-200 text-red-900' 
                                : 'bg-green-50 border border-green-200 text-green-900'
                            }`}>
                              {hours !== 0 ? `${Math.abs(hours).toFixed(1)}h` : '-'}
                              {hours < 0 && <span className="block text-xs">⚠️ Klaidinga</span>}
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => removeManualEntry(entry.id)}
                            className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Ištrinti"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary Statistics */}
              {manualEntries.length > 0 && (
                <div className="mt-6 space-y-4">
                  {/* Per Worker Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
                    <h4 className="font-bold text-blue-900 mb-4 text-lg">Pagal darbuotoją</h4>
                    <div className="space-y-3">
                      {Array.from(new Set(manualEntries.map(e => e.worker_id))).map(workerId => {
                        const worker = workers.find(w => w.id === workerId);
                        const totalHours = calculateTotalHours(manualEntries, workerId);
                        const totalDays = calculateTotalDays(manualEntries, workerId);
                        const weekHours = calculateWeekHours(manualEntries, workerId);
                        
                        return (
                          <div key={workerId} className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-gray-800">{worker?.full_name}</span>
                              <div className="flex gap-4">
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Mėnuo</div>
                                  <div className="text-lg font-bold text-blue-900">{totalHours.toFixed(1)}h</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Dienų</div>
                                  <div className="text-lg font-bold text-green-900">{totalDays}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Weekly breakdown */}
                            {weekHours.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Savaitės:</div>
                                <div className="flex flex-wrap gap-2">
                                  {weekHours.map((week, idx) => (
                                    <div key={week.weekStart} className="bg-blue-50 px-2 py-1 rounded text-xs">
                                      <span className="text-gray-600">S{idx + 1}:</span>{' '}
                                      <span className="font-semibold text-blue-900">{week.hours.toFixed(1)}h</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Overall Totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                      <div className="text-sm opacity-90 mb-1">Viso per mėnesį</div>
                      <div className="text-4xl font-bold">{calculateTotalHours(manualEntries).toFixed(1)}h</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                      <div className="text-sm opacity-90 mb-1">Viso darbo dienų</div>
                      <div className="text-4xl font-bold">{calculateTotalDays(manualEntries)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowManualEntryModal(false);
                  setManualEntries([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={saveManualEntries}
                disabled={manualEntries.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Išsaugoti grafikus ({manualEntries.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
