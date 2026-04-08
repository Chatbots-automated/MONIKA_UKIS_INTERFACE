import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Search, Edit, Trash2, X, Save, Grid3x3, Layers } from 'lucide-react';

interface Shelf {
  id?: string;
  shelf_id?: string;
  shelf_number: string;
  name?: string;
  shelf_name?: string;
  description: string | null;
  location: string | null;
  is_active?: boolean;
  total_compartments?: number;
  active_compartments?: number;
  total_items_stored?: number;
  total_value?: number;
}

interface Compartment {
  id: string;
  shelf_id: string;
  compartment_code: string;
  description: string | null;
  vehicle_category: 'tractor' | 'heavy_transport' | null;
  notes: string | null;
  is_active: boolean;
  items_count?: number;
  total_value?: number;
}

export function ShelvesManagement() {
  const { user, logAction } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [compartments, setCompartments] = useState<Compartment[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showCompartmentModal, setShowCompartmentModal] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [editingCompartment, setEditingCompartment] = useState<Compartment | null>(null);

  const [shelfForm, setShelfForm] = useState({
    shelf_number: '',
    name: '',
    description: '',
    location: '',
  });

  const [compartmentForm, setCompartmentForm] = useState({
    compartment_code: '',
    description: '',
    vehicle_category: '' as '' | 'tractor' | 'heavy_transport',
    notes: '',
  });

  useEffect(() => {
    loadShelves();
  }, []);

  useEffect(() => {
    const shelfId = selectedShelf?.id || selectedShelf?.shelf_id;
    if (shelfId) {
      loadCompartments(shelfId);
    } else {
      setCompartments([]);
    }
  }, [selectedShelf]);

  const loadShelves = async () => {
    const { data, error } = await supabase
      .from('equipment_shelf_summary')
      .select('*')
      .order('shelf_number');

    if (error) {
      console.error('Error loading shelves:', error);
    } else if (data) {
      setShelves(data);
    }
  };

  const loadCompartments = async (shelfId: string) => {
    const { data, error } = await supabase
      .from('equipment_compartment_summary')
      .select('*')
      .eq('shelf_id', shelfId)
      .order('compartment_code');

    if (error) {
      console.error('Error loading compartments:', error);
    } else if (data) {
      setCompartments(data);
    }
  };

  const handleOpenShelfModal = (shelf?: Shelf) => {
    if (shelf) {
      setEditingShelf(shelf);
      setShelfForm({
        shelf_number: shelf.shelf_number,
        name: shelf.name || shelf.shelf_name || '',
        description: shelf.description || '',
        location: shelf.location || '',
      });
    } else {
      setEditingShelf(null);
      setShelfForm({
        shelf_number: '',
        name: '',
        description: '',
        location: '',
      });
    }
    setShowShelfModal(true);
  };

  const handleSaveShelf = async () => {
    if (!shelfForm.shelf_number || !shelfForm.name) {
      alert('Prašome užpildyti privalomus laukus');
      return;
    }

    try {
      const shelfData = {
        shelf_number: shelfForm.shelf_number.toUpperCase(),
        name: shelfForm.name,
        description: shelfForm.description || null,
        location: shelfForm.location || null,
      };

      if (editingShelf) {
        const { error } = await supabase
          .from('equipment_shelves')
          .update(shelfData)
          .eq('id', editingShelf.id);

        if (error) throw error;
        await logAction('update_shelf', 'equipment_shelves', editingShelf.id);
        alert('Stalažas sėkmingai atnaujintas');
      } else {
        const { data, error } = await supabase
          .from('equipment_shelves')
          .insert({ ...shelfData, created_by: user?.id || null })
          .select()
          .single();

        if (error) throw error;
        await logAction('create_shelf', 'equipment_shelves', data.id);
        alert('Stalažas sėkmingai sukurtas');
      }

      setShowShelfModal(false);
      setEditingShelf(null);
      loadShelves();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleDeleteShelf = async (shelf: Shelf) => {
    if (!confirm(`Ar tikrai norite ištrinti stalažą ${shelf.shelf_number}?`)) {
      return;
    }

    try {
      const shelfId = shelf.id || shelf.shelf_id;
      if (!shelfId) return;

      const { error } = await supabase
        .from('equipment_shelves')
        .update({ is_active: false })
        .eq('id', shelfId);

      if (error) throw error;
      await logAction('delete_shelf', 'equipment_shelves', shelfId);
      alert('Stalažas ištrintas');
      loadShelves();
      const selectedShelfId = selectedShelf?.id || selectedShelf?.shelf_id;
      if (selectedShelfId === shelfId) {
        setSelectedShelf(null);
        setCompartments([]);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleOpenCompartmentModal = (compartment?: Compartment) => {
    if (!selectedShelf) {
      alert('Pirmiausia pasirinkite stalažą');
      return;
    }

    if (compartment) {
      setEditingCompartment(compartment);
      setCompartmentForm({
        compartment_code: compartment.compartment_code,
        description: compartment.description || '',
        vehicle_category: compartment.vehicle_category || '',
        notes: compartment.notes || '',
      });
    } else {
      setEditingCompartment(null);
      setCompartmentForm({
        compartment_code: '',
        description: '',
        vehicle_category: '',
        notes: '',
      });
    }
    setShowCompartmentModal(true);
  };

  const handleSaveCompartment = async () => {
    const shelfId = selectedShelf?.id || selectedShelf?.shelf_id;
    
    if (!shelfId) {
      alert('Pasirinkite stalažą iš kairės pusės');
      setShowCompartmentModal(false);
      return;
    }

    if (!compartmentForm.compartment_code) {
      alert('Prašome įvesti skyriaus kodą');
      return;
    }

    try {
      const compartmentData = {
        shelf_id: shelfId,
        compartment_code: compartmentForm.compartment_code.toUpperCase(),
        description: compartmentForm.description || null,
        vehicle_category: compartmentForm.vehicle_category || null,
        notes: compartmentForm.notes || null,
      };

      if (editingCompartment) {
        const { error } = await supabase
          .from('equipment_shelf_compartments')
          .update(compartmentData)
          .eq('id', editingCompartment.id);

        if (error) throw error;
        await logAction('update_compartment', 'equipment_shelf_compartments', editingCompartment.id);
        alert('Skyrius sėkmingai atnaujintas');
      } else {
        const { data, error } = await supabase
          .from('equipment_shelf_compartments')
          .insert({ ...compartmentData, created_by: user?.id || null })
          .select()
          .single();

        if (error) throw error;
        await logAction('create_compartment', 'equipment_shelf_compartments', data.id);
        alert('Skyrius sėkmingai sukurtas');
      }

      setShowCompartmentModal(false);
      setEditingCompartment(null);
      if (shelfId) {
        loadCompartments(shelfId);
      }
      loadShelves(); // Refresh summary
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleDeleteCompartment = async (compartment: Compartment) => {
    if (!confirm(`Ar tikrai norite ištrinti skyrių ${compartment.compartment_code}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment_shelf_compartments')
        .update({ is_active: false })
        .eq('id', compartment.id);

      if (error) throw error;
      await logAction('delete_compartment', 'equipment_shelf_compartments', compartment.id);
      alert('Skyrius ištrintas');
      if (selectedShelf) {
        loadCompartments(selectedShelf.id);
        loadShelves();
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const filteredShelves = shelves.filter(shelf =>
    shelf.shelf_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shelf.name || shelf.shelf_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Stalažai (Warehouse Shelves)</h3>
          <button
            onClick={() => handleOpenShelfModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pridėti stalažą
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti stalažo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shelves List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Stalažai ({filteredShelves.length})
            </h4>
            {filteredShelves.map(shelf => {
              const shelfId = shelf.id || shelf.shelf_id;
              const selectedShelfId = selectedShelf?.id || selectedShelf?.shelf_id;
              return (
              <div
                key={shelfId}
                onClick={() => setSelectedShelf(shelf)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedShelfId === shelfId
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-900">{shelf.shelf_number}</span>
                      <span className="text-gray-700">{shelf.name || shelf.shelf_name}</span>
                    </div>
                    {shelf.location && (
                      <p className="text-sm text-gray-600 mt-1">📍 {shelf.location}</p>
                    )}
                    {shelf.description && (
                      <p className="text-sm text-gray-500 mt-1">{shelf.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShelfModal(shelf);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShelf(shelf);
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Skyriai</p>
                    <p className="font-semibold text-gray-900">{shelf.active_compartments || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Prekės</p>
                    <p className="font-semibold text-gray-900">{shelf.total_items_stored || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Vertė</p>
                    <p className="font-semibold text-green-600">€{(shelf.total_value || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              );
            })}

            {filteredShelves.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Stalažų nerasta</p>
              </div>
            )}
          </div>

          {/* Compartments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <Grid3x3 className="w-5 h-5" />
                Skyriai {selectedShelf && `(${selectedShelf.shelf_number})`}
              </h4>
              {selectedShelf && (
                <button
                  onClick={() => handleOpenCompartmentModal()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti skyrių
                </button>
              )}
            </div>

            {selectedShelf ? (
              compartments.length > 0 ? (
                compartments.map(compartment => (
                  <div
                    key={compartment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{compartment.compartment_code}</span>
                          {compartment.vehicle_category && (
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              compartment.vehicle_category === 'tractor'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {compartment.vehicle_category === 'tractor' ? 'Traktorius' : 'Sunkvežimis'}
                            </span>
                          )}
                        </div>
                        {compartment.description && (
                          <p className="text-sm text-gray-600 mt-1">{compartment.description}</p>
                        )}
                        {compartment.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{compartment.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenCompartmentModal(compartment)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompartment(compartment)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Prekės</p>
                        <p className="font-semibold text-gray-900">{compartment.items_count || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Vertė</p>
                        <p className="font-semibold text-green-600">€{(compartment.total_value || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Skyrių nėra</p>
                  <button
                    onClick={() => handleOpenCompartmentModal()}
                    className="mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    Pridėti pirmą skyrių
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Pasirinkite stalažą iš kairės</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shelf Modal */}
      {showShelfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingShelf ? 'Redaguoti stalažą' : 'Naujas stalažas'}
              </h3>
              <button onClick={() => setShowShelfModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stalažo numeris *</label>
                <input
                  type="text"
                  value={shelfForm.shelf_number}
                  onChange={e => setShelfForm({ ...shelfForm, shelf_number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 uppercase"
                  placeholder="1, 2, A, B..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas *</label>
                <input
                  type="text"
                  value={shelfForm.name}
                  onChange={e => setShelfForm({ ...shelfForm, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Stalažas 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vieta</label>
                <input
                  type="text"
                  value={shelfForm.location}
                  onChange={e => setShelfForm({ ...shelfForm, location: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Sandėlio kairė pusė"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
                <textarea
                  value={shelfForm.description}
                  onChange={e => setShelfForm({ ...shelfForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Papildoma informacija..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowShelfModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveShelf}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {editingShelf ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compartment Modal */}
      {showCompartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCompartment ? 'Redaguoti skyrių' : 'Naujas skyrius'}
              </h3>
              <button onClick={() => setShowCompartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  Stalažas: <span className="font-semibold">{selectedShelf?.shelf_number} - {selectedShelf?.name || selectedShelf?.shelf_name}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skyriaus kodas *</label>
                <input
                  type="text"
                  value={compartmentForm.compartment_code}
                  onChange={e => setCompartmentForm({ ...compartmentForm, compartment_code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 uppercase"
                  placeholder="B2, C3, A1..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
                <input
                  type="text"
                  value={compartmentForm.description}
                  onChange={e => setCompartmentForm({ ...compartmentForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Filtrai traktoriams, Įrankiai..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporto kategorija</label>
                <select
                  value={compartmentForm.vehicle_category}
                  onChange={e => setCompartmentForm({ ...compartmentForm, vehicle_category: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Nenurodyta --</option>
                  <option value="tractor">Traktorius</option>
                  <option value="heavy_transport">Sunkvežimis</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Jei šiame skyriuje laikomi tik traktoriaus arba sunkvežimio dalys</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={compartmentForm.notes}
                  onChange={e => setCompartmentForm({ ...compartmentForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Papildoma informacija..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCompartmentModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveCompartment}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                {editingCompartment ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
