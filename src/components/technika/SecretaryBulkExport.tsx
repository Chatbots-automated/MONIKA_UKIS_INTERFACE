import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, AlertCircle, FileDown, ChevronRight, ChevronDown } from 'lucide-react';
import { SecretarySystemExport } from './SecretarySystemExport';
import { 
  generateSecretaryExportPayload, 
  validateSecretaryPayload,
  convertPayloadToImportFile 
} from '../../utils/secretaryExport';
import type { SecretaryInvoiceExportPayload } from '../../types/secretary-system';

interface SecretaryBulkExportProps {
  invoiceIds: string[];
  onClose: () => void;
}

interface InvoiceStatus {
  id: string;
  invoice_number: string;
  status: 'pending' | 'configuring' | 'ready' | 'error';
  payload?: SecretaryInvoiceExportPayload;
  errors?: string[];
}

export function SecretaryBulkExport({ invoiceIds, onClose }: SecretaryBulkExportProps) {
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([]);
  const [currentConfigIndex, setCurrentConfigIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [invoiceIds]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_invoices')
        .select('id, invoice_number')
        .in('id', invoiceIds)
        .order('invoice_number');

      if (error) throw error;

      setInvoiceStatuses(
        (data || []).map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: 'pending',
        }))
      );
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Klaida įkeliant sąskaitas');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceConfigured = (invoiceId: string, payload: SecretaryInvoiceExportPayload) => {
    setInvoiceStatuses(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'ready', payload }
          : inv
      )
    );
    setCurrentConfigIndex(null);
  };

  const handleDownloadBulkCSV = () => {
    const readyInvoices = invoiceStatuses.filter(inv => inv.status === 'ready' && inv.payload);
    
    if (readyInvoices.length === 0) {
      alert('Nėra paruoštų sąskaitų eksportui');
      return;
    }

    // Combine all payloads into one CSV
    const allLines: string[] = [];
    
    // Add header (only once)
    const headers = [
      'L001', 'L002', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008',
      'L009', 'L010', 'L011', 'L012', 'L013', 'L014', 'L015', 'L016', 'L017',
      'L018', 'L019', 'L020', 'L021', 'L022', 'L023', 'L024', 'L025', 'L026', 'L027',
      'L028', 'L029', 'L030', 'L031', 'L032', 'L033', 'L034', 'L035', 'L036', 'L037', 'L038', 'L039',
      'L040', 'L041', 'L042', 'L043', 'L044', 'L045', 'L046', 'L047', 'L048', 'L049',
      'L050', 'L051', 'L052', 'L053', 'L054', 'L055', 'L056', 'L057', 'L058',
      'L059', 'L060', 'L061',
      'L064', 'L065', 'L066', 'L067', 'L068', 'L069', 'L070', 'L071', 'L072', 'L073', 'L074', 'L075', 'L076', 'L077',
      'L078', 'L079', 'L080', 'L081', 'L082', 'L083', 'L084'
    ];
    allLines.push(headers.join(','));

    // Add all invoice data
    readyInvoices.forEach(inv => {
      if (!inv.payload) return;
      const csvContent = convertPayloadToImportFile(inv.payload);
      const lines = csvContent.split('\n');
      // Skip the header line (first line) from individual CSVs
      allLines.push(...lines.slice(1));
    });

    // Download
    const blob = new Blob([allLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const allReady = invoiceStatuses.every(inv => inv.status === 'ready');
  const readyCount = invoiceStatuses.filter(inv => inv.status === 'ready').length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Įkeliama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Masinis eksportas</h2>
            <p className="text-sm text-gray-600 mt-1">
              {readyCount} / {invoiceStatuses.length} sąskaitų paruošta
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentConfigIndex !== null ? (
            <SecretarySystemExport
              invoiceId={invoiceStatuses[currentConfigIndex].id}
              onClose={() => setCurrentConfigIndex(null)}
              onExportComplete={(payload) => {
                handleInvoiceConfigured(invoiceStatuses[currentConfigIndex].id, payload);
              }}
              bulkMode={true}
            />
          ) : (
            <div className="space-y-3">
              {invoiceStatuses.map((inv, index) => (
                <div
                  key={inv.id}
                  className={`border-2 rounded-lg p-4 ${
                    inv.status === 'ready'
                      ? 'border-green-300 bg-green-50'
                      : inv.status === 'error'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {inv.status === 'ready' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : inv.status === 'error' ? (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-400" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">{inv.invoice_number}</p>
                        {inv.status === 'ready' && (
                          <p className="text-sm text-green-600">Paruošta eksportui</p>
                        )}
                        {inv.status === 'error' && inv.errors && (
                          <p className="text-sm text-red-600">{inv.errors[0]}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === 'ready' && (
                        <button
                          onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {expandedInvoice === inv.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setCurrentConfigIndex(index)}
                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                          inv.status === 'ready'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {inv.status === 'ready' ? 'Redaguoti' : 'Konfigūruoti'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {expandedInvoice === inv.id && inv.payload && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold mb-2">Peržiūra:</p>
                      <div className="text-xs space-y-1">
                        <p><strong>Tiekėjas:</strong> {inv.payload.L007}</p>
                        <p><strong>Data:</strong> {inv.payload.L005}</p>
                        <p><strong>Eilučių:</strong> {inv.payload.items.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {currentConfigIndex === null && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {allReady ? (
                <span className="text-green-600 font-semibold">Visos sąskaitos paruoštos!</span>
              ) : (
                <span>Sukonfigūruokite visas sąskaitas prieš eksportą</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleDownloadBulkCSV}
                disabled={readyCount === 0}
                className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  readyCount > 0
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FileDown className="w-5 h-5" />
                Atsisiųsti CSV ({readyCount})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
