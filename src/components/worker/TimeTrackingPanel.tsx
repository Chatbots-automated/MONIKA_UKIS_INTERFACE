import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, Play, Square, AlertCircle } from 'lucide-react';

interface TimeTrackingPanelProps {
  workLocation: 'farm' | 'warehouse';
  todaySchedule: any | null;
  activeTimeEntry: any | null;
  onTimeEntryChange: () => void;
}

export function TimeTrackingPanel({
  workLocation,
  todaySchedule,
  activeTimeEntry,
  onTimeEntryChange,
}: TimeTrackingPanelProps) {
  const { user, logAction } = useAuth();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'in' | 'out' | null>(null);

  const handleClockIn = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('worker_time_entries')
        .insert({
          worker_id: user.id,
          work_location: workLocation,
          date: today,
          actual_start_time: now.toISOString(),
          scheduled_start: todaySchedule?.shift_start || null,
          scheduled_end: todaySchedule?.shift_end || null,
          status: 'active',
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction('worker_clock_in', 'worker_time_entries', data.id, null, {
        date: today,
        time: now.toISOString(),
      });

      setNotes('');
      setShowConfirm(null);
      onTimeEntryChange();
    } catch (error: any) {
      console.error('Error clocking in:', error);
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !activeTimeEntry) return;

    setLoading(true);
    try {
      const now = new Date();

      const { error } = await supabase
        .from('worker_time_entries')
        .update({
          actual_end_time: now.toISOString(),
          status: 'completed',
          notes: notes || activeTimeEntry.notes,
        })
        .eq('id', activeTimeEntry.id);

      if (error) throw error;

      await logAction('worker_clock_out', 'worker_time_entries', activeTimeEntry.id, null, {
        time: now.toISOString(),
      });

      setNotes('');
      setShowConfirm(null);
      onTimeEntryChange();
    } catch (error: any) {
      console.error('Error clocking out:', error);
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = () => {
    if (!activeTimeEntry) return null;
    
    const start = new Date(activeTimeEntry.actual_start_time);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, total: `${hours}h ${minutes}m` };
  };

  const elapsed = getElapsedTime();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Darbo laiko apskaita
      </h2>

      {!activeTimeEntry ? (
        // Clock In View
        <div className="space-y-4">
          {todaySchedule?.schedule_type === 'work' ? (
            <>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-2">Planuota pradžia</p>
                <p className="text-3xl font-bold text-gray-900">
                  {todaySchedule.shift_start?.substring(0, 5) || '-'}
                </p>
              </div>

              {!showConfirm && (
                <button
                  onClick={() => setShowConfirm('in')}
                  className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg transition-colors"
                >
                  <Play className="w-6 h-6" />
                  Pradėti darbą
                </button>
              )}

              {showConfirm === 'in' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      Ar tikrai norite pradėti darbą? Dabartinis laikas: <strong>{new Date().toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}</strong>
                    </p>
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Pastabos (neprivaloma)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    rows={2}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Atšaukti
                    </button>
                    <button
                      onClick={handleClockIn}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                      disabled={loading}
                    >
                      {loading ? 'Fiksuojama...' : 'Patvirtinti'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {todaySchedule ? 'Šiandien nėra darbo diena' : 'Šiandien nėra suplanuoto grafiko'}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Clock Out View
        <div className="space-y-4">
          <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 mb-2">Dirbate</p>
            <p className="text-4xl font-bold text-green-900">{elapsed?.total}</p>
            <p className="text-xs text-green-600 mt-2">
              Pradėta: {new Date(activeTimeEntry.actual_start_time).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {todaySchedule?.shift_end && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-600">Planuota pabaiga</p>
              <p className="text-xl font-semibold text-gray-900">
                {todaySchedule.shift_end.substring(0, 5)}
              </p>
            </div>
          )}

          {!showConfirm && (
            <button
              onClick={() => setShowConfirm('out')}
              className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-colors"
            >
              <Square className="w-6 h-6" />
              Baigti darbą
            </button>
          )}

          {showConfirm === 'out' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  Ar tikrai norite baigti darbą? Dabartinis laikas: <strong>{new Date().toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Iš viso dirbote: <strong>{elapsed?.total}</strong>
                </p>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Papildomos pastabos (neprivaloma)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Atšaukti
                </button>
                <button
                  onClick={handleClockOut}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Fiksuojama...' : 'Patvirtinti'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
