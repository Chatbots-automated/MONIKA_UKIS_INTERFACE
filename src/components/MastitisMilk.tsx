import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateLT, formatNumberLT } from '../lib/formatters';
import { Droplet, AlertCircle, Calendar, TrendingUp, RefreshCw } from 'lucide-react';

interface MastitisMilkRow {
  animal_id: string;
  tag_no: string | null;
  collar_no: number | null;
  total_milk_liters: number;
  days_tracked: number;
  first_milking_date: string | null;
  last_milking_date: string | null;
  days_in_group5: number | null;
}

export function MastitisMilk() {
  const [milkData, setMilkData] = useState<MastitisMilkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMilk, setTotalMilk] = useState(0);
  const [groupNumber, setGroupNumber] = useState(5);

  useEffect(() => {
    loadMastitisMilkData();
  }, [groupNumber]);

  const loadMastitisMilkData = async () => {
    try {
      setLoading(true);

      // Query gea_daily to find all animals in the specified group
      const { data: group5Animals, error: animalsError } = await supabase
        .from('gea_daily')
        .select('animal_id, snapshot_date, collar_no')
        .eq('grupe', groupNumber)
        .order('snapshot_date', { ascending: false });

      if (animalsError) throw animalsError;

      if (!group5Animals || group5Animals.length === 0) {
        setMilkData([]);
        setTotalMilk(0);
        setLoading(false);
        return;
      }

      // Get unique animal IDs
      const uniqueAnimalIds = [...new Set(group5Animals.map(a => a.animal_id))];

      // For each animal, calculate milk totals while they were in group 5
      const milkPromises = uniqueAnimalIds.map(async (animalId) => {
        // Get animal details
        const { data: animal } = await supabase
          .from('animals')
          .select('tag_no')
          .eq('id', animalId)
          .maybeSingle();

        // Get all gea_daily records for this animal while in group 5
        const { data: geaRecords } = await supabase
          .from('gea_daily')
          .select('*')
          .eq('animal_id', animalId)
          .eq('grupe', groupNumber)
          .order('snapshot_date', { ascending: true });

        if (!geaRecords || geaRecords.length === 0) return null;

        // Calculate totals
        const totalMilk = geaRecords.reduce((sum, record) => {
          return sum +
            (record.m1_qty || 0) +
            (record.m2_qty || 0) +
            (record.m3_qty || 0) +
            (record.m4_qty || 0) +
            (record.m5_qty || 0);
        }, 0);

        const firstRecord = geaRecords[0];
        const lastRecord = geaRecords[geaRecords.length - 1];

        return {
          animal_id: animalId,
          tag_no: animal?.tag_no || null,
          collar_no: firstRecord.collar_no,
          total_milk_liters: totalMilk,
          days_tracked: geaRecords.length,
          first_milking_date: firstRecord.snapshot_date,
          last_milking_date: lastRecord.snapshot_date,
          days_in_group5: geaRecords.length,
        };
      });

      const results = await Promise.all(milkPromises);
      const validResults = results.filter((r): r is MastitisMilkRow => r !== null && r.total_milk_liters > 0);

      // Sort by total milk (highest first)
      validResults.sort((a, b) => b.total_milk_liters - a.total_milk_liters);

      setMilkData(validResults);
      setTotalMilk(validResults.reduce((sum, row) => sum + row.total_milk_liters, 0));
    } catch (error) {
      console.error('Error loading mastitis milk data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Droplet className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mastitinis Pienas</h2>
              <p className="text-sm text-gray-600">Grupė {groupNumber} gyvūnų pieno gamyba</p>
            </div>
          </div>
          <button
            onClick={loadMastitisMilkData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Viso Pieno</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{formatNumberLT(totalMilk)} L</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų Skaičius</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">{milkData.length}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Vidutiniškai per gyvūną</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {milkData.length > 0 ? formatNumberLT(totalMilk / milkData.length) : '0'} L
            </div>
          </div>
        </div>
      </div>

      {/* Group Number Selector */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grupės numeris:
        </label>
        <select
          value={groupNumber}
          onChange={(e) => setGroupNumber(parseInt(e.target.value))}
          className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <option key={num} value={num}>Grupė {num}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Pasirinkite grupę mastitinio pieno sekimui</p>
      </div>

      {/* Data Table */}
      {milkData.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nerasta gyvūnų grupėje {groupNumber}</p>
          <p className="text-sm text-gray-400 mt-1">Pasirinkite kitą grupę arba patikrinkite duomenis</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ausies Nr.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kaklo Nr.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Viso Pieno (L)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dienų
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pirmasis melžimas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Paskutinis melžimas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {milkData.map((row) => (
                  <tr key={row.animal_id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{row.tag_no || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-600">{row.collar_no || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {formatNumberLT(row.total_milk_liters)} L
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {row.days_tracked}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {row.first_milking_date ? formatDateLT(row.first_milking_date) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {row.last_milking_date ? formatDateLT(row.last_milking_date) : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-50 border-t-2 border-purple-200">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 uppercase">
                    Viso:
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xl font-bold text-purple-700">
                      {formatNumberLT(totalMilk)} L
                    </div>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
