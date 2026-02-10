import { formatDateLT } from '../lib/formatters';

function translateUnit(unit: string): string {
  const translations: Record<string, string> = {
    'syringe': 'švirkštukas',
    'tablet': 'tabletkė',
    'bolus': 'bolusas',
  };
  return translations[unit] || unit;
}

interface TreatedAnimalsReportProps {
  data: any[];
}

export function TreatedAnimalsReport({ data }: TreatedAnimalsReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GYDOMŲ GYVŪNŲ APSKAITA</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700 text-center">Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Data, kai vaistas gyvūnams duotas pirmą kartą</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Vaisto pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Duotas vaisto kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydomo gyvūno identifikavimo duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Liga / Diagnozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Receptą išrašiusio veterinarijos gydytojo duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Išlauka (karantinas)</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo trukmė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-semibold text-gray-600">{idx + 1}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.registration_date ? formatDateLT(row.registration_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900 font-medium">{row.product_name || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.dose || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.animal_tag || '-'}</div>
                    <div className="text-gray-600">{row.species || '-'}</div>
                    {row.owner_name && <div className="text-gray-500 text-[10px]">{row.owner_name}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.disease_name || '-'}</div>
                    {row.clinical_diagnosis && <div className="text-gray-600 text-[10px]">{row.clinical_diagnosis}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.veterinarian || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    {row.withdrawal_until_meat && <div className="text-red-700 font-medium">🥩 Mėsa: {formatDateLT(row.withdrawal_until_meat)}</div>}
                    {row.withdrawal_until_milk && <div className="text-blue-700 font-medium">🥛 Pienas: {formatDateLT(row.withdrawal_until_milk)}</div>}
                    {!row.withdrawal_until_meat && !row.withdrawal_until_milk && <span className="text-gray-400">-</span>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {row.treatment_days ? `${row.treatment_days} d.` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface MedicalWasteReportProps {
  data: any[];
}

export function MedicalWasteReport({ data }: MedicalWasteReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ MEDICININIŲ ATLIEKŲ SUSIDARYMO APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-orange-50 to-red-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarinių medicininių atliekų kodas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarinių medicininių atliekų pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Susidarymo periodas ir data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Susidarymo kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Perduotas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atliekų vežėjas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atliekų tvarkytojas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Perdavimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento numeris ir data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atsakingo asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-orange-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                    {row.waste_code || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.waste_type || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-gray-900">{row.reporting_period || '-'}</div>
                    <div className="text-gray-600 text-[10px]">{row.record_date ? formatDateLT(row.record_date) : '-'}</div>
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-gray-900">{row.quantity_generated || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-emerald-700">{row.quantity_transferred || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.waste_carrier || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.waste_processor || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.transfer_date ? formatDateLT(row.transfer_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.transfer_document || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.responsible_person || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface DrugJournalReportProps {
  data: any[];
}

export function DrugJournalReport({ data }: DrugJournalReportProps) {
  // Group data by product (medicine)
  const groupedData = data.reduce((acc, row) => {
    const productKey = row.product_id || row.product_name;
    if (!acc[productKey]) {
      acc[productKey] = {
        product_name: row.product_name,
        unit: row.unit,
        registration_code: row.registration_code,
        active_substance: row.active_substance,
        batches: []
      };
    }
    acc[productKey].batches.push(row);
    return acc;
  }, {} as Record<string, any>);

  const medicines = Object.values(groupedData);

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {medicines.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {medicines.map((medicine, medIdx) => (
        <div key={medIdx} className="mb-8 page-break-inside-avoid">
          {/* Medicine Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-gray-300 rounded-t-lg p-4 mb-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Veterinarinio vaisto / vaistinio preparato pavadinimas</p>
                <p className="text-base font-bold text-gray-900">{medicine.product_name || '-'}</p>
                {medicine.registration_code && (
                  <p className="text-xs text-emerald-700 mt-1">📋 Reg. kodas: {medicine.registration_code}</p>
                )}
                {medicine.active_substance && (
                  <p className="text-xs text-gray-600 mt-1">💊 Veiklioji medžiaga: {medicine.active_substance}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Pirminė pakuotė (mato vnt.)</p>
                <p className="text-base font-bold text-gray-900">{translateUnit(medicine.unit) || '-'}</p>
              </div>
            </div>
          </div>

          {/* Medicine Batches Table */}
          <div className="overflow-x-auto rounded-b-lg border-2 border-t-0 border-gray-300 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gavimo data</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento, pagal kurį gautas vaistas, pavadinimas, numeris, data</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gautas kiekis</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Tinkamumo naudoti laikas</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Serija</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudotas kiekis</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Likutis</th>
                </tr>
              </thead>
              <tbody>
                {medicine.batches.map((batch: any, batchIdx: number) => (
                  <tr key={batchIdx} className="hover:bg-emerald-50 transition-colors print-break-avoid">
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">
                      {batch.receipt_date ? formatDateLT(batch.receipt_date) : '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                      <div className="space-y-1">
                        {batch.doc_title && <div className="font-medium text-gray-900">{batch.doc_title}</div>}
                        {batch.invoice_number && <div className="font-medium text-gray-900">Nr. {batch.invoice_number}</div>}
                        {batch.invoice_date && <div className="text-gray-600">{formatDateLT(batch.invoice_date)}</div>}
                        {!batch.doc_title && !batch.invoice_number && !batch.invoice_date && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                        {batch.quantity_received || '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      <span className={`font-medium ${batch.expiry_date && new Date(batch.expiry_date) < new Date() ? 'text-red-700' : 'text-gray-900'}`}>
                        {batch.expiry_date ? formatDateLT(batch.expiry_date) : '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {batch.batch_number || batch.lot || '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-red-700">
                      {batch.quantity_used || '0'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                        (batch.quantity_remaining || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {batch.quantity_remaining || '0'}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Summary row for this medicine */}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="border-2 border-gray-300 px-3 py-3 text-xs text-right text-gray-700">
                    Viso ({medicine.product_name}):
                  </td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-blue-900">
                    {medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_received) || 0), 0).toFixed(2)}
                  </td>
                  <td colSpan={2} className="border-2 border-gray-300 px-3 py-3"></td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-red-900">
                    {medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_used) || 0), 0).toFixed(2)}
                  </td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-emerald-900">
                    {medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_remaining) || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {medicines.length > 0 && (
        <div className="mt-4 space-y-2 text-sm text-gray-600 no-print">
          <p>Viso vaistų: <span className="font-semibold text-gray-900">{medicines.length}</span></p>
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
          <p>Tiekėjai: <span className="font-medium text-gray-800">{Array.from(new Set(data.map(d => d.supplier_name).filter(Boolean))).join(', ') || 'Nenurodyta'}</span></p>
        </div>
      )}
    </div>
  );
}

interface BiocideJournalReportProps {
  data: any[];
}

export function BiocideJournalReport({ data }: BiocideJournalReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Biocidinio produkto pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirminė pakuotė (mato vnt.)</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gavimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento pavadinimas, numeris, data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gautas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pagaminimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Tinkamumo naudoti laikas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Serija / partija</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Panaudojimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Panaudojimo paskirtis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Darbų apimtis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudotas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Biocidinį produktą naudojusio asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-purple-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.biocide_name || '-'}</div>
                    {row.registration_code && <div className="text-purple-700 text-[10px] font-medium">📋 Reg: {row.registration_code}</div>}
                    {row.active_substance && <div className="text-gray-600 text-[10px]">🧪 Veikl. med.: {row.active_substance}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-medium text-gray-700">{translateUnit(row.unit) || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.batch_expiry ? formatDateLT(row.batch_expiry) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {row.batch_number || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.use_date ? formatDateLT(row.use_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.purpose || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.work_scope || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700">
                    {row.quantity_used || '-'} {row.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.applied_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface OwnerMedsReportProps {
  data: any[];
}

export function OwnerMedsReport({ data }: OwnerMedsReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SAVININKO DUODAMI VAISTAI</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-sky-50 to-blue-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Recepto data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirmo davimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Liga</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Vaisto pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Paros dozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo trukmė (dienos)</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Bendra dozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Duota dozių</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Statusas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarijos gydytojas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-sky-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.prescription_date ? formatDateLT(row.prescription_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.first_admin_date ? formatDateLT(row.first_admin_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.animal_tag || '-'}</div>
                    <div className="text-gray-600">{row.species || '-'}</div>
                    {row.owner_name && <div className="text-gray-500 text-[10px]">{row.owner_name}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.disease_name || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.product_name || '-'}</div>
                    {row.registration_code && <div className="text-sky-700 text-[10px] font-medium">📋 Reg: {row.registration_code}</div>}
                    {row.batch_number && <div className="text-gray-600 text-[10px]">📦 Serija: {row.batch_number}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-gray-900">{row.daily_dose || '-'} {row.unit || ''}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {row.treatment_days || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700">
                    {row.total_dose || '-'} {row.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-semibold text-emerald-700">{row.doses_administered || '0'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold ${
                    row.course_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    row.course_status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {row.course_status === 'completed' ? '✓ Baigtas' :
                     row.course_status === 'active' ? '⟳ Aktyvus' :
                     row.course_status || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.prescribing_vet || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface InseminationJournalReportProps {
  data: any[];
}

export function InseminationJournalReport({ data }: InseminationJournalReportProps) {
  const pregnancyStats = {
    total: data.length,
    confirmed: data.filter(r => r.pregnancy_confirmed === true).length,
    notConfirmed: data.filter(r => r.pregnancy_confirmed === false).length,
    pending: data.filter(r => r.pregnancy_confirmed === null).length,
  };

  const successRate = pregnancyStats.total > 0
    ? ((pregnancyStats.confirmed / pregnancyStats.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SĖKLINIMO ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6 no-print">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase">Viso sėklinimų</p>
            <p className="text-2xl font-bold text-rose-900 mt-1">{pregnancyStats.total}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-600 uppercase">Patvirtinti nėštumai</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{pregnancyStats.confirmed}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 uppercase">Nepatvirtinti</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{pregnancyStats.notConfirmed}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Sėkmės rodiklis</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{successRate}%</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-rose-50 to-pink-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sėklinimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Spermos produktas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Spermos kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirštinės</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirštinių kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Nėštumas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pastabos</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-rose-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-semibold text-gray-600">{idx + 1}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">
                  {row.insemination_date ? formatDateLT(row.insemination_date) : '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.animal?.tag_no || '-'}</div>
                    <div className="text-gray-600">{row.animal?.species || '-'}</div>
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">
                  {row.sperm_product?.name || '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                    {row.sperm_quantity || '-'} {row.sperm_product?.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">
                  {row.glove_product?.name || '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                    {row.glove_quantity || '-'} {row.glove_product?.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  {row.pregnancy_confirmed === true && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      ✓ Patvirtintas
                    </span>
                  )}
                  {row.pregnancy_confirmed === false && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      ✗ Nepatvirtintas
                    </span>
                  )}
                  {row.pregnancy_confirmed === null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      ⏳ Laukiama
                    </span>
                  )}
                  {row.pregnancy_check_date && (
                    <div className="text-[10px] text-gray-500 mt-1">
                      {formatDateLT(row.pregnancy_check_date)}
                    </div>
                  )}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                  {row.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}
