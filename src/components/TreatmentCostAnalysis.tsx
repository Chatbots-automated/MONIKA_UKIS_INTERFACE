import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatDateLT, formatNumberLT } from '../lib/formatters';
import { calculateSafeUnitCost, TREATMENT_COST_CONFIG, formatCost, formatUnitCost } from '../lib/costCalculations';
import { fetchAllRows } from '../lib/helpers';
import { Euro, Activity, Syringe, Calendar, TrendingDown, Package, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';

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
  is_vaccine?: boolean;
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
  vet_name: string | null;
  treatment_info: {
    disease_name: string | null;
    treatment_id: string | null;
  } | null;
  all_products: MedicationDetail[];
  total_products_cost: number;
}

interface AnimalDetailData {
  visits: VisitDetail[];
}

export function TreatmentCostAnalysis() {
  const [costData, setCostData] = useState<AnimalCostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [animalDetails, setAnimalDetails] = useState<Map<string, AnimalDetailData>>(new Map());
  const [sortBy, setSortBy] = useState<'total' | 'visits' | 'medications' | 'vaccinations' | 'tag_no' | 'visit_count' | 'treatment_count'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [neckNumberSearch, setNeckNumberSearch] = useState('');

  useEffect(() => {
    loadCostData();
  }, []);

  const loadCostData = async () => {
    try {
      setLoading(true);

      // Get all animals using pagination helper
      const animals = await fetchAllRows<{ id: string; tag_no: string | null }>('animals', 'id, tag_no', 'tag_no');

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
      // Get all visits for this animal
      const { data: visits } = await supabase
        .from('animal_visits')
        .select('id, visit_datetime, status, procedures, notes, vet_name, planned_medications')
        .eq('animal_id', animalId)
        .eq('status', 'Baigtas')
        .order('visit_datetime', { ascending: false });

      const visitDetails: VisitDetail[] = [];

      for (const visit of visits || []) {
        let totalProductsCost = 0;
        const allProducts: MedicationDetail[] = [];

        // 1. Get treatment info for this visit (if exists)
        const { data: treatment } = await supabase
          .from('treatments')
          .select('id, diseases(name)')
          .eq('visit_id', visit.id)
          .maybeSingle();

        const treatmentInfo = treatment ? {
          disease_name: (treatment.diseases as any)?.name || null,
          treatment_id: treatment.id
        } : null;

        // 2. Get ALL usage_items for this visit's treatment (medicines, gloves, supplies, EVERYTHING)
        if (treatment?.id) {
          const { data: usageItems } = await supabase
            .from('usage_items')
            .select(`
              qty,
              products(name, primary_pack_unit, category, subcategory),
              batches(purchase_price, received_qty)
            `)
            .eq('treatment_id', treatment.id);

          for (const usage of usageItems || []) {
            if (usage.batches && usage.qty) {
              const unitCost = calculateSafeUnitCost(
                usage.batches.purchase_price,
                usage.batches.received_qty
              );
              const itemCost = usage.qty * unitCost;

              // Debug logging for math verification
              if (usage.qty >= 40 && unitCost > 0) {
                console.log('=== MATH VERIFICATION ===');
                console.log('Product:', (usage.products as any)?.name);
                console.log('Quantity:', usage.qty, (usage.products as any)?.primary_pack_unit);
                console.log('Batch purchase price:', usage.batches.purchase_price);
                console.log('Batch received qty:', usage.batches.received_qty);
                console.log('Unit cost:', unitCost.toFixed(6));
                console.log('Calculation:', usage.qty, '×', unitCost.toFixed(6), '=', itemCost.toFixed(6));
                console.log('Expected for 40×0.03:', (40 * 0.03).toFixed(2));
                console.log('Actual result:', itemCost.toFixed(2));
                console.log('========================');
              }

              totalProductsCost += itemCost;

              // Check if it's a vaccine based on category or subcategory
              const isVaccine = (usage.products as any)?.category === 'prevention' ||
                               (usage.products as any)?.subcategory === 'Vakcinos' ||
                               (usage.products as any)?.name?.toLowerCase().includes('vakcin');

              allProducts.push({
                name: (usage.products as any)?.name || 'Nežinomas produktas',
                quantity: usage.qty,
                unit: (usage.products as any)?.primary_pack_unit || 'vnt',
                unit_cost: unitCost,
                total_cost: itemCost,
                is_vaccine: isVaccine,
              });
            }
          }
        }

        // 3. Get ALL vaccinations for this visit (prevention products like Rycaps, Hydrocaps, etc.)
        // Vaccinations are linked to animal_id, not visit_id, so we match by date
        const visitDate = new Date(visit.visit_datetime).toISOString().split('T')[0];
        const { data: vaccinations } = await supabase
          .from('vaccinations')
          .select(`
            dose_amount,
            unit,
            vaccination_date,
            products(name, primary_pack_unit, category),
            batches(purchase_price, received_qty)
          `)
          .eq('animal_id', animalId)
          .eq('vaccination_date', visitDate);

        for (const vacc of vaccinations || []) {
          if (vacc.batches && vacc.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vacc.batches.purchase_price,
              vacc.batches.received_qty
            );
            const itemCost = vacc.dose_amount * unitCost;

            totalProductsCost += itemCost;

            allProducts.push({
              name: (vacc.products as any)?.name || 'Nežinomas produktas',
              quantity: vacc.dose_amount,
              unit: vacc.unit || (vacc.products as any)?.primary_pack_unit || 'vnt',
              unit_cost: unitCost,
              total_cost: itemCost,
              is_vaccine: true,
            });
          }
        }

        // 4. ALSO add products from planned_medications (in case they weren't processed yet)
        const plannedMeds = visit.planned_medications as any[];
        if (plannedMeds && Array.isArray(plannedMeds)) {
          for (const med of plannedMeds) {
            const { data: product } = await supabase
              .from('products')
              .select('name, primary_pack_unit, category, subcategory')
              .eq('id', med.product_id)
              .maybeSingle();

            const { data: batch } = await supabase
              .from('batches')
              .select('purchase_price, received_qty')
              .eq('id', med.batch_id)
              .maybeSingle();

            if (batch && med.qty) {
              const unitCost = calculateSafeUnitCost(
                batch.purchase_price,
                batch.received_qty
              );
              const itemCost = med.qty * unitCost;

              // Check if this product is already in allProducts (avoid duplicates)
              const alreadyExists = allProducts.some(p =>
                p.name === (product?.name || 'Nežinomas produktas') &&
                p.quantity === med.qty
              );

              if (!alreadyExists) {
                totalProductsCost += itemCost;

                // Check if it's a vaccine based on category or subcategory
                const isVaccine = product?.category === 'prevention' ||
                                 product?.subcategory === 'Vakcinos' ||
                                 product?.name?.toLowerCase().includes('vakcin');

                allProducts.push({
                  name: product?.name || 'Nežinomas produktas',
                  quantity: med.qty,
                  unit: med.unit || product?.primary_pack_unit || 'vnt',
                  unit_cost: unitCost,
                  total_cost: itemCost,
                  is_vaccine: isVaccine,
                });
              }
            }
          }
        }

        // Debug logging for cost calculation
        if (allProducts.length > 0) {
          console.log(`\n🔍 Visit ${visit.visit_datetime} - Cost Breakdown:`);
          let sumCheck = 0;
          allProducts.forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.name}: ${p.quantity} × €${p.unit_cost.toFixed(6)} = €${p.total_cost.toFixed(6)}`);
            sumCheck += p.total_cost;
          });
          console.log(`  ➕ Sum of individual costs: €${sumCheck.toFixed(6)}`);
          console.log(`  📊 Total products cost: €${totalProductsCost.toFixed(6)}`);
          console.log(`  ✅ Rounded display: €${totalProductsCost.toFixed(2)}`);
          if (Math.abs(sumCheck - totalProductsCost) > 0.001) {
            console.log(`  ⚠️ MISMATCH DETECTED!`);
          }
        }

        visitDetails.push({
          id: visit.id,
          visit_datetime: visit.visit_datetime,
          status: visit.status,
          procedures: visit.procedures,
          notes: visit.notes,
          vet_name: visit.vet_name,
          treatment_info: treatmentInfo,
          all_products: allProducts,
          total_products_cost: totalProductsCost,
        });
      }

      // Also load standalone vaccinations (not associated with any visit)
      const { data: allVaccinations } = await supabase
        .from('vaccinations')
        .select(`
          id,
          dose_amount,
          unit,
          vaccination_date,
          products(name, primary_pack_unit, category),
          batches(purchase_price, received_qty)
        `)
        .eq('animal_id', animalId)
        .order('vaccination_date', { ascending: false });

      // Get dates of visits to exclude vaccinations already included
      const visitDates = new Set((visits || []).map(v =>
        new Date(v.visit_datetime).toISOString().split('T')[0]
      ));

      // Create synthetic "visit" entries for standalone vaccinations
      const standaloneVaccsByDate = new Map<string, any[]>();

      for (const vacc of allVaccinations || []) {
        const vaccDate = new Date(vacc.vaccination_date).toISOString().split('T')[0];

        // Skip if this vaccination date matches a visit date (already included)
        if (visitDates.has(vaccDate)) continue;

        if (!standaloneVaccsByDate.has(vaccDate)) {
          standaloneVaccsByDate.set(vaccDate, []);
        }
        standaloneVaccsByDate.get(vaccDate)!.push(vacc);
      }

      // Add standalone vaccinations as synthetic visits
      for (const [vaccDate, vaccs] of standaloneVaccsByDate.entries()) {
        let totalVaccCost = 0;
        const vaccProducts: MedicationDetail[] = [];

        for (const vacc of vaccs) {
          if (vacc.batches && vacc.dose_amount) {
            const unitCost = calculateSafeUnitCost(
              vacc.batches.purchase_price,
              vacc.batches.received_qty
            );
            const itemCost = vacc.dose_amount * unitCost;

            totalVaccCost += itemCost;
            vaccProducts.push({
              name: (vacc.products as any)?.name || 'Nežinomas produktas',
              quantity: vacc.dose_amount,
              unit: vacc.unit || (vacc.products as any)?.primary_pack_unit || 'vnt',
              unit_cost: unitCost,
              total_cost: itemCost,
              is_vaccine: true,
            });
          }
        }

        // Add as a synthetic visit for standalone vaccinations
        visitDetails.push({
          id: `vacc-${vaccDate}`,
          visit_datetime: vaccDate,
          status: 'Baigtas',
          procedures: ['Vakcina'],
          notes: 'Vakcinacija be vizito',
          vet_name: null,
          treatment_info: null,
          all_products: vaccProducts,
          total_products_cost: totalVaccCost,
        });
      }

      // Sort all visit details by date (newest first)
      visitDetails.sort((a, b) =>
        new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime()
      );

      setAnimalDetails(prev => new Map(prev).set(animalId, {
        visits: visitDetails
      }));
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  const toggleExpand = (animalId: string) => {
    if (expandedAnimal === animalId) {
      setExpandedAnimal(null);
      setExpandedVisits(new Set()); // Clear expanded visits when collapsing
    } else {
      setExpandedAnimal(animalId);
      setExpandedVisits(new Set()); // Clear previous expanded visits
      loadAnimalDetails(animalId);
    }
  };

  const toggleVisitExpand = (visitId: string) => {
    setExpandedVisits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  const filteredData = costData.filter(animal => {
    let matchesGeneral = true;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesGeneral = animal.tag_no?.toLowerCase().includes(searchLower) || false;
    }

    return matchesGeneral;
  });

  const sortedData = [...filteredData].sort((a, b) => {
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
      case 'vaccinations':
        compareValue = a.vaccination_costs - b.vaccination_costs;
        break;
      case 'visit_count':
        compareValue = a.visit_count - b.visit_count;
        break;
      case 'treatment_count':
        compareValue = a.treatment_count - b.treatment_count;
        break;
      case 'tag_no':
        compareValue = (a.tag_no || '').localeCompare(b.tag_no || '', 'lt');
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

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti pagal gyvūno numerį..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>
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
            <optgroup label="Pagal kainą">
              <option value="total">Bendra kaina</option>
              <option value="visits">Vizitų kaina</option>
              <option value="medications">Vaistų kaina</option>
              <option value="vaccinations">Vakcinų kaina</option>
            </optgroup>
            <optgroup label="Pagal kiekį">
              <option value="treatment_count">Gydymų skaičius</option>
              <option value="visit_count">Vizitų skaičius</option>
            </optgroup>
            <optgroup label="Pagal gyvūną">
              <option value="tag_no">Ausies numeris</option>
            </optgroup>
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
                    <React.Fragment key={row.animal_id}>
                      <tr
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

                      {/* Expanded Details - ONLY VISITS */}
                      {isExpanded && detailData && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gradient-to-br from-blue-50 to-blue-100">
                            <div className="max-w-5xl mx-auto">
                              <h4 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2 pb-3 border-b-2 border-blue-400">
                                <Calendar className="w-7 h-7 text-blue-600" />
                                Vizitai ({detailData.visits.length})
                              </h4>

                              <div className="space-y-3">
                                {detailData.visits.length === 0 ? (
                                  <div className="text-gray-500 text-sm italic p-6 bg-white rounded-lg text-center">
                                    Nėra užbaigtų vizitų
                                  </div>
                                ) : (
                                  detailData.visits.map((visit) => {
                                    const isVisitExpanded = expandedVisits.has(visit.id);
                                    const totalVisitCost = TREATMENT_COST_CONFIG.VISIT_BASE_COST + visit.total_products_cost;
                                    const hasProducts = visit.all_products.length > 0;

                                    return (
                                      <div key={visit.id} className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500">
                                        {/* Visit Header - Clickable */}
                                        <div
                                          className="p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                                          onClick={() => hasProducts && toggleVisitExpand(visit.id)}
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            {/* Left: Visit Info */}
                                            <div className="flex-1 flex items-start gap-3">
                                              {hasProducts && (
                                                <div className="mt-1">
                                                  {isVisitExpanded ?
                                                    <ChevronDown className="w-5 h-5 text-blue-600" /> :
                                                    <ChevronRight className="w-5 h-5 text-blue-600" />
                                                  }
                                                </div>
                                              )}
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                  <div className="font-bold text-gray-900 text-lg">
                                                    {formatDateLT(visit.visit_datetime)}
                                                  </div>
                                                  {visit.vet_name && (
                                                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                      {visit.vet_name}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Treatment Info */}
                                                {visit.treatment_info && (
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Activity className="w-4 h-4 text-orange-600" />
                                                    <span className="font-semibold text-orange-700">
                                                      {visit.treatment_info.disease_name}
                                                    </span>
                                                  </div>
                                                )}

                                                {/* Procedures - Format better */}
                                                {visit.procedures && typeof visit.procedures === 'string' && (
                                                  <div className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-1.5 rounded-md inline-block">
                                                    {visit.procedures.replace(/([A-Z])/g, ' $1').trim()}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Right: Cost Breakdown */}
                                            <div className="text-right">
                                              <div className="font-bold text-blue-600 text-2xl mb-1">
                                                {formatCost(totalVisitCost)}
                                              </div>
                                              <div className="text-xs text-gray-600 space-y-0.5">
                                                <div>Vizitas: {formatCost(TREATMENT_COST_CONFIG.VISIT_BASE_COST)}</div>
                                                {visit.total_products_cost > 0 && (
                                                  <div>Produktai: {formatCost(visit.total_products_cost)}</div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Expanded Products List */}
                                        {isVisitExpanded && hasProducts && (
                                          <div className="px-4 pb-4 pt-2 bg-gradient-to-r from-blue-50 to-white border-t border-blue-200">
                                            {/* Medicines Section */}
                                            {visit.all_products.some(p => !p.is_vaccine) && (
                                              <div className="mb-4">
                                                <div className="text-xs font-bold text-blue-900 uppercase mb-3 flex items-center gap-2">
                                                  <Package className="w-4 h-4" />
                                                  Vaistai ir priemonės ({visit.all_products.filter(p => !p.is_vaccine).length})
                                                </div>
                                                <div className="space-y-2">
                                                  {visit.all_products.filter(p => !p.is_vaccine).map((product, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                          <div className="font-semibold text-gray-900">{product.name}</div>
                                                          <div className="text-sm text-gray-600 mt-1">
                                                            {formatNumberLT(product.quantity)} {product.unit} × {formatUnitCost(product.unit_cost)}/{product.unit}
                                                          </div>
                                                        </div>
                                                        <div className="font-bold text-blue-700 text-lg ml-4">
                                                          {formatCost(product.total_cost)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Vaccines Section */}
                                            {visit.all_products.some(p => p.is_vaccine) && (
                                              <div>
                                                <div className="text-xs font-bold text-purple-900 uppercase mb-3 flex items-center gap-2">
                                                  <Syringe className="w-4 h-4" />
                                                  Vakcinacijos ({visit.all_products.filter(p => p.is_vaccine).length})
                                                </div>
                                                <div className="space-y-2">
                                                  {visit.all_products.filter(p => p.is_vaccine).map((product, idx) => (
                                                    <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200 shadow-sm">
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                          <div className="font-semibold text-gray-900">{product.name}</div>
                                                          <div className="text-sm text-gray-600 mt-1">
                                                            {formatNumberLT(product.quantity)} {product.unit} × {formatUnitCost(product.unit_cost)}/{product.unit}
                                                          </div>
                                                        </div>
                                                        <div className="font-bold text-purple-700 text-lg ml-4">
                                                          {formatCost(product.total_cost)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Total Summary */}
                              {detailData.visits.length > 0 && (
                                <div className="mt-6 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Vizitai ({detailData.visits.length} × €10):</span>
                                      <span className="font-semibold">
                                        {formatCost(detailData.visits.length * TREATMENT_COST_CONFIG.VISIT_BASE_COST)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Visi produktai:</span>
                                      <span className="font-semibold">
                                        {formatCost(detailData.visits.reduce((sum, v) => sum + v.total_products_cost, 0))}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-blue-400">
                                      <span className="font-bold text-lg">VISO:</span>
                                      <span className="font-bold text-2xl">
                                        {formatCost(
                                          detailData.visits.length * TREATMENT_COST_CONFIG.VISIT_BASE_COST +
                                          detailData.visits.reduce((sum, v) => sum + v.total_products_cost, 0)
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
