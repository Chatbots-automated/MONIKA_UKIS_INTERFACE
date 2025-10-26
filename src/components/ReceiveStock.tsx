import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Supplier } from '../lib/types';
import { Plus, Check, Upload, FileText, X, AlertCircle, CheckCircle, PlusCircle } from 'lucide-react';

export function ReceiveStock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [matchedProducts, setMatchedProducts] = useState<Map<number, Product | null>>(new Map());
  const [editedItems, setEditedItems] = useState<Map<number, any>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState<any>(null);
  const [newProductCategory, setNewProductCategory] = useState('');
  const [bulkReceiveData, setBulkReceiveData] = useState({
    lot: '',
    mfg_date: '',
    expiry_date: '',
    doc_date: new Date().toISOString().split('T')[0],
  });
  const [bulkReceiving, setBulkReceiving] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    lot: '',
    mfg_date: '',
    expiry_date: '',
    supplier_id: '',
    doc_title: 'Invoice',
    doc_number: '',
    doc_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    currency: 'EUR',
    received_qty: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
    } else {
      alert('Prašome pasirinkti PDF failą');
      e.target.value = '';
    }
  };

  const searchProductMatch = async (itemDescription: string): Promise<Product | null> => {
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

      const response = await fetch('https://n8n-up8s.onrender.com/webhook-test/36549f46-a08b-4790-bf56-40cdc919e4c0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${selectedFile.name}"`,
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        throw new Error(`Serverio klaida: ${response.status}`);
      }

      const data = await response.json();
      console.log('Webhook response:', data);

      let invoiceObject;
      if (Array.isArray(data) && data.length > 0) {
        invoiceObject = data[0];
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        invoiceObject = data;
      } else {
        throw new Error('Netinkamas atsakymo formatas');
      }

      if (!invoiceObject.items || !Array.isArray(invoiceObject.items)) {
        throw new Error('Atsakyme nerasta prekių sąrašo');
      }

      setInvoiceData(invoiceObject);

      const matches = new Map<number, Product | null>();
      for (let i = 0; i < invoiceObject.items.length; i++) {
        const match = await searchProductMatch(invoiceObject.items[i].description);
        matches.set(i, match);
      }
      setMatchedProducts(matches);

      setUploadStatus('success');
      setUploadMessage(`PDF sėkmingai įkeltas! Rasta ${invoiceObject.items.length} prekių.`);
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(`Klaida: ${error.message}`);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadMessage('');
    setInvoiceData(null);
    setMatchedProducts(new Map());
    setEditedItems(new Map());
  };

  const getItemData = (item: any, index: number) => {
    const edited = editedItems.get(index);
    return edited || item;
  };

  const handleItemEdit = (index: number, field: string, value: any) => {
    const currentItem = invoiceData.items[index];
    const edited = editedItems.get(index) || { ...currentItem };
    edited[field] = value;
    const newEdited = new Map(editedItems);
    newEdited.set(index, edited);
    setEditedItems(newEdited);
  };

  const handleProductMatch = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newMatches = new Map(matchedProducts);
    newMatches.set(index, product || null);
    setMatchedProducts(newMatches);
  };

  const handleCreateProduct = (item: any) => {
    setCreatingProduct(item);
    setShowCreateModal(true);
  };

  const handleSaveNewProduct = async () => {
    if (!creatingProduct || !newProductCategory) {
      alert('Pasirinkite produkto kategoriją');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: creatingProduct.description,
          category: newProductCategory,
          unit: creatingProduct.unit || 'vnt',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();

      const itemIndex = invoiceData.items.findIndex((i: any) => i.line_no === creatingProduct.line_no);
      if (itemIndex !== -1) {
        const newMatches = new Map(matchedProducts);
        newMatches.set(itemIndex, data);
        setMatchedProducts(newMatches);
      }

      setShowCreateModal(false);
      setCreatingProduct(null);
      setNewProductCategory('');
      alert('Produktas sėkmingai sukurtas!');
    } catch (error: any) {
      alert('Klaida kuriant produktą: ' + error.message);
    }
  };

  const handleBulkReceive = async () => {
    if (!invoiceData || !invoiceData.supplier) {
      alert('Nėra sąskaitos duomenų');
      return;
    }

    const matchedItems = invoiceData.items.filter((_: any, index: number) => {
      const matched = matchedProducts.get(index);
      return matched !== undefined && matched !== null;
    });

    if (matchedItems.length === 0) {
      alert('Nėra susieti produktai. Prašome susieti produktus prieš priėmimą.');
      return;
    }

    if (!bulkReceiveData.lot || !bulkReceiveData.expiry_date) {
      alert('Įveskite partijos numerį ir galiojimo datą');
      return;
    }

    setBulkReceiving(true);

    try {
      let supplierId = invoiceData.supplier_id;

      if (!supplierId) {
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', invoiceData.supplier.name)
          .maybeSingle();

        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const { data: newSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: invoiceData.supplier.name,
              code: invoiceData.supplier.code,
              vat_code: invoiceData.supplier.vat_code,
              iban: invoiceData.supplier.iban,
              address: invoiceData.supplier.address,
            })
            .select()
            .single();

          if (supplierError) throw supplierError;
          supplierId = newSupplier.id;
        }
      }

      const stockEntries = [];
      for (let i = 0; i < invoiceData.items.length; i++) {
        const matched = matchedProducts.get(i);
        if (!matched) continue;

        const itemData = getItemData(invoiceData.items[i], i);

        stockEntries.push({
          product_id: matched.id,
          lot: bulkReceiveData.lot,
          mfg_date: bulkReceiveData.mfg_date || null,
          expiry_date: bulkReceiveData.expiry_date,
          supplier_id: supplierId,
          doc_title: 'Invoice',
          doc_number: invoiceData.invoice.number,
          doc_date: bulkReceiveData.doc_date,
          purchase_price: parseFloat(itemData.unit_price) || 0,
          currency: invoiceData.invoice.currency,
          received_qty: parseFloat(itemData.qty) || 0,
        });
      }

      const { error: insertError } = await supabase
        .from('stock_receipts')
        .insert(stockEntries);

      if (insertError) throw insertError;

      alert(`Sėkmingai priimta ${stockEntries.length} produktų!`);
      setInvoiceData(null);
      setMatchedProducts(new Map());
      setEditedItems(new Map());
      setSelectedFile(null);
      setUploadStatus('idle');
      setBulkReceiveData({
        lot: '',
        mfg_date: '',
        expiry_date: '',
        doc_date: new Date().toISOString().split('T')[0],
      });

      await loadData();
    } catch (error: any) {
      alert('Klaida priimant produktus: ' + error.message);
    } finally {
      setBulkReceiving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('batches').insert({
        product_id: formData.product_id,
        lot: formData.lot || null,
        mfg_date: formData.mfg_date || null,
        expiry_date: formData.expiry_date || null,
        supplier_id: formData.supplier_id || null,
        doc_title: formData.doc_title,
        doc_number: formData.doc_number || null,
        doc_date: formData.doc_date || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        currency: formData.currency,
        received_qty: parseFloat(formData.received_qty),
      });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        product_id: '',
        lot: '',
        mfg_date: '',
        expiry_date: '',
        supplier_id: '',
        doc_title: 'Invoice',
        doc_number: '',
        doc_date: new Date().toISOString().split('T')[0],
        purchase_price: '',
        currency: 'EUR',
        received_qty: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-50 p-2 rounded-lg">
            <Plus className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Priėmimo registravimas</h2>
            <p className="text-sm text-gray-600">Pridėti naują partiją į atsargas</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Atsargos sėkmingai priimtos!</span>
          </div>
        )}

        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">PDF dokumento įkėlimas</h3>
              <p className="text-sm text-gray-600">Įkelkite priėmimo dokumentą (sąskaitą, važtaraštį ir kt.)</p>
            </div>
          </div>

          {!selectedFile ? (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Spustelėkite arba tempkite PDF failą čia
                </p>
                <p className="text-xs text-gray-500">Palaikomi tik PDF failai</p>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-white border-2 border-blue-300 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={uploadStatus === 'uploading'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadMessage && (
                <div className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                  uploadStatus === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : uploadStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  {uploadStatus === 'success' && <Check className="w-5 h-5" />}
                  <span className="text-sm font-medium">{uploadMessage}</span>
                </div>
              )}

              <button
                onClick={handleFileUpload}
                disabled={uploadStatus === 'uploading'}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploadStatus === 'uploading' ? 'Įkeliama...' : 'Įkelti PDF'}
              </button>
            </div>
          )}
        </div>

        {invoiceData && (
          <div className="mb-6 p-6 bg-white border-2 border-gray-200 rounded-xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sąskaitos duomenys</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Sąskaita Nr.</p>
                  <p className="font-semibold text-gray-900">{invoiceData.invoice.number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Data</p>
                  <p className="font-semibold text-gray-900">{invoiceData.invoice.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tiekėjas</p>
                  <p className="font-semibold text-gray-900">{invoiceData.supplier.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Viso suma</p>
                  <p className="font-semibold text-emerald-700 text-lg">
                    €{invoiceData.invoice.total_gross.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3">Prekės ({invoiceData.items.length})</h4>
              <div className="space-y-2">
                {invoiceData.items.map((item: any, index: number) => {
                  const matchedProduct = matchedProducts.get(index);
                  const isMatched = matchedProduct !== undefined && matchedProduct !== null;

                  return (
                    <div
                      key={item.line_no}
                      className={`p-3 rounded-lg border-2 ${
                        isMatched
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isMatched ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-gray-900 text-sm">
                          #{item.line_no}: {item.description}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-gray-600">SKU:</span>{' '}
                          <input
                            type="text"
                            value={getItemData(item, index).sku}
                            onChange={(e) => handleItemEdit(index, 'sku', e.target.value)}
                            className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600">Kiekis:</span>{' '}
                          <input
                            type="number"
                            step="0.01"
                            value={getItemData(item, index).qty}
                            onChange={(e) => handleItemEdit(index, 'qty', e.target.value)}
                            className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600">Kaina:</span>{' '}
                          <input
                            type="number"
                            step="0.01"
                            value={getItemData(item, index).unit_price}
                            onChange={(e) => handleItemEdit(index, 'unit_price', e.target.value)}
                            className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600">Suma:</span>{' '}
                          <span className="font-medium text-emerald-700">
                            €{(getItemData(item, index).qty * getItemData(item, index).unit_price).toFixed(2)}
                          </span>
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
                              {products.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.category})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-amber-800 font-semibold">
                              Produktas nerastas
                            </p>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleProductMatch(index, e.target.value);
                                }
                              }}
                              className="px-2 py-0.5 border border-amber-300 rounded text-xs bg-white"
                              defaultValue=""
                            >
                              <option value="">Pasirinkti esamą...</option>
                              {products.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.category})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleCreateProduct(item)}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Sukurti naują
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Masinis priėmimas</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partija *
                  </label>
                  <input
                    type="text"
                    value={bulkReceiveData.lot}
                    onChange={(e) => setBulkReceiveData({ ...bulkReceiveData, lot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="LOT-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gamybos data
                  </label>
                  <input
                    type="date"
                    value={bulkReceiveData.mfg_date}
                    onChange={(e) => setBulkReceiveData({ ...bulkReceiveData, mfg_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Galiojimo data *
                  </label>
                  <input
                    type="date"
                    value={bulkReceiveData.expiry_date}
                    onChange={(e) => setBulkReceiveData({ ...bulkReceiveData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dokumento data *
                  </label>
                  <input
                    type="date"
                    value={bulkReceiveData.doc_date}
                    onChange={(e) => setBulkReceiveData({ ...bulkReceiveData, doc_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleBulkReceive}
                disabled={bulkReceiving}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {bulkReceiving ? 'Priimama...' : `Priimti visus susietus produktus (${Array.from(matchedProducts.values()).filter(p => p !== null).length})`}
              </button>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują produktą</h3>

              {creatingProduct && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Pavadinimas:</p>
                  <p className="font-semibold text-gray-900">{creatingProduct.description}</p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">Vienetas:</p>
                  <p className="font-semibold text-gray-900">{creatingProduct.unit}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pasirinkite kategoriją *
                </label>
                <select
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Pasirinkite...</option>
                  <option value="medicines">Vaistai</option>
                  <option value="vaccines">Vakcinos</option>
                  <option value="supplements">Priedai</option>
                  <option value="equipment">Įranga</option>
                  <option value="consumables">Suvartojamos medžiagos</option>
                  <option value="other">Kita</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatingProduct(null);
                    setNewProductCategory('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={handleSaveNewProduct}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Sukurti
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t-2 border-gray-200 pt-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rankinis priėmimo registravimas</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produktas *
              </label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="">Pasirinkite produktą...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PARTIJA / Serijos numeris
              </label>
              <input
                type="text"
                value={formData.lot}
                onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="PARTIJA-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priimtas kiekis *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.received_qty}
                onChange={(e) => setFormData({ ...formData, received_qty: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gamybos data
              </label>
              <input
                type="date"
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Galiojimo pabaiga
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiekėjas
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Pasirinkite tiekėją...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento pavadinimas
              </label>
              <input
                type="text"
                value={formData.doc_title}
                onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Sąskaita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento numeris
              </label>
              <input
                type="text"
                value={formData.doc_number}
                onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="S-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento data
              </label>
              <input
                type="date"
                value={formData.doc_date}
                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pirkimo kaina
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="25.50"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registruojama...' : 'Registruoti priėmimą'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
