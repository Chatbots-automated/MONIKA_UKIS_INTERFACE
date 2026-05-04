import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Calendar, Info, Plus, Edit2, Save, X } from 'lucide-react';

interface EconomicGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

interface AnimalDeparture {
  id: string;
  animal_number: string;
  departure_date: string;
  gender: string | null;
  birth_date: string | null;
  reason: string | null;
  vet_reason_code: string | null;
  destination_name: string | null;
  destination_herd_number: string | null;
  source_name: string | null;
  source_herd_number: string | null;
  entered_by: string | null;
  last_treatment_date: string | null;
  last_withdrawal_milk: string | null;
  last_withdrawal_meat: string | null;
  has_withdrawal_conflict: boolean;
  conflict_details: string | null;
  milk_conflict_days: number;
  meat_conflict_days: number;
  animal_id: string | null;
  tag_no: string | null;
  species: string | null;
  sex: string | null;
  breed: string | null;
  animal_active: boolean | null;
  economic_group_id: string | null;
  economic_group_name: string | null;
  economic_group_color: string | null;
  created_at: string;
  updated_at: string;
}

export default function AnimalDepartures() {
  const [departures, setDepartures] = useState<AnimalDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterConflicts, setFilterConflicts] = useState<'all' | 'conflicts' | 'clean'>('all');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days');
  const [searchTerm, setSearchTerm] = useState('');
  const [economicGroups, setEconomicGroups] = useState<EconomicGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EconomicGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');

  useEffect(() => {
    fetchDepartures();
    fetchEconomicGroups();
  }, [filterConflicts, dateRange]);

  const fetchDepartures = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vw_animal_departures_with_conflicts')
        .select('*')
        .order('departure_date', { ascending: false });

      // Apply conflict filter
      if (filterConflicts === 'conflicts') {
        query = query.eq('has_withdrawal_conflict', true);
      } else if (filterConflicts === 'clean') {
        query = query.eq('has_withdrawal_conflict', false);
      }

      // Apply date range filter
      if (dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('departure_date', sevenDaysAgo.toISOString().split('T')[0]);
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('departure_date', thirtyDaysAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDepartures(data || []);
    } catch (error) {
      console.error('Error fetching departures:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEconomicGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('economic_groups')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEconomicGroups(data || []);
    } catch (error) {
      console.error('Error fetching economic groups:', error);
    }
  };

  const updateEconomicGroup = async (departureId: string, groupId: string | null) => {
    try {
      const { error } = await supabase
        .from('animal_departures')
        .update({ economic_group_id: groupId, updated_at: new Date().toISOString() })
        .eq('id', departureId);

      if (error) throw error;
      
      // Refresh departures to show updated data
      await fetchDepartures();
    } catch (error) {
      console.error('Error updating economic group:', error);
      alert('Klaida atnaujinant ekonominę grupę');
    }
  };

  const saveEconomicGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Įveskite grupės pavadinimą');
      return;
    }

    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('economic_groups')
          .update({
            name: newGroupName,
            description: newGroupDescription,
            color: newGroupColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
      } else {
        // Create new group
        const { error } = await supabase
          .from('economic_groups')
          .insert({
            name: newGroupName,
            description: newGroupDescription,
            color: newGroupColor
          });

        if (error) throw error;
      }

      // Refresh groups and close modal
      await fetchEconomicGroups();
      setShowGroupModal(false);
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3B82F6');
    } catch (error) {
      console.error('Error saving economic group:', error);
      alert('Klaida išsaugant ekonominę grupę');
    }
  };

  const openGroupModal = (group?: EconomicGroup) => {
    if (group) {
      setEditingGroup(group);
      setNewGroupName(group.name);
      setNewGroupDescription(group.description || '');
      setNewGroupColor(group.color);
    } else {
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3B82F6');
    }
    setShowGroupModal(true);
  };

  const filteredDepartures = departures.filter(dep =>
    searchTerm === '' ||
    dep.animal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.destination_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.entered_by?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: departures.length,
    conflicts: departures.filter(d => d.has_withdrawal_conflict).length,
    notFound: departures.filter(d => !d.animal_id).length,
    clean: departures.filter(d => d.animal_id && !d.has_withdrawal_conflict).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Išvežti Gyvūnai</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gyvūnų išvežimo registras su karencijos laikotarpio tikrinimu
          </p>
        </div>
        <button
          onClick={() => openGroupModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Valdyti ekonomines grupes
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Viso išvežta</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Su konfliktais</p>
              <p className="text-2xl font-bold text-red-600">{stats.conflicts}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Be konfliktų</p>
              <p className="text-2xl font-bold text-green-600">{stats.clean}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nerasta DB</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.notFound}</p>
            </div>
            <Info className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paieška
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gyvūno numeris, vieta, įvedėjas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Conflict Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konfliktai
            </label>
            <select
              value={filterConflicts}
              onChange={(e) => setFilterConflicts(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visi</option>
              <option value="conflicts">Tik su konfliktais</option>
              <option value="clean">Tik be konfliktų</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laikotarpis
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Paskutinės 7 dienos</option>
              <option value="30days">Paskutinės 30 dienų</option>
              <option value="all">Visi įrašai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Kraunama...</div>
        ) : filteredDepartures.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nerasta įrašų pagal pasirinktus filtrus
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statusas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gyvūno Nr.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Išvežimo Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lytis
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ekonominė grupė
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pieno Karencija
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mėsos Karencija
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Konflikto Detalės
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Įvedėjas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDepartures.map((departure) => (
                  <tr
                    key={departure.id}
                    className={
                      departure.has_withdrawal_conflict
                        ? 'bg-red-50 hover:bg-red-100'
                        : !departure.animal_id
                        ? 'bg-yellow-50 hover:bg-yellow-100'
                        : 'hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {departure.has_withdrawal_conflict ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Konfliktas
                        </span>
                      ) : !departure.animal_id ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Info className="w-3 h-3 mr-1" />
                          Nerasta
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {departure.animal_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(departure.departure_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {departure.gender || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={departure.economic_group_id || ''}
                        onChange={(e) => updateEconomicGroup(departure.id, e.target.value || null)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nepriskirta</option>
                        {economicGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      {departure.economic_group_name && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: departure.economic_group_color }}
                          >
                            {departure.economic_group_name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {departure.last_withdrawal_milk ? (
                        <div>
                          <div className="text-gray-900">
                            {new Date(departure.last_withdrawal_milk).toLocaleDateString('lt-LT')}
                          </div>
                          {departure.milk_conflict_days > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              +{departure.milk_conflict_days} d.
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {departure.last_withdrawal_meat ? (
                        <div>
                          <div className="text-gray-900">
                            {new Date(departure.last_withdrawal_meat).toLocaleDateString('lt-LT')}
                          </div>
                          {departure.meat_conflict_days > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              +{departure.meat_conflict_days} d.
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                      <div className="truncate" title={departure.conflict_details || ''}>
                        {departure.conflict_details || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {departure.entered_by || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Informacija apie sistemą:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Duomenys automatiškai importuojami iš Excel failo kasdien</li>
              <li>Sistema tikrina ar išvežimo data neprieštarauja karencijos laikotarpiui</li>
              <li>Raudona eilutė = yra karencijos konfliktas</li>
              <li>Geltona eilutė = gyvūnas nerastas duomenų bazėje</li>
              <li>Žalia eilutė = viskas tvarkoje</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Economic Groups Management Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingGroup ? 'Redaguoti ekonominę grupę' : 'Ekonominių grupių valdymas'}
                </h3>
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setEditingGroup(null);
                    setNewGroupName('');
                    setNewGroupDescription('');
                    setNewGroupColor('#3B82F6');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Create/Edit Group Form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  {editingGroup ? 'Redaguoti grupę' : 'Sukurti naują grupę'}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pavadinimas *
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Pvz., Pelningos karvės"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aprašymas
                    </label>
                    <textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Pasirenkamas aprašymas..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spalva
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newGroupColor}
                        onChange={(e) => setNewGroupColor(e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">{newGroupColor}</span>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white"
                        style={{ backgroundColor: newGroupColor }}
                      >
                        Pavyzdys
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEconomicGroup}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {editingGroup ? 'Išsaugoti' : 'Sukurti'}
                    </button>
                    {editingGroup && (
                      <button
                        onClick={() => {
                          setEditingGroup(null);
                          setNewGroupName('');
                          setNewGroupDescription('');
                          setNewGroupColor('#3B82F6');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Atšaukti
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Existing Groups List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Esamos grupės</h4>
                <div className="space-y-2">
                  {economicGroups.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nėra sukurtų ekonominių grupių
                    </p>
                  ) : (
                    economicGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white"
                            style={{ backgroundColor: group.color }}
                          >
                            {group.name}
                          </span>
                          {group.description && (
                            <span className="text-sm text-gray-600">{group.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => openGroupModal(group)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Redaguoti"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
