import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Plus, Trash2, Edit2, Save, X, Search, CheckCircle, XCircle } from 'lucide-react';

interface Worker {
  id: string;
  full_name: string;
  email: string | null;
  work_location: string;
}

interface WorkerCode {
  id: string;
  code: string;
  worker_id: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  notes: string | null;
  worker?: {
    full_name: string;
    work_location: string;
  };
}

export function WorkerCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<WorkerCode[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCode, setEditingCode] = useState<WorkerCode | null>(null);
  
  const [newCode, setNewCode] = useState({
    code: '',
    worker_id: '',
    notes: ''
  });

  useEffect(() => {
    loadCodes();
    loadWorkers();
  }, []);

  const loadCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('worker_login_codes')
        .select(`
          *,
          worker:users!worker_login_codes_worker_id_fkey(full_name, work_location)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error loading codes:', error);
      alert('Klaida įkeliant kodus');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, work_location')
        .in('role', ['farm_worker', 'warehouse_worker'])
        .order('full_name');

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code.trim() || !newCode.worker_id) {
      alert('Prašome įvesti kodą ir pasirinkti darbuotoją');
      return;
    }

    // Check if worker already has a code
    const existingCode = codes.find(c => c.worker_id === newCode.worker_id && c.is_active);
    if (existingCode) {
      alert('Šis darbuotojas jau turi aktyvų kodą!');
      return;
    }

    try {
      const { error } = await supabase
        .from('worker_login_codes')
        .insert({
          code: newCode.code.trim().toUpperCase(),
          worker_id: newCode.worker_id,
          notes: newCode.notes.trim() || null,
          created_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          alert('Šis kodas jau egzistuoja! Pasirinkite kitą kodą.');
          return;
        }
        throw error;
      }

      alert('Kodas sėkmingai sukurtas!');
      setShowAddModal(false);
      setNewCode({ code: '', worker_id: '', notes: '' });
      loadCodes();
    } catch (error) {
      console.error('Error creating code:', error);
      alert('Klaida kuriant kodą');
    }
  };

  const handleUpdateCode = async (codeId: string, updates: Partial<WorkerCode>) => {
    try {
      const { error } = await supabase
        .from('worker_login_codes')
        .update(updates)
        .eq('id', codeId);

      if (error) throw error;
      
      loadCodes();
      setEditingCode(null);
    } catch (error) {
      console.error('Error updating code:', error);
      alert('Klaida atnaujinant kodą');
    }
  };

  const handleToggleActive = async (code: WorkerCode) => {
    await handleUpdateCode(code.id, { is_active: !code.is_active });
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį kodą?')) return;

    try {
      const { error } = await supabase
        .from('worker_login_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      
      alert('Kodas sėkmingai ištrintas!');
      loadCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      alert('Klaida trinant kodą');
    }
  };

  const filteredCodes = codes.filter(code => {
    const searchLower = searchTerm.toLowerCase();
    return (
      code.code.toLowerCase().includes(searchLower) ||
      code.worker?.full_name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-7 h-7 text-red-600" />
            Darbuotojų prisijungimo kodai
          </h2>
          <p className="text-gray-600 mt-1">
            Kodai darbuotojams, kurie neturi el. pašto adresų
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Sukurti kodą
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Viso kodų</div>
          <div className="text-3xl font-bold text-blue-900">{codes.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Aktyvūs</div>
          <div className="text-3xl font-bold text-green-900">
            {codes.filter(c => c.is_active).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 font-medium">Neaktyvūs</div>
          <div className="text-3xl font-bold text-amber-900">
            {codes.filter(c => !c.is_active).length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Ieškoti pagal kodą arba darbuotoją..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kodas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Darbuotojas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vieta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paskutinį kartą naudotas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statusas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pastabos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Veiksmai
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Kodų nerasta' : 'Nėra sukurtų kodų'}
                </td>
              </tr>
            ) : (
              filteredCodes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-lg text-gray-900">
                      {code.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {code.worker?.full_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      code.worker?.work_location === 'farm'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {code.worker?.work_location === 'farm' ? 'Ūkis' : 'Sandėlis'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.last_used_at
                      ? new Date(code.last_used_at).toLocaleString('lt-LT')
                      : 'Nenaudotas'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {code.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Aktyvus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Neaktyvus
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {editingCode?.id === code.id ? (
                      <input
                        type="text"
                        value={editingCode.notes || ''}
                        onChange={(e) => setEditingCode({ ...editingCode, notes: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        placeholder="Pastabos..."
                      />
                    ) : (
                      code.notes || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {editingCode?.id === code.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateCode(code.id, { notes: editingCode.notes })}
                            className="text-green-600 hover:text-green-900"
                            title="Išsaugoti"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCode(null)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Atšaukti"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingCode(code)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Redaguoti pastabas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(code)}
                            className={`${
                              code.is_active
                                ? 'text-amber-600 hover:text-amber-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={code.is_active ? 'Deaktyvuoti' : 'Aktyvuoti'}
                          >
                            {code.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Ištrinti"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Code Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-red-600" />
              Sukurti naują kodą
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kodas *
                </label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="pvz. GG2007"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-lg"
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Rekomenduojama: raidės + skaičiai (pvz. AB1234)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Darbuotojas *
                </label>
                <select
                  value={newCode.worker_id}
                  onChange={(e) => setNewCode({ ...newCode, worker_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Pasirinkite darbuotoją...</option>
                  {workers
                    .filter(w => !codes.find(c => c.worker_id === w.id && c.is_active))
                    .map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name} ({worker.work_location === 'farm' ? 'Ūkis' : 'Sandėlis'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pastabos
                </label>
                <textarea
                  value={newCode.notes}
                  onChange={(e) => setNewCode({ ...newCode, notes: e.target.value })}
                  placeholder="Papildoma informacija..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateCode}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sukurti
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCode({ code: '', worker_id: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Atšaukti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
