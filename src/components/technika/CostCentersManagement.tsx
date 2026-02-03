import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Archive, TrendingUp, Package, Calendar, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface CostCenter {
  id: string;
  name: string;
  description: string | null;
  color: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CostCenterSummary extends CostCenter {
  total_assignments: number;
  total_cost: number;
  first_assignment_date: string | null;
  last_assignment_date: string | null;
  children?: CostCenterSummary[];
}

interface CostCenterItem {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  product_name: string;
  product_code: string | null;
  unit_type: string;
  category_name: string | null;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  assignment_notes: string | null;
  assigned_at: string;
  assigned_by_name: string | null;
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
  const [expandedCenter, setExpandedCenter] = useState<string | null>(null);
  const [centerItems, setCenterItems] = useState<CostCenterItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    parent_id: null as string | null,
  });
  const [creatingChildFor, setCreatingChildFor] = useState<string | null>(null);

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
      const centers: CostCenterSummary[] = data.map(row => ({
        id: row.cost_center_id,
        name: row.cost_center_name,
        description: row.description,
        color: row.color,
        parent_id: row.parent_id || null,
        is_active: row.is_active,
        total_assignments: row.total_assignments || 0,
        total_cost: parseFloat(row.total_cost) || 0,
        first_assignment_date: row.first_assignment_date,
        last_assignment_date: row.last_assignment_date,
        created_at: '',
        updated_at: '',
        children: [],
      }));

      // Build hierarchy
      const centerMap = new Map<string, CostCenterSummary>();
      centers.forEach(c => centerMap.set(c.id, c));

      const rootCenters: CostCenterSummary[] = [];
      centers.forEach(center => {
        if (center.parent_id && centerMap.has(center.parent_id)) {
          const parent = centerMap.get(center.parent_id)!;
          if (!parent.children) parent.children = [];
          parent.children.push(center);
        } else {
          rootCenters.push(center);
        }
      });

      setCostCenters(rootCenters);
    }
    setLoading(false);
  };

  const loadCenterItems = async (centerId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('cost_center_parts_usage')
      .select('*')
      .eq('cost_center_id', centerId)
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Error loading cost center items:', error);
    } else if (data) {
      setCenterItems(data);
    }
    setLoadingItems(false);
  };

  const handleToggleExpand = async (centerId: string) => {
    if (expandedCenter === centerId) {
      setExpandedCenter(null);
      setCenterItems([]);
    } else {
      setExpandedCenter(centerId);
      await loadCenterItems(centerId);
    }
  };

  const handleOpenModal = (center?: CostCenter, parentId?: string | null) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        description: center.description || '',
        color: center.color,
        parent_id: center.parent_id,
      });
      setCreatingChildFor(null);
    } else {
      setEditingCenter(null);
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        parent_id: parentId || null,
      });
      setCreatingChildFor(parentId || null);
    }
    setShowModal(true);
  };

  const handleOpenChildModal = (parentCenter: CostCenter) => {
    handleOpenModal(undefined, parentCenter.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCenter(null);
    setCreatingChildFor(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      parent_id: null,
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
            parent_id: formData.parent_id,
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
            parent_id: formData.parent_id,
            created_by: user?.id,
          });

        if (error) throw error;

        await logAction('create', 'cost_centers', undefined, null, {
          name: formData.name,
          parent_id: formData.parent_id,
        });

        alert(formData.parent_id ? 'Subkaštų centras sukurtas' : 'Kaštų centras sukurtas');
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
        <div className="space-y-4">
          {costCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
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

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Produktų</p>
                      <p className="font-semibold text-gray-900">{center.total_assignments}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Viso išlaidų</p>
                      <p className="font-semibold text-gray-900">{center.total_cost.toFixed(2)} EUR</p>
                    </div>
                  </div>

                  {center.last_assignment_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Pask. priskyrimas</p>
                        <p className="font-medium text-gray-900">{center.last_assignment_date}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenChildModal(center)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Subcentras
                  </button>
                  {center.total_assignments > 0 && (
                    <button
                      onClick={() => handleToggleExpand(center.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      {expandedCenter === center.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Slėpti
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Produktai
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenModal(center)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
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

                {/* Child Cost Centers */}
                {center.children && center.children.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Subkaštų centrai:</h4>
                    {center.children.map((child) => (
                      <div key={child.id} className="ml-4 pl-4 border-l-4 bg-gray-50 rounded-lg p-4" style={{ borderLeftColor: child.color }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-6 h-6 rounded-full flex-shrink-0"
                              style={{ backgroundColor: child.color }}
                            />
                            <div>
                              <h5 className="font-semibold text-gray-900">{child.name}</h5>
                              {child.description && (
                                <p className="text-xs text-gray-600 mt-0.5">{child.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600">{child.total_assignments} produktų</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600">{child.total_cost.toFixed(2)} EUR</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(child)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white text-gray-700 rounded border hover:bg-gray-50 transition-colors text-xs font-medium"
                          >
                            <Edit2 className="w-3 h-3" />
                            Redaguoti
                          </button>
                          {child.total_assignments === 0 ? (
                            <button
                              onClick={() => handleDelete(child)}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs font-medium"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(child)}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors text-xs font-medium"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expandedCenter === center.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {loadingItems ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                      </div>
                    ) : centerItems.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Nėra priskirtų produktų</p>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Panaudojimo įrašai ({centerItems.length})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {centerItems.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.product_name}</p>
                                  {item.product_code && (
                                    <p className="text-xs text-gray-500">Kodas: {item.product_code}</p>
                                  )}
                                  {item.item_description && item.item_description !== item.product_name && (
                                    <p className="text-xs text-gray-600 mt-1">{item.item_description}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-bold text-gray-900">{item.total_price.toFixed(2)} EUR</p>
                                  <p className="text-xs text-gray-600">{item.quantity} {item.unit_type} × {item.unit_price.toFixed(2)} EUR</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-slate-300">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{item.invoice_number}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{item.invoice_date}</span>
                                  </div>
                                  {item.category_name && (
                                    <span className="px-2 py-0.5 bg-slate-200 rounded text-xs">{item.category_name}</span>
                                  )}
                                </div>
                                {item.supplier_name && (
                                  <span className="text-gray-600">{item.supplier_name}</span>
                                )}
                              </div>
                              {item.assignment_notes && (
                                <p className="text-xs text-gray-600 mt-2 italic">Pastaba: {item.assignment_notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingCenter ? 'Redaguoti kaštų centrą' : creatingChildFor ? 'Naujas subkaštų centras' : 'Naujas kaštų centras'}
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

              {!creatingChildFor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pagrindinis centras (nebūtinas)
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={creatingChildFor !== null}
                  >
                    <option value="">Nėra - tai pagrindinis centras</option>
                    {costCenters.map((center) => (
                      <option key={center.id} value={center.id} disabled={editingCenter?.id === center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Pasirinkite pagrindinį centrą, kad šis būtų jo subcentras
                  </p>
                </div>
              )}

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
