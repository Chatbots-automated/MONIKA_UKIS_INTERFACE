import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisit, VisitStatus, VisitProcedure } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Search, Filter, Thermometer, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { AnimalDetailSidebar } from './AnimalDetailSidebar';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface VisitWithAnimal extends AnimalVisit {
  animal?: Animal;
}

export function VisitsModern() {
  const { logAction } = useAuth();
  const [visits, setVisits] = useState<VisitWithAnimal[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<VisitStatus | 'all'>('all');
  const [filterProcedure, setFilterProcedure] = useState<VisitProcedure | 'all'>('all');
  const [filterVet, setFilterVet] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription for animal_visits
  useRealtimeSubscription({
    table: 'animal_visits',
    onInsert: useCallback((payload) => {
      const newVisit = payload.new as AnimalVisit;
      const animal = animals.find(a => a.id === newVisit.animal_id);
      setVisits(prev => [{ ...newVisit, animal }, ...prev].sort((a, b) =>
        new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime()
      ));
    }, [animals]),
    onUpdate: useCallback((payload) => {
      const updatedVisit = payload.new as AnimalVisit;
      const animal = animals.find(a => a.id === updatedVisit.animal_id);
      setVisits(prev => prev.map(visit =>
        visit.id === updatedVisit.id ? { ...updatedVisit, animal } : visit
      ));
    }, [animals]),
    onDelete: useCallback((payload) => {
      setVisits(prev => prev.filter(visit => visit.id !== payload.old.id));
    }, []),
  });

  const loadData = async () => {
    try {
      const [visitsRes, animalsRes] = await Promise.all([
        supabase
          .from('animal_visits')
          .select('*')
          .order('visit_datetime', { ascending: false }),
        supabase.from('animals').select('*').limit(10000),
      ]);

      const visitsWithAnimals = (visitsRes.data || []).map(visit => ({
        ...visit,
        animal: (animalsRes.data || []).find((a: Animal) => a.id === visit.animal_id),
      }));

      setVisits(visitsWithAnimals);
      setAnimals(animalsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueVets = Array.from(new Set(visits.map(v => v.vet_name).filter(Boolean)));

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const filteredVisits = visits.filter(visit => {

    if (filterStatus !== 'all' && visit.status !== filterStatus) return false;
    if (filterProcedure !== 'all' && !visit.procedures.includes(filterProcedure)) return false;
    if (filterVet !== 'all' && visit.vet_name !== filterVet) return false;

    if (dateFrom) {
      const visitDate = new Date(visit.visit_datetime);
      const fromDate = new Date(dateFrom);
      if (visitDate < fromDate) return false;
    }

    if (dateTo) {
      const visitDate = new Date(visit.visit_datetime);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      if (visitDate > toDate) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesAnimal =
        visit.animal?.tag_no?.toLowerCase().includes(term) ||
        visit.animal?.species.toLowerCase().includes(term) ||
        visit.animal?.holder_name?.toLowerCase().includes(term);
      const matchesNotes = visit.notes?.toLowerCase().includes(term);
      const matchesVet = visit.vet_name?.toLowerCase().includes(term);
      if (!matchesAnimal && !matchesNotes && !matchesVet) return false;
    }

    return true;
  });

  // Categorize visits by time
  const todayVisits = filteredVisits.filter(v => isToday(v.visit_datetime));
  const futureVisits = filteredVisits.filter(v => new Date(v.visit_datetime) > new Date());
  const pastVisits = filteredVisits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate < today && visitDate.toDateString() !== today.toDateString();
  });

  // Separate by completion status
  const todayIncomplete = todayVisits.filter(v => v.status !== 'Baigtas');
  const todayCompleted = todayVisits.filter(v => v.status === 'Baigtas');

  const futureIncomplete = futureVisits.filter(v => v.status !== 'Baigtas');
  const futureCompleted = futureVisits.filter(v => v.status === 'Baigtas');

  const pastIncomplete = pastVisits.filter(v => v.status !== 'Baigtas');
  const pastCompleted = pastVisits.filter(v => v.status === 'Baigtas');

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Vykdomas': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baigtas': return 'bg-green-100 text-green-800 border-green-200';
      case 'Atšauktas': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Neįvykęs': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return <Clock className="w-4 h-4" />;
      case 'Vykdomas': return <AlertCircle className="w-4 h-4" />;
      case 'Baigtas': return <CheckCircle className="w-4 h-4" />;
      case 'Atšauktas': return <XCircle className="w-4 h-4" />;
      case 'Neįvykęs': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Kraunama...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Vizitai</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Filtrai</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data nuo</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data iki</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statusas</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as VisitStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Visi</option>
              <option value="Planuojamas">Planuojamas</option>
              <option value="Vykdomas">Vykdomas</option>
              <option value="Baigtas">Baigtas</option>
              <option value="Atšauktas">Atšauktas</option>
              <option value="Neįvykęs">Neįvykęs</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Procedūra</label>
            <select
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value as VisitProcedure | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Visos</option>
              <option value="Temperatūra">Temperatūra</option>
              <option value="Apžiūra">Apžiūra</option>
              <option value="Profilaktika">Profilaktika</option>
              <option value="Gydymas">Gydymas</option>
              <option value="Vakcina">Vakcina</option>
              <option value="Kita">Kita</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gydytojas</label>
            <select
              value={filterVet}
              onChange={(e) => setFilterVet(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Visi</option>
              {uniqueVets.map(vet => (
                <option key={vet} value={vet}>{vet}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Ieškoti pagal gyvūną, pastabas, gydytoją..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* MISSED/OVERDUE VISITS */}
      {pastIncomplete.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-bold text-red-700">⚠️ Praleisti vizitai - Reikia atlikti! ({pastIncomplete.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastIncomplete.map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
              />
            ))}
          </div>
        </div>
      )}

      {/* TODAY'S VISITS */}
      {todayVisits.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-orange-700">Šiandienos vizitai ({todayVisits.length})</h3>
          </div>

          {todayIncomplete.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Reikia atlikti</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayIncomplete.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                  />
                ))}
              </div>
            </div>
          )}

          {todayCompleted.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Atlikta šiandien
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayCompleted.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FUTURE VISITS */}
      {futureVisits.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-blue-700">Būsimi vizitai ({futureVisits.length})</h3>
          </div>

          {futureIncomplete.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Suplanuota</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureIncomplete.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                  />
                ))}
              </div>
            </div>
          )}

          {futureCompleted.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Atlikta iš anksto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureCompleted.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAST COMPLETED VISITS */}
      {pastCompleted.length > 0 && (
        <div className="border-t-4 border-gray-300 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-green-700">Ankstesni užbaigti vizitai ({pastCompleted.length})</h3>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Laikas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedūros</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statusas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydytojas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pastabos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastCompleted.slice(0, 20).map(visit => (
                    <tr
                      key={visit.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{formatDateTimeLT(visit.visit_datetime)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{visit.animal?.tag_no || '-'}</div>
                        <div className="text-gray-600">{visit.animal?.species}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {visit.procedures.map((proc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {proc}
                            </span>
                          ))}
                        </div>
                        {visit.temperature && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                            <Thermometer className="w-3 h-3" />
                            {visit.temperature}°C
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit border ${getStatusColor(visit.status)}`}>
                          {getStatusIcon(visit.status)}
                          {visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {visit.vet_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {visit.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {pastCompleted.length > 20 && (
            <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg mt-2">
              + dar {pastCompleted.length - 20} užbaigti vizitai
            </p>
          )}
        </div>
      )}

      {filteredVisits.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Nerasta vizitų</p>
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailSidebar
          animal={selectedAnimal}
          defaultTab="visits"
          onClose={() => {
            setSelectedAnimal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function VisitCard({ visit, getStatusColor, getStatusIcon, onClick }: {
  visit: VisitWithAnimal;
  getStatusColor: (status: VisitStatus) => string;
  getStatusIcon: (status: VisitStatus) => JSX.Element;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900 text-lg">{visit.animal?.tag_no || '-'}</div>
          <div className="text-sm text-gray-600">{visit.animal?.species}</div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(visit.status)}`}>
          {getStatusIcon(visit.status)}
          {visit.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
          {formatDateTimeLT(visit.visit_datetime)}
        </div>

        <div className="flex flex-wrap gap-1">
          {visit.procedures.map((proc, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {proc}
            </span>
          ))}
        </div>

        {visit.temperature && (
          <div className="flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 rounded px-2 py-1">
            <Thermometer className="w-4 h-4" />
            {visit.temperature}°C
          </div>
        )}

        {visit.notes && (
          <p className="text-sm text-gray-700 line-clamp-2">{visit.notes}</p>
        )}

        {visit.vet_name && (
          <p className="text-xs text-gray-500">Gyd.: {visit.vet_name}</p>
        )}
      </div>
    </div>
  );
}
