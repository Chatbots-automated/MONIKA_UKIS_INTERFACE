import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Archive, TrendingUp, Package, Calendar, Trash2 } from 'lucide-react';

interface CostCenter {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CostCenterSummary extends CostCenter {
  total_assignments: number;
  total_cost: number;
  first_assignment_date: string | null;
  last_assignment_date: string | null;
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Slate', value: '#64748B' },
  { name: 'Emerald', value: '#059669' },
];

export function CostCentersManagement() {
  const { user, logAction } = useAuth();
  const [costCenters, setCostCenters] = useState<CostCenterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    loadCostCenters();
  }, []);

  const loadCostCenters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cost_center_summary')
      .select('*')
      .order('cost_center_name');

    if (error) {
      console.error('Error loading cost centers:', error);
    } else if (data) {
      setCostCenters(data.map(row => ({
        id: row.cost_center_id,
        name: row.cost_center_name,
        description: row.description,
        color: row.color,
        is_active: row.is_active,
        total_assignments: row.total_assignments || 0,
        total_cost: parseFloat(row.total_cost) || 0,
        first_assignment_date: row.first_assignment_date,
        last_assignment_date: row.last_assignment_date,
        created_at: '',
        updated_at: '',
      })));
    }
    setLoading(false);
  };

  const handleOpenModal = (center?: CostCenter) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        description: center.description || '',
        color: center.color,
      });
    } else {
      setEditingCenter(null);
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCenter(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Prašome įvesti pavadinimą');
      return;
    }

    try {
      if (editingCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
          })
          .eq('id', editingCenter.id);

        if (error) throw error;

        await logAction('update', 'cost_centers', editingCenter.id, null, {
          name: formData.name,
        });

        alert('Kaštų centras atnaujintas');
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            created_by: user?.id,
          });

        if (error) throw error;

        await logAction('create', 'cost_centers', undefined, null, {
          name: formData.name,
        });

        alert('Kaštų centras sukurtas');
      }

      handleCloseModal();
      loadCostCenters();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      alert('Klaida: ' + error.message);
    }
  };

  const handleArchive = async (center: CostCenter) => {
    if (!confirm(`Ar tikrai norite archyvuoti "${center.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cost_centers')
        .update({ is_active: false })
        .eq('id', center.id);

      if (error) throw error;

      await logAction('archive', 'cost_centers', center.id, null, {
        name: center.name,
      });

      alert('Kaštų centras archyvuotas');
      loadCostCenters();
    } catch (error: any) {
      console.error('Error archiving cost center:', error);
      alert('Klaida: ' + error.message);
    }
  };

  const handleDelete = async (center: CostCenterSummary) => {
    if (center.total_assignments > 0) {
      alert('Negalima ištrinti kaštų centro, kuris turi priskirtų produktų. Pirmiausia archyvuokite.');
      return;
    }

    if (!confirm(`Ar tikrai norite ištrinti "${center.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', center.id);

      if (error) throw error;

      await logAction('delete', 'cost_centers', center.id, null, {
        name: center.name,
      });

      alert('Kaštų centras ištrintas');
      loadCostCenters();
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      alert('Klaida: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kaštų centrai</h2>
          <p className="text-gray-600 mt-1">
            Sukurkite ir tvarkykite kaštų centrus produktų priskyrimui
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Naujas kaštų centras
        </button>
      </div>

      {costCenters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nėra kaštų centrų
          </h3>
          <p className="text-gray-600 mb-4">
            Sukurkite pirmą kaštų centrą, kad galėtumėte priskirti produktus
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" />
            Sukurti kaštų centrą
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {costCenters.map((center) => (
            <div
              key={center.id}
              className="bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all overflow-hidden"
            >
              <div
                className="h-3"
                style={{ backgroundColor: center.color }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {center.name}
                    </h3>
                    {center.description && (
                      <p className="text-sm text-gray-600">{center.description}</p>
                    )}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ml-3"
                    style={{ backgroundColor: center.color }}
                  />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Produktų:</span>
                    <span className="font-semibold text-gray-900">
                      {center.total_assignments}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Viso išlaidų:</span>
                    <span className="font-semibold text-gray-900">
                      {center.total_cost.toFixed(2)} EUR
                    </span>
                  </div>

                  {center.last_assignment_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Pask. priskyrimas:</span>
                      <span className="font-medium text-gray-900">
                        {center.last_assignment_date}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenModal(center)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Redaguoti
                  </button>
                  {center.total_assignments === 0 ? (
                    <button
                      onClick={() => handleDelete(center)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(center)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingCenter ? 'Redaguoti kaštų centrą' : 'Naujas kaštų centras'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pavadinimas *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Pvz.: Fermos projektas, Traktorių remontas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aprašymas
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Kaštų centro aprašymas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spalva
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`relative h-12 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {formData.color === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-gray-900 rounded-full" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                {editingCenter ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
