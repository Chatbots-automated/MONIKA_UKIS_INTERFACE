import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, X, Check, AlertCircle, Eye, Trash2, Package } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  code: string;
  vat_code: string;
}

interface Product {
  id: string;
  name: string;
  unit_type: string;
  category_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_gross: number;
  status: string;
  pdf_url: string;
  created_at: string;
}

export function EquipmentInvoices() {
  const { logAction } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<Map<number, Product | null>>(new Map());
  const [headerData, setHeaderData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [suppliersRes, productsRes, invoicesRes] = await Promise.all([
      supabase.from('equipment_suppliers').select('*').order('name'),
      supabase.from('equipment_products').select('*').eq('is_active', true).order('name'),
      supabase.from('equipment_invoices').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      alert('Prašome pasirinkti PDF failą');
      e.target.value = '';
    }
  };

  const searchProductMatch = (itemDescription: string): Product | null => {
    const searchTerm = itemDescription.toLowerCase();
    const match = products.find(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(p.name.toLowerCase())
    );
    return match || null;
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadMessage('Įkeliama...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const sanitizedFilename = selectedFile.name
        .replace(/[()]/g, '')
        .replace(/[^\w\s.-]/g, '_')
        .replace(/\s+/g, '_');

      const response = await fetch('https://n8n-up8s.onrender.com/webhook/36549f46-a08b-4790-bf56-40cdc919e4c0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': sanitizedFilename,
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        throw new Error('Nepavyko įkelti failo');
      }

      const data = await response.json();
      setInvoiceData(data);
      setHeaderData({
        supplier_name: data.supplier || '',
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
        total_net: data.total_net || 0,
        total_vat: data.total_vat || 0,
        total_gross: data.total_gross || 0,
      });

      const newMatches = new Map<number, Product | null>();
      data.items?.forEach((item: any, index: number) => {
        const match = searchProductMatch(item.description || '');
        newMatches.set(index, match);
      });
      setMatchedProducts(newMatches);

      setUploadStatus('success');
      setUploadMessage('Failas sėkmingai apdorotas');
      await logAction('upload_equipment_invoice', { filename: sanitizedFilename });
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Klaida įkeliant failą');
      console.error('Upload error:', error);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!invoiceData || !headerData) return;

    try {
      let supplierId = suppliers.find(s => s.name === headerData.supplier_name)?.id;

      if (!supplierId && headerData.supplier_name) {
        const { data: newSupplier } = await supabase
          .from('equipment_suppliers')
          .insert({ name: headerData.supplier_name })
          .select()
          .single();
        if (newSupplier) supplierId = newSupplier.id;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('equipment_invoices')
        .insert({
          invoice_number: headerData.invoice_number,
          invoice_date: headerData.invoice_date,
          supplier_id: supplierId,
          supplier_name: headerData.supplier_name,
          total_net: parseFloat(headerData.total_net) || 0,
          total_vat: parseFloat(headerData.total_vat) || 0,
          total_gross: parseFloat(headerData.total_gross) || 0,
          currency: 'EUR',
          status: 'received',
          pdf_url: pdfUrl,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      for (const [index, item] of (invoiceData.items || []).entries()) {
        const product = matchedProducts.get(index);
        if (!product) continue;

        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;

        const { data: batch } = await supabase
          .from('equipment_batches')
          .insert({
            product_id: product.id,
            invoice_id: invoice.id,
            batch_number: item.lot || '',
            received_qty: quantity,
            qty_left: quantity,
            purchase_price: unitPrice,
          })
          .select()
          .single();

        await supabase.from('equipment_invoice_items').insert({
          invoice_id: invoice.id,
          line_no: index + 1,
          product_id: product.id,
          description: item.description,
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          batch_id: batch?.id,
        });
      }

      await logAction('confirm_equipment_invoice', { invoice_id: invoice.id });
      setUploadStatus('idle');
      setInvoiceData(null);
      setSelectedFile(null);
      setPdfUrl(null);
      loadData();
      alert('Sąskaita sėkmingai įrašyta');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Klaida: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Nauja sąskaita</h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Įkelkite PDF sąskaitą automatiniam apdorojimui</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
          >
            <FileText className="w-4 h-4" />
            Pasirinkti PDF
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadStatus === 'idle' && (
                  <button
                    onClick={handleFileUpload}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Apdoroti
                  </button>
                )}
                {uploadStatus === 'uploading' && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
                    <span>Apdorojama...</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPdfUrl(null);
                    setInvoiceData(null);
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {uploadMessage && (
              <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                uploadStatus === 'success' ? 'bg-green-50 text-green-800' :
                uploadStatus === 'error' ? 'bg-red-50 text-red-800' : ''
              }`}>
                {uploadStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                {uploadStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                <span>{uploadMessage}</span>
              </div>
            )}
          </div>
        )}

        {invoiceData && headerData && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiekėjas</label>
                <input
                  type="text"
                  value={headerData.supplier_name}
                  onChange={e => setHeaderData({ ...headerData, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sąskaitos nr.</label>
                <input
                  type="text"
                  value={headerData.invoice_number}
                  onChange={e => setHeaderData({ ...headerData, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={headerData.invoice_date}
                  onChange={e => setHeaderData({ ...headerData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suma su PVM</label>
                <input
                  type="number"
                  step="0.01"
                  value={headerData.total_gross}
                  onChange={e => setHeaderData({ ...headerData, total_gross: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3">Prekės</h4>
              <div className="space-y-2">
                {invoiceData.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="text-sm text-gray-600">
                        Kiekis: {item.quantity} | Kaina: €{item.unit_price}
                      </p>
                    </div>
                    {matchedProducts.get(index) ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span className="text-sm">{matchedProducts.get(index)?.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">Neatpažinta</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setInvoiceData(null);
                  setSelectedFile(null);
                  setPdfUrl(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleConfirmInvoice}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Patvirtinti pajamavimą
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Paskutinės sąskaitos</h3>
        <div className="space-y-2">
          {invoices.map(invoice => (
            <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">{invoice.supplier_name} · {invoice.invoice_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-800">€{invoice.total_gross.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{invoice.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
