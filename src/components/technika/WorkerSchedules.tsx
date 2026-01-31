import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, Edit2, Trash2, X } from 'lucide-react';

interface Worker {
  id: string;
  full_name: string;
}

interface Schedule {
  id: string;
  worker_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  schedule_type: string;
  notes: string;
  worker?: { full_name: string };
}

const SCHEDULE_TYPES = [
  { value: 'work', label: 'Darbas', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'off', label: 'Poilsis', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'vacation', label: 'Atostogos', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'sick', label: 'Liga', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'training', label: 'Mokymai', color: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export function WorkerSchedules() {
  const { logAction } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    worker_id: '',
    date: '',
    shift_start: '08:00',
    shift_end: '17:00',
    schedule_type: 'work',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  const loadData = async () => {
    const [workersRes, schedulesRes] = await Promise.all([
      supabase.from('users').select('id, full_name').order('full_name'),
      supabase.from('worker_schedules').select('*').order('date', { ascending: true }),
    ]);

    if (workersRes.data) setWorkers(workersRes.data);
    if (schedulesRes.data) {
      const schedulesWithWorkers = await Promise.all(
        schedulesRes.data.map(async (schedule: any) => {
          const { data: worker } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', schedule.worker_id)
            .maybeSingle();
          return { ...schedule, worker };
        })
      );
      setSchedules(schedulesWithWorkers);
    }
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

  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

    const dates = [];
    let currentDay = new Date(startDate);

    while (currentDay <= lastDay || currentDay.getDay() !== 1) {
      dates.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return dates;
  };

  const getSchedulesForDate = (workerId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.worker_id === workerId && s.date === dateStr);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.worker_id || !scheduleForm.date) {
      alert('Prašome pasirinkti darbuotoją ir datą');
      return;
    }

    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('worker_schedules')
          .update({
            worker_id: scheduleForm.worker_id,
            date: scheduleForm.date,
            shift_start: scheduleForm.shift_start,
            shift_end: scheduleForm.shift_end,
            schedule_type: scheduleForm.schedule_type,
            notes: scheduleForm.notes,
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;
        await logAction('update_worker_schedule', { schedule_id: editingSchedule.id });
        alert('Grafikas atnaujintas');
      } else {
        const { error } = await supabase.from('worker_schedules').insert({
          worker_id: scheduleForm.worker_id,
          date: scheduleForm.date,
          shift_start: scheduleForm.shift_start,
          shift_end: scheduleForm.shift_end,
          schedule_type: scheduleForm.schedule_type,
          notes: scheduleForm.notes,
        });

        if (error) throw error;
        await logAction('add_worker_schedule', { worker_id: scheduleForm.worker_id, date: scheduleForm.date });
        alert('Grafikas pridėtas');
      }

      setShowAddModal(false);
      setEditingSchedule(null);
      setScheduleForm({
        worker_id: '',
        date: '',
        shift_start: '08:00',
        shift_end: '17:00',
        schedule_type: 'work',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį grafiką?')) return;

    try {
      const { error } = await supabase.from('worker_schedules').delete().eq('id', scheduleId);
      if (error) throw error;

      await logAction('delete_worker_schedule', { schedule_id: scheduleId });
      loadData();
      alert('Grafikas ištrintas');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const dates = viewMode === 'week' ? getWeekDates() : getMonthDates();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-slate-600" />
            <h3 className="text-xl font-bold text-gray-800">Darbuotojų grafikai</h3>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setScheduleForm({
                worker_id: '',
                date: '',
                shift_start: '08:00',
                shift_end: '17:00',
                schedule_type: 'work',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pridėti grafiką
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
              {viewMode === 'week'
                ? `${dates[0].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' })} - ${dates[6].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : currentDate.toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' })
              }
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-slate-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Savaitė
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-slate-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mėnuo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'week' ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold text-gray-700 w-48">
                    Darbuotojas
                  </th>
                  {dates.map((date, idx) => (
                    <th key={idx} className="border border-gray-300 bg-gray-50 p-3 text-center font-semibold text-gray-700">
                      <div>{['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'][date.getDay()]}</div>
                      <div className="text-sm font-normal">{date.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map(worker => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {worker.full_name}
                      </div>
                    </td>
                    {dates.map((date, idx) => {
                      const daySchedules = getSchedulesForDate(worker.id, date);
                      return (
                        <td key={idx} className="border border-gray-300 p-1">
                          <div className="space-y-1">
                            {daySchedules.map(schedule => {
                              const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                              return (
                                <div
                                  key={schedule.id}
                                  className={`text-xs p-2 rounded border ${scheduleType?.color} cursor-pointer group relative`}
                                  onClick={() => {
                                    setEditingSchedule(schedule);
                                    setScheduleForm({
                                      worker_id: schedule.worker_id,
                                      date: schedule.date,
                                      shift_start: schedule.shift_start,
                                      shift_end: schedule.shift_end,
                                      schedule_type: schedule.schedule_type,
                                      notes: schedule.notes || '',
                                    });
                                    setShowAddModal(true);
                                  }}
                                >
                                  <div className="font-semibold">{scheduleType?.label}</div>
                                  {schedule.schedule_type === 'work' && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <Clock className="w-3 h-3" />
                                      {formatTime(schedule.shift_start)} - {formatTime(schedule.shift_end)}
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSchedule(schedule.id);
                                      }}
                                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-700 p-2">
                  {day}
                </div>
              ))}
              {dates.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                return (
                  <div
                    key={idx}
                    className={`border border-gray-200 rounded-lg p-2 min-h-[100px] ${
                      !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {workers.map(worker => {
                        const daySchedules = getSchedulesForDate(worker.id, date);
                        return daySchedules.map(schedule => {
                          const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                          return (
                            <div
                              key={schedule.id}
                              className={`text-[10px] p-1 rounded border ${scheduleType?.color} cursor-pointer truncate`}
                              onClick={() => {
                                setEditingSchedule(schedule);
                                setScheduleForm({
                                  worker_id: schedule.worker_id,
                                  date: schedule.date,
                                  shift_start: schedule.shift_start,
                                  shift_end: schedule.shift_end,
                                  schedule_type: schedule.schedule_type,
                                  notes: schedule.notes || '',
                                });
                                setShowAddModal(true);
                              }}
                              title={`${worker.full_name} - ${scheduleType?.label}`}
                            >
                              {worker.full_name.split(' ')[0]}
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSchedule ? 'Redaguoti grafiką' : 'Pridėti grafiką'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSchedule(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas *</label>
                <select
                  value={scheduleForm.worker_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, worker_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Pasirinkite darbuotoją</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grafiko tipas *</label>
                <select
                  value={scheduleForm.schedule_type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  {SCHEDULE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {scheduleForm.schedule_type === 'work' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pradžia</label>
                    <input
                      type="time"
                      value={scheduleForm.shift_start}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, shift_start: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pabaiga</label>
                    <input
                      type="time"
                      value={scheduleForm.shift_end}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, shift_end: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Papildoma informacija..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSchedule(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                {editingSchedule ? 'Atnaujinti' : 'Pridėti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
