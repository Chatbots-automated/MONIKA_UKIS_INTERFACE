import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function SecretaryDataImport() {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    materials?: number;
    services?: number;
    suppliers?: number;
    responsible_persons?: number;
    accounting_operations?: number;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImportFromJSON = async () => {
    setImporting(true);
    setError(null);
    setSuccess(false);

    try {
      // Fetch the secretary_data.json file
      const response = await fetch('/secretary_data.json');
      if (!response.ok) {
        throw new Error('Nepavyko įkelti secretary_data.json failo');
      }

      const data = await response.json();

      // Import Materials
      if (data.materials && data.materials.length > 0) {
        const { error: materialsError } = await supabase
          .from('secretary_materials')
          .upsert(
            data.materials.map((m: any) => ({
              code: m.code,
              name: m.name,
              bar_code: m.bar_code,
              product_code: m.product_code,
              unit_type: m.unit_type,
              price: m.price,
              selling_price: m.selling_price,
              product_code_2: m.product_code_2,
              group_code: m.group_code,
              group_name: m.group_name,
              vat_sale: m.vat_sale,
              vat_purchase: m.vat_purchase,
              markup: m.markup,
              alcohol: m.alcohol,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            })),
            { onConflict: 'code' }
          );

        if (materialsError) throw materialsError;
        setImportStatus(prev => ({ ...prev, materials: data.materials.length }));
      }

      // Import Services
      if (data.services && data.services.length > 0) {
        const { error: servicesError } = await supabase
          .from('secretary_services')
          .upsert(
            data.services.map((s: any) => ({
              code: s.code,
              name: s.name,
              additional_info: s.additional_info,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            })),
            { onConflict: 'code' }
          );

        if (servicesError) throw servicesError;
        setImportStatus(prev => ({ ...prev, services: data.services.length }));
      }

      // Import Suppliers
      if (data.suppliers && data.suppliers.length > 0) {
        const { error: suppliersError } = await supabase
          .from('secretary_suppliers')
          .upsert(
            data.suppliers.map((s: any) => ({
              code: s.code,
              name: s.name,
              company_code: s.company_code,
              vat_code: s.vat_code,
              address: s.address,
              email: s.email,
              phone: s.phone,
              bank_code: s.bank_code,
              bank_account: s.bank_account,
              vmi: s.vmi,
              additional_info: s.additional_info,
              account_group: s.account_group,
              account_type: s.account_type,
              account_name: s.account_name,
              accounting_account: s.accounting_account,
              currency: s.currency,
              recipient_company_code: s.recipient_company_code,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            })),
            { onConflict: 'code' }
          );

        if (suppliersError) throw suppliersError;
        setImportStatus(prev => ({ ...prev, suppliers: data.suppliers.length }));
      }

      // Import Responsible Persons
      if (data.responsible_persons && data.responsible_persons.length > 0) {
        const { error: personsError } = await supabase
          .from('secretary_responsible_persons')
          .upsert(
            data.responsible_persons.map((p: any) => ({
              code: p.code,
              name: p.name,
              additional_info: p.additional_info,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            })),
            { onConflict: 'code' }
          );

        if (personsError) throw personsError;
        setImportStatus(prev => ({ ...prev, responsible_persons: data.responsible_persons.length }));
      }

      // Import Accounting Operations
      if (data.accounting_operations && data.accounting_operations.length > 0) {
        const { error: operationsError } = await supabase
          .from('secretary_accounting_operations')
          .upsert(
            data.accounting_operations.map((o: any) => ({
              code: o.code,
              name: o.name,
              debit: o.debit,
              credit: o.credit,
              expense_structure: o.expense_structure,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            })),
            { onConflict: 'code' }
          );

        if (operationsError) throw operationsError;
        setImportStatus(prev => ({ ...prev, accounting_operations: data.accounting_operations.length }));
      }

      setSuccess(true);
    } catch (error: any) {
      console.error('Import error:', error);
      setError(error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Sekretorės sistemos duomenų importas</h2>
              <p className="text-blue-100 mt-1">Importuoti referencines lenteles iš secretary_data.json</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-blue-900 mb-2">Instrukcijos:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Įsitikinkite, kad <code className="bg-blue-100 px-1 rounded">secretary_data.json</code> failas yra <code className="bg-blue-100 px-1 rounded">public/</code> kataloge</li>
              <li>Spauskite "Importuoti duomenis" mygtuką</li>
              <li>Palaukite kol importuosis visi duomenys (~7000 įrašų)</li>
              <li>Patikrinkite rezultatus žemiau</li>
            </ol>
          </div>

          {/* Import Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleImportFromJSON}
              disabled={importing}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-3 mx-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Importuojama...
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  Importuoti duomenis
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900 mb-1">Klaida importuojant</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-green-900 mb-1">Importas sėkmingas!</h4>
                  <p className="text-sm text-green-800">Visi duomenys sėkmingai importuoti į duomenų bazę.</p>
                </div>
              </div>
            </div>
          )}

          {/* Import Statistics */}
          {Object.keys(importStatus).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {importStatus.materials !== undefined && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-1">Medžiagos</h4>
                  <p className="text-3xl font-bold text-blue-600">{importStatus.materials}</p>
                  <p className="text-xs text-blue-700 mt-1">įrašų importuota</p>
                </div>
              )}

              {importStatus.services !== undefined && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-1">Paslaugos</h4>
                  <p className="text-3xl font-bold text-purple-600">{importStatus.services}</p>
                  <p className="text-xs text-purple-700 mt-1">įrašų importuota</p>
                </div>
              )}

              {importStatus.suppliers !== undefined && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-1">Tiekėjai</h4>
                  <p className="text-3xl font-bold text-green-600">{importStatus.suppliers}</p>
                  <p className="text-xs text-green-700 mt-1">įrašų importuota</p>
                </div>
              )}

              {importStatus.responsible_persons !== undefined && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-1">Atsakingi asmenys</h4>
                  <p className="text-3xl font-bold text-amber-600">{importStatus.responsible_persons}</p>
                  <p className="text-xs text-amber-700 mt-1">įrašų importuota</p>
                </div>
              )}

              {importStatus.accounting_operations !== undefined && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-lg p-4">
                  <h4 className="font-semibold text-cyan-900 mb-1">Ūkinės operacijos</h4>
                  <p className="text-3xl font-bold text-cyan-600">{importStatus.accounting_operations}</p>
                  <p className="text-xs text-cyan-700 mt-1">įrašų importuota</p>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Apie importą</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Importuojami duomenys iš <code className="bg-gray-200 px-1 rounded">secretary_data.json</code></li>
              <li>• Dublikatai (pagal kodą) bus atnaujinti naujais duomenimis</li>
              <li>• Importas gali užtrukti 30-60 sekundžių</li>
              <li>• Rekomenduojama paleisti kas dieną arba kas 6 valandas per n8n</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
