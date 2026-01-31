import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Trash2, X, Edit2 } from 'lucide-react';

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
}

const SCHEDULE_TYPES = [
  { value: 'work', label: 'Darbas', color: 'bg-green-500', lightColor: 'bg-green-100', borderColor: 'border-green-600' },
  { value: 'off', label: 'Poilsis', color: 'bg-gray-400', lightColor: 'bg-gray-100', borderColor: 'border-gray-500' },
  { value: 'vacation', label: 'Atostogos', color: 'bg-blue-500', lightColor: 'bg-blue-100', borderColor: 'border-blue-600' },
  { value: 'sick', label: 'Liga', color: 'bg-red-500', lightColor: 'bg-red-100', borderColor: 'border-red-600' },
  { value: 'training', label: 'Mokymai', color: 'bg-purple-500', lightColor: 'bg-purple-100', borderColor: 'border-purple-600' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WorkerSchedules() {
  const { logAction } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedScheduleType, setSelectedScheduleType] = useState('work');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: string; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: string; hour: number } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    const [workersRes, schedulesRes] = await Promise.all([
      supabase.from('users').select('id, full_name').order('full_name'),
      supabase.from('worker_schedules').select('*').order('date', { ascending: true }),
    ]);

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

  const getSchedulesForCell = (date: Date, hour: number) => {
    const dateKey = formatDateKey(date);
    return schedules.filter(s => {
      if (s.worker_id !== selectedWorker || s.date !== dateKey) return false;
      const startHour = parseInt(s.shift_start.split(':')[0]);
      const endHour = parseInt(s.shift_end.split(':')[0]);
      const startMinute = parseInt(s.shift_start.split(':')[1]);
      const endMinute = parseInt(s.shift_end.split(':')[1]);

      const cellStart = hour;
      const cellEnd = hour + 1;
      const scheduleStart = startHour + startMinute / 60;
      const scheduleEnd = endHour + endMinute / 60;

      return scheduleStart < cellEnd && scheduleEnd > cellStart;
    });
  };

  const handleMouseDown = (date: Date, hour: number) => {
    if (!selectedWorker) {
      alert('Prašome pasirinkti darbuotoją');
      return;
    }
    setIsDragging(true);
    const dateKey = formatDateKey(date);
    setDragStart({ date: dateKey, hour });
    setDragEnd({ date: dateKey, hour });
  };

  const handleMouseEnter = (date: Date, hour: number) => {
    if (isDragging && dragStart) {
      const dateKey = formatDateKey(date);
      if (dateKey === dragStart.date) {
        setDragEnd({ date: dateKey, hour });
      }
    }
  };

  const handleMouseUp = async () => {
    if (isDragging && dragStart && dragEnd && selectedWorker) {
      const startHour = Math.min(dragStart.hour, dragEnd.hour);
      const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;

      const shift_start = `${String(startHour).padStart(2, '0')}:00`;
      const shift_end = `${String(endHour).padStart(2, '0')}:00`;

      try {
        const { error } = await supabase.from('worker_schedules').insert({
          worker_id: selectedWorker,
          date: dragStart.date,
          shift_start,
          shift_end,
          schedule_type: selectedScheduleType,
          notes: '',
        });

        if (error) throw error;
        await logAction('add_worker_schedule', { worker_id: selectedWorker, date: dragStart.date });
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

  const isCellInDragRange = (date: Date, hour: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const dateKey = formatDateKey(date);
    if (dateKey !== dragStart.date) return false;

    const minHour = Math.min(dragStart.hour, dragEnd.hour);
    const maxHour = Math.max(dragStart.hour, dragEnd.hour);
    return hour >= minHour && hour <= maxHour;
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį grafiką?')) return;

    try {
      const { error } = await supabase.from('worker_schedules').delete().eq('id', scheduleId);
      if (error) throw error;

      await logAction('delete_worker_schedule', { schedule_id: scheduleId });
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
      await logAction('update_worker_schedule', { schedule_id: editingSchedule.id });
      setShowEditModal(false);
      setEditingSchedule(null);
      loadData();
      alert('Grafikas atnaujintas');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const dates = getWeekDates();
  const selectedWorkerName = workers.find(w => w.id === selectedWorker)?.full_name || '';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-slate-600" />
            <h3 className="text-xl font-bold text-gray-800">Darbuotojų grafikai</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {selectedWorker ? (
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
                          const isInDragRange = isCellInDragRange(date, hour);
                          const scheduleTypeColor = SCHEDULE_TYPES.find(t => t.value === selectedScheduleType);

                          return (
                            <div
                              key={hour}
                              className={`h-12 border-b border-gray-200 cursor-pointer relative transition-colors ${
                                isInDragRange
                                  ? scheduleTypeColor?.lightColor
                                  : 'hover:bg-gray-50'
                              }`}
                              onMouseDown={() => handleMouseDown(date, hour)}
                              onMouseEnter={() => handleMouseEnter(date, hour)}
                            >
                              {cellSchedules.map(schedule => {
                                const scheduleType = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type);
                                const startHour = parseInt(schedule.shift_start.split(':')[0]);
                                const startMinute = parseInt(schedule.shift_start.split(':')[1]);
                                const endHour = parseInt(schedule.shift_end.split(':')[0]);
                                const endMinute = parseInt(schedule.shift_end.split(':')[1]);

                                const scheduleStartInHours = startHour + startMinute / 60;
                                const scheduleEndInHours = endHour + endMinute / 60;
                                const cellStartInHours = hour;

                                const isFirstCell = Math.floor(scheduleStartInHours) === hour;

                                if (!isFirstCell) return null;

                                const durationInHours = scheduleEndInHours - scheduleStartInHours;
                                const heightInPixels = durationInHours * 48;
                                const topOffset = (scheduleStartInHours - cellStartInHours) * 48;

                                return (
                                  <div
                                    key={schedule.id}
                                    className={`absolute inset-x-0 ${scheduleType?.color} text-white rounded px-2 py-1 text-xs font-medium shadow-sm border-l-4 ${scheduleType?.borderColor} group cursor-pointer z-10`}
                                    style={{
                                      top: `${topOffset}px`,
                                      height: `${heightInPixels}px`,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSchedule(schedule);
                                      setShowEditModal(true);
                                    }}
                                  >
                                    <div className="flex items-center justify-between h-full">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate">{scheduleType?.label}</div>
                                        <div className="text-[10px] opacity-90">
                                          {schedule.shift_start.substring(0, 5)} - {schedule.shift_end.substring(0, 5)}
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSchedule(schedule.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 hover:bg-white hover:bg-opacity-20 rounded"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
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
          <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Pasirinkite darbuotoją iš sąrašo</p>
          </div>
        )}

        {selectedWorker && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-blue-800">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Kaip naudotis:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>1. Pasirinkite darbuotoją ir grafiko tipą</li>
                  <li>2. Spustelėkite ir tempkite pelę kalendoriuje norėdami sukurti pamainą</li>
                  <li>3. Spustelėkite ant sukurtos pamainos norėdami redaguoti ar ištrinti</li>
                </ul>
              </div>
            </div>
          </div>
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
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="text"
                  value={new Date(editingSchedule.date).toLocaleDateString('lt-LT')}
                  disabled
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
                <select
                  value={editingSchedule.schedule_type}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, schedule_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
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
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pabaiga</label>
                  <input
                    type="time"
                    value={editingSchedule.shift_end}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, shift_end: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={editingSchedule.notes || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSchedule(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleUpdateSchedule}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Atnaujinti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
