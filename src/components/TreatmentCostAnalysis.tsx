import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatDateLT, formatNumberLT } from '../lib/formatters';
import { calculateSafeUnitCost, TREATMENT_COST_CONFIG, formatCost } from '../lib/costCalculations';
import { Euro, Activity, Syringe, Calendar, TrendingDown, Package, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface AnimalCostData {
  animal_id: string;
  tag_no: string | null;
  treatment_count: number;
  visit_count: number;
  visit_costs: number;
  medication_costs: number;
  vaccination_count: number;
  vaccination_costs: number;
  total_costs: number;
}

interface MedicationDetail {
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface TreatmentDetail {
  treatment_id: string;
  disease_name: string | null;
  start_date: string;
  end_date: string | null;
  visit_count: number;
  visit_cost: number;
  medication_cost: number;
  medications: MedicationDetail[];
  total_cost: number;
}

interface VisitDetail {
  id: string;
  visit_datetime: string;
  status: string;
  procedures: string | null;
  notes: string | null;
}

interface AnimalDetailData {
  treatments: TreatmentDetail[];
  visits: VisitDetail[];
}

export function TreatmentCostAnalysis() {
  const [costData, setCostData] = useState<AnimalCostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [animalDetails, setAnimalDetails] = useState<Map<string, AnimalDetailData>>(new Map());
  const [sortBy, setSortBy] = useState<'total' | 'visits' | 'medications'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadCostData();
  }, []);

  const loadCostData = async () => {
    try {
      setLoading(true);

      // Get all animals
      const { data: animals, error: animalsError } = await supabase
        .from('animals')
        .select('id, tag_no');

      if (animalsError) {
        console.error('Animals error:', animalsError);
        throw animalsError;
      }

      console.log('Animals loaded:', animals?.length);

      // Get all treatments with usage items
      const { data: treatments, error: treatmentsError } = await supabase
        .from('treatments')
        .select(`
          id,
          animal_id,
          disease_id,
          reg_date,
          outcome,
          diseases(name)
        `);

      if (treatmentsError) {
        console.error('Treatments error:', treatmentsError);
        throw treatmentsError;
      }

      console.log('Treatments loaded:', treatments?.length);

      // Get all usage items with batch info
      const { data: usageItems, error: usageError } = await supabase
        .from('usage_items')
        .select(`
          id,
          treatment_id,
          product_id,
          batch_id,
          qty,
          batches(purchase_price, received_qty)
        `);

      if (usageError) {
        console.error('Usage items error:', usageError);
        throw usageError;
      }

      console.log('Usage items loaded:', usageItems?.length);

      // Get all vaccinations with batch info
      const { data: vaccinations, error: vaccinationsError } = await supabase
        .from('vaccinations')
        .select(`
          id,
          animal_id,
          dose_amount,
          batch_id,
          batches(purchase_price, received_qty)
        `);

      if (vaccinationsError) {
        console.error('Vaccinations error:', vaccinationsError);
        throw vaccinationsError;
      }

      console.log('Vaccinations loaded:', vaccinations?.length);

      // Get all visits
      const { data: visits, error: visitsError } = await supabase
        .from('animal_visits')
        .select('id, animal_id, visit_datetime, status');

      if (visitsError) throw visitsError;

      // Calculate costs for each animal
      const animalCosts: AnimalCostData[] = [];

      for (const animal of animals || []) {
        const animalTreatments = (treatments || []).filter(t => t.animal_id === animal.id);
        const animalVaccinations = (vaccinations || []).filter(v => v.animal_id === animal.id);
        const completedVisits = (visits || []).filter(v =>
          v.animal_id === animal.id && v.status === 'Baigtas'
        );

        // Calculate medication costs from usage items
        let medicationCosts = 0;
        for (const treatment of animalTreatments) {
          const treatmentUsage = (usageItems || []).filter(ui => ui.treatment_id === treatment.id);
          for (const usage of treatmentUsage) {
            if (usage.batches && usage.qty) {
              const unitCost = calculateSafeUnitCost(
                usage.batches.purchase_price,
                usage.batches.received_qty
              );
              medicationCosts += usage.qty * unitCost;
            }
          }
        }

        // Calculate vaccination costs
        let vaccinationCosts = 0;
        for (const vaccination of animalVaccinations) {
          if (vaccination.batches && vaccination.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vaccination.batches.purchase_price,
              vaccination.batches.received_qty
            );
            vaccinationCosts += vaccination.dose_amount * unitCost;
          }
        }

        // Calculate visit costs
        const visitCount = completedVisits.length;
        const visitCosts = visitCount * TREATMENT_COST_CONFIG.VISIT_BASE_COST;

        const totalCosts = visitCosts + medicationCosts + vaccinationCosts;

        // Include animals with any treatment activity
        if (animalTreatments.length > 0 || animalVaccinations.length > 0 || visitCount > 0) {
          animalCosts.push({
            animal_id: animal.id,
            tag_no: animal.tag_no,
            treatment_count: animalTreatments.length,
            visit_count: visitCount,
            visit_costs: visitCosts,
            medication_costs: medicationCosts,
            vaccination_count: animalVaccinations.length,
            vaccination_costs: vaccinationCosts,
            total_costs: totalCosts,
          });
        }
      }

      console.log('Final animal costs calculated:', animalCosts.length);
      console.log('Sample data:', animalCosts.slice(0, 3));
      setCostData(animalCosts);
    } catch (error) {
      console.error('Error loading cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimalDetails = async (animalId: string) => {
    if (animalDetails.has(animalId)) {
      return; // Already loaded
    }

    try {
      // Get all treatments with full details (only those with disease_id)
      const { data: treatments, error } = await supabase
        .from('treatments')
        .select(`
          id,
          reg_date,
          outcome,
          disease_id,
          diseases(name)
        `)
        .eq('animal_id', animalId)
        .not('disease_id', 'is', null)
        .order('reg_date', { ascending: false });

      if (error) throw error;

      // Calculate costs for each treatment with detailed medication info
      const treatmentDetails: TreatmentDetail[] = [];
      for (const treatment of treatments || []) {
        // Get usage items with product details
        const { data: usageItems } = await supabase
          .from('usage_items')
          .select(`
            qty,
            products(name, primary_pack_unit),
            batches(purchase_price, received_qty)
          `)
          .eq('treatment_id', treatment.id);

        let medicationCost = 0;
        const medications: MedicationDetail[] = [];

        for (const usage of usageItems || []) {
          if (usage.batches && usage.qty) {
            const unitCost = calculateSafeUnitCost(
              usage.batches.purchase_price,
              usage.batches.received_qty
            );
            const itemCost = usage.qty * unitCost;
            medicationCost += itemCost;

            medications.push({
              name: (usage.products as any)?.name || 'Nežinomas produktas',
              quantity: usage.qty,
              unit: (usage.products as any)?.primary_pack_unit || 'vnt',
              unit_cost: unitCost,
              total_cost: itemCost,
            });
          }
        }

        treatmentDetails.push({
          treatment_id: treatment.id,
          disease_name: (treatment.diseases as any)?.name || 'Liga',
          start_date: treatment.reg_date,
          end_date: null,
          visit_count: 0,
          visit_cost: 0,
          medication_cost: medicationCost,
          medications: medications,
          total_cost: medicationCost,
        });
      }

      // Get all visits for this animal
      const { data: visits } = await supabase
        .from('animal_visits')
        .select('id, visit_datetime, status, procedures, notes')
        .eq('animal_id', animalId)
        .eq('status', 'Baigtas')
        .order('visit_datetime', { ascending: false });

      setAnimalDetails(prev => new Map(prev).set(animalId, {
        treatments: treatmentDetails,
        visits: visits || []
      }));
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  const toggleExpand = (animalId: string) => {
    if (expandedAnimal === animalId) {
      setExpandedAnimal(null);
    } else {
      setExpandedAnimal(animalId);
      loadAnimalDetails(animalId);
    }
  };

  const sortedData = [...costData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'total':
        compareValue = a.total_costs - b.total_costs;
        break;
      case 'visits':
        compareValue = a.visit_costs - b.visit_costs;
        break;
      case 'medications':
        compareValue = a.medication_costs - b.medication_costs;
        break;
    }
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  const totalStats = costData.reduce(
    (acc, row) => ({
      totalAnimals: acc.totalAnimals + 1,
      totalVisits: acc.totalVisits + row.visit_count,
      totalVisitCosts: acc.totalVisitCosts + row.visit_costs,
      totalMedicationCosts: acc.totalMedicationCosts + row.medication_costs,
      totalVaccinationCosts: acc.totalVaccinationCosts + row.vaccination_costs,
      totalCosts: acc.totalCosts + row.total_costs,
    }),
    {
      totalAnimals: 0,
      totalVisits: 0,
      totalVisitCosts: 0,
      totalMedicationCosts: 0,
      totalVaccinationCosts: 0,
      totalCosts: 0,
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Euro className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gydymų Savikainos</h2>
              <p className="text-sm text-gray-600">Detalus gydymų išlaidų skaičiavimas</p>
            </div>
          </div>
          <button
            onClick={loadCostData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vizitų</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalVisits}</div>
            <div className="text-xs text-gray-500 mt-1">{formatCost(totalStats.totalVisitCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vaistų</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{formatCost(totalStats.totalMedicationCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Syringe className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vakcinų</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{formatCost(totalStats.totalVaccinationCosts)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Viso</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCost(totalStats.totalCosts)}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-emerald-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Vidutinė kaina per gyvūną:</span>
              <span className="ml-2 font-bold text-emerald-700">
                {formatCost(totalStats.totalAnimals > 0 ? totalStats.totalCosts / totalStats.totalAnimals : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vidutinė kaina per vizitą:</span>
              <span className="ml-2 font-bold text-blue-700">
                {formatCost(totalStats.totalVisits > 0 ? totalStats.totalCosts / totalStats.totalVisits : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vizitų bazinė kaina:</span>
              <span className="ml-2 font-bold text-gray-700">
                {formatCost(TREATMENT_COST_CONFIG.VISIT_BASE_COST)} / vizitas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Rūšiuoti pagal:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="total">Bendra kaina</option>
            <option value="visits">Vizitų kaina</option>
            <option value="medications">Vaistų kaina</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ Didėjančia' : '↑ Mažėjančia'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Euro className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nerasta gydymų išlaidų duomenų</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ausies Nr.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Gydymų
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vizitų
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vizitų kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vaistų kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vakcinų kaina
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Viso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((row) => {
                  const isExpanded = expandedAnimal === row.animal_id;
                  const detailData = animalDetails.get(row.animal_id);

                  return (
                    <>
                      <tr
                        key={row.animal_id}
                        className="hover:bg-emerald-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(row.animal_id)}
                      >
                        <td className="px-4 py-4 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{row.tag_no || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {row.treatment_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {row.visit_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-blue-700">
                            {formatCost(row.visit_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-orange-700">
                            {formatCost(row.medication_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-purple-700">
                            {formatCost(row.vaccination_costs)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-lg font-bold text-emerald-700">
                            {formatCost(row.total_costs)}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && detailData && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gradient-to-br from-gray-50 to-gray-100">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                              {/* LEFT: Treatments Section */}
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 pb-2 border-b-2 border-orange-300">
                                  <Activity className="w-6 h-6 text-orange-600" />
                                  Gydymai ir Vaistai ({detailData.treatments.length})
                                </h4>
                                <div className="space-y-3">
                                  {detailData.treatments.length === 0 ? (
                                    <div className="text-gray-500 text-sm italic p-4 bg-white rounded-lg">
                                      Nėra įrašytų gydymų
                                    </div>
                                  ) : (
                                    detailData.treatments.map((treatment) => (
                                      <div key={treatment.treatment_id} className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow-sm">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <div className="font-bold text-gray-900">
                                              {treatment.disease_name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                              {formatDateLT(treatment.start_date)}
                                            </div>
                                          </div>
                                          {treatment.medication_cost > 0 && (
                                            <div className="text-right ml-4">
                                              <div className="text-xs text-gray-500">Vaistai:</div>
                                              <div className="text-lg font-bold text-orange-600">
                                                {formatCost(treatment.medication_cost)}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Medications List */}
                                        {treatment.medications.length > 0 ? (
                                          <div className="space-y-1.5">
                                            {treatment.medications.map((med, idx) => (
                                              <div key={idx} className="bg-orange-50 p-2.5 rounded flex items-center justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900 text-sm">{med.name}</div>
                                                  <div className="text-xs text-gray-600">
                                                    {formatNumberLT(med.quantity)} {med.unit} × {formatCost(med.unit_cost)}/{med.unit}
                                                  </div>
                                                </div>
                                                <div className="font-bold text-orange-700 ml-3">
                                                  {formatCost(med.total_cost)}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500 italic">
                                            Vaistai nebuvo panaudoti
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* RIGHT: Visits Section */}
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 pb-2 border-b-2 border-blue-300">
                                  <Calendar className="w-6 h-6 text-blue-600" />
                                  Vizitai ({detailData.visits.length})
                                </h4>
                                <div className="space-y-2">
                                  {detailData.visits.length === 0 ? (
                                    <div className="text-gray-500 text-sm italic p-4 bg-white rounded-lg">
                                      Nėra įrašytų vizitų
                                    </div>
                                  ) : (
                                    detailData.visits.map((visit) => (
                                      <div key={visit.id} className="bg-white p-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="font-semibold text-gray-900">
                                              {formatDateLT(visit.visit_datetime)}
                                            </div>
                                            {visit.procedures && (
                                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{visit.procedures}</div>
                                            )}
                                          </div>
                                          <div className="font-bold text-blue-600 ml-3 text-lg">
                                            {formatCost(TREATMENT_COST_CONFIG.VISIT_BASE_COST)}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Visits Summary */}
                                {detailData.visits.length > 0 && (
                                  <div className="mt-4 bg-blue-100 p-3 rounded-lg border border-blue-300">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-blue-900">Viso vizitų:</span>
                                      <span className="font-bold text-blue-900 text-xl">
                                        {formatCost(detailData.visits.length * TREATMENT_COST_CONFIG.VISIT_BASE_COST)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
