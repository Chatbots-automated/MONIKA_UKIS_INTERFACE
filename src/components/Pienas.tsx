import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Droplets, TrendingUp, AlertCircle, Activity, Plus, X, Calendar, Beaker, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface Animal {
  id: string;
  tag_no: string;
  species: string;
  holder_name?: string;
}

interface MilkProduction {
  id: string;
  animal_id: string;
  measurement_date: string;
  measurement_time: string;
  milk_quantity: number;
  milk_temperature?: number;
  session_type: string;
  milking_duration?: number;
  flow_rate?: number;
  conductivity?: number;
  scale_device_id?: string;
  notes?: string;
  animal?: Animal;
}

interface MilkTest {
  id: string;
  animal_id: string;
  test_date: string;
  sample_date: string;
  sample_session?: string;
  fat_percentage?: number;
  protein_percentage?: number;
  lactose_percentage?: number;
  somatic_cell_count?: number;
  bacteria_count?: number;
  urea_level?: number;
  ph_level?: number;
  freezing_point?: number;
  total_solids?: number;
  test_status: string;
  lab_name?: string;
  lab_reference?: string;
  notes?: string;
  animal?: Animal;
}

interface MilkAnalytics {
  animal_id: string;
  tag_no: string;
  species: string;
  holder_name?: string;
  latest_test_date?: string;
  latest_fat_pct?: number;
  latest_protein_pct?: number;
  latest_scc?: number;
  latest_test_status?: string;
  milkings_last_7_days?: number;
  total_milk_7_days?: number;
  avg_milk_per_session?: number;
  milk_today?: number;
  latest_milking_time?: string;
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

type TabType = 'overview' | 'production' | 'tests' | 'analytics' | 'labTests';

export function Pienas() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [productions, setProductions] = useState<MilkProduction[]>([]);
  const [tests, setTests] = useState<MilkTest[]>([]);
  const [analytics, setAnalytics] = useState<MilkAnalytics[]>([]);
  const [labTestData, setLabTestData] = useState<ProducerWithTests[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [productionForm, setProductionForm] = useState({
    animal_id: '',
    measurement_date: new Date().toISOString().split('T')[0],
    measurement_time: new Date().toTimeString().slice(0, 5),
    milk_quantity: '',
    milk_temperature: '',
    session_type: 'morning',
    milking_duration: '',
    flow_rate: '',
    conductivity: '',
    notes: ''
  });

  const [testForm, setTestForm] = useState({
    animal_id: '',
    test_date: new Date().toISOString().split('T')[0],
    sample_date: new Date().toISOString().split('T')[0],
    sample_session: 'morning',
    fat_percentage: '',
    protein_percentage: '',
    lactose_percentage: '',
    somatic_cell_count: '',
    bacteria_count: '',
    urea_level: '',
    ph_level: '',
    freezing_point: '',
    total_solids: '',
    test_status: 'completed',
    lab_name: '',
    lab_reference: '',
    notes: ''
  });

  useRealtimeSubscription('milk_production', loadProductions);
  useRealtimeSubscription('milk_tests', loadTests);
  useRealtimeSubscription('milk_producers', loadLabTests);
  useRealtimeSubscription('milk_composition_tests', loadLabTests);
  useRealtimeSubscription('milk_quality_tests', loadLabTests);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAnimals(),
        activeTab === 'production' || activeTab === 'overview' ? loadProductions() : Promise.resolve(),
        activeTab === 'tests' || activeTab === 'overview' ? loadTests() : Promise.resolve(),
        activeTab === 'analytics' ? loadAnalytics() : Promise.resolve(),
        activeTab === 'labTests' ? loadLabTests() : Promise.resolve(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimals = async () => {
    const { data, error } = await supabase
      .from('animals')
      .select('id, tag_no, species, holder_name')
      .or('species.ilike.%karv%,species.ilike.%cow%')
      .eq('active', true)
      .order('tag_no');

    if (!error && data) setAnimals(data);
  };

  const loadProductions = async () => {
    const { data, error } = await supabase
      .from('milk_production')
      .select(`
        *,
        animal:animals(id, tag_no, species, holder_name)
      `)
      .order('measurement_date', { ascending: false })
      .order('measurement_time', { ascending: false })
      .limit(100);

    if (!error && data) setProductions(data);
  };

  const loadTests = async () => {
    const { data, error } = await supabase
      .from('milk_tests')
      .select(`
        *,
        animal:animals(id, tag_no, species, holder_name)
      `)
      .order('test_date', { ascending: false })
      .limit(100);

    if (!error && data) setTests(data);
  };

  const loadAnalytics = async () => {
    const { data, error } = await supabase
      .from('vw_milk_analytics')
      .select('*')
      .order('tag_no');

    if (!error && data) setAnalytics(data);
  };

  const loadLabTests = async () => {
    const { data: producers, error: producersError } = await supabase
      .from('milk_producers')
      .select('*')
      .order('updated_at', { ascending: false });

    if (producersError || !producers) return;

    const producersWithTests: ProducerWithTests[] = await Promise.all(
      producers.map(async (producer) => {
        const { data: compositionTests } = await supabase
          .from('milk_composition_tests')
          .select('*')
          .eq('producer_id', producer.id)
          .order('tyrimo_data', { ascending: false })
          .limit(10);

        const { data: qualityTests } = await supabase
          .from('milk_quality_tests')
          .select('*')
          .eq('producer_id', producer.id)
          .order('tyrimo_data', { ascending: false })
          .limit(10);

        return {
          producer,
          compositionTests: compositionTests || [],
          qualityTests: qualityTests || []
        };
      })
    );

    setLabTestData(producersWithTests);
  };

  const handleAddProduction = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('milk_production').insert({
      animal_id: productionForm.animal_id,
      measurement_date: productionForm.measurement_date,
      measurement_time: productionForm.measurement_time,
      milk_quantity: parseFloat(productionForm.milk_quantity),
      milk_temperature: productionForm.milk_temperature ? parseFloat(productionForm.milk_temperature) : null,
      session_type: productionForm.session_type,
      milking_duration: productionForm.milking_duration ? parseInt(productionForm.milking_duration) : null,
      flow_rate: productionForm.flow_rate ? parseFloat(productionForm.flow_rate) : null,
      conductivity: productionForm.conductivity ? parseFloat(productionForm.conductivity) : null,
      notes: productionForm.notes || null
    });

    if (error) {
      alert('Klaida pridedant įrašą: ' + error.message);
      return;
    }

    setShowProductionModal(false);
    setProductionForm({
      animal_id: '',
      measurement_date: new Date().toISOString().split('T')[0],
      measurement_time: new Date().toTimeString().slice(0, 5),
      milk_quantity: '',
      milk_temperature: '',
      session_type: 'morning',
      milking_duration: '',
      flow_rate: '',
      conductivity: '',
      notes: ''
    });
    loadProductions();
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('milk_tests').insert({
      animal_id: testForm.animal_id,
      test_date: testForm.test_date,
      sample_date: testForm.sample_date,
      sample_session: testForm.sample_session || null,
      fat_percentage: testForm.fat_percentage ? parseFloat(testForm.fat_percentage) : null,
      protein_percentage: testForm.protein_percentage ? parseFloat(testForm.protein_percentage) : null,
      lactose_percentage: testForm.lactose_percentage ? parseFloat(testForm.lactose_percentage) : null,
      somatic_cell_count: testForm.somatic_cell_count ? parseInt(testForm.somatic_cell_count) : null,
      bacteria_count: testForm.bacteria_count ? parseInt(testForm.bacteria_count) : null,
      urea_level: testForm.urea_level ? parseFloat(testForm.urea_level) : null,
      ph_level: testForm.ph_level ? parseFloat(testForm.ph_level) : null,
      freezing_point: testForm.freezing_point ? parseFloat(testForm.freezing_point) : null,
      total_solids: testForm.total_solids ? parseFloat(testForm.total_solids) : null,
      test_status: testForm.test_status,
      lab_name: testForm.lab_name || null,
      lab_reference: testForm.lab_reference || null,
      notes: testForm.notes || null
    });

    if (error) {
      alert('Klaida pridedant tyrimą: ' + error.message);
      return;
    }

    setShowTestModal(false);
    setTestForm({
      animal_id: '',
      test_date: new Date().toISOString().split('T')[0],
      sample_date: new Date().toISOString().split('T')[0],
      sample_session: 'morning',
      fat_percentage: '',
      protein_percentage: '',
      lactose_percentage: '',
      somatic_cell_count: '',
      bacteria_count: '',
      urea_level: '',
      ph_level: '',
      freezing_point: '',
      total_solids: '',
      test_status: 'completed',
      lab_name: '',
      lab_reference: '',
      notes: ''
    });
    loadTests();
  };

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

  const renderOverview = () => {
    const todayProduction = productions.filter(p =>
      p.measurement_date === new Date().toISOString().split('T')[0]
    );
    const totalToday = todayProduction.reduce((sum, p) => sum + parseFloat(p.milk_quantity.toString()), 0);
    const recentTests = tests.slice(0, 5);
    const avgSCC = tests.filter(t => t.somatic_cell_count).length > 0
      ? tests.filter(t => t.somatic_cell_count).reduce((sum, t) => sum + (t.somatic_cell_count || 0), 0) / tests.filter(t => t.somatic_cell_count).length
      : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900">Šiandien primelžta</h3>
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{totalToday.toFixed(1)} kg</p>
            <p className="text-xs text-blue-600 mt-2">{todayProduction.length} melžimai</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-900">Aktyvios karvės</h3>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{animals.length}</p>
            <p className="text-xs text-green-600 mt-2">Melžiamos</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-900">Vidutinis SCC</h3>
              <Beaker className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {avgSCC > 0 ? (avgSCC / 1000).toFixed(0) : '0'}k
            </p>
            <p className="text-xs text-purple-600 mt-2">Somatinės ląstelės</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-orange-900">Tyrimai</h3>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">{tests.length}</p>
            <p className="text-xs text-orange-600 mt-2">Iš viso</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Paskutiniai melžimai</h3>
            <div className="space-y-3">
              {productions.slice(0, 5).map(prod => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{prod.animal?.tag_no}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(prod.measurement_date + 'T' + prod.measurement_time).toLocaleString('lt-LT')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{prod.milk_quantity} kg</p>
                    <p className="text-xs text-gray-500 capitalize">{prod.session_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Paskutiniai tyrimai</h3>
            <div className="space-y-3">
              {recentTests.map(test => {
                const sccStatus = getSCCStatus(test.somatic_cell_count);
                return (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{test.animal?.tag_no}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(test.test_date).toLocaleDateString('lt-LT')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${sccStatus.color}`}>
                        SCC: {sccStatus.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        Riebalai: {test.fat_percentage?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProduction = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pieno gamyba</h2>
        <button
          onClick={() => setShowProductionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pridėti įrašą
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gyvūnas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Laikas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kiekis (kg)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Temperatūra</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sesija</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Detalės</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productions.map(prod => (
                <>
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{prod.animal?.tag_no}</p>
                        <p className="text-xs text-gray-500">{prod.animal?.species}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(prod.measurement_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{prod.measurement_time}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-600">{prod.milk_quantity} kg</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {prod.milk_temperature ? `${prod.milk_temperature}°C` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {prod.session_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleRow(prod.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedRows.has(prod.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(prod.id) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {prod.milking_duration && (
                            <div>
                              <p className="text-gray-500">Trukmė</p>
                              <p className="font-semibold">{prod.milking_duration}s</p>
                            </div>
                          )}
                          {prod.flow_rate && (
                            <div>
                              <p className="text-gray-500">Srauto greitis</p>
                              <p className="font-semibold">{prod.flow_rate} kg/min</p>
                            </div>
                          )}
                          {prod.conductivity && (
                            <div>
                              <p className="text-gray-500">Laidumas</p>
                              <p className="font-semibold">{prod.conductivity}</p>
                            </div>
                          )}
                          {prod.scale_device_id && (
                            <div>
                              <p className="text-gray-500">Svarstyklės</p>
                              <p className="font-semibold">{prod.scale_device_id}</p>
                            </div>
                          )}
                          {prod.notes && (
                            <div className="col-span-full">
                              <p className="text-gray-500">Pastabos</p>
                              <p className="font-semibold">{prod.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTests = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pieno tyrimai</h2>
        <button
          onClick={() => setShowTestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pridėti tyrimą
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gyvūnas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tyrimo data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Riebalai %</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Baltymai %</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SCC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Statusas</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Detalės</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tests.map(test => {
                const sccStatus = getSCCStatus(test.somatic_cell_count);
                return (
                  <>
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">{test.animal?.tag_no}</p>
                          <p className="text-xs text-gray-500">{test.animal?.species}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(test.test_date).toLocaleDateString('lt-LT')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600">
                          {test.fat_percentage?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-600">
                          {test.protein_percentage?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-semibold ${sccStatus.color}`}>
                            {test.somatic_cell_count ? (test.somatic_cell_count / 1000).toFixed(0) + 'k' : '-'}
                          </p>
                          <p className={`text-xs ${sccStatus.color}`}>{sccStatus.label}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          test.test_status === 'completed' ? 'bg-green-100 text-green-700' :
                          test.test_status === 'requires_attention' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {test.test_status === 'completed' ? 'Užbaigtas' :
                           test.test_status === 'requires_attention' ? 'Reikia dėmesio' : 'Laukiama'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRow(test.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expandedRows.has(test.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(test.id) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {test.lactose_percentage && (
                              <div>
                                <p className="text-gray-500">Laktozė %</p>
                                <p className="font-semibold">{test.lactose_percentage.toFixed(2)}</p>
                              </div>
                            )}
                            {test.bacteria_count && (
                              <div>
                                <p className="text-gray-500">Bakterijos</p>
                                <p className="font-semibold">{test.bacteria_count}</p>
                              </div>
                            )}
                            {test.urea_level && (
                              <div>
                                <p className="text-gray-500">Karbamidas</p>
                                <p className="font-semibold">{test.urea_level} mg/dl</p>
                              </div>
                            )}
                            {test.ph_level && (
                              <div>
                                <p className="text-gray-500">pH</p>
                                <p className="font-semibold">{test.ph_level}</p>
                              </div>
                            )}
                            {test.lab_name && (
                              <div>
                                <p className="text-gray-500">Laboratorija</p>
                                <p className="font-semibold">{test.lab_name}</p>
                              </div>
                            )}
                            {test.lab_reference && (
                              <div>
                                <p className="text-gray-500">Ref. numeris</p>
                                <p className="font-semibold">{test.lab_reference}</p>
                              </div>
                            )}
                            {test.notes && (
                              <div className="col-span-full">
                                <p className="text-gray-500">Pastabos</p>
                                <p className="font-semibold">{test.notes}</p>
                              </div>
                            )}
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
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Analitika</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gyvūnas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Šiandien</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">7d suma</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">7d vid.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Riebalai</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Baltymai</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SCC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pask. tyrimas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.map(item => {
                const sccStatus = getSCCStatus(item.latest_scc);
                return (
                  <tr key={item.animal_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.tag_no}</p>
                        <p className="text-xs text-gray-500">{item.holder_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-600">
                        {item.milk_today?.toFixed(1) || '0'} kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        {item.total_milk_7_days?.toFixed(1) || '0'} kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {item.avg_milk_per_session?.toFixed(1) || '0'} kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-green-600">
                        {item.latest_fat_pct?.toFixed(1) || '-'}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-600">
                        {item.latest_protein_pct?.toFixed(1) || '-'}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`font-semibold ${sccStatus.color}`}>
                          {item.latest_scc ? (item.latest_scc / 1000).toFixed(0) + 'k' : '-'}
                        </p>
                        <p className={`text-xs ${sccStatus.color}`}>{sccStatus.label}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.latest_test_date ? new Date(item.latest_test_date).toLocaleDateString('lt-LT') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLabTests = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Laboratorijos tyrimai</h2>
        <div className="text-sm text-gray-500">
          Importuoti duomenys iš n8n
        </div>
      </div>

      <div className="space-y-4">
        {labTestData.map(({ producer, compositionTests, qualityTests }) => {
          const latestComposition = compositionTests[0];
          const latestQuality = qualityTests[0];
          const sccStatus = getSCCStatus(latestQuality?.somatiniu_lasteliu_skaicius);

          return (
            <div key={producer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{producer.imone}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>Gamintojas: {producer.gamintojas_code}</span>
                      <span>Punktas: {producer.punktas}</span>
                      <span>Rajonas: {producer.rajonas}</span>
                      <span className="capitalize">{producer.label}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRow(producer.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedRows.has(producer.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Riebalai</p>
                    <p className="text-lg font-bold text-green-600">
                      {latestComposition?.riebalu_kiekis?.toFixed(2) || '-'}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Baltymai</p>
                    <p className="text-lg font-bold text-blue-600">
                      {latestComposition?.baltymu_kiekis?.toFixed(2) || '-'}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Laktozė</p>
                    <p className="text-lg font-bold text-purple-600">
                      {latestComposition?.laktozes_kiekis?.toFixed(2) || '-'}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">SCC</p>
                    <p className={`text-lg font-bold ${sccStatus.color}`}>
                      {latestQuality?.somatiniu_lasteliu_skaicius
                        ? (latestQuality.somatiniu_lasteliu_skaicius / 1000).toFixed(0) + 'k'
                        : '-'}
                    </p>
                    <p className={`text-xs ${sccStatus.color}`}>{sccStatus.label}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500">Bakterijos</p>
                    <p className="text-lg font-bold text-orange-600">
                      {latestQuality?.bendras_bakteriju_skaicius
                        ? (latestQuality.bendras_bakteriju_skaicius / 1000).toFixed(0) + 'k'
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {expandedRows.has(producer.id) && (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Beaker className="w-4 h-4" />
                        Sudėties tyrimai
                      </h4>
                      <div className="space-y-2">
                        {compositionTests.length === 0 ? (
                          <p className="text-sm text-gray-500">Nėra duomenų</p>
                        ) : (
                          compositionTests.map(test => (
                            <div key={test.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold text-gray-700">
                                    {new Date(test.paemimo_data).toLocaleDateString('lt-LT')}
                                  </p>
                                  <p className="text-xs text-gray-500">Tyrimas: {new Date(test.tyrimo_data).toLocaleDateString('lt-LT')}</p>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {test.konteineris}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">Riebalai:</span>
                                  <span className="ml-1 font-semibold">{test.riebalu_kiekis?.toFixed(2)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Baltymai:</span>
                                  <span className="ml-1 font-semibold">{test.baltymu_kiekis?.toFixed(2)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Laktozė:</span>
                                  <span className="ml-1 font-semibold">{test.laktozes_kiekis?.toFixed(2)}%</span>
                                </div>
                              </div>
                              {test.ureja_mg_100ml && (
                                <div className="mt-2 text-xs">
                                  <span className="text-gray-500">Ureja:</span>
                                  <span className="ml-1 font-semibold">{test.ureja_mg_100ml} mg/100ml</span>
                                </div>
                              )}
                              {test.ph && (
                                <div className="mt-1 text-xs">
                                  <span className="text-gray-500">pH:</span>
                                  <span className="ml-1 font-semibold">{test.ph}</span>
                                </div>
                              )}
                              {test.pastaba && (
                                <div className="mt-2 text-xs text-gray-600">
                                  {test.pastaba}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Kokybės tyrimai
                      </h4>
                      <div className="space-y-2">
                        {qualityTests.length === 0 ? (
                          <p className="text-sm text-gray-500">Nėra duomenų</p>
                        ) : (
                          qualityTests.map(test => {
                            const testSccStatus = getSCCStatus(test.somatiniu_lasteliu_skaicius);
                            return (
                              <div key={test.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-700">
                                      {new Date(test.paemimo_data).toLocaleDateString('lt-LT')}
                                    </p>
                                    <p className="text-xs text-gray-500">Tyrimas: {new Date(test.tyrimo_data).toLocaleDateString('lt-LT')}</p>
                                  </div>
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {test.konteineris}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">SCC:</span>
                                    <span className={`ml-1 font-semibold ${testSccStatus.color}`}>
                                      {test.somatiniu_lasteliu_skaicius
                                        ? (test.somatiniu_lasteliu_skaicius / 1000).toFixed(0) + 'k'
                                        : '-'} ({testSccStatus.label})
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Bakterijos:</span>
                                    <span className="ml-1 font-semibold">
                                      {test.bendras_bakteriju_skaicius
                                        ? (test.bendras_bakteriju_skaicius / 1000).toFixed(0) + 'k'
                                        : '-'}
                                    </span>
                                  </div>
                                </div>
                                {test.neatit_pst && (
                                  <div className="mt-2 text-xs text-red-600 font-medium">
                                    {test.neatit_pst}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {labTestData.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nėra importuotų duomenų</h3>
            <p className="text-gray-500">Duomenys bus rodomi kai bus importuoti per n8n sistemą</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Pieno apskaita</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Realtime aktyvus</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Apžvalga
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'production'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pieno gamyba
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'tests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pieno tyrimai
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analitika
        </button>
        <button
          onClick={() => setActiveTab('labTests')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'labTests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Laboratorijos tyrimai
        </button>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'production' && renderProduction()}
      {activeTab === 'tests' && renderTests()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'labTests' && renderLabTests()}

      {showProductionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Pridėti pieno gamybą</h2>
              <button
                onClick={() => setShowProductionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddProduction} className="p-6 space-y-4">
              <SearchableSelect
                label="Gyvūnas *"
                value={productionForm.animal_id}
                onChange={(value) => setProductionForm({ ...productionForm, animal_id: value })}
                options={animals.map(a => ({ value: a.id, label: `${a.tag_no} - ${a.species}` }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={productionForm.measurement_date}
                    onChange={(e) => setProductionForm({ ...productionForm, measurement_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laikas *
                  </label>
                  <input
                    type="time"
                    value={productionForm.measurement_time}
                    onChange={(e) => setProductionForm({ ...productionForm, measurement_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kiekis (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productionForm.milk_quantity}
                    onChange={(e) => setProductionForm({ ...productionForm, milk_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperatūra (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={productionForm.milk_temperature}
                    onChange={(e) => setProductionForm({ ...productionForm, milk_temperature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sesijos tipas *
                </label>
                <select
                  value={productionForm.session_type}
                  onChange={(e) => setProductionForm({ ...productionForm, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="morning">Rytas</option>
                  <option value="afternoon">Popietė</option>
                  <option value="evening">Vakaras</option>
                  <option value="other">Kita</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trukmė (s)
                  </label>
                  <input
                    type="number"
                    value={productionForm.milking_duration}
                    onChange={(e) => setProductionForm({ ...productionForm, milking_duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Srauto greitis
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productionForm.flow_rate}
                    onChange={(e) => setProductionForm({ ...productionForm, flow_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laidumas
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productionForm.conductivity}
                    onChange={(e) => setProductionForm({ ...productionForm, conductivity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pastabos
                </label>
                <textarea
                  value={productionForm.notes}
                  onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Pridėti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Pridėti pieno tyrimą</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddTest} className="p-6 space-y-4">
              <SearchableSelect
                label="Gyvūnas *"
                value={testForm.animal_id}
                onChange={(value) => setTestForm({ ...testForm, animal_id: value })}
                options={animals.map(a => ({ value: a.id, label: `${a.tag_no} - ${a.species}` }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tyrimo data *
                  </label>
                  <input
                    type="date"
                    value={testForm.test_date}
                    onChange={(e) => setTestForm({ ...testForm, test_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mėginio data *
                  </label>
                  <input
                    type="date"
                    value={testForm.sample_date}
                    onChange={(e) => setTestForm({ ...testForm, sample_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Riebalai %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testForm.fat_percentage}
                    onChange={(e) => setTestForm({ ...testForm, fat_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Baltymai %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testForm.protein_percentage}
                    onChange={(e) => setTestForm({ ...testForm, protein_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laktozė %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testForm.lactose_percentage}
                    onChange={(e) => setTestForm({ ...testForm, lactose_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Somatinės ląstelės (SCC)
                  </label>
                  <input
                    type="number"
                    value={testForm.somatic_cell_count}
                    onChange={(e) => setTestForm({ ...testForm, somatic_cell_count: e.target.value })}
                    placeholder="pvz. 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bakterijos
                  </label>
                  <input
                    type="number"
                    value={testForm.bacteria_count}
                    onChange={(e) => setTestForm({ ...testForm, bacteria_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karbamidas (mg/dl)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testForm.urea_level}
                    onChange={(e) => setTestForm({ ...testForm, urea_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    pH
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testForm.ph_level}
                    onChange={(e) => setTestForm({ ...testForm, ph_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Užšalimo taškas
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={testForm.freezing_point}
                    onChange={(e) => setTestForm({ ...testForm, freezing_point: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laboratorija
                  </label>
                  <input
                    type="text"
                    value={testForm.lab_name}
                    onChange={(e) => setTestForm({ ...testForm, lab_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ref. numeris
                  </label>
                  <input
                    type="text"
                    value={testForm.lab_reference}
                    onChange={(e) => setTestForm({ ...testForm, lab_reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statusas *
                </label>
                <select
                  value={testForm.test_status}
                  onChange={(e) => setTestForm({ ...testForm, test_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="pending">Laukiama</option>
                  <option value="completed">Užbaigtas</option>
                  <option value="requires_attention">Reikia dėmesio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pastabos
                </label>
                <textarea
                  value={testForm.notes}
                  onChange={(e) => setTestForm({ ...testForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Pridėti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
