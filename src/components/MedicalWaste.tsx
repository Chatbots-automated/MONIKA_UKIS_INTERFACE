import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Check } from 'lucide-react';

export function MedicalWaste() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const loadRecords = async () => {
    const { data } = await supabase
      .from('medical_waste')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (data) setRecords(data);
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
        <h3 className="font-semibold text-gray-900 mb-4">Paskutiniai atliekų įrašai</h3>
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{record.waste_code} - {record.name}</p>
                  <p className="text-sm text-gray-600">
                    {record.carrier && `Vežėjas: ${record.carrier}`}
                    {record.processor && ` • Perdirbėjas: ${record.processor}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {record.qty_transferred ? `${record.qty_transferred} kg perduota` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
