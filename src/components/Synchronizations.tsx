import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Syringe, AlertCircle, Filter, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SynchronizationStepWithDetails, Animal } from '../lib/types';
import { formatDateLT, formatDateTimeLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllRows, formatAnimalDisplay } from '../lib/helpers';

interface SyncStepDisplay extends SynchronizationStepWithDetails {
  animal?: Animal;
  protocol_name?: string;
}

export function Synchronizations() {
  const { logAction } = useAuth();
  const [syncSteps, setSyncSteps] = useState<SyncStepDisplay[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadData();
  }, [filterDate, customDateFrom, customDateTo, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allAnimals = await fetchAllRows<Animal>('animals', '*', 'tag_no');
      setAnimals(allAnimals);

      let dateFilter = '';
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      if (filterDate === 'today') {
        dateFilter = today;
      } else if (filterDate === 'tomorrow') {
        dateFilter = tomorrow;
      } else if (filterDate === 'custom' && customDateFrom) {
        dateFilter = customDateFrom;
      }

      let query = supabase
        .from('synchronization_steps')
        .select(`
          *,
          product:medication_product_id(id, name, unit),
          batch:batch_id(id, batch_no, expiry_date)
        `)
        .order('scheduled_date', { ascending: true })
        .order('step_number', { ascending: true });

      if (filterDate === 'today' || filterDate === 'tomorrow') {
        query = query.eq('scheduled_date', dateFilter);
      } else if (filterDate === 'custom' && customDateFrom && customDateTo) {
        query = query.gte('scheduled_date', customDateFrom).lte('scheduled_date', customDateTo);
      } else if (filterDate === 'custom' && customDateFrom) {
        query = query.eq('scheduled_date', customDateFrom);
      }

      if (statusFilter === 'pending') {
        query = query.eq('completed', false);
      } else if (statusFilter === 'completed') {
        query = query.eq('completed', true);
      }

      const { data: stepsData, error } = await query;

      if (error) throw error;

      if (stepsData) {
        const syncIds = [...new Set(stepsData.map(s => s.synchronization_id))];
        const { data: syncsData } = await supabase
          .from('animal_synchronizations')
          .select('id, animal_id, protocol_id, synchronization_protocols(name)')
          .in('id', syncIds);

        const syncsMap = new Map(syncsData?.map(s => [s.id, s]) || []);

        const enrichedSteps = stepsData.map(step => {
          const sync = syncsMap.get(step.synchronization_id);
          const animal = allAnimals.find(a => a.id === sync?.animal_id);
          return {
            ...step,
            animal,
            protocol_name: (sync?.synchronization_protocols as any)?.name,
          };
        });

        setSyncSteps(enrichedSteps);
      }
    } catch (error) {
      console.error('Error loading synchronizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async (step: SyncStepDisplay) => {
    try {
      const newCompleted = !step.completed;

      const { error: stepError } = await supabase
        .from('synchronization_steps')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', step.id);

      if (stepError) throw stepError;

      const { data: linkedVisit } = await supabase
        .from('animal_visits')
        .select('id')
        .eq('sync_step_id', step.id)
        .maybeSingle();

      if (linkedVisit) {
        const { error: visitError } = await supabase
          .from('animal_visits')
          .update({
            status: newCompleted ? 'Atliktas' : 'Planuojamas',
          })
          .eq('id', linkedVisit.id);

        if (visitError) throw visitError;
      }

      await logAction(
        newCompleted ? 'update' : 'create',
        'synchronization_steps',
        step.id,
        `${newCompleted ? 'Užbaigtas' : 'Atnaujintas'} sinchronizacijos žingsnis: ${step.step_name}`
      );

      loadData();
    } catch (error) {
      console.error('Error updating step:', error);
      alert('Klaida atnaujinant žingsnį');
    }
  };

  const filteredSteps = syncSteps.filter(step => {
    if (!searchTerm) return true;
    const animal = step.animal;
    const searchLower = searchTerm.toLowerCase();
    return (
      animal?.tag_no?.toLowerCase().includes(searchLower) ||
      animal?.collar_no?.toString().includes(searchLower) ||
      step.step_name?.toLowerCase().includes(searchLower) ||
      step.protocol_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (step: SyncStepDisplay) => {
    if (step.completed) return 'bg-green-100 text-green-800 border-green-300';
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return 'bg-red-100 text-red-800 border-red-300';
    if (step.scheduled_date === today) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getStatusIcon = (step: SyncStepDisplay) => {
    if (step.completed) return <CheckCircle2 className="w-4 h-4" />;
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return <AlertCircle className="w-4 h-4" />;
    if (step.scheduled_date === today) return <Clock className="w-4 h-4" />;
    return <Circle className="w-4 h-4" />;
  };

  const getStatusText = (step: SyncStepDisplay) => {
    if (step.completed) return 'Atlikta';
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return 'Praleista';
    if (step.scheduled_date === today) return 'Šiandien';
    return 'Planuojama';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sinchronizacijos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ieškoti..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Šiandien</option>
              <option value="tomorrow">Rytoj</option>
              <option value="custom">Pasirinkti datą</option>
            </select>
          </div>

          {filterDate === 'custom' && (
            <>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visi</option>
              <option value="pending">Nebaigti</option>
              <option value="completed">Baigti</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Kraunama...</p>
        </div>
      ) : filteredSteps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Sinchronizacijų nerasta</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSteps.map((step) => (
            <div
              key={step.id}
              className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(step)} ${
                step.completed ? '' : 'hover:shadow-lg cursor-pointer'
              }`}
              onClick={() => !step.completed && handleCompleteStep(step)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">
                      {step.animal ? formatAnimalDisplay(step.animal) : 'Nežinomas gyvūnas'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 border-2`}>
                      {getStatusIcon(step)}
                      {getStatusText(step)}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="font-medium text-gray-700">
                      Protokolas: <span className="font-bold">{step.protocol_name || 'Nežinomas'}</span>
                    </div>
                    <div className="font-medium text-gray-700">
                      Žingsnis {step.step_number}: <span className="font-semibold">{step.step_name}</span>
                    </div>
                    {step.is_evening && (
                      <div className="text-orange-600 font-medium">🌙 Vakare</div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold">{formatDateLT(step.scheduled_date)}</span>
                  </div>
                  {step.completed && step.completed_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      Atlikta: {formatDateTimeLT(step.completed_at)}
                    </div>
                  )}
                </div>
              </div>

              {step.product && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-current/20">
                  <Syringe className="w-4 h-4" />
                  <span className="font-medium">{(step.product as any).name}</span>
                  {step.dosage && (
                    <span className="text-sm">
                      ({step.dosage} {step.dosage_unit || (step.product as any).unit})
                    </span>
                  )}
                  {step.batch && (
                    <span className="text-sm ml-auto">
                      Partija: {(step.batch as any).batch_no}
                    </span>
                  )}
                </div>
              )}

              {step.notes && (
                <div className="mt-3 pt-3 border-t border-current/20 text-sm">
                  <span className="font-medium">Pastabos:</span> {step.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
