import { formatDateLT } from '../lib/formatters';

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
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900 font-medium">{row.products_used || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.dose_summary || '-'}</td>
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
    <div className="bg-white p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">VETERINARINIŲ MEDICININIŲ ATLIEKŲ SUSIDARYMO APSKAITOS ŽURNALAS</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Veterinarinių medicininių atliekų kodas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Veterinarinių medicininių atliekų pavadinimas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Susidarymo periodas ir data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Susidarymo kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Perduotas kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Atliekų vežėjas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Atliekų tvarkytojas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Perdavimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Dokumento numeris ir data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Atsakingo asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border-2 border-black px-2 py-2 text-xs text-center">{row.waste_code || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.waste_type || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <div>
                    <div>{row.reporting_period || '-'}</div>
                    <div className="text-gray-600">{row.record_date ? formatDateLT(row.record_date) : '-'}</div>
                  </div>
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right">{row.quantity_generated || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right">{row.quantity_transferred || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.waste_carrier || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.waste_processor || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.transfer_date ? formatDateLT(row.transfer_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.transfer_document || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.responsible_person || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <p className="text-center py-12 text-gray-500">Nėra duomenų</p>
      )}
    </div>
  );
}

interface DrugJournalReportProps {
  data: any[];
}

export function DrugJournalReport({ data }: DrugJournalReportProps) {
  return (
    <div className="bg-white p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">1. Vaisto pavadinimas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">2. Pirminė pakuotė (mato vnt.)</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">3. Gavimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">4. Dokumento pavadinimas, numeris, data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">5. Gautas kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">6. Pagaminimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">7. Tinkamumo naudoti laikas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">8. Serija</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Sunaudotas kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Likutis</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <div className="font-bold">{row.product_name || '-'}</div>
                  {row.registration_code && <div className="text-gray-600 text-[10px]">Reg: {row.registration_code}</div>}
                  {row.active_substance && <div className="text-gray-600 text-[10px]">Veikl. med.: {row.active_substance}</div>}
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs text-center">{row.unit || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.receipt_date ? formatDateLT(row.receipt_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">
                  {row.invoice_number && <div>SF: {row.invoice_number}</div>}
                  {row.invoice_date && <div className="text-gray-600">{formatDateLT(row.invoice_date)}</div>}
                  {!row.invoice_number && !row.invoice_date && '-'}
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right font-bold">{row.quantity_received || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.manufacture_date ? formatDateLT(row.manufacture_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.expiry_date ? formatDateLT(row.expiry_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.batch_number || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right">{row.quantity_used || '0'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right font-bold text-green-700">{row.quantity_remaining || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <p className="text-center py-12 text-gray-500">Nėra duomenų</p>
      )}

      <div className="mt-4 text-xs text-gray-600">
        <p>Tiekėjai: {Array.from(new Set(data.map(d => d.supplier_name).filter(Boolean))).join(', ') || 'Nenurodyta'}</p>
      </div>
    </div>
  );
}

interface BiocideJournalReportProps {
  data: any[];
}

export function BiocideJournalReport({ data }: BiocideJournalReportProps) {
  return (
    <div className="bg-white p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Biocidinio produkto pavadinimas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Pirminė pakuotė (mato vnt.)</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Gavimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Dokumento pavadinimas, numeris, data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Gautas kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Pagaminimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Tinkamumo naudoti laikas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Serija / partija</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Panaudojimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Panaudojimo paskirtis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Darbų apimtis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Sunaudotas kiekis</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Biocidinį produktą naudojusio asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <div className="font-bold">{row.biocide_name || '-'}</div>
                  {row.registration_code && <div className="text-gray-600 text-[10px]">Reg: {row.registration_code}</div>}
                  {row.active_substance && <div className="text-gray-600 text-[10px]">Veikl. med.: {row.active_substance}</div>}
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs text-center">{row.unit || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">-</td>
                <td className="border-2 border-black px-2 py-2 text-xs">-</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right">-</td>
                <td className="border-2 border-black px-2 py-2 text-xs">-</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.batch_expiry ? formatDateLT(row.batch_expiry) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.batch_number || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.use_date ? formatDateLT(row.use_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.purpose || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.work_scope || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right font-bold">{row.quantity_used || '-'} {row.unit || ''}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.applied_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <p className="text-center py-12 text-gray-500">Nėra duomenų</p>
      )}
    </div>
  );
}

interface OwnerMedsReportProps {
  data: any[];
}

export function OwnerMedsReport({ data }: OwnerMedsReportProps) {
  return (
    <div className="bg-white p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">SAVININKO DUODAMI VAISTAI</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Recepto data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Pirmo davimo data</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Gyvūno duomenys</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Liga</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Vaisto pavadinimas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Paros dozė</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Gydymo trukmė (dienos)</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Bendra dozė</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Duota dozių</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Statusas</th>
              <th className="border-2 border-black px-2 py-2 text-xs font-bold">Veterinarijos gydytojas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border-2 border-black px-2 py-2 text-xs">{row.prescription_date ? formatDateLT(row.prescription_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.first_admin_date ? formatDateLT(row.first_admin_date) : '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <div className="font-bold">{row.animal_tag || '-'}</div>
                  <div className="text-gray-600">{row.species || '-'}</div>
                  <div className="text-gray-600 text-[10px]">{row.owner_name || '-'}</div>
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.disease_name || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <div className="font-bold">{row.product_name || '-'}</div>
                  {row.registration_code && <div className="text-gray-600 text-[10px]">Reg: {row.registration_code}</div>}
                  {row.batch_number && <div className="text-gray-600 text-[10px]">Serija: {row.batch_number}</div>}
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right">{row.daily_dose || '-'} {row.unit || ''}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-center">{row.treatment_days || '-'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-right font-bold">{row.total_dose || '-'} {row.unit || ''}</td>
                <td className="border-2 border-black px-2 py-2 text-xs text-center">{row.doses_administered || '0'}</td>
                <td className="border-2 border-black px-2 py-2 text-xs">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    row.course_status === 'completed' ? 'bg-green-100 text-green-800' :
                    row.course_status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {row.course_status === 'completed' ? 'Baigtas' :
                     row.course_status === 'active' ? 'Aktyvus' :
                     row.course_status || '-'}
                  </span>
                </td>
                <td className="border-2 border-black px-2 py-2 text-xs">{row.prescribing_vet || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <p className="text-center py-12 text-gray-500">Nėra duomenų</p>
      )}
    </div>
  );
}
