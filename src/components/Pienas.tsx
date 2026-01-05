import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Beaker, ChevronDown, ChevronUp, Calendar, Weight, Sunrise, Moon } from 'lucide-react';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface MilkWeight {
  id: string;
  date: string;
  session_type: 'rytinis' | 'naktinis';
  weight: number;
  session_id: string | null;
  measurement_timestamp: string;
  timezone: string | null;
  hose_status: string | null;
  stable_status: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DailyMilkWeights {
  date: string;
  rytinis: MilkWeight | null;
  naktinis: MilkWeight | null;
  total: number;
}

interface MilkProducer {
  id: string;
  gamintojo_id: string;
  gamintojas_code: string;
  label: string;
  imone: string;
  rajonas: string;
  punktas: string;
  updated_at: string;
}

interface MilkCompositionTest {
  id: string;
  producer_id: string;
  paemimo_data: string;
  tyrimo_data: string;
  riebalu_kiekis?: number;
  baltymu_kiekis?: number;
  laktozes_kiekis?: number;
  ureja_mg_100ml?: number;
  ph?: number;
  pastaba?: string;
  konteineris: string;
  prot_nr: string;
}

interface MilkQualityTest {
  id: string;
  producer_id: string;
  paemimo_data: string;
  tyrimo_data: string;
  somatiniu_lasteliu_skaicius?: number;
  bendras_bakteriju_skaicius?: number;
  neatit_pst?: string;
  konteineris: string;
  prot_nr: string;
}

interface ProducerWithTests {
  producer: MilkProducer;
  compositionTests: MilkCompositionTest[];
  qualityTests: MilkQualityTest[];
}

interface UnifiedTest {
  paemimo_data: string;
  tyrimo_data: string;
  konteineris: string;
  prot_nr: string;
  composition?: MilkCompositionTest;
  quality?: MilkQualityTest;
}

export function Pienas() {
  const [labTestData, setLabTestData] = useState<ProducerWithTests[]>([]);
  const [milkWeights, setMilkWeights] = useState<DailyMilkWeights[]>([]);
  const [loading, setLoading] = useState(true);
  const [weightsLoading, setWeightsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const loadMilkWeights = async () => {
    console.log('[Pienas] loadMilkWeights called');
    setWeightsLoading(true);

    const { data: weights, error } = await supabase
      .from('milk_weights')
      .select('*')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false });

    console.log('[Pienas] Milk weights response:', { count: weights?.length || 0, error, weights });

    if (error) {
      console.error('[Pienas] Error loading milk weights:', error);
      setWeightsLoading(false);
      return;
    }

    if (!weights) {
      setMilkWeights([]);
      setWeightsLoading(false);
      return;
    }

    const dailyWeightsMap = new Map<string, DailyMilkWeights>();

    weights.forEach((weight) => {
      const dateKey = weight.date;
      if (!dailyWeightsMap.has(dateKey)) {
        dailyWeightsMap.set(dateKey, {
          date: dateKey,
          rytinis: null,
          naktinis: null,
          total: 0,
        });
      }

      const daily = dailyWeightsMap.get(dateKey)!;
      if (weight.session_type === 'rytinis') {
        daily.rytinis = weight;
      } else {
        daily.naktinis = weight;
      }
    });

    dailyWeightsMap.forEach((daily) => {
      daily.total = (daily.rytinis?.weight || 0) + (daily.naktinis?.weight || 0);
    });

    const dailyWeightsArray = Array.from(dailyWeightsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log('[Pienas] Processed daily weights:', dailyWeightsArray);
    setMilkWeights(dailyWeightsArray);
    setWeightsLoading(false);
  };

  const loadLabTests = async () => {
    console.log('[Pienas] loadLabTests called');
    const { data: producers, error: producersError } = await supabase
      .from('milk_producers')
      .select('*')
      .order('updated_at', { ascending: false });

    console.log('[Pienas] Producers response:', {
      producersCount: producers?.length || 0,
      error: producersError,
      producers
    });

    if (producersError || !producers) {
      console.error('[Pienas] Error loading producers:', producersError);
      return;
    }

    const producersWithTests: ProducerWithTests[] = await Promise.all(
      producers.map(async (producer) => {
        console.log(`[Pienas] Loading tests for producer ${producer.gamintojo_id}`);

        const { data: compositionTests, error: compError } = await supabase
          .from('milk_composition_tests')
          .select('*')
          .eq('producer_id', producer.id)
          .order('tyrimo_data', { ascending: false })
          .limit(10);

        console.log(`[Pienas] Composition tests for ${producer.gamintojo_id}:`, {
          count: compositionTests?.length || 0,
          error: compError,
          tests: compositionTests
        });

        const { data: qualityTests, error: qualError } = await supabase
          .from('milk_quality_tests')
          .select('*')
          .eq('producer_id', producer.id)
          .order('tyrimo_data', { ascending: false })
          .limit(10);

        console.log(`[Pienas] Quality tests for ${producer.gamintojo_id}:`, {
          count: qualityTests?.length || 0,
          error: qualError,
          tests: qualityTests
        });

        return {
          producer,
          compositionTests: compositionTests || [],
          qualityTests: qualityTests || []
        };
      })
    );

    console.log('[Pienas] Final data:', {
      producersWithTests,
      totalProducers: producersWithTests.length
    });
    setLabTestData(producersWithTests);
  };

  useRealtimeSubscription('milk_producers', loadLabTests);
  useRealtimeSubscription('milk_composition_tests', loadLabTests);
  useRealtimeSubscription('milk_quality_tests', loadLabTests);
  useRealtimeSubscription('milk_weights', loadMilkWeights);

  useEffect(() => {
    console.log('[Pienas] useEffect mounting - starting initial load');
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadLabTests(), loadMilkWeights()]);
      } finally {
        console.log('[Pienas] Initial load complete');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    loadMilkWeights();
  }, [dateFrom, dateTo]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getSCCStatus = (scc?: number) => {
    if (!scc) return { label: 'N/A', color: 'text-gray-400' };
    // Values are already in thousands (141 = 141k cells/ml)
    if (scc < 200) return { label: 'Puiki', color: 'text-green-600' };
    if (scc < 400) return { label: 'Gera', color: 'text-blue-600' };
    if (scc < 600) return { label: 'Vidutinė', color: 'text-yellow-600' };
    return { label: 'Blogai', color: 'text-red-600' };
  };

  const mergeTestsByDate = (
    compositionTests: MilkCompositionTest[],
    qualityTests: MilkQualityTest[]
  ): UnifiedTest[] => {
    const testsMap = new Map<string, UnifiedTest>();

    compositionTests.forEach((test) => {
      const key = `${test.paemimo_data}_${test.konteineris}`;
      testsMap.set(key, {
        paemimo_data: test.paemimo_data,
        tyrimo_data: test.tyrimo_data,
        konteineris: test.konteineris,
        prot_nr: test.prot_nr,
        composition: test,
      });
    });

    qualityTests.forEach((test) => {
      const key = `${test.paemimo_data}_${test.konteineris}`;
      const existing = testsMap.get(key);
      if (existing) {
        existing.quality = test;
      } else {
        testsMap.set(key, {
          paemimo_data: test.paemimo_data,
          tyrimo_data: test.tyrimo_data,
          konteineris: test.konteineris,
          prot_nr: test.prot_nr,
          quality: test,
        });
      }
    });

    return Array.from(testsMap.values()).sort(
      (a, b) => new Date(b.paemimo_data).getTime() - new Date(a.paemimo_data).getTime()
    );
  };

  console.log('[Pienas] Render state:', {
    loading,
    labTestDataLength: labTestData.length,
    labTestData
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  const formatWeight = (kg: number) => {
    return kg.toFixed(1) + ' kg';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Beaker className="w-8 h-8 text-blue-600" />
          Pienas
        </h1>
        <p className="text-gray-600">
          Dieniniai pieno svoriai ir laboratorijos tyrimai
        </p>
      </div>

      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Weight className="w-6 h-6 text-green-600" />
              Dieniniai pieno svoriai
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Nuo:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Iki:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {weightsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Kraunama...</div>
            </div>
          ) : milkWeights.length === 0 ? (
            <div className="text-center py-12">
              <Weight className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nėra svorio duomenų</h3>
              <p className="text-gray-500">
                Pasirinktu laikotarpiu pieno svorio duomenų nėra. Webhook dar negavo duomenų.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <Sunrise className="w-4 h-4 text-orange-500" />
                        Rytinis
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        Naktinis
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Viso per dieną</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Atnaujinta</th>
                  </tr>
                </thead>
                <tbody>
                  {milkWeights.map((daily) => (
                    <tr key={daily.date} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {new Date(daily.date).toLocaleDateString('lt-LT', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {daily.rytinis ? (
                          <div>
                            <div className="text-lg font-bold text-orange-600">
                              {formatWeight(daily.rytinis.weight)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(daily.rytinis.measurement_timestamp).toLocaleTimeString('lt-LT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {daily.naktinis ? (
                          <div>
                            <div className="text-lg font-bold text-indigo-600">
                              {formatWeight(daily.naktinis.weight)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(daily.naktinis.measurement_timestamp).toLocaleTimeString('lt-LT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="text-xl font-bold text-green-600">
                          {formatWeight(daily.total)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-gray-500">
                        {new Date(
                          Math.max(
                            new Date(daily.rytinis?.updated_at || 0).getTime(),
                            new Date(daily.naktinis?.updated_at || 0).getTime()
                          )
                        ).toLocaleString('lt-LT', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {milkWeights.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Periodo statistika</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Bendras svoris</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatWeight(milkWeights.reduce((sum, d) => sum + d.total, 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Vidutinis per dieną</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatWeight(
                          milkWeights.reduce((sum, d) => sum + d.total, 0) / milkWeights.length
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Vidutinis rytinis</div>
                      <div className="text-lg font-bold text-orange-600">
                        {formatWeight(
                          milkWeights
                            .filter((d) => d.rytinis)
                            .reduce((sum, d) => sum + (d.rytinis?.weight || 0), 0) /
                            milkWeights.filter((d) => d.rytinis).length
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Vidutinis naktinis</div>
                      <div className="text-lg font-bold text-indigo-600">
                        {formatWeight(
                          milkWeights
                            .filter((d) => d.naktinis)
                            .reduce((sum, d) => sum + (d.naktinis?.weight || 0), 0) /
                            milkWeights.filter((d) => d.naktinis).length
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Beaker className="w-6 h-6 text-blue-600" />
          Pieno laboratorijos tyrimai
        </h2>
        <p className="text-gray-600">
          Bandos lygmens pieno kokybės ir sudėties tyrimai (importuoti iš n8n)
        </p>
      </div>

      {labTestData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nėra tyrimų duomenų</h3>
          <p className="text-gray-500">
            Pieno tyrimų duomenys dar nebuvo importuoti. Paleiskite n8n darbo eigą.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {labTestData.map((item) => {
            const isExpanded = expandedRows.has(item.producer.id);
            const latestComposition = item.compositionTests[0];
            const latestQuality = item.qualityTests[0];
            const sccStatus = getSCCStatus(latestQuality?.somatiniu_lasteliu_skaicius);

            return (
              <div
                key={item.producer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRow(item.producer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{item.producer.imone}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                          {item.producer.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>Kodas: {item.producer.gamintojas_code}</span>
                        <span>Rajonas: {item.producer.rajonas}</span>
                        <span>Punktas: {item.producer.punktas}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mr-8">
                      {latestComposition && (
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Sudėtis</div>
                          <div className="text-sm font-semibold text-gray-900">
                            R: {latestComposition.riebalu_kiekis?.toFixed(2) || '-'}% |
                            B: {latestComposition.baltymu_kiekis?.toFixed(2) || '-'}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(latestComposition.paemimo_data).toLocaleDateString('lt-LT')}
                          </div>
                        </div>
                      )}

                      {latestQuality && (
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Kokybė</div>
                          <div className={`text-sm font-semibold ${sccStatus.color}`}>
                            SCC: {latestQuality.somatiniu_lasteliu_skaicius
                              ? latestQuality.somatiniu_lasteliu_skaicius.toFixed(0) + 'k'
                              : '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(latestQuality.paemimo_data).toLocaleDateString('lt-LT')}
                          </div>
                        </div>
                      )}
                    </div>

                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Tyrimų istorija
                    </h4>
                    {item.compositionTests.length === 0 && item.qualityTests.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nėra duomenų</p>
                    ) : (
                      <div className="space-y-3">
                        {mergeTestsByDate(item.compositionTests, item.qualityTests).map((test, index) => {
                          const status = getSCCStatus(test.quality?.somatiniu_lasteliu_skaicius);
                          return (
                            <div
                              key={`${test.paemimo_data}_${test.konteineris}_${index}`}
                              className="bg-white rounded-lg p-5 border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="text-base font-bold text-gray-900">
                                    Paėmimas: {new Date(test.paemimo_data).toLocaleDateString('lt-LT')}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Tyrimas: {new Date(test.tyrimo_data).toLocaleDateString('lt-LT')}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {test.konteineris} / {test.prot_nr}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {test.composition && (
                                  <div>
                                    <h5 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                                      Sudėties tyrimai
                                    </h5>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-600">Riebalai:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          {test.composition.riebalu_kiekis?.toFixed(2) || '-'}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Baltymai:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          {test.composition.baltymu_kiekis?.toFixed(2) || '-'}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Laktozė:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          {test.composition.laktozes_kiekis?.toFixed(2) || '-'}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Urėja:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          {test.composition.ureja_mg_100ml || '-'} mg/100ml
                                        </span>
                                      </div>
                                      {test.composition.ph && (
                                        <div>
                                          <span className="text-gray-600">pH:</span>
                                          <span className="ml-2 font-semibold text-gray-900">
                                            {test.composition.ph.toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {test.composition.pastaba && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <span className="text-xs text-gray-600">Pastaba: </span>
                                        <span className="text-xs text-gray-900">{test.composition.pastaba}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {test.quality && (
                                  <div>
                                    <h5 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                                      Kokybės tyrimai
                                    </h5>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Somatinių ląstelių skaičius:</span>
                                        <div className="text-right">
                                          <span className={`text-lg font-bold ${status.color}`}>
                                            {test.quality.somatiniu_lasteliu_skaicius
                                              ? test.quality.somatiniu_lasteliu_skaicius.toFixed(0) + 'k'
                                              : '-'}
                                          </span>
                                          <div className={`text-xs ${status.color}`}>{status.label}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Bendras bakterijų skaičius:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                          {test.quality.bendras_bakteriju_skaicius
                                            ? test.quality.bendras_bakteriju_skaicius.toFixed(0) + 'k'
                                            : '-'}
                                        </span>
                                      </div>
                                      {test.quality.neatit_pst && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm text-gray-600">Neatitikimas PST:</span>
                                          <span className="text-sm font-semibold text-red-600">
                                            {test.quality.neatit_pst}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
