import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Calendar } from 'lucide-react';

type ReportType = 'drug_journal' | 'treated_animals' | 'owner_meds' | 'biocide_journal' | 'medical_waste';

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('drug_journal');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let query;

      switch (reportType) {
        case 'drug_journal':
          query = supabase.from('vw_vet_drug_journal').select('*');
          break;
        case 'treated_animals':
          query = supabase.from('vw_treated_animals').select('*');
          if (dateFrom) query = query.gte('reg_date', dateFrom);
          if (dateTo) query = query.lte('reg_date', dateTo);
          break;
        case 'owner_meds':
          query = supabase.from('vw_owner_admin_meds').select('*');
          if (dateFrom) query = query.gte('first_admin_date', dateFrom);
          if (dateTo) query = query.lte('first_admin_date', dateTo);
          break;
        case 'biocide_journal':
          query = supabase.from('vw_biocide_journal').select('*');
          if (dateFrom) query = query.gte('use_date', dateFrom);
          if (dateTo) query = query.lte('use_date', dateTo);
          break;
        case 'medical_waste':
          query = supabase.from('vw_medical_waste').select('*');
          if (dateFrom) query = query.gte('date', dateFrom);
          if (dateTo) query = query.lte('date', dateTo);
          break;
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No data available for this report
        </div>
      );
    }

    const headers = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {row[header] !== null && row[header] !== undefined ? String(row[header]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-50 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compliance Reports</h2>
            <p className="text-sm text-gray-600">Generate and export regulatory journals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="drug_journal">Veterinary Drug Journal</option>
            <option value="treated_animals">Treated Animals Register</option>
            <option value="owner_meds">Owner-Administered Meds</option>
            <option value="biocide_journal">Biocide Journal</option>
            <option value="medical_waste">Medical Waste Journal</option>
          </select>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="From"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="To"
            />
          </div>

          <button
            onClick={loadReport}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Generate Report
          </button>
        </div>

        {data.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {renderTable()}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Report Descriptions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Veterinary Drug Journal:</strong> Complete log of all medicine receipts and usage by batch.</p>
          <p><strong>Treated Animals Register:</strong> All treatments performed with animal details, diagnosis, and products used.</p>
          <p><strong>Owner-Administered Meds:</strong> Log of medications administered by animal owners under veterinary prescription.</p>
          <p><strong>Biocide Journal:</strong> Record of all biocide applications including purpose and work scope.</p>
          <p><strong>Medical Waste Journal:</strong> Tracking of veterinary medical waste generation and disposal.</p>
        </div>
      </div>
    </div>
  );
}
