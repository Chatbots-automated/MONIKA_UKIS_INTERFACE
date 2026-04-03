import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileDown, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Save,
  Send,
  Eye,
  Edit2,
  Building2,
  User,
  Calculator,
  FileText
} from 'lucide-react';
import {
  SecretarySupplier,
  SecretaryResponsiblePerson,
  SecretaryAccountingOperation,
  SecretaryMaterial,
  SecretaryService,
  REVERSE_VAT_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  VAT_SPECIAL_CODES,
} from '../../types/secretary-system';
import { 
  generateSecretaryExportPayload, 
  validateSecretaryPayload,
  formatPayloadForDisplay,
  convertPayloadToImportFile
} from '../../utils/secretaryExport';

interface SecretarySystemExportProps {
  invoiceId: string;
  onClose: () => void;
  onExportComplete?: (payload?: SecretaryInvoiceExportPayload) => void;
  bulkMode?: boolean;
}

interface InvoiceWithItems {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  supplier_unique_code?: string;
  supplier_currency?: string;
  supplier_company_code?: string;
  supplier_vat_code?: string;
  supplier_address?: string;
  supplier_accounting_account?: string;
  branch_number?: string;
  document_series_number?: string;
  document_number_only?: string;
  document_type_flag?: string;
  reverse_vat_indicator?: string;
  non_vat_invoice?: boolean;
  buyer_bank_account?: string;
  supplier_bank_account?: string;
  payment_due_date?: string;
  pvm_debtor_code?: string;
  pvm_debtor_name?: string;
  pvm_creditor_code?: string;
  pvm_creditor_name?: string;
  oss_system_document?: boolean;
  contact_email?: string;
  oss_country_code?: string;
  items: InvoiceItemWithFields[];
}

interface InvoiceItemWithFields {
  id: string;
  product_code?: string;
  description: string;
  unit_type?: string;
  quantity: number;
  quantity_sign?: number;
  unit_price: number;
  total_price: number;
  vat_rate?: number;
  vat_code?: string;
  vat_amount?: number;
  product_service_flag?: number;
  responsible_person_code?: string;
  responsible_person_name?: string;
  accounting_op1_debit?: string;
  accounting_op1_credit?: string;
  accounting_op1_expense_structure?: string;
  structural_unit_code?: string;
  structural_unit_name?: string;
  object_code?: string;
  object_name?: string;
}

export function SecretarySystemExport({ invoiceId, onClose, onExportComplete, bulkMode = false }: SecretarySystemExportProps) {
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Lookup data
  const [secretarySuppliers, setSecretarySuppliers] = useState<SecretarySupplier[]>([]);
  const [responsiblePersons, setResponsiblePersons] = useState<SecretaryResponsiblePerson[]>([]);
  const [accountingOperations, setAccountingOperations] = useState<SecretaryAccountingOperation[]>([]);
  const [secretaryMaterials, setSecretaryMaterials] = useState<SecretaryMaterial[]>([]);
  const [secretaryServices, setSecretaryServices] = useState<SecretaryService[]>([]);
  
  // Search states
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [materialSearch, setMaterialSearch] = useState<Map<number, string>>(new Map());
  const [showMaterialDropdown, setShowMaterialDropdown] = useState<number | null>(null);
  const [accountingOpSearch, setAccountingOpSearch] = useState<Map<number, string>>(new Map());
  const [showAccountingOpDropdown, setShowAccountingOpDropdown] = useState<number | null>(null);
  
  // Edit mode
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [itemEdits, setItemEdits] = useState<Map<number, Partial<InvoiceItemWithFields>>>(new Map());
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadInvoiceData();
    loadLookupData();
  }, [invoiceId]);
  
  // Auto-check L078-L081 checkbox when L069 is filled
  useEffect(() => {
    if (!invoice) return;
    
    // If L069 is filled and L078-L081 are not set, auto-check them
    if (invoice.reverse_vat_indicator && invoice.reverse_vat_indicator !== '' && !invoice.pvm_debtor_code) {
      setInvoice({
        ...invoice,
        pvm_debtor_code: 'auto',
        pvm_debtor_name: 'auto',
        pvm_creditor_code: 'auto',
        pvm_creditor_name: 'auto'
      });
    }
  }, [invoice?.reverse_vat_indicator]);
  
  useEffect(() => {
    if (!invoice || (secretaryMaterials.length === 0 && secretaryServices.length === 0) || accountingOperations.length === 0) return;
    
    const newMaterialSearch = new Map<number, string>();
    const newAccountingOpSearch = new Map<number, string>();
    
    invoice.items.forEach((item, idx) => {
      if (item.product_code) {
        // Check if it's a service or material based on L009 selection
        const isService = item.product_service_flag === 1;
        const lookupList = isService ? secretaryServices : secretaryMaterials;
        const found = lookupList.find((m: any) => String(m.code) === item.product_code);
        if (found) {
          newMaterialSearch.set(idx, found.name);
        }
      }
      
      if (item.accounting_op1_debit) {
        const operation = accountingOperations.find(op => op.debit === item.accounting_op1_debit);
        if (operation) {
          newAccountingOpSearch.set(idx, operation.name);
        }
      }
    });
    
    if (newMaterialSearch.size > 0) setMaterialSearch(newMaterialSearch);
    if (newAccountingOpSearch.size > 0) setAccountingOpSearch(newAccountingOpSearch);
  }, [invoice?.items, secretaryMaterials, secretaryServices, accountingOperations]);
  
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSupplierDropdown(false);
      setShowMaterialDropdown(null);
      setShowAccountingOpDropdown(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadInvoiceData = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('equipment_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('equipment_invoice_items')
        .select(`
          *,
          product:equipment_products(name, product_code, unit_type)
        `)
        .eq('invoice_id', invoiceId)
        .order('line_no');

      if (itemsError) throw itemsError;

      if (invoiceData.supplier_name) {
        setSupplierSearch(invoiceData.supplier_name);
      }
      
      // Get supplier's accounting account for L029
      let supplierAccountingAccount = invoiceData.supplier_accounting_account;
      if (invoiceData.supplier_unique_code && !supplierAccountingAccount) {
        const { data: supplierData } = await supabase
          .from('secretary_suppliers')
          .select('accounting_account')
          .eq('code', parseInt(invoiceData.supplier_unique_code))
          .single();
        
        if (supplierData?.accounting_account) {
          supplierAccountingAccount = String(supplierData.accounting_account);
        }
      }
      
      setInvoice({
        ...invoiceData,
        supplier_accounting_account: supplierAccountingAccount,
        document_series_number: invoiceData.document_series_number || invoiceData.invoice_number,
        items: itemsData.map(item => ({
          id: item.id,
          product_code: item.product_code || item.product?.product_code || '',
          description: item.description,
          unit_type: item.unit_type || item.product?.unit_type || 'vnt',
          quantity: item.quantity,
          quantity_sign: item.quantity_sign ?? 0,
          unit_price: item.unit_price,
          total_price: item.total_price,
          vat_rate: item.vat_rate ?? 21,
          vat_code: item.vat_code,
          vat_amount: item.vat_amount,
          product_service_flag: item.product_service_flag ?? 0,
          responsible_person_code: item.responsible_person_code,
          responsible_person_name: item.responsible_person_name,
          accounting_op1_debit: item.accounting_op1_debit,
          accounting_op1_credit: item.accounting_op1_credit || supplierAccountingAccount || '451',
          accounting_op1_expense_structure: item.accounting_op1_expense_structure,
          structural_unit_code: item.structural_unit_code,
          structural_unit_name: item.structural_unit_name,
          object_code: item.object_code,
          object_name: item.object_name,
        })),
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Klaida įkeliant sąskaitą');
      setLoading(false);
    }
  };

  const loadLookupData = async () => {
    // Load all data with pagination to bypass 1000 row limit
    const loadAllRows = async (table: string) => {
      const allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('is_active', true)
          .order('name')
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      
      return allData;
    };

    try {
      const [suppliers, persons, operations, materials, services] = await Promise.all([
        loadAllRows('secretary_suppliers'),
        loadAllRows('secretary_responsible_persons'),
        loadAllRows('secretary_accounting_operations'),
        loadAllRows('secretary_materials'),
        loadAllRows('secretary_services'),
      ]);

      setSecretarySuppliers(suppliers);
      setResponsiblePersons(persons);
      setAccountingOperations(operations);
      setSecretaryMaterials(materials);
      setSecretaryServices(services);
    } catch (error) {
      console.error('Error loading lookup data:', error);
    }
  };

  const handleSupplierSelect = (supplier: SecretarySupplier) => {
    if (!invoice) return;
    
    // Detect if supplier is foreign based on VAT code
    const isForeignSupplier = supplier.vat_code && !supplier.vat_code.startsWith('LT');
    
    // Get supplier's accounting account (column P) for L029
    const supplierAccountingAccount = supplier.accounting_account ? String(supplier.accounting_account) : undefined;
    
    setInvoice({
      ...invoice,
      supplier_unique_code: String(supplier.code),
      supplier_name: supplier.name,
      supplier_company_code: supplier.company_code || undefined,
      supplier_vat_code: supplier.vat_code || undefined,
      supplier_address: supplier.address || undefined,
      supplier_currency: supplier.currency || 'EUR',
      supplier_accounting_account: supplierAccountingAccount,
      // Auto-set L069 based on supplier country
      reverse_vat_indicator: isForeignSupplier ? '1' : '',
      // Auto-set L029 for all items from supplier's accounting account (column P)
      items: invoice.items.map(item => ({
        ...item,
        accounting_op1_credit: supplierAccountingAccount || item.accounting_op1_credit || '451'
      }))
    });
    
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
  };

  const handleItemFieldUpdate = (index: number, field: string, value: any) => {
    if (!invoice) return;
    
    const updatedItems = [...invoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInvoice({ ...invoice, items: updatedItems });
    
    const currentEdits = itemEdits.get(index) || {};
    const newEdits = new Map(itemEdits);
    newEdits.set(index, { ...currentEdits, [field]: value });
    setItemEdits(newEdits);
  };

  const getItemData = (item: InvoiceItemWithFields, index: number): InvoiceItemWithFields => {
    const edits = itemEdits.get(index);
    return edits ? { ...item, ...edits } : item;
  };

  const handleSaveChanges = async () => {
    if (!invoice) return;
    
    setSaving(true);
    
    try {
      // Update invoice header
      const { error: invoiceError } = await supabase
        .from('equipment_invoices')
        .update({
          supplier_unique_code: invoice.supplier_unique_code,
          supplier_currency: invoice.supplier_currency,
          supplier_company_code: invoice.supplier_company_code,
          supplier_vat_code: invoice.supplier_vat_code,
          supplier_address: invoice.supplier_address,
          branch_number: invoice.branch_number || '1',
          document_series_number: invoice.document_series_number,
          document_number_only: invoice.document_number_only,
          document_type_flag: invoice.document_type_flag,
          reverse_vat_indicator: invoice.reverse_vat_indicator,
          non_vat_invoice: invoice.non_vat_invoice,
          buyer_bank_account: invoice.buyer_bank_account,
          payment_due_date: invoice.payment_due_date,
          pvm_debtor_code: invoice.pvm_debtor_code,
          pvm_debtor_name: invoice.pvm_debtor_name,
          pvm_creditor_code: invoice.pvm_creditor_code,
          pvm_creditor_name: invoice.pvm_creditor_name,
          oss_system_document: invoice.oss_system_document,
          contact_email: invoice.contact_email,
          oss_country_code: invoice.oss_country_code,
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Update invoice items
      for (const [index, item] of invoice.items.entries()) {
        const itemData = getItemData(item, index);
        
        const { error: itemError } = await supabase
          .from('equipment_invoice_items')
          .update({
            product_code: itemData.product_code,
            unit_type: itemData.unit_type,
            quantity_sign: itemData.quantity_sign,
            vat_rate: itemData.vat_rate,
            vat_code: itemData.vat_code,
            vat_amount: itemData.vat_amount,
            product_service_flag: itemData.product_service_flag,
            responsible_person_code: itemData.responsible_person_code,
            responsible_person_name: itemData.responsible_person_name,
            accounting_op1_debit: itemData.accounting_op1_debit,
            accounting_op1_credit: itemData.accounting_op1_credit,
            accounting_op1_expense_structure: itemData.accounting_op1_expense_structure,
            structural_unit_code: itemData.structural_unit_code,
            structural_unit_name: itemData.structural_unit_name,
            object_code: itemData.object_code,
            object_name: itemData.object_name,
          })
          .eq('id', itemData.id);

        if (itemError) throw itemError;
      }

      alert('Pakeitimai išsaugoti sėkmingai!');
      setItemEdits(new Map());
      await loadInvoiceData();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('Klaida išsaugant: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePreview = () => {
    if (!invoice) return;
    
    try {
      const itemsWithEdits = invoice.items.map((item, index) => getItemData(item, index));
      const payload = generateSecretaryExportPayload(invoice, itemsWithEdits);
      const validation = validateSecretaryPayload(payload);
      
      setPreviewPayload(payload);
      setValidationErrors(validation.errors);
      setShowPreview(true);
    } catch (error: any) {
      alert('Klaida generuojant eksportą: ' + error.message);
    }
  };

  const handleExportToSecretary = async () => {
    if (!invoice || !previewPayload) return;
    
    const validation = validateSecretaryPayload(previewPayload);
    if (!validation.valid) {
      alert('Negalima eksportuoti: yra klaidų\n\n' + validation.errors.join('\n'));
      return;
    }
    
    setExporting(true);
    
    try {
      // Save export log
      const { data: exportLog, error: exportError } = await supabase
        .from('secretary_invoice_exports')
        .insert({
          invoice_id: invoiceId,
          export_payload: previewPayload,
          export_status: 'pending',
          exported_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (exportError) throw exportError;

      // Here you would send to their secretary system
      // For now, we just save the JSON payload
      alert('✅ Eksportas paruoštas! JSON payload išsaugotas sistemoje.');
      
      if (onExportComplete) {
        onExportComplete();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error exporting:', error);
      alert('Klaida eksportuojant: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!previewPayload) return;

    const jsonString = formatPayloadForDisplay(previewPayload);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoice?.invoice_number}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!previewPayload) return;

    const csvContent = convertPayloadToImportFile(previewPayload);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoice?.invoice_number}_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredSuppliers = secretarySuppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    String(s.code).includes(supplierSearch) ||
    (s.company_code && s.company_code.includes(supplierSearch))
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-800">Sąskaita nerasta</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
            Uždaryti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Eksportas į sekretorės sistemą</h2>
              <p className="text-blue-100">Sąskaita: {invoice.invoice_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Supplier Section */}
          <div className="mb-6 bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-slate-600" />
              <h3 className="text-lg font-bold text-gray-800">Tiekėjo informacija (L006-L008)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Search/Select */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ieškoti tiekėjo sistemoje <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      placeholder="Ieškoti pagal pavadinimą, kodą arba įmonės kodą..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {showSupplierDropdown && supplierSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map(supplier => (
                          <button
                            key={supplier.id}
                            onClick={() => handleSupplierSelect(supplier)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-900">{supplier.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">Kodas: {supplier.code}</span>
                              {supplier.company_code && (
                                <span className="ml-2 font-mono bg-blue-100 px-2 py-0.5 rounded">Įm. kodas: {supplier.company_code}</span>
                              )}
                              {supplier.vat_code && (
                                <span className="ml-2 font-mono bg-green-100 px-2 py-0.5 rounded">PVM: {supplier.vat_code}</span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          Nerasta tiekėjų
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Display selected supplier info */}
              {invoice.supplier_unique_code && (
                <div className="col-span-2 bg-white border-2 border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">L006: Tiekėjo kodas</label>
                      <p className="font-mono font-bold text-blue-600 text-lg">{invoice.supplier_unique_code}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">L007: Pavadinimas</label>
                      <p className="font-semibold text-gray-900">{invoice.supplier_name}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">L008: Valiuta</label>
                      <p className="font-mono font-bold text-gray-900">{invoice.supplier_currency || 'EUR'}</p>
                    </div>
                  </div>
                  {invoice.supplier_vat_code && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div>
                        <span className="text-xs text-gray-600">PVM kodas: </span>
                        <span className="font-mono text-sm font-semibold">{invoice.supplier_vat_code}</span>
                        {invoice.supplier_vat_code.startsWith('LT') ? (
                          <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                            🇱🇹 LIETUVOS TIEKĖJAS
                          </span>
                        ) : (
                          <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded">
                            🌍 UŽSIENIO TIEKĖJAS
                          </span>
                        )}
                      </div>
                      {invoice.supplier_accounting_account && (
                        <div>
                          <span className="text-xs text-gray-600">L029 (Kreditas): </span>
                          <span className="font-mono text-sm font-bold text-purple-600">{invoice.supplier_accounting_account}</span>
                          <span className="ml-2 text-xs text-gray-500">(iš stulpelio P)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Info Section */}
          <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-800">Dokumento informacija (L001-L005, L064-L084)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L001: Filialo numeris <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={invoice.branch_number || '1'}
                  onChange={(e) => setInvoice({ ...invoice, branch_number: e.target.value })}
                  maxLength={4}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L003: Dokumento serija ir Nr. *
                </label>
                <input
                  type="text"
                  value={invoice.document_series_number || invoice.invoice_number}
                  onChange={(e) => setInvoice({ ...invoice, document_series_number: e.target.value })}
                  maxLength={15}
                  placeholder="ABC000254"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Svarbu VMI! Serija + Nr. (pvz., ABC000254). L004 užpildomas automatiškai.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L064: Dokumento tipas
                </label>
                <select
                  value={invoice.document_type_flag || ''}
                  onChange={(e) => setInvoice({ ...invoice, document_type_flag: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Įprastas pirkimas (tuščias)</option>
                  <option value="K">K - Kreditinė sąskaita</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Palikite tuščią įprastam pirkimui. Tik "K" kreditinei sąskaitai.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L069: Atvirkštinio PVM požymis
                </label>
                <div className="mb-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                  <p className="text-sm font-bold text-amber-900">⚠️ SVARBU!</p>
                  <p className="text-xs text-amber-800 mt-1">
                    <strong>Lietuvos tiekėjas</strong> (pvz., Kalnapilis) → Palikite <strong>TUŠČIĄ</strong><br/>
                    <strong>Užsienio ES tiekėjas</strong> (pvz., Latvija, Lenkija) → Pasirinkite <strong>"1"</strong><br/>
                    <strong>96-to str. atvejai</strong> (statybos, elektronika, mediena) → Pasirinkite <strong>"2-9"</strong>
                  </p>
                </div>
                <select
                  value={invoice.reverse_vat_indicator || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Auto-check L078-L081 if L069 is filled (not empty)
                    if (newValue && newValue !== '') {
                      setInvoice({ 
                        ...invoice, 
                        reverse_vat_indicator: newValue,
                        pvm_debtor_code: 'auto',
                        pvm_debtor_name: 'auto',
                        pvm_creditor_code: 'auto',
                        pvm_creditor_name: 'auto'
                      });
                    } else {
                      setInvoice({ 
                        ...invoice, 
                        reverse_vat_indicator: newValue,
                        pvm_debtor_code: undefined,
                        pvm_debtor_name: undefined,
                        pvm_creditor_code: undefined,
                        pvm_creditor_name: undefined
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">TUŠČIAS - Lietuvos tiekėjas (pvz., Kalnapilis)</option>
                  {REVERSE_VAT_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.code} - {opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L070: Ne PVM sąskaita
                </label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    checked={invoice.non_vat_invoice || false}
                    onChange={(e) => setInvoice({ ...invoice, non_vat_invoice: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Tai ne PVM sąskaita faktūra</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L071: Pirkėjo banko sąskaita
                </label>
                <input
                  type="text"
                  value={invoice.buyer_bank_account || ''}
                  onChange={(e) => setInvoice({ ...invoice, buyer_bank_account: e.target.value })}
                  maxLength={20}
                  placeholder="LT..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* L072: Tiekėjo banko sąskaita - HIDDEN, not needed */}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  L075: Apmokėti iki data
                </label>
                <input
                  type="date"
                  value={invoice.payment_due_date || ''}
                  onChange={(e) => setInvoice({ ...invoice, payment_due_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Construction/Special cases fields */}
            <div className="mt-4 p-4 bg-white border-2 border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-3">
                Specialūs atvejai (užsienio, elektronika, mediena, statybos darbai)
              </p>
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!invoice.pvm_debtor_code}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setInvoice({ 
                          ...invoice, 
                          pvm_debtor_code: 'GautPVM',
                          pvm_debtor_name: 'VMI prie LR FM',
                          pvm_creditor_code: 'MokPVM',
                          pvm_creditor_name: 'VMI prie LR FM'
                        });
                      } else {
                        setInvoice({ 
                          ...invoice, 
                          pvm_debtor_code: undefined,
                          pvm_debtor_name: undefined,
                          pvm_creditor_code: undefined,
                          pvm_creditor_name: undefined
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Atvirkštinis PVM pirkimas (L078-L081)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Pažymėkite jei: užsienio pirkimas, 96-to str. prekės/paslaugos (statybos, elektronika, mediena, bankrotas)
                </p>
              </div>
              {invoice.pvm_debtor_code && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">L078: PVM debitoriaus kodas</label>
                    <input
                      type="text"
                      value="GautPVM"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">L079: PVM debitoriaus pavadinimas</label>
                    <input
                      type="text"
                      value="VMI prie LR FM"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">L080: PVM kreditoriaus kodas</label>
                    <input
                      type="text"
                      value="MokPVM"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">L081: PVM kreditoriaus pavadinimas</label>
                    <input
                      type="text"
                      value="VMI prie LR FM"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-800">Sąskaitos eilutės ({invoice.items.length})</h3>
            </div>

            <div className="space-y-4">
              {invoice.items.map((item, index) => {
                const itemData = item;
                const isEditing = editingItem === index;

                return (
                  <div key={item.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            #{index + 1}
                          </span>
                          <h4 className="font-bold text-gray-900 text-lg">{itemData.description}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Kiekis: <span className="font-semibold">{itemData.quantity}</span></span>
                          <span>Vienetas: <span className="font-semibold">{itemData.unit_type}</span></span>
                          <span>Suma: <span className="font-semibold">{itemData.total_price.toFixed(2)} EUR</span></span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingItem(isEditing ? null : index)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                          isEditing
                            ? 'bg-gray-600 text-white hover:bg-gray-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isEditing ? (
                          <>
                            <X className="w-4 h-4" />
                            Uždaryti
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4" />
                            Redaguoti
                          </>
                        )}
                      </button>
                    </div>

                    {isEditing && (
                      <div className="space-y-4 pt-4 border-t-2 border-gray-200">
                        {/* L009 - Product/Service Flag - MANUAL SELECTION */}
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            L009: Produktas ar paslauga? <span className="text-red-600">*</span>
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={itemData.product_service_flag === 0}
                                onChange={() => handleItemFieldUpdate(index, 'product_service_flag', 0)}
                                className="w-4 h-4 text-purple-600"
                              />
                              <span className="font-semibold">0 - Produktas (vertybė)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={itemData.product_service_flag === 1}
                                onChange={() => handleItemFieldUpdate(index, 'product_service_flag', 1)}
                                className="w-4 h-4 text-purple-600"
                              />
                              <span className="font-semibold">1 - Paslauga</span>
                            </label>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Pasirinkite rankiniu būdu. Nuo šio priklauso L010 sąrašas (vertybių ar paslaugų).
                          </p>
                        </div>

                        {/* Product Code (L010) - Material/Service Lookup */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            {(() => {
                              const isService = itemData.product_service_flag === 1;
                              const lookupList = isService ? secretaryServices : secretaryMaterials;
                              const listType = isService ? 'paslaugos' : 'medžiagos';
                              
                              return (
                                <>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    L010: {isService ? 'Paslaugos' : 'Produkto'} kodas <span className="text-red-600">*</span>
                                  </label>
                                  {itemData.product_service_flag === undefined && (
                                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                      ⚠️ Pirmiausia pasirinkite L009 (produktas ar paslauga)
                                    </div>
                                  )}
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={materialSearch.get(index) ?? ''}
                                      onChange={(e) => {
                                        const newSearch = new Map(materialSearch);
                                        newSearch.set(index, e.target.value);
                                        setMaterialSearch(newSearch);
                                        setShowMaterialDropdown(index);
                                      }}
                                      onFocus={() => setShowMaterialDropdown(index)}
                                      placeholder={`Ieškoti ${listType} pagal pavadinimą...`}
                                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      disabled={itemData.product_service_flag === undefined}
                                    />
                                    <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                                  </div>
                                  
                                  {itemData.product_code && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                      <p className="text-xs text-gray-600">Pasirinkta ({isService ? 'paslauga' : 'produktas'}):</p>
                                      <p className="font-mono font-bold text-blue-600">
                                        {itemData.product_code} - {lookupList.find((m: any) => String(m.code) === itemData.product_code)?.name || 'Įkeliama...'}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {showMaterialDropdown === index && materialSearch.get(index) && itemData.accounting_op1_debit && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                      {lookupList
                                        .filter((m: any) => 
                                          m.name.toLowerCase().includes(materialSearch.get(index)?.toLowerCase() || '') ||
                                          String(m.code).includes(materialSearch.get(index) || '')
                                        )
                                        .slice(0, 50)
                                        .map((item: any) => (
                                          <button
                                            key={item.id}
                                            onClick={() => {
                                              if (!invoice) return;
                                              
                                              const updatedItems = [...invoice.items];
                                              updatedItems[index] = { 
                                                ...updatedItems[index], 
                                                product_code: String(item.code),
                                                description: item.name,
                                                unit_type: item.unit_type || 'vnt'
                                              };
                                              setInvoice({ ...invoice, items: updatedItems });
                                              
                                              const currentEdits = itemEdits.get(index) || {};
                                              const newEdits = new Map(itemEdits);
                                              newEdits.set(index, { 
                                                ...currentEdits, 
                                                product_code: String(item.code),
                                                description: item.name,
                                                unit_type: item.unit_type || 'vnt'
                                              });
                                              setItemEdits(newEdits);
                                              
                                              const newSearch = new Map(materialSearch);
                                              newSearch.set(index, item.name);
                                              setMaterialSearch(newSearch);
                                              setShowMaterialDropdown(null);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                                          >
                                            <div className="font-mono text-sm font-bold text-blue-600">
                                              {item.code}
                                            </div>
                                            <div className="text-sm text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">
                                              {item.unit_type || 'vnt'} {item.price && `| ${item.price} EUR`}
                                            </div>
                                          </button>
                                        ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              L012: Mato vienetas <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={itemData.unit_type || 'vnt'}
                              onChange={(e) => handleItemFieldUpdate(index, 'unit_type', e.target.value)}
                              maxLength={4}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* VAT Information */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <h5 className="font-semibold text-green-900 mb-3">PVM informacija</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                L016: PVM tarifas (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={itemData.vat_rate ?? 21}
                                onChange={(e) => handleItemFieldUpdate(index, 'vat_rate', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Lietuvoje: 5%, 9%, arba 21% (bus išsiųsta kaip 500, 900, 2100)
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                L016: Arba specialus kodas
                              </label>
                              <select
                                value={itemData.vat_code || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'vat_code', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              >
                                <option value="">Naudoti tarifą</option>
                                {VAT_SPECIAL_CODES.map(code => (
                                  <option key={code.code} value={code.code}>{code.code} - {code.label}</option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Naudokite tik jei PVM tarifas = 0%
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                L017: PVM suma (EUR)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={itemData.vat_amount ?? (itemData.total_price * ((itemData.vat_rate ?? 21) / 100)).toFixed(2)}
                                onChange={(e) => handleItemFieldUpdate(index, 'vat_amount', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Responsible Person (L022-L023) */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="w-5 h-5 text-blue-600" />
                            <h5 className="font-semibold text-blue-900">Materialiai atsakingas asmuo (L022-L023)</h5>
                            <span className="text-red-600 text-sm">*</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">L022: Kodas</label>
                              <select
                                value={String(itemData.responsible_person_code || '')}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const person = responsiblePersons.find(p => String(p.code) === code);
                                  
                                  console.log('Selected person:', { code, person, itemData });
                                  
                                  if (!invoice) return;
                                  const updatedItems = [...invoice.items];
                                  updatedItems[index] = { 
                                    ...updatedItems[index], 
                                    responsible_person_code: code,
                                    responsible_person_name: person?.name || ''
                                  };
                                  setInvoice({ ...invoice, items: updatedItems });
                                  
                                  const currentEdits = itemEdits.get(index) || {};
                                  const newEdits = new Map(itemEdits);
                                  newEdits.set(index, { 
                                    ...currentEdits, 
                                    responsible_person_code: code,
                                    responsible_person_name: person?.name || ''
                                  });
                                  setItemEdits(newEdits);
                                }}
                                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                              >
                                <option value="">Pasirinkite...</option>
                                {responsiblePersons.map(person => (
                                  <option key={person.id} value={String(person.code)}>
                                    {person.code} - {person.name} {person.additional_info && `(${person.additional_info})`}
                                  </option>
                                ))}
                              </select>
                              {itemData.responsible_person_code && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Pasirinktas kodas: <span className="font-mono font-bold">{itemData.responsible_person_code}</span>
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">L023: Pavadinimas</label>
                              <input
                                type="text"
                                value={itemData.responsible_person_name || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'responsible_person_name', e.target.value)}
                                maxLength={35}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                readOnly
                              />
                            </div>
                          </div>
                        </div>

                        {/* Accounting Operations (L028-L029) */}
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calculator className="w-5 h-5 text-amber-600" />
                            <h5 className="font-semibold text-amber-900">1-a ūkinė operacija (L028-L029)</h5>
                            <span className="text-red-600 text-sm">*</span>
                          </div>
                          <div className="mb-3 relative" onClick={(e) => e.stopPropagation()}>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pasirinkti operaciją</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={accountingOpSearch.get(index) ?? ''}
                                onChange={(e) => {
                                  const newSearch = new Map(accountingOpSearch);
                                  newSearch.set(index, e.target.value);
                                  setAccountingOpSearch(newSearch);
                                  setShowAccountingOpDropdown(index);
                                }}
                                onFocus={() => setShowAccountingOpDropdown(index)}
                                placeholder="Ieškoti operacijos pagal pavadinimą arba kodą..."
                                className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                              />
                              <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                            </div>
                            
                            {(itemData.accounting_op1_debit || itemData.accounting_op1_credit) && (
                              <div className="mt-2 p-2 bg-amber-100 rounded border border-amber-300">
                                <p className="text-xs text-gray-600">Pasirinkta:</p>
                                <p className="font-mono text-sm">
                                  <span className="font-bold">D: {itemData.accounting_op1_debit}</span>
                                  {' / '}
                                  <span className="font-bold">K: {itemData.accounting_op1_credit}</span>
                                </p>
                              </div>
                            )}
                            
                            {showAccountingOpDropdown === index && accountingOpSearch.get(index) && (
                              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-amber-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {accountingOperations
                                  .filter(op => 
                                    op.name.toLowerCase().includes(accountingOpSearch.get(index)?.toLowerCase() || '') ||
                                    String(op.code).includes(accountingOpSearch.get(index) || '') ||
                                    op.debit?.includes(accountingOpSearch.get(index) || '') ||
                                    op.credit?.includes(accountingOpSearch.get(index) || '')
                                  )
                                  .slice(0, 50)
                                  .map(operation => (
                                    <button
                                      key={operation.id}
                                      onClick={() => {
                                        if (!invoice) return;
                                        
                                        const debitValue = String(operation.debit || '').replace('.0', '');
                                        // L029 comes from SUPPLIER's accounting account, not from operation
                                        const creditValue = invoice?.supplier_accounting_account || '451';
                                        const expenseValue = String(operation.expense_structure || '').replace('.0', '');
                                        
                                        const updatedItems = [...invoice.items];
                                        updatedItems[index] = { 
                                          ...updatedItems[index], 
                                          accounting_op1_debit: debitValue,
                                          accounting_op1_credit: creditValue,
                                          accounting_op1_expense_structure: expenseValue
                                        };
                                        setInvoice({ ...invoice, items: updatedItems });
                                        
                                        const currentEdits = itemEdits.get(index) || {};
                                        const newEdits = new Map(itemEdits);
                                        newEdits.set(index, { 
                                          ...currentEdits, 
                                          accounting_op1_debit: debitValue,
                                          accounting_op1_credit: creditValue,
                                          accounting_op1_expense_structure: expenseValue
                                        });
                                        setItemEdits(newEdits);
                                        
                                        const newSearch = new Map(accountingOpSearch);
                                        newSearch.set(index, operation.name);
                                        setAccountingOpSearch(newSearch);
                                        setShowAccountingOpDropdown(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-amber-50 border-b border-gray-100 last:border-0"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-amber-600">{operation.code}</span>
                                        <span className="text-xs font-mono text-gray-500">
                                          D:{String(operation.debit || '-').replace('.0', '')} K:{String(operation.credit || '-').replace('.0', '')}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-900">{operation.name}</div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">L028: Debetas</label>
                              <input
                                type="text"
                                value={itemData.accounting_op1_debit || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'accounting_op1_debit', e.target.value)}
                                maxLength={9}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                L029: Kreditas
                                <span className="text-xs text-gray-500 ml-2">(iš tiekėjo įrašo)</span>
                              </label>
                              <input
                                type="text"
                                value={itemData.accounting_op1_credit || invoice?.supplier_accounting_account || '451'}
                                disabled
                                maxLength={9}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-mono bg-gray-100 text-gray-700"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Automatiškai iš tiekėjo buhalterinės sąskaitos (stulpelis P)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Optional: Structural Unit (L024-L025) */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-700 mb-3 text-sm">Papildoma informacija (neprivaloma)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">L024: Struktūrinis padalinys (kodas)</label>
                              <input
                                type="text"
                                value={itemData.structural_unit_code || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'structural_unit_code', e.target.value)}
                                maxLength={4}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">L025: Struktūrinis padalinys (pavadinimas)</label>
                              <input
                                type="text"
                                value={itemData.structural_unit_name || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'structural_unit_name', e.target.value)}
                                maxLength={35}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                L026: Objektas (kodas)
                                <span className="text-xs text-gray-400 ml-2">(Paprastai nenaudojama)</span>
                              </label>
                              <input
                                type="text"
                                value={itemData.object_code || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'object_code', e.target.value)}
                                maxLength={4}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                L027: Objektas (pavadinimas)
                                <span className="text-xs text-gray-400 ml-2">(Paprastai nenaudojama)</span>
                              </label>
                              <input
                                type="text"
                                value={itemData.object_name || ''}
                                onChange={(e) => handleItemFieldUpdate(index, 'object_name', e.target.value)}
                                maxLength={35}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t-2 border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Atšaukti
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saugoma...' : 'Išsaugoti pakeitimus'}
              </button>

              <button
                onClick={handleGeneratePreview}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Peržiūrėti JSON
              </button>

              <button
                onClick={handleExportToSecretary}
                disabled={exporting || validationErrors.length > 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {exporting ? 'Eksportuojama...' : 'Eksportuoti'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-1">JSON Payload peržiūra</h3>
                  <p className="text-purple-100">Eksporto duomenys sekretorės sistemai</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-purple-500 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Validation Status */}
              {validationErrors.length > 0 ? (
                <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-900 mb-2">Validacijos klaidos:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                        {validationErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <p className="font-semibold text-green-900">Visi privalomi laukai užpildyti ✓</p>
                  </div>
                </div>
              )}

              {/* JSON Preview */}
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 font-mono text-sm">
                  {formatPayloadForDisplay(previewPayload)}
                </pre>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Uždaryti
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadJSON}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FileDown className="w-5 h-5" />
                    Atsisiųsti JSON
                  </button>
                  {!bulkMode && (
                    <button
                      onClick={handleDownloadCSV}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <FileDown className="w-5 h-5" />
                      Atsisiųsti CSV
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (bulkMode && previewPayload) {
                        onExportComplete?.(previewPayload);
                        setShowPreview(false);
                      } else {
                        handleExportToSecretary();
                      }
                    }}
                    disabled={exporting || validationErrors.length > 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {bulkMode ? 'Patvirtinti šią sąskaitą' : (exporting ? 'Eksportuojama...' : 'Patvirtinti ir eksportuoti')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
