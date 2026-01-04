import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatDateLT, formatNumberLT } from '../lib/formatters';
import { AnimalMilkLossByTreatment } from '../lib/types';
import { Milk, Calendar, TrendingDown, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface AnimalMilkLossAggregated {
  animal_id: string;
  animal_number: string;
  animal_name: string | null;
  treatment_count: number;
  total_loss_days: number;
  total_milk_lost_kg: number;
  total_milk_loss_value_eur: number;
  avg_daily_milk_kg: number;
}

export function AnimalMilkLossAnalysis() {
  const [milkLossData, setMilkLossData] = useState<AnimalMilkLossByTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'total_loss' | 'milk_lost' | 'days' | 'treatments' | 'animal'>('total_loss');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMilkLossData();
  }, []);

  const loadMilkLossData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('animal_milk_loss_by_treatment')
        .select('*')
        .order('treatment_date', { ascending: false });

      if (error) throw error;

      setMilkLossData(data || []);
    } catch (error) {
      console.error('Error loading milk loss data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregatedData = milkLossData.reduce((acc, row) => {
    const existing = acc.find(a => a.animal_id === row.animal_id);

    if (existing) {
      existing.treatment_count += 1;
      existing.total_loss_days += row.loss_days;
      existing.total_milk_lost_kg += row.total_milk_lost_kg;
      existing.total_milk_loss_value_eur += row.milk_loss_value_eur;
    } else {
      acc.push({
        animal_id: row.animal_id,
        animal_number: row.animal_number,
        animal_name: row.animal_name,
        treatment_count: 1,
        total_loss_days: row.loss_days,
        total_milk_lost_kg: row.total_milk_lost_kg,
        total_milk_loss_value_eur: row.milk_loss_value_eur,
        avg_daily_milk_kg: row.avg_daily_milk_kg,
      });
    }

    return acc;
  }, [] as AnimalMilkLossAggregated[]);

  const filteredData = aggregatedData.filter(row => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      row.animal_number?.toLowerCase().includes(search) ||
      row.animal_name?.toLowerCase().includes(search)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'total_loss':
        compareValue = a.total_milk_loss_value_eur - b.total_milk_loss_value_eur;
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
        compareValue = (a.animal_number || '').localeCompare(b.animal_number || '');
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
    return milkLossData.filter(t => t.animal_id === animalId);
  };

  const totalStats = sortedData.reduce(
    (acc, row) => ({
      totalAnimals: acc.totalAnimals + 1,
      totalTreatments: acc.totalTreatments + row.treatment_count,
      totalLossDays: acc.totalLossDays + row.total_loss_days,
      totalMilkLost: acc.totalMilkLost + row.total_milk_lost_kg,
      totalValue: acc.totalValue + row.total_milk_loss_value_eur,
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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Milk className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Pieno Nuostoliai Gydymo Metu</h2>
              <p className="text-sm text-gray-600">Pieno gamybos nuostoliai per sinchronizacijas</p>
            </div>
          </div>
          <button
            onClick={loadMilkLossData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti pagal gyvūno numerį arba vardą..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Milk className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-orange-600" />
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
              <Milk className="w-4 h-4 text-blue-600" />
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

        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Vid. nuostoliai per gyvūną:</span>
              <span className="ml-2 font-bold text-blue-700">
                {formatCurrencyLT(totalStats.totalAnimals > 0 ? totalStats.totalValue / totalStats.totalAnimals : 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Vid. nuostoliai per gydymą:</span>
              <span className="ml-2 font-bold text-orange-700">
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
                <th className="w-12 px-4 py-3"></th>
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
                >
                  Dienų {sortBy === 'days' && (sortOrder === 'desc' ? '↓' : '↑')}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.animal_number}</div>
                        {row.animal_name && <div className="text-xs text-gray-500">{row.animal_name}</div>}
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
                        {formatCurrencyLT(row.total_milk_loss_value_eur)}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Gydymo istorija</h4>
                            {treatments.map((treatment) => (
                              <div
                                key={treatment.treatment_id}
                                className="bg-white border border-gray-200 rounded-lg p-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs text-gray-500">Data</div>
                                    <div className="text-sm font-medium">{formatDateLT(treatment.treatment_date)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">Diagnozė</div>
                                    <div className="text-sm">{treatment.diagnosis || 'Nenustatyta'}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">Sinchronizacijos laikotarpis</div>
                                    <div className="text-sm">
                                      {formatDateLT(treatment.sync_start)} - {formatDateLT(treatment.sync_end)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Statusas: <span className="font-medium">{treatment.sync_status}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">Pieno nuostoliai</div>
                                    <div className="text-sm">
                                      {treatment.loss_days} d. × {formatNumberLT(treatment.avg_daily_milk_kg)} kg/d
                                    </div>
                                    <div className="text-sm font-semibold text-blue-600 mt-1">
                                      = {formatNumberLT(treatment.total_milk_lost_kg)} kg
                                    </div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="text-xs text-gray-500">Nuostolių vertė</div>
                                    <div className="text-lg font-bold text-red-600">
                                      {formatCurrencyLT(treatment.milk_loss_value_eur)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Naudota kaina: {formatCurrencyLT(treatment.milk_price_used)}/kg
                                    </div>
                                  </div>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Nerasta gyvūnų pagal paieškos kriterijus' : 'Nėra duomenų apie pieno nuostolius'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
