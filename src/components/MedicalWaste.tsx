import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Check, Package, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { MedicalWasteWithDetails } from '../lib/types';
import { showNotification } from './NotificationToast';

type WasteFilter = 'all' | 'automatic' | 'manual';

export function MedicalWaste() {
  const { logAction } = useAuth();
  const [records, setRecords] = useState<MedicalWasteWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wasteFilter, setWasteFilter] = useState<WasteFilter>('all');

  const [formData, setFormData] = useState({
    waste_code: '',
    name: '',
    period: '',
    date: new Date().toISOString().split('T')[0],
    qty_generated: '',
    qty_transferred: '',
    carrier: '',
    processor: '',
    transfer_date: '',
    doc_no: '',
    responsible: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useRealtimeSubscription({
    table: 'medical_waste',
    onInsert: useCallback(async (payload: any) => {
      await loadRecords();

      if (payload.new.auto_generated) {
        const { data: productData } = await supabase
          .from('products')
          .select('name')
          .eq('id', payload.new.source_product_id)
          .maybeSingle();

        const { data: batchData } = await supabase
          .from('batches')
          .select('lot')
          .eq('id', payload.new.source_batch_id)
          .maybeSingle();

        const weight = payload.new.qty_generated ? `${(payload.new.qty_generated / 1000).toFixed(3)} kg` : 'N/A';
        const productName = productData?.name || 'Nežinomas produktas';
        const lotInfo = batchData?.lot ? ` (Partija: ${batchData.lot})` : '';

        showNotification(
          `Automatiškai sukurtas medicininių atliekų įrašas: ${productName}${lotInfo} - ${weight}`,
          'info'
        );
      }
    }, []),
    onUpdate: useCallback(() => {
      loadRecords();
    }, []),
    onDelete: useCallback(() => {
      loadRecords();
    }, []),
  });

  const loadRecords = async () => {
    const { data } = await supabase
      .from('vw_medical_waste_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setRecords(data as MedicalWasteWithDetails[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('medical_waste').insert({
        waste_code: formData.waste_code,
        name: formData.name,
        period: formData.period || null,
        date: formData.date || null,
        qty_generated: formData.qty_generated ? parseFloat(formData.qty_generated) : null,
        qty_transferred: formData.qty_transferred ? parseFloat(formData.qty_transferred) : null,
        carrier: formData.carrier || null,
        processor: formData.processor || null,
        transfer_date: formData.transfer_date || null,
        doc_no: formData.doc_no || null,
        responsible: formData.responsible || null,
      });

      if (error) throw error;

      await logAction(
        'create_medical_waste',
        'medical_waste',
        null,
        null,
        {
          waste_code: formData.waste_code,
          name: formData.name,
          qty_generated: formData.qty_generated,
          qty_transferred: formData.qty_transferred,
          carrier: formData.carrier,
          transfer_date: formData.transfer_date,
        }
      );

      setSuccess(true);
      setFormData({
        waste_code: '',
        name: '',
        period: '',
        date: new Date().toISOString().split('T')[0],
        qty_generated: '',
        qty_transferred: '',
        carrier: '',
        processor: '',
        transfer_date: '',
        doc_no: '',
        responsible: '',
      });

      setTimeout(() => setSuccess(false), 3000);
      await loadRecords();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-50 p-2 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Medicininių Atliekų Valdymas</h2>
            <p className="text-sm text-gray-600">Sekti veterinarinių medicininių atliekų susidarymą ir šalinimą</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Atliekų įrašas sėkmingai užregistruotas!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Atliekų kodas *</label>
              <input
                type="text"
                value={formData.waste_code}
                onChange={(e) => setFormData({ ...formData, waste_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="e.g., 18 02 02"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Atliekų pavadinimas *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Atliekų aprašymas"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Laikotarpis</label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="2025 K1, Sausis, ir t.t."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Susidariusi kiekis (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.qty_generated}
                onChange={(e) => setFormData({ ...formData, qty_generated: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perduotas kiekis (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.qty_transferred}
                onChange={(e) => setFormData({ ...formData, qty_transferred: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vežėjas</label>
              <input
                type="text"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Transporto įmonė"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perdirbėjas / Šalinimo įmonė</label>
              <input
                type="text"
                value={formData.processor}
                onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perdavimo data</label>
              <input
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dokumento numeris</label>
              <input
                type="text"
                value={formData.doc_no}
                onChange={(e) => setFormData({ ...formData, doc_no: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Perdavimo dokumento nr."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Atsakingas asmuo</label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registruojama...' : 'Registruoti atliekų įrašą'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Atliekų įrašai</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={wasteFilter}
              onChange={(e) => setWasteFilter(e.target.value as WasteFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Visi įrašai</option>
              <option value="automatic">Tik automatiniai</option>
              <option value="manual">Tik rankiniai</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {records
            .filter(record => {
              if (wasteFilter === 'all') return true;
              return record.source_type === wasteFilter;
            })
            .map((record) => (
            <div
              key={record.id}
              className={`p-4 rounded-lg border ${
                record.auto_generated
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{record.waste_code} - {record.name}</p>
                      {record.auto_generated ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          <Package className="w-3 h-3" />
                          AUTOMATINIS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          RANKINIS
                        </span>
                      )}
                    </div>

                    {record.auto_generated && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Produktas:</span> {record.product_name || 'N/A'}
                        {record.batch_lot && <span className="ml-2"><span className="font-medium">Partija:</span> {record.batch_lot}</span>}
                      </div>
                    )}

                    {record.package_count && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Pakuočių skaičius:</span> {record.package_count} vnt
                      </p>
                    )}

                    <p className="text-sm text-gray-600">
                      {record.carrier && `Vežėjas: ${record.carrier}`}
                      {record.processor && ` • Perdirbėjas: ${record.processor}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {record.qty_generated ? `${(record.qty_generated / 1000).toFixed(3)} kg` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {record.date ? new Date(record.date).toLocaleDateString('lt-LT') : 'N/A'}
                  </p>
                  {record.auto_generated_at && (
                    <p className="text-xs text-blue-600 mt-1">
                      Sugeneruota: {new Date(record.auto_generated_at).toLocaleDateString('lt-LT')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {records.filter(record => {
            if (wasteFilter === 'all') return true;
            return record.source_type === wasteFilter;
          }).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Atliekų įrašų nerasta
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
