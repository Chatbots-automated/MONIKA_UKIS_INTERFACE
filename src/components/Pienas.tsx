import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Beaker, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

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

export function Pienas() {
  const [labTestData, setLabTestData] = useState<ProducerWithTests[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    console.log('[Pienas] useEffect mounting - starting initial load');
    const loadData = async () => {
      setLoading(true);
      try {
        await loadLabTests();
      } finally {
        console.log('[Pienas] Initial load complete');
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
    if (scc < 200000) return { label: 'Puiki', color: 'text-green-600' };
    if (scc < 400000) return { label: 'Gera', color: 'text-blue-600' };
    if (scc < 600000) return { label: 'Vidutinė', color: 'text-yellow-600' };
    return { label: 'Blogai', color: 'text-red-600' };
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Beaker className="w-8 h-8 text-blue-600" />
          Pieno laboratorijos tyrimai
        </h1>
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
                              ? (latestQuality.somatiniu_lasteliu_skaicius / 1000).toFixed(0) + 'k'
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          Sudėties tyrimai
                        </h4>
                        {item.compositionTests.length === 0 ? (
                          <p className="text-gray-500 text-sm">Nėra duomenų</p>
                        ) : (
                          <div className="space-y-3">
                            {item.compositionTests.map((test) => (
                              <div
                                key={test.id}
                                className="bg-white rounded-lg p-4 border border-gray-200"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      Paėmimas: {new Date(test.paemimo_data).toLocaleDateString('lt-LT')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Tyrimas: {new Date(test.tyrimo_data).toLocaleDateString('lt-LT')}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {test.konteineris} / {test.prot_nr}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                  <div>
                                    <span className="text-gray-600">Riebalai:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {test.riebalu_kiekis?.toFixed(2) || '-'}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Baltymai:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {test.baltymu_kiekis?.toFixed(2) || '-'}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Laktoza:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {test.laktozes_kiekis?.toFixed(2) || '-'}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Urėja:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {test.ureja_mg_100ml || '-'} mg/100ml
                                    </span>
                                  </div>
                                  {test.ph && (
                                    <div>
                                      <span className="text-gray-600">pH:</span>
                                      <span className="ml-2 font-semibold text-gray-900">
                                        {test.ph.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {test.pastaba && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-xs text-gray-600">Pastaba: </span>
                                    <span className="text-xs text-gray-900">{test.pastaba}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          Kokybės tyrimai
                        </h4>
                        {item.qualityTests.length === 0 ? (
                          <p className="text-gray-500 text-sm">Nėra duomenų</p>
                        ) : (
                          <div className="space-y-3">
                            {item.qualityTests.map((test) => {
                              const status = getSCCStatus(test.somatiniu_lasteliu_skaicius);
                              return (
                                <div
                                  key={test.id}
                                  className="bg-white rounded-lg p-4 border border-gray-200"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        Paėmimas: {new Date(test.paemimo_data).toLocaleDateString('lt-LT')}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Tyrimas: {new Date(test.tyrimo_data).toLocaleDateString('lt-LT')}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {test.konteineris} / {test.prot_nr}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 mt-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Somatinių ląstelių skaičius:</span>
                                      <div className="text-right">
                                        <span className={`text-lg font-bold ${status.color}`}>
                                          {test.somatiniu_lasteliu_skaicius
                                            ? (test.somatiniu_lasteliu_skaicius / 1000).toFixed(0) + 'k'
                                            : '-'}
                                        </span>
                                        <div className={`text-xs ${status.color}`}>{status.label}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Bendras bakterijų skaičius:</span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {test.bendras_bakteriju_skaicius
                                          ? (test.bendras_bakteriju_skaicius / 1000).toFixed(0) + 'k'
                                          : '-'}
                                      </span>
                                    </div>
                                    {test.neatit_pst && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Neatitikimas PST:</span>
                                        <span className="text-sm font-semibold text-red-600">
                                          {test.neatit_pst}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
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
