import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Wrench, Plus, Search, User, MapPin, CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';

interface Tool {
  id: string;
  tool_number: string;
  name: string | null;
  type: string;
  condition: string;
  serial_number: string;
  is_available: boolean;
  current_holder: string | null;
  notes: string;
  product: {
    name: string;
  } | null;
  holder: {
    full_name: string;
  } | null;
  location: {
    name: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

export function ToolsManagement() {
  const { user, logAction } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAvailable, setFilterAvailable] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [newToolForm, setNewToolForm] = useState({
    name: '',
    product_id: '',
    tool_number: '',
    serial_number: '',
    type: 'manual',
    condition: 'good',
    location_id: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [toolsRes, productsRes, locationsRes] = await Promise.all([
      supabase.from('tools').select(`
        id,
        tool_number,
        name,
        type,
        condition,
        serial_number,
        is_available,
        current_holder,
        current_location_id,
        product_id,
        notes
      `).order('tool_number'),
      supabase.from('equipment_products').select('id, name').eq('is_active', true).order('name'),
      supabase.from('equipment_locations').select('id, name').eq('is_active', true).order('name'),
    ]);

    if (toolsRes.data) {
      const toolsWithRelations = await Promise.all(
        toolsRes.data.map(async (tool: any) => {
          const relations: any = { ...tool, product: null, holder: null, location: null };

          if (tool.product_id) {
            const { data: product } = await supabase
              .from('equipment_products')
              .select('name')
              .eq('id', tool.product_id)
              .maybeSingle();
            relations.product = product;
          }

          if (tool.current_holder) {
            const { data: holder } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', tool.current_holder)
              .maybeSingle();
            relations.holder = holder;
          }

          if (tool.current_location_id) {
            const { data: location } = await supabase
              .from('equipment_locations')
              .select('name')
              .eq('id', tool.current_location_id)
              .maybeSingle();
            relations.location = location;
          }

          return relations;
        })
      );
      setTools(toolsWithRelations);
    }
    if (productsRes.data) setProducts(productsRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
  };

  const loadTools = loadData;

  const filteredTools = tools.filter(tool => {
    const matchesSearch =
      tool.tool_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || tool.type === filterType;
    const matchesAvailable =
      filterAvailable === 'all' ||
      (filterAvailable === 'available' && tool.is_available) ||
      (filterAvailable === 'checked_out' && !tool.is_available);

    return matchesSearch && matchesType && matchesAvailable;
  });

  const handleCheckout = async (tool: Tool) => {
    if (!user) return;

    try {
      await supabase.from('tool_movements').insert({
        tool_id: tool.id,
        movement_type: 'checkout',
        to_holder: user.id,
        from_location_id: tool.current_location_id,
        movement_date: new Date().toISOString(),
        recorded_by: user.id,
      });

      await supabase
        .from('tools')
        .update({
          current_holder: user.id,
          is_available: false,
          current_location_id: null,
        })
        .eq('id', tool.id);

      await logAction('checkout_tool', { tool_id: tool.id, tool_number: tool.tool_number });
      loadTools();
      alert('Įrankis sėkmingai išduotas');
    } catch (error) {
      console.error('Error:', error);
      alert('Klaida išduodant įrankį');
    }
  };

  const handleReturn = async (tool: Tool) => {
    try {
      await supabase.from('tool_movements').insert({
        tool_id: tool.id,
        movement_type: 'return',
        from_holder: tool.current_holder,
        movement_date: new Date().toISOString(),
        recorded_by: user?.id,
      });

      await supabase
        .from('tools')
        .update({
          current_holder: null,
          is_available: true,
        })
        .eq('id', tool.id);

      await logAction('return_tool', { tool_id: tool.id, tool_number: tool.tool_number });
      loadTools();
      alert('Įrankis sėkmingai grąžintas');
    } catch (error) {
      console.error('Error:', error);
      alert('Klaida grąžinant įrankį');
    }
  };

  const handleAddTool = async () => {
    if (!newToolForm.tool_number || (!newToolForm.name && !newToolForm.product_id)) {
      alert('Prašome užpildyti įrankio numerį ir pavadinimą (arba pasirinkti produktą)');
      return;
    }

    try {
      const { error } = await supabase.from('tools').insert({
        name: newToolForm.name || null,
        product_id: newToolForm.product_id || null,
        tool_number: newToolForm.tool_number,
        serial_number: newToolForm.serial_number || null,
        type: newToolForm.type,
        condition: newToolForm.condition,
        current_location_id: newToolForm.location_id || null,
        notes: newToolForm.notes || null,
        is_available: true,
      });

      if (error) throw error;

      await logAction('add_tool', { tool_number: newToolForm.tool_number });
      setShowAddModal(false);
      setNewToolForm({
        name: '',
        product_id: '',
        tool_number: '',
        serial_number: '',
        type: 'manual',
        condition: 'good',
        location_id: '',
        notes: '',
      });
      loadData();
      alert('Įrankis sėkmingai pridėtas');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida pridedant įrankį: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Įrankių valdymas</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pridėti įrankį
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal numerį, pavadinimą..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi tipai</option>
            <option value="manual">Rankiniai</option>
            <option value="electric">Elektriniai</option>
            <option value="pneumatic">Pneumatiniai</option>
            <option value="hydraulic">Hidrauliniai</option>
          </select>
          <select
            value={filterAvailable}
            onChange={e => setFilterAvailable(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi</option>
            <option value="available">Prieinami</option>
            <option value="checked_out">Išduoti</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map(tool => (
            <div
              key={tool.id}
              className={`border rounded-lg p-4 transition-all ${
                tool.is_available ? 'border-gray-200 hover:border-slate-400' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wrench className={`w-5 h-5 ${tool.is_available ? 'text-slate-600' : 'text-amber-600'}`} />
                  <span className="font-semibold text-gray-800">{tool.tool_number}</span>
                </div>
                {tool.is_available ? (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Prieinamas</span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">Išduotas</span>
                )}
              </div>

              <h4 className="font-medium text-gray-800 mb-2">{tool.name || tool.product?.name || 'Įrankis'}</h4>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p>Tipas: {tool.type === 'manual' ? 'Rankinis' : tool.type === 'electric' ? 'Elektrinis' : tool.type === 'pneumatic' ? 'Pneumatinis' : 'Hidraulinis'}</p>
                <p>Būklė: {tool.condition === 'new' ? 'Naujas' : tool.condition === 'good' ? 'Gera' : tool.condition === 'fair' ? 'Patenkinama' : 'Prasta'}</p>
                {tool.serial_number && <p>Serijos nr.: {tool.serial_number}</p>}
              </div>

              {tool.holder && (
                <div className="flex items-center gap-2 text-sm text-amber-700 mb-3">
                  <User className="w-4 h-4" />
                  <span>{tool.holder.full_name}</span>
                </div>
              )}

              {tool.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{tool.location.name}</span>
                </div>
              )}

              {tool.is_available ? (
                <button
                  onClick={() => handleCheckout(tool)}
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                >
                  Išduoti
                </button>
              ) : (
                <button
                  onClick={() => handleReturn(tool)}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Grąžinti
                </button>
              )}
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Įrankių nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viso įrankių" value={tools.length.toString()} color="blue" />
        <StatCard title="Prieinami" value={tools.filter(t => t.is_available).length.toString()} color="green" />
        <StatCard title="Išduoti" value={tools.filter(t => !t.is_available).length.toString()} color="amber" />
        <StatCard title="Reikia taisyti" value={tools.filter(t => t.condition === 'needs_repair').length.toString()} color="red" />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Pridėti naują įrankį</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Įrankio numeris *</label>
                <input
                  type="text"
                  value={newToolForm.tool_number}
                  onChange={(e) => setNewToolForm({ ...newToolForm, tool_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="T-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas *</label>
                <input
                  type="text"
                  value={newToolForm.name}
                  onChange={(e) => setNewToolForm({ ...newToolForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Veržliaraktis 10mm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produktas (nebūtina)</label>
                <select
                  value={newToolForm.product_id}
                  onChange={(e) => setNewToolForm({ ...newToolForm, product_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite produktą</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serijos numeris</label>
                <input
                  type="text"
                  value={newToolForm.serial_number}
                  onChange={(e) => setNewToolForm({ ...newToolForm, serial_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
                  <select
                    value={newToolForm.type}
                    onChange={(e) => setNewToolForm({ ...newToolForm, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="manual">Rankinis</option>
                    <option value="electric">Elektrinis</option>
                    <option value="pneumatic">Pneumatinis</option>
                    <option value="hydraulic">Hidraulinis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Būklė</label>
                  <select
                    value={newToolForm.condition}
                    onChange={(e) => setNewToolForm({ ...newToolForm, condition: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="new">Naujas</option>
                    <option value="good">Gera</option>
                    <option value="fair">Patenkinama</option>
                    <option value="needs_repair">Reikia taisyti</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokacija</label>
                <select
                  value={newToolForm.location_id}
                  onChange={(e) => setNewToolForm({ ...newToolForm, location_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite lokaciją</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={newToolForm.notes}
                  onChange={(e) => setNewToolForm({ ...newToolForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewToolForm({
                    name: '',
                    product_id: '',
                    tool_number: '',
                    serial_number: '',
                    type: 'manual',
                    condition: 'good',
                    location_id: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleAddTool}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
              >
                Pridėti įrankį
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
