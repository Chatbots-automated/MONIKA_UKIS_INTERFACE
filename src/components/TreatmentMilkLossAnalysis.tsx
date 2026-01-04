import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatDateLT, formatNumberLT } from '../lib/formatters';
import { Droplet, Calendar, TrendingDown, RefreshCw, ChevronDown, ChevronRight, Search, AlertTriangle, X } from 'lucide-react';

interface TreatmentMilkLoss {
  treatment_id: string;
  animal_id: string;
  animal_tag: string;
  treatment_date: string;
  withdrawal_until_milk: string;
  withdrawal_until_meat: string;
  clinical_diagnosis: string | null;
  vet_name: string | null;
  withdrawal_days: number;
  safety_days: number;
  total_loss_days: number;
  avg_daily_milk_kg: number;
  total_milk_lost_kg: number;
  milk_price_eur_per_kg: number;
  total_value_lost_eur: number;
  medications_used: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    unit: string;
    withdrawal_milk_days: number;
    withdrawal_meat_days: number;
  }>;
}

interface AnimalTreatmentAggregate {
  animal_id: string;
  animal_tag: string;
  treatment_count: number;
  total_loss_days: number;
  total_milk_lost_kg: number;
  total_value_lost_eur: number;
}

interface TreatmentMilkLossModalProps {
  animalId?: string;
  animalTag?: string;
  onClose?: () => void;
}

export function TreatmentMilkLossAnalysis({ animalId, animalTag, onClose }: TreatmentMilkLossModalProps = {}) {
  const [treatmentLossData, setTreatmentLossData] = useState<TreatmentMilkLoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(animalId || null);
  const [sortBy, setSortBy] = useState<'total_loss' | 'milk_lost' | 'days' | 'treatments' | 'animal'>('total_loss');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTreatmentMilkLossData();
  }, [animalId]);

  const loadTreatmentMilkLossData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('treatment_milk_loss_summary')
        .select('*')
        .order('treatment_date', { ascending: false });

      if (animalId) {
        query = query.eq('animal_id', animalId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTreatmentLossData(data || []);
    } catch (error) {
      console.error('Error loading treatment milk loss data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregatedData = treatmentLossData.reduce((acc, row) => {
    const existing = acc.find(a => a.animal_id === row.animal_id);

    if (existing) {
      existing.treatment_count += 1;
      // Track earliest and latest dates for continuous period calculation
      const rowTreatmentDate = new Date(row.treatment_date);
      const rowWithdrawalDate = new Date(row.withdrawal_until_milk);

      if (!existing.earliest_treatment_date || rowTreatmentDate < existing.earliest_treatment_date) {
        existing.earliest_treatment_date = rowTreatmentDate;
      }
      if (!existing.latest_withdrawal_date || rowWithdrawalDate > existing.latest_withdrawal_date) {
        existing.latest_withdrawal_date = rowWithdrawalDate;
      }

      // Sum average milk for weighted calculation
      existing.total_avg_milk += row.avg_daily_milk_kg;
    } else {
      acc.push({
        animal_id: row.animal_id,
        animal_tag: row.animal_tag,
        treatment_count: 1,
        earliest_treatment_date: new Date(row.treatment_date),
        latest_withdrawal_date: new Date(row.withdrawal_until_milk),
        total_avg_milk: row.avg_daily_milk_kg,
        total_loss_days: 0, // Will be calculated after
        total_milk_lost_kg: 0, // Will be calculated after
        total_value_lost_eur: 0, // Will be calculated after
      });
    }

    return acc;
  }, [] as (AnimalTreatmentAggregate & {
    earliest_treatment_date?: Date;
    latest_withdrawal_date?: Date;
    total_avg_milk?: number;
  })[]).map(animal => {
    // Calculate actual continuous period
    if (animal.earliest_treatment_date && animal.latest_withdrawal_date) {
      const daysDiff = Math.ceil(
        (animal.latest_withdrawal_date.getTime() - animal.earliest_treatment_date.getTime()) / (1000 * 60 * 60 * 24)
      );
      const total_days = daysDiff + 1; // +1 for safety day
      const avg_milk = animal.total_avg_milk! / animal.treatment_count; // Average across treatments
      const milk_price = treatmentLossData[0]?.milk_price_eur_per_kg || 0.45;

      animal.total_loss_days = total_days;
      animal.total_milk_lost_kg = avg_milk * total_days;
      animal.total_value_lost_eur = animal.total_milk_lost_kg * milk_price;
    }

    return animal as AnimalTreatmentAggregate;
  });

  const filteredData = aggregatedData.filter(row => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return row.animal_tag?.toLowerCase().includes(search);
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'total_loss':
        compareValue = a.total_value_lost_eur - b.total_value_lost_eur;
        break;
      case 'milk_lost':
        compareValue = a.total_milk_lost_kg - b.total_milk_lost_kg;
        break;
      case 'days':
        compareValue = a.total_loss_days - b.total_loss_days;
        break;
      case 'treatments':
        compareValue = a.treatment_count - b.treatment_count;
        break;
      case 'animal':
        compareValue = (a.animal_tag || '').localeCompare(b.animal_tag || '');
        break;
    }
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getTreatmentsForAnimal = (animalId: string) => {
    return treatmentLossData.filter(t => t.animal_id === animalId);
  };

  const totalStats = sortedData.reduce(
    (acc, row) => ({
      totalAnimals: acc.totalAnimals + 1,
      totalTreatments: acc.totalTreatments + row.treatment_count,
      totalLossDays: acc.totalLossDays + row.total_loss_days,
      totalMilkLost: acc.totalMilkLost + row.total_milk_lost_kg,
      totalValue: acc.totalValue + row.total_value_lost_eur,
    }),
    {
      totalAnimals: 0,
      totalTreatments: 0,
      totalLossDays: 0,
      totalMilkLost: 0,
      totalValue: 0,
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  const isModal = !!animalId;

  const content = (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isModal ? `Pieno Nuostoliai - ${animalTag}` : 'Pieno Nuostoliai Per Gydymus'}
              </h2>
              <p className="text-sm text-gray-600">
                Pieno gamybos nuostoliai dėl vaistų karencijos laikotarpio (karencines dienos)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTreatmentMilkLossData}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Atnaujinti"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Uždaryti"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {!isModal && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal gyvūno numerį..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Droplet className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gydymų</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{totalStats.totalTreatments}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Dienų</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{totalStats.totalLossDays}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Droplet className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Pieno (kg)</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatNumberLT(totalStats.totalMilkLost)}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vertė</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrencyLT(totalStats.totalValue)}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-orange-200 space-y-3">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-900">
                <span className="font-semibold">Svarbu:</span> Kai gyvūnas gauna kelis gydymus iš eilės, pieno nuostoliai skaičiuojami kaip <span className="font-semibold">ištisinis laikotarpis</span> nuo pirmojo gydymo iki paskutinės karencijos pabaigos. Persidengiančios dienos neskaičiuojamos kelis kartus.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Vid. nuostoliai per gyvūną:</span>
              <span className="ml-2 font-bold text-orange-700">
                {formatCurrencyLT(totalStats.totalAnimals > 0 ? totalStats.totalValue / totalStats.totalAnimals : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vid. nuostoliai per gydymą:</span>
              <span className="ml-2 font-bold text-red-700">
                {formatCurrencyLT(totalStats.totalTreatments > 0 ? totalStats.totalValue / totalStats.totalTreatments : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vid. pieno per dieną:</span>
              <span className="ml-2 font-bold text-gray-700">
                {formatNumberLT(totalStats.totalLossDays > 0 ? totalStats.totalMilkLost / totalStats.totalLossDays : 0)} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {!isModal && <th className="w-12 px-4 py-3"></th>}
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('animal')}
                >
                  Gyvūnas {sortBy === 'animal' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('treatments')}
                >
                  Gydymų {sortBy === 'treatments' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('days')}
                  title="Ištisinių dienų laikotarpis nuo pirmojo gydymo iki paskutinės karencijos"
                >
                  Dienų (ištisinis) {sortBy === 'days' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('milk_lost')}
                >
                  Pieno prarastas (kg) {sortBy === 'milk_lost' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_loss')}
                >
                  Vertė {sortBy === 'total_loss' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((row) => {
                const isExpanded = expandedAnimal === row.animal_id;
                const treatments = getTreatmentsForAnimal(row.animal_id);

                return (
                  <React.Fragment key={row.animal_id}>
                    <tr className="hover:bg-gray-50">
                      {!isModal && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedAnimal(isExpanded ? null : row.animal_id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.animal_tag}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.treatment_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.total_loss_days}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {formatNumberLT(row.total_milk_lost_kg)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                        {formatCurrencyLT(row.total_value_lost_eur)}
                      </td>
                    </tr>

                    {(isExpanded || isModal) && (
                      <tr>
                        <td colSpan={isModal ? 5 : 6} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Gydymų istorija su pieno nuostoliais</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-medium text-blue-900 mb-1">Skaičiuojamas ištisinių dienų laikotarpis</div>
                                    <div className="text-blue-700 text-xs">
                                      Pieno nuostoliai skaičiuojami nuo <span className="font-semibold">pirmojo gydymo datos</span> iki <span className="font-semibold">paskutinės karencijos pabaigos</span>.
                                      Kai gydymai persikloja, dienos neskaičiuojamos kelis kartus.
                                      {treatments.length > 0 && (
                                        <span className="block mt-1">
                                          ({formatDateLT(treatments[treatments.length - 1]?.treatment_date)} → {formatDateLT(treatments[0]?.withdrawal_until_milk)} = {row.total_loss_days} d.)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {treatments.map((treatment) => (
                              <div
                                key={treatment.treatment_id}
                                className="bg-white border border-gray-200 rounded-lg p-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-xs text-gray-500">Gydymo data</div>
                                    <div className="text-sm font-medium">{formatDateLT(treatment.treatment_date)}</div>
                                    {treatment.clinical_diagnosis && (
                                      <div className="text-xs text-gray-600 mt-1">{treatment.clinical_diagnosis}</div>
                                    )}
                                    {treatment.vet_name && (
                                      <div className="text-xs text-gray-500 mt-1">Vet: {treatment.vet_name}</div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500">Karencijos laikotarpis (atskiras)</div>
                                    <div className="text-sm">
                                      {formatDateLT(treatment.treatment_date)} - {formatDateLT(treatment.withdrawal_until_milk)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {treatment.withdrawal_days} d. + {treatment.safety_days} d. (saugumas) = <span className="font-semibold">{treatment.total_loss_days} d.</span>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500">Nuostoliai (jei būtų atskiras)</div>
                                    <div className="text-sm text-gray-600">
                                      {formatNumberLT(treatment.avg_daily_milk_kg)} kg/d. × {treatment.total_loss_days} d.
                                    </div>
                                    <div className="text-sm font-semibold text-gray-600 mt-1">
                                      = {formatNumberLT(treatment.total_milk_lost_kg)} kg
                                    </div>
                                    <div className="text-base font-semibold text-gray-600 mt-1">
                                      ({formatCurrencyLT(treatment.total_value_lost_eur)})
                                    </div>
                                    <div className="text-xs text-gray-500 italic mt-1">
                                      *Tikroji suma skaičiuojama pagal visų gydymų laikotarpį
                                    </div>
                                  </div>

                                  {treatment.medications_used && treatment.medications_used.length > 0 && (
                                    <div className="md:col-span-3 mt-2 pt-2 border-t border-gray-200">
                                      <div className="text-xs text-gray-500 mb-2">Panaudoti vaistai</div>
                                      <div className="space-y-1">
                                        {treatment.medications_used.map((med, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                                            <div className="flex-1">
                                              <span className="font-medium">{med.product_name}</span>
                                              <span className="text-gray-600 ml-2">
                                                {med.qty} {med.unit}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Karencija: <span className="font-semibold text-orange-600">{med.withdrawal_milk_days} d. (pienas)</span>
                                              {' / '}
                                              <span className="font-semibold text-gray-600">{med.withdrawal_meat_days} d. (mėsa)</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={isModal ? 5 : 6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Nerasta gyvūnų pagal paieškos kriterijus' : 'Nėra duomenų apie pieno nuostolius per gydymus'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
