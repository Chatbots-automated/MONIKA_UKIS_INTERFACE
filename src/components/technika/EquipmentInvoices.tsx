import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, X, Check, AlertCircle, Eye, Trash2, Package, PlusCircle, CheckCircle as LucideCheckCircle, Edit2 } from 'lucide-react';

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
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string;
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
  const { logAction, user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<Map<number, Product | null>>(new Map());
  const [headerData, setHeaderData] = useState<any>(null);
  const [editedItems, setEditedItems] = useState<Map<number, any>>(new Map());
  const [editingHeader, setEditingHeader] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState<any>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    product_code: '',
    unit_type: 'pcs',
    category_id: '',
    manufacturer: '',
    model_number: '',
    description: '',
    min_stock_level: '0',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [suppliersRes, productsRes, categoriesRes, invoicesRes] = await Promise.all([
      supabase.from('equipment_suppliers').select('*').order('name'),
      supabase.from('equipment_products').select('*').eq('is_active', true).order('name'),
      supabase.from('equipment_categories').select('*').order('name'),
      supabase.from('equipment_invoices').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
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

  const getItemData = (item: any, index: number) => {
    const edited = editedItems.get(index);
    return edited ? { ...item, ...edited } : item;
  };

  const handleItemEdit = (index: number, field: string, value: any) => {
    const currentEdits = editedItems.get(index) || {};
    const newEdits = new Map(editedItems);
    newEdits.set(index, { ...currentEdits, [field]: value });
    setEditedItems(newEdits);
  };

  const handleBatchItemEdit = (index: number, updates: Record<string, any>) => {
    const currentEdits = editedItems.get(index) || {};
    const newEdits = new Map(editedItems);
    newEdits.set(index, { ...currentEdits, ...updates });
    setEditedItems(newEdits);
  };

  const handleProductMatch = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newMatches = new Map(matchedProducts);
    newMatches.set(index, product || null);
    setMatchedProducts(newMatches);
  };

  const handleCreateProduct = (item: any, index: number) => {
    const itemData = getItemData(item, index);
    setCreatingProduct({ ...itemData, index });
    setNewProductForm({
      name: itemData.description || '',
      product_code: itemData.sku || '',
      unit_type: 'pcs',
      category_id: '',
      manufacturer: '',
      model_number: '',
      description: itemData.description || '',
      min_stock_level: '0',
    });
    setShowCreateModal(true);
  };

  const handleSaveNewProduct = async () => {
    if (!newProductForm.name) {
      alert('Prašome įvesti produkto pavadinimą');
      return;
    }

    try {
      const { data: newProduct, error } = await supabase
        .from('equipment_products')
        .insert({
          name: newProductForm.name,
          product_code: newProductForm.product_code || null,
          category_id: newProductForm.category_id || null,
          unit_type: newProductForm.unit_type,
          manufacturer: newProductForm.manufacturer || null,
          model_number: newProductForm.model_number || null,
          description: newProductForm.description || null,
          min_stock_level: parseFloat(newProductForm.min_stock_level) || 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setProducts([...products, newProduct]);

      if (creatingProduct) {
        handleProductMatch(creatingProduct.index, newProduct.id);
      }

      await logAction('create_equipment_product', { product_id: newProduct.id, name: newProduct.name });

      setShowCreateModal(false);
      setCreatingProduct(null);
      setNewProductForm({
        name: '',
        product_code: '',
        unit_type: 'pcs',
        manufacturer: '',
        model_number: '',
        description: '',
        min_stock_level: '0',
      });

      alert('Produktas sėkmingai sukurtas');
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert('Klaida kuriant produktą: ' + error.message);
    }
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

      // Parse the response - it might be an array with a single object
      const parsedData = Array.isArray(data) ? data[0] : data;
      setInvoiceData(parsedData);

      // Handle supplier data - it might be an object or a string
      const supplierName = typeof parsedData.supplier === 'object'
        ? (parsedData.supplier?.name || '')
        : (parsedData.supplier || '');
      const supplierCode = typeof parsedData.supplier === 'object'
        ? (parsedData.supplier?.code || '')
        : (parsedData.supplier_code || '');
      const vatCode = typeof parsedData.supplier === 'object'
        ? (parsedData.supplier?.vat_code || '')
        : (parsedData.vat_code || '');

      // Handle invoice data - might be nested under "invoice" key
      const invoiceInfo = parsedData.invoice || parsedData;

      setHeaderData({
        supplier_name: supplierName,
        supplier_code: supplierCode,
        vat_code: vatCode,
        invoice_number: invoiceInfo.number || invoiceInfo.invoice_number || '',
        invoice_date: invoiceInfo.date || invoiceInfo.invoice_date || new Date().toISOString().split('T')[0],
        currency: invoiceInfo.currency || 'EUR',
        total_net: invoiceInfo.total_net || 0,
        total_vat: invoiceInfo.total_vat || 0,
        total_gross: invoiceInfo.total_gross || 0,
      });

      const newMatches = new Map<number, Product | null>();
      parsedData.items?.forEach((item: any, index: number) => {
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

        const itemData = getItemData(item, index);
        const quantity = parseFloat(itemData.qty || itemData.quantity) || 0;
        const totalPrice = itemData.editable_total_price !== undefined
          ? parseFloat(itemData.editable_total_price)
          : (itemData.net ? parseFloat(itemData.net) : 0);
        const unitPrice = quantity > 0 ? totalPrice / quantity : 0;
        const batchNumber = itemData.batch || itemData.lot || '';
        const expiryDate = itemData.expiry || null;

        const { data: batch } = await supabase
          .from('equipment_batches')
          .insert({
            product_id: product.id,
            invoice_id: invoice.id,
            batch_number: batchNumber,
            expiry_date: expiryDate,
            received_qty: quantity,
            qty_left: quantity,
            purchase_price: unitPrice,
          })
          .select()
          .single();

        await supabase.from('equipment_invoice_items').insert({
          invoice_id: invoice.id,
          line_no: itemData.line_no || index + 1,
          product_id: product.id,
          description: itemData.description,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
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
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pdfUrl && (
              <div className="lg:sticky lg:top-6 lg:self-start">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Sąskaitos PDF</h3>
                  <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '800px' }}>
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="Invoice PDF"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
            <div className="border-2 border-blue-300 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Sąskaitos duomenys</h3>
                <button
                  onClick={() => setEditingHeader(!editingHeader)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  {editingHeader ? 'Baigti redaguoti' : 'Redaguoti'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">Sąskaita Nr.</label>
                  {editingHeader ? (
                    <input
                      type="text"
                      value={headerData.invoice_number}
                      onChange={e => setHeaderData({ ...headerData, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{headerData.invoice_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">Data</label>
                  {editingHeader ? (
                    <input
                      type="date"
                      value={headerData.invoice_date}
                      onChange={e => setHeaderData({ ...headerData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{headerData.invoice_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">Valiuta</label>
                  {editingHeader ? (
                    <input
                      type="text"
                      value={headerData.currency}
                      onChange={e => setHeaderData({ ...headerData, currency: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{headerData.currency}</p>
                  )}
                </div>
              </div>

              <div className="border-t-2 border-blue-200 pt-4 mb-4">
                <h4 className="text-lg font-bold text-blue-900 mb-3">Tiekėjas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-blue-900 mb-1">Tiekėjas</label>
                    {editingHeader ? (
                      <input
                        type="text"
                        value={headerData.supplier_name}
                        onChange={e => setHeaderData({ ...headerData, supplier_name: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                      />
                    ) : (
                      <p className="text-lg font-bold text-gray-900">{headerData.supplier_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-900 mb-1">Tiekėjo kodas</label>
                    {editingHeader ? (
                      <input
                        type="text"
                        value={headerData.supplier_code}
                        onChange={e => setHeaderData({ ...headerData, supplier_code: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-bold text-gray-900">{headerData.supplier_code || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-900 mb-1">PVM kodas</label>
                    {editingHeader ? (
                      <input
                        type="text"
                        value={headerData.vat_code}
                        onChange={e => setHeaderData({ ...headerData, vat_code: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-lg font-bold text-gray-900">{headerData.vat_code || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-blue-200 pt-4">
                <h4 className="text-lg font-bold text-blue-900 mb-3">Sumos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <label className="block text-sm font-semibold text-blue-900 mb-1">Suma be PVM</label>
                    {editingHeader ? (
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_net}
                        onChange={e => setHeaderData({ ...headerData, total_net: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">{parseFloat(headerData.total_net).toFixed(2)} EUR</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                    <label className="block text-sm font-semibold text-gray-800 mb-1">PVM</label>
                    {editingHeader ? (
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_vat}
                        onChange={e => setHeaderData({ ...headerData, total_vat: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-600 font-bold text-lg font-mono"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-gray-700 font-mono">{parseFloat(headerData.total_vat).toFixed(2)} EUR</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                    <label className="block text-sm font-semibold text-green-900 mb-1">Suma su PVM</label>
                    {editingHeader ? (
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_gross}
                        onChange={e => setHeaderData({ ...headerData, total_gross: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 font-bold text-lg"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">{parseFloat(headerData.total_gross).toFixed(2)} EUR</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Prekės ({invoiceData.items?.length || 0})</h3>
              {invoiceData.items?.map((item: any, index: number) => {
                const itemData = getItemData(item, index);
                const matchedProduct = matchedProducts.get(index);
                const isMatched = matchedProduct !== null && matchedProduct !== undefined;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-xl overflow-hidden transition-all ${
                      isMatched
                        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50'
                        : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {isMatched ? (
                          <LucideCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-semibold text-gray-700 text-sm">#{item.line_no || index + 1}:</span>
                          <input
                            type="text"
                            value={getItemData(item, index).description}
                            onChange={(e) => handleItemEdit(index, 'description', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs mb-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <span className="text-gray-600">SKU:</span>{' '}
                            <input
                              type="text"
                              value={getItemData(item, index).sku || ''}
                              onChange={(e) => handleItemEdit(index, 'sku', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Vienetas:</span>{' '}
                            <span className="font-semibold text-gray-900">{matchedProduct?.unit_type || item.unit || 'vnt'}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded mb-2">
                          <p className="text-xs text-gray-700 font-bold mb-2 uppercase tracking-wide">Pakuočių skaičiavimas (optional)</p>
                          <div className="grid grid-cols-5 gap-2 items-end">
                            <div>
                              <label className="block text-gray-700 font-medium mb-0.5 text-xs">Pak. dydis:</label>
                              <input
                                type="number"
                                step="0.01"
                                value={getItemData(item, index).package_size || ''}
                                onChange={(e) => {
                                  const newPkgSize = e.target.value;
                                  const itemData = getItemData(item, index);
                                  const pkgSize = parseFloat(newPkgSize) || 0;
                                  const pkgCount = parseFloat(itemData.package_count || '0') || 0;

                                  const updates: Record<string, any> = {
                                    package_size: newPkgSize
                                  };

                                  if (pkgSize > 0 && pkgCount > 0) {
                                    const newQty = (pkgSize * pkgCount).toFixed(2);
                                    updates.qty = newQty;

                                    const totalPrice = itemData.editable_total_price !== undefined
                                      ? parseFloat(itemData.editable_total_price)
                                      : (itemData.net ? parseFloat(itemData.net) : 0);

                                    if (totalPrice > 0) {
                                      updates.price_per_unit = (totalPrice / parseFloat(newQty)).toFixed(4);
                                    }
                                  } else if (!newPkgSize) {
                                    updates.qty = '';
                                  }

                                  handleBatchItemEdit(index, updates);
                                }}
                                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-sm focus:ring-2 focus:ring-gray-600 focus:border-gray-600 font-mono"
                                placeholder="10"
                              />
                            </div>
                            <div className="text-center pb-2">
                              <span className="text-gray-600 font-bold text-lg">×</span>
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-0.5 text-xs">Kiek pak.:</label>
                              <input
                                type="number"
                                step="0.01"
                                value={getItemData(item, index).package_count || ''}
                                onChange={(e) => {
                                  const newPkgCount = e.target.value;
                                  const itemData = getItemData(item, index);
                                  const pkgSize = parseFloat(itemData.package_size || '0') || 0;
                                  const pkgCount = parseFloat(newPkgCount) || 0;

                                  const updates: Record<string, any> = {
                                    package_count: newPkgCount
                                  };

                                  if (pkgSize > 0 && pkgCount > 0) {
                                    const newQty = (pkgSize * pkgCount).toFixed(2);
                                    updates.qty = newQty;

                                    const totalPrice = itemData.editable_total_price !== undefined
                                      ? parseFloat(itemData.editable_total_price)
                                      : (itemData.net ? parseFloat(itemData.net) : 0);

                                    if (totalPrice > 0) {
                                      updates.price_per_unit = (totalPrice / parseFloat(newQty)).toFixed(4);
                                    }
                                  } else if (!newPkgCount) {
                                    updates.qty = '';
                                  }

                                  handleBatchItemEdit(index, updates);
                                }}
                                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-sm focus:ring-2 focus:ring-gray-600 focus:border-gray-600 font-mono"
                                placeholder="6"
                              />
                            </div>
                            <div className="text-center pb-2">
                              <span className="text-gray-600 font-bold text-lg">=</span>
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-0.5 text-xs">Viso:</label>
                              <input
                                type="number"
                                step="0.01"
                                value={getItemData(item, index).qty || getItemData(item, index).quantity || ''}
                                onChange={(e) => {
                                  const newQty = e.target.value;
                                  handleItemEdit(index, 'qty', newQty);
                                  handleItemEdit(index, 'package_size', '');
                                  handleItemEdit(index, 'package_count', '');

                                  const itemData = getItemData(item, index);
                                  const totalPrice = itemData.editable_total_price !== undefined
                                    ? parseFloat(itemData.editable_total_price)
                                    : (itemData.net ? parseFloat(itemData.net) : 0);
                                  const qty = parseFloat(newQty) || 0;

                                  if (qty > 0 && totalPrice > 0) {
                                    const perUnitPrice = (totalPrice / qty).toFixed(4);
                                    handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                  }
                                }}
                                className={`w-full px-3 py-2 border rounded text-sm font-bold font-mono ${
                                  getItemData(item, index).package_size && getItemData(item, index).package_count
                                    ? 'border-slate-500 bg-slate-100 cursor-not-allowed text-slate-700'
                                    : 'border-gray-400 bg-white focus:ring-2 focus:ring-gray-600 focus:border-gray-600'
                                }`}
                                readOnly={!!(getItemData(item, index).package_size && getItemData(item, index).package_count)}
                                title={getItemData(item, index).package_size && getItemData(item, index).package_count ? 'Apskaičiuota iš pakuočių' : 'Įveskite kiekį tiesiogiai'}
                              />
                            </div>
                          </div>
                          {getItemData(item, index).package_size && getItemData(item, index).package_count && (
                            <div className="mt-2 px-2 py-1 bg-slate-100 border border-slate-300 rounded">
                              <p className="text-xs text-slate-700 font-mono font-medium">
                                = {getItemData(item, index).package_size} × {getItemData(item, index).package_count} = {getItemData(item, index).qty} {matchedProduct?.unit_type || item.unit || 'vnt'}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">Galutinė kaina:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              value={(() => {
                                const itemData = getItemData(item, index);
                                if (itemData.editable_total_price !== undefined) {
                                  return itemData.editable_total_price;
                                }
                                return itemData.net ? parseFloat(itemData.net).toFixed(2) : '0.00';
                              })()}
                              onChange={(e) => {
                                const totalPrice = e.target.value;
                                handleItemEdit(index, 'editable_total_price', totalPrice);
                                const qty = parseFloat(getItemData(item, index).qty || getItemData(item, index).quantity) || 0;
                                if (qty > 0 && totalPrice) {
                                  const perUnitPrice = (parseFloat(totalPrice) / qty).toFixed(4);
                                  handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                }
                              }}
                              className="w-20 px-1 py-0.5 border-2 border-emerald-300 rounded text-xs font-semibold bg-emerald-50"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">
                              {matchedProduct?.unit_type || 'vnt'} kaina:
                            </span>{' '}
                            <input
                              type="number"
                              step="0.0001"
                              value={getItemData(item, index).price_per_unit || ''}
                              readOnly
                              className="w-20 px-1 py-0.5 border-2 border-blue-300 rounded text-xs font-semibold bg-blue-50"
                            />
                          </div>
                        </div>
                        {matchedProduct && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            📦 {matchedProduct.name} - Matavimo vienetas: {matchedProduct.unit_type}
                            {(() => {
                              const itemData = getItemData(item, index);
                              const finalPrice = itemData.editable_total_price !== undefined
                                ? itemData.editable_total_price
                                : (itemData.net ? parseFloat(itemData.net).toFixed(2) : '0.00');
                              const qty = parseFloat(itemData.qty || itemData.quantity) || 0;
                              if (finalPrice && qty) {
                                return (
                                  <span className="ml-2">
                                    ({finalPrice} ÷ {qty} = {itemData.price_per_unit || '...'} EUR/{matchedProduct.unit_type})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                          <div>
                            <span className="text-gray-600">Serija:</span>{' '}
                            <input
                              type="text"
                              value={getItemData(item, index).batch || getItemData(item, index).lot || ''}
                              onChange={(e) => handleItemEdit(index, 'batch', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Serijos Nr."
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Galioja iki <span className="text-gray-400 text-xs">(optional)</span>:</span>{' '}
                            <input
                              type="date"
                              value={getItemData(item, index).expiry || ''}
                              onChange={(e) => handleItemEdit(index, 'expiry', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {isMatched ? (
                        <div className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-800"><strong>Produktas:</strong></span>
                            <select
                              value={matchedProduct.id}
                              onChange={(e) => handleProductMatch(index, e.target.value)}
                              className="px-2 py-0.5 border border-emerald-300 rounded text-xs bg-white"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-700 font-semibold">
                              Produktas nerastas
                            </p>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleProductMatch(index, e.target.value);
                                }
                              }}
                              className="px-2 py-0.5 border border-gray-400 rounded text-xs bg-white font-mono"
                              defaultValue=""
                            >
                              <option value="">Pasirinkti esamą...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleCreateProduct(item, index)}
                            className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded text-xs font-medium hover:bg-gray-900 transition-all shadow-md"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Sukurti naują
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setInvoiceData(null);
                  setSelectedFile(null);
                  setPdfUrl(null);
                  setEditedItems(new Map());
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleConfirmInvoice}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <LucideCheckCircle className="w-5 h-5" />
                Patvirtinti pajamavimą
              </button>
            </div>
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują produktą</h3>

            {creatingProduct && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="text-sm font-bold text-blue-900 mb-2">Duomenys iš sąskaitos:</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Pakuotės dydis:</span>
                    <p className="font-bold text-blue-900">{creatingProduct.package_size || 'Nenustatyta'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Pakuočių skaičius:</span>
                    <p className="font-bold text-blue-900">{creatingProduct.package_count || 'Nenustatyta'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Viso:</span>
                    <p className="font-bold text-green-700">{creatingProduct.qty || creatingProduct.quantity || 'Nenustatyta'}</p>
                  </div>
                </div>
                {creatingProduct.package_size && creatingProduct.package_count ? (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {creatingProduct.package_count} pak. × {creatingProduct.package_size} = {creatingProduct.qty || creatingProduct.quantity} viso
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    Pakuočių informacija nebuvo automatiškai ištraukta iš PDF
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas *</label>
                <input
                  type="text"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produkto kodas</label>
                <input
                  type="text"
                  value={newProductForm.product_code}
                  onChange={(e) => setNewProductForm({ ...newProductForm, product_code: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorija *</label>
                <select
                  value={newProductForm.category_id}
                  onChange={(e) => setNewProductForm({ ...newProductForm, category_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite kategoriją</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                  <select
                    value={newProductForm.unit_type}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="pcs">vnt</option>
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                    <option value="m">m</option>
                    <option value="box">dėžė</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. atsargos</label>
                  <input
                    type="number"
                    value={newProductForm.min_stock_level}
                    onChange={(e) => setNewProductForm({ ...newProductForm, min_stock_level: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gamintojas</label>
                <input
                  type="text"
                  value={newProductForm.manufacturer}
                  onChange={(e) => setNewProductForm({ ...newProductForm, manufacturer: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelio numeris</label>
                <input
                  type="text"
                  value={newProductForm.model_number}
                  onChange={(e) => setNewProductForm({ ...newProductForm, model_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
                <textarea
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatingProduct(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveNewProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sukurti produktą
              </button>
            </div>
          </div>
        </div>
      )}
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
