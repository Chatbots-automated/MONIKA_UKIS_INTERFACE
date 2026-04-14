import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Filter, 
  Download, 
  Check, 
  X, 
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { exportWriteOffActToCSV } from '../utils/writeOffExport';

interface WriteOffAct {
  id: string;
  act_number: string;
  act_date: string;
  period_start: string;
  period_end: string;
  department: string | null;
  module: 'technika' | 'veterinarija';
  status: 'draft' | 'approved' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  items?: WriteOffActItem[];
}

interface WriteOffActItem {
  id: string;
  act_id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  category_name: string | null;
  unit_type: string;
  quantity_used: number;
  unit_price: number;
  total_price: number;
  batch_id: string | null;
  batch_number: string | null;
  batch_lot: string | null;
  batch_created_date: string | null;
  line_number: number | null;
  notes: string | null;
  received_qty?: number;
  qty_remaining?: number;
}

export function WriteOffActs() {
  const { user } = useAuth();
  const [acts, setActs] = useState<WriteOffAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAct, setExpandedAct] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<'all' | 'technika' | 'veterinarija'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'approved' | 'cancelled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [populatingActId, setPopulatingActId] = useState<string | null>(null);
  const [combineBatches, setCombineBatches] = useState(true); // Default to combined view

  // New act form
  const [newAct, setNewAct] = useState({
    module: 'technika' as 'technika' | 'veterinarija',
    department: '',
    period_start: '',
    period_end: '',
    act_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadActs();
  }, [filterModule, filterStatus]);

  const loadActs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('write_off_acts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterModule !== 'all') {
        query = query.eq('module', filterModule);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActs(data || []);
    } catch (error) {
      console.error('Error loading write-off acts:', error);
      alert('Klaida kraunant nurašymo aktus');
    } finally {
      setLoading(false);
    }
  };

  const loadActItems = async (actId: string) => {
    try {
      const { data, error } = await supabase
        .from('write_off_act_items')
        .select('*')
        .eq('act_id', actId)
        .order('category_name', { ascending: true })
        .order('line_number', { ascending: true });

      if (error) throw error;

      // Update the act with items
      setActs(prev => prev.map(act => 
        act.id === actId ? { ...act, items: data || [] } : act
      ));
    } catch (error) {
      console.error('Error loading act items:', error);
    }
  };

  const handleToggleExpand = async (actId: string) => {
    if (expandedAct === actId) {
      setExpandedAct(null);
    } else {
      setExpandedAct(actId);
      const act = acts.find(a => a.id === actId);
      if (act && !act.items) {
        await loadActItems(actId);
      }
    }
  };

  const handleCreateAct = async () => {
    if (!newAct.period_start || !newAct.period_end) {
      alert('Prašome pasirinkti periodo pradžią ir pabaigą');
      return;
    }

    try {
      // Generate act number client-side as fallback
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      const actNumber = `NA-${year}-${newAct.module}-${timestamp}`;

      // Try to use RPC function first, fallback to client-generated number
      let finalActNumber = actNumber;
      try {
        const { data: actNumberData, error: actNumberError } = await supabase
          .rpc('generate_write_off_act_number', { p_module: newAct.module });

        if (!actNumberError && actNumberData) {
          finalActNumber = actNumberData;
        }
      } catch (rpcError) {
        console.warn('RPC function failed, using client-generated number:', rpcError);
      }

      // Create the act
      const { data: act, error: actError } = await supabase
        .from('write_off_acts')
        .insert({
          act_number: finalActNumber,
          act_date: newAct.act_date,
          period_start: newAct.period_start,
          period_end: newAct.period_end,
          department: newAct.department || null,
          module: newAct.module,
          status: 'draft',
          notes: newAct.notes || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (actError) throw actError;

      setShowCreateModal(false);
      setNewAct({
        module: 'technika',
        department: '',
        period_start: '',
        period_end: '',
        act_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      // Navigate to the new act and auto-populate
      setExpandedAct(act.id);
      await loadActs();
      
      // Auto-populate immediately
      if (confirm(`Nurašymo aktas ${finalActNumber} sukurtas! Ar norite automatiškai užpildyti jį su panaudotomis prekėmis?`)) {
        await handleAutoPopulate(act);
      }
    } catch (error) {
      console.error('Error creating write-off act:', error);
      alert('Klaida kuriant nurašymo aktą');
    }
  };

  const handleApproveAct = async (actId: string) => {
    if (!confirm('Ar tikrai norite patvirtinti šį nurašymo aktą? Po patvirtinimo jis negalės būti redaguojamas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('write_off_acts')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', actId);

      if (error) throw error;

      alert('Nurašymo aktas patvirtintas!');
      loadActs();
    } catch (error: any) {
      console.error('Error approving act:', error);
      alert('Klaida: ' + (error.message || 'Nepavyko patvirtinti akto'));
    }
  };

  const handleDeleteAct = async (actId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį nurašymo aktą?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('write_off_acts')
        .delete()
        .eq('id', actId);

      if (error) throw error;

      alert('Nurašymo aktas ištrintas');
      loadActs();
    } catch (error) {
      console.error('Error deleting act:', error);
      alert('Klaida trinant nurašymo aktą');
    }
  };

  const handleAutoPopulate = async (act: WriteOffAct) => {
    if (!confirm(`Ar tikrai norite automatiškai užpildyti aktą ${act.act_number} su panaudotomis prekėmis iš periodo ${new Date(act.period_start).toLocaleDateString('lt-LT')} - ${new Date(act.period_end).toLocaleDateString('lt-LT')}?`)) {
      return;
    }

    setPopulatingActId(act.id);

    try {
      // Use combined or detailed function based on toggle
      const functionName = combineBatches ? 'populate_write_off_act_combined' : 'populate_write_off_act';
      
      const { data, error } = await supabase.rpc(functionName, {
        p_act_id: act.id,
        p_module: act.module,
        p_period_start: act.period_start,
        p_period_end: act.period_end
      });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        alert(`Sėkmingai pridėta ${result.items_added} prekių. Bendra suma: €${result.total_amount.toFixed(2)}`);
        
        // Reload the act items
        await loadActItems(act.id);
        await loadActs(); // Refresh to update total amount
      } else {
        alert('Nerasta panaudotų prekių šiame periode');
      }
    } catch (error: any) {
      console.error('Error auto-populating act:', error);
      alert('Klaida: ' + (error.message || 'Nepavyko užpildyti akto'));
    } finally {
      setPopulatingActId(null);
    }
  };

  const handleExportAct = async (act: WriteOffAct) => {
    try {
      // Make sure we have the items loaded
      if (!act.items) {
        await loadActItems(act.id);
        // Get the updated act with items
        const updatedAct = acts.find(a => a.id === act.id);
        if (!updatedAct?.items) {
          alert('Nepavyko užkrauti akto prekių');
          return;
        }
        act = updatedAct;
      }

      if (act.items.length === 0) {
        alert('Akte nėra prekių. Užpildykite aktą prieš eksportuojant.');
        return;
      }

      // Export to CSV
      exportWriteOffActToCSV({
        act_number: act.act_number,
        act_date: act.act_date,
        period_start: act.period_start,
        period_end: act.period_end,
        department: act.department,
        module: act.module,
        total_amount: act.total_amount,
        items: act.items.map(item => ({
          product_name: item.product_name,
          product_code: item.product_code,
          category_name: item.category_name,
          unit_type: item.unit_type,
          quantity_used: item.quantity_used,
          unit_price: item.unit_price,
          total_price: item.total_price,
          batch_number: item.batch_number,
          line_number: item.line_number,
          received_qty: item.received_qty,
          qty_remaining: item.qty_remaining
        }))
      });

      alert('Nurašymo aktas sėkmingai eksportuotas!');
    } catch (error) {
      console.error('Error exporting act:', error);
      alert('Klaida eksportuojant aktą');
    }
  };

  const handleSetPeriodPreset = (preset: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisweek' | 'lastweek' | 'thismonth' | 'lastmonth' | 'thisquarter' | 'thisyear') => {
    const today = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = start;
        break;
      case 'last7days':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = today;
        break;
      case 'last30days':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = today;
        break;
      case 'thisweek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1); // Monday
        end = today;
        break;
      case 'lastweek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 6); // Last Monday
        end = new Date(start);
        end.setDate(start.getDate() + 6); // Last Sunday
        break;
      case 'thismonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'lastmonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisquarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = today;
        break;
      case 'thisyear':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
    }

    setNewAct(prev => ({
      ...prev,
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0]
    }));
  };

  const filteredActs = acts.filter(act =>
    act.act_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (act.department && act.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canApprove = user?.role === 'admin' || user?.role === 'buhaltere';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Nurašymo aktai</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Sukurti naują aktą
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterModule('all')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visi
          </button>
          <button
            onClick={() => setFilterModule('technika')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'technika'
                ? 'bg-slate-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Technika
          </button>
          <button
            onClick={() => setFilterModule('veterinarija')}
            className={`px-4 py-2 rounded-lg ${
              filterModule === 'veterinarija'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Veterinarija
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-2 rounded-lg text-sm ${
              filterStatus === 'all'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visi statusai
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`px-3 py-2 rounded-lg text-sm ${
              filterStatus === 'draft'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Juodraščiai
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-2 rounded-lg text-sm ${
              filterStatus === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Patvirtinti
          </button>
        </div>

        <input
          type="text"
          placeholder="Ieškoti pagal numerį ar padalinį..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
        />
      </div>

      {/* Acts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Kraunama...</p>
          </div>
        ) : filteredActs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nurašymo aktų nerasta</p>
          </div>
        ) : (
          filteredActs.map(act => (
            <div key={act.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => handleToggleExpand(act.id)}
                    className="flex-1 text-left flex items-start gap-3"
                  >
                    {expandedAct === act.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 mt-1" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{act.act_number}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          act.module === 'technika'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {act.module === 'technika' ? 'Technika' : 'Veterinarija'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          act.status === 'draft'
                            ? 'bg-amber-100 text-amber-700'
                            : act.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {act.status === 'draft' ? 'Juodraštis' : act.status === 'approved' ? 'Patvirtintas' : 'Atšauktas'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Periodas: {new Date(act.period_start).toLocaleDateString('lt-LT')} - {new Date(act.period_end).toLocaleDateString('lt-LT')}
                        </span>
                        {act.department && (
                          <span>Padalinys: {act.department}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sukurta: {new Date(act.created_at).toLocaleDateString('lt-LT')}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Suma</p>
                      <p className="text-lg font-bold text-blue-600">€{act.total_amount.toFixed(2)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-4">
                    {act.status === 'draft' && canApprove && (
                      <button
                        onClick={() => handleApproveAct(act.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Patvirtinti"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    {act.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteAct(act.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Ištrinti"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleExportAct(act)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Eksportuoti į CSV"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Items */}
              {expandedAct === act.id && act.items && (
                <div className="border-t bg-gray-50 p-4">
                  {act.items.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">Šiame akte nėra prekių</p>
                      {act.status === 'draft' && (
                        <button
                          onClick={() => handleAutoPopulate(act)}
                          disabled={populatingActId === act.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                        >
                          {populatingActId === act.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Užpildoma...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Užpildyti automatiškai
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Info note */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                        <p className="font-medium text-blue-900 mb-1">ℹ️ Stulpelių paaiškinimas:</p>
                        <ul className="text-xs space-y-1 text-gray-600">
                          <li><strong>Panaudota:</strong> Kiekis panaudotas per šį ataskaitinį periodą iš konkrečios partijos</li>
                          <li><strong>Likutis:</strong> Kiek liko šioje konkrečioje partijoje (Gauta - Panaudota iš viso = Likutis)</li>
                        </ul>
                      </div>

                      {/* Re-populate button for draft acts with items */}
                      {act.status === 'draft' && (
                        <div className="flex justify-between items-center mb-4">
                          {/* Batch combination toggle */}
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={combineBatches}
                                onChange={(e) => setCombineBatches(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span>Sujungti partijas su tuo pačiu numeriu</span>
                            </label>
                            <div className="group relative">
                              <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Jei įjungta, partijos su tuo pačiu numeriu bus sujungtos į vieną eilutę su vidutine kaina
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                          <button
                            onClick={() => handleAutoPopulate(act)}
                            disabled={populatingActId === act.id}
                            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {populatingActId === act.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                                Atnaujinama...
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                Atnaujinti iš naujo
                              </>
                            )}
                          </button>
                          </div>
                        </div>
                      )}

                      {/* Group by category - TABLE VIEW */}
                      {Object.entries(
                        act.items.reduce((acc, item) => {
                          const cat = item.category_name || 'Kita';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(item);
                          return acc;
                        }, {} as Record<string, WriteOffActItem[]>)
                      ).map(([category, items]) => (
                        <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">{category}</h4>
                          </div>
                          
                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Nr.</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pavadinimas</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Partija</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Panaudota</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Likutis</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Vnt. kaina</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Suma</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {items.map((item, idx) => {
                                  const usagePercent = item.received_qty ? ((item.quantity_used / item.received_qty) * 100) : 0;
                                  
                                  return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                      <td className="px-3 py-2">
                                        <div>
                                          <p className="font-medium text-gray-900">{item.product_name}</p>
                                          {item.product_code && (
                                            <p className="text-xs text-gray-500">Kodas: {item.product_code}</p>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="text-xs">
                                          <p className="font-medium text-gray-900">{item.batch_number || '-'}</p>
                                          {item.batch_created_date && (
                                            <p className="text-gray-500">
                                              {new Date(item.batch_created_date).toLocaleDateString('lt-LT')}
                                            </p>
                                          )}
                                          {item.notes && (
                                            <p className="text-xs text-blue-600 mt-1">
                                              {item.notes}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {item.quantity_used.toFixed(2)} {item.unit_type}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            šiame periode
                                          </p>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="space-y-1">
                                          <p className={`font-medium ${
                                            (item.qty_remaining || 0) === 0 
                                              ? 'text-red-600' 
                                              : (item.qty_remaining || 0) < (item.received_qty || 0) * 0.2 
                                              ? 'text-amber-600' 
                                              : 'text-green-600'
                                          }`}>
                                            {(item.qty_remaining || 0).toFixed(2)} {item.unit_type}
                                          </p>
                                          {item.received_qty && (
                                            <div className="text-xs text-gray-500 space-y-0.5">
                                              <div className="flex justify-between gap-2">
                                                <span>Gauta:</span>
                                                <span className="font-medium">{item.received_qty.toFixed(2)}</span>
                                              </div>
                                              <div className="flex justify-between gap-2">
                                                <span>Panaudota iš viso:</span>
                                                <span className="font-medium">{(item.received_qty - item.qty_remaining).toFixed(2)}</span>
                                              </div>
                                              <div className="flex justify-between gap-2 border-t border-gray-300 pt-0.5">
                                                <span>Liko:</span>
                                                <span className="font-medium">{item.qty_remaining.toFixed(2)}</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-600">
                                        €{item.unit_price.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-green-600">
                                        €{item.total_price.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr>
                                  <td colSpan={2} className="px-3 py-2 text-left font-semibold text-gray-900">
                                    {category} viso:
                                  </td>
                                  <td className="px-3 py-2 text-right text-sm text-gray-600">
                                    {items.length} partij{items.length === 1 ? 'a' : 'os'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                                    {items.reduce((sum, item) => sum + item.quantity_used, 0).toFixed(2)} {items[0]?.unit_type}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-700">
                                    {items.reduce((sum, item) => sum + (item.qty_remaining || 0), 0).toFixed(2)} {items[0]?.unit_type}
                                  </td>
                                  <td className="px-3 py-2"></td>
                                  <td className="px-3 py-2 text-right font-bold text-blue-600">
                                    €{items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ))}

                      {/* Grand Total Summary */}
                      {act.items && act.items.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                          <h4 className="text-lg font-bold text-gray-900 mb-4">Bendra suvestinė</h4>
                          
                          {/* Category Totals */}
                          <div className="space-y-2 mb-4">
                            {Object.entries(
                              act.items.reduce((acc, item) => {
                                const cat = item.category_name || 'Kita';
                                if (!acc[cat]) acc[cat] = 0;
                                acc[cat] += item.total_price;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([category, total]) => (
                              <div key={category} className="flex justify-between items-center py-2 border-b border-blue-200">
                                <span className="font-medium text-gray-700">{category}:</span>
                                <span className="font-semibold text-gray-900">
                                  €{total.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Grand Total */}
                          <div className="flex justify-between items-center pt-4 border-t-2 border-blue-300">
                            <span className="text-xl font-bold text-gray-900">VISO:</span>
                            <span className="text-2xl font-bold text-blue-600">
                              €{act.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują nurašymo aktą</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modulis *</label>
                <select
                  value={newAct.module}
                  onChange={(e) => setNewAct({ ...newAct, module: e.target.value as 'technika' | 'veterinarija' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="technika">Technika</option>
                  <option value="veterinarija">Veterinarija</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Padalinys</label>
                <input
                  type="text"
                  value={newAct.department}
                  onChange={(e) => setNewAct({ ...newAct, department: e.target.value })}
                  placeholder="Pvz.: Ferma, Sandėlys, Augalininkystė"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodo pradžia *</label>
                  <input
                    type="date"
                    value={newAct.period_start}
                    onChange={(e) => setNewAct({ ...newAct, period_start: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodo pabaiga *</label>
                  <input
                    type="date"
                    value={newAct.period_end}
                    onChange={(e) => setNewAct({ ...newAct, period_end: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Greitas pasirinkimas:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSetPeriodPreset('today')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Šiandien
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('yesterday')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Vakar
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('last7days')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Paskutinės 7d.
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('thisweek')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Ši savaitė
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('lastweek')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Praeita savaitė
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('last30days')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Paskutinės 30d.
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('thismonth')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Šis mėnuo
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('lastmonth')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Praėjęs mėnuo
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('thisquarter')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Šis ketvirtis
                  </button>
                  <button
                    onClick={() => handleSetPeriodPreset('thisyear')}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded border border-gray-200"
                  >
                    Šie metai
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akto data *</label>
                <input
                  type="date"
                  value={newAct.act_date}
                  onChange={(e) => setNewAct({ ...newAct, act_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={newAct.notes}
                  onChange={(e) => setNewAct({ ...newAct, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Papildoma informacija..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleCreateAct}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sukurti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
