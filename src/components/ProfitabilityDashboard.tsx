import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrencyLT, formatNumberLT } from '../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  AlertTriangle,
  CheckCircle,
  Droplet,
  Activity,
  BarChart3,
  Calculator,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface ProfitabilityData {
  animal_id: string;
  tag_no: string | null;
  collar_no: string | null;
  days_tracked: number;
  total_milk_liters: number;
  avg_daily_milk: number;
  milk_revenue: number;
  withdrawal_revenue_loss: number;
  adjusted_milk_revenue: number;
  treatment_count: number;
  vaccination_count: number;
  visit_count: number;
  medication_costs: number;
  visit_costs: number;
  total_costs: number;
  net_profit: number;
  roi_percentage: number | null;
  cost_to_revenue_ratio: number | null;
  lactation_days: number | null;
  current_group: number | null;
  current_status: string | null;
  is_producing: boolean | null;
  days_in_withdrawal: number;
}

interface TreatmentROIAnalysis {
  animal_id: string;
  tag_no: string | null;
  collar_no: string | null;
  avg_daily_milk: number;
  net_profit: number;
  current_total_costs: number;
  treatment_count_last_90_days: number;
  total_treatment_cost: number;
  avg_treatment_cost: number;
  last_treatment_date: string | null;
  successful_treatments: number;
  ongoing_treatments: number;
  success_rate_percentage: number | null;
  days_to_payback_avg_treatment: number | null;
  recommendation: 'profitable' | 'monitor' | 'at_risk' | 'chronic_case' | 'cull_recommended';
  current_status: string | null;
  is_producing: boolean | null;
}

interface HerdSummary {
  total_animals: number;
  profitable_count: number;
  unprofitable_count: number;
  severe_loss_count: number;
  total_herd_milk: number;
  total_milk_revenue: number;
  total_treatment_costs: number;
  total_herd_profit: number;
  avg_profit_per_animal: number;
  avg_daily_milk_per_animal: number;
  total_withdrawal_days: number;
  total_withdrawal_loss: number;
  overall_cost_to_revenue_ratio: number;
}

type TabType = 'pelningumas' | 'sprendimai' | 'banda' | 'konfiguracija';

export function ProfitabilityDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pelningumas');
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData[]>([]);
  const [roiAnalysis, setRoiAnalysis] = useState<TreatmentROIAnalysis[]>([]);
  const [herdSummary, setHerdSummary] = useState<HerdSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'net_profit' | 'milk_revenue' | 'total_costs' | 'tag_no'>('net_profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Treatment decision calculator state
  const [selectedAnimal, setSelectedAnimal] = useState<string>('');
  const [estimatedTreatmentCost, setEstimatedTreatmentCost] = useState<number>(0);
  const [decisionResult, setDecisionResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load profitability data
      const { data: profData, error: profError } = await supabase
        .from('vw_animal_profitability')
        .select('*');

      if (profError) throw profError;
      setProfitabilityData(profData || []);

      // Load ROI analysis data
      const { data: roiData, error: roiError } = await supabase
        .from('vw_treatment_roi_analysis')
        .select('*');

      if (roiError) throw roiError;
      setRoiAnalysis(roiData || []);

      // Load herd summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('vw_herd_profitability_summary')
        .select('*')
        .single();

      if (summaryError) throw summaryError;
      setHerdSummary(summaryData);

    } catch (error) {
      console.error('Error loading profitability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTreatmentDecision = () => {
    if (!selectedAnimal || !estimatedTreatmentCost) return;

    const animal = roiAnalysis.find(a => a.animal_id === selectedAnimal);
    if (!animal) return;

    const dailyRevenue = animal.avg_daily_milk * 0.45; // Using default milk price
    const daysToPayback = dailyRevenue > 0 ? Math.ceil(estimatedTreatmentCost / dailyRevenue) : null;

    let decision: 'treat' | 'monitor' | 'cull';
    let reasoning: string;
    let confidence: 'high' | 'medium' | 'low';

    if (animal.net_profit < -100) {
      decision = 'cull';
      reasoning = 'Gyvulys yra labai nuostolingas (< -100 EUR per 90 dienų). Gydymo investicija greičiausiai neatsipirks.';
      confidence = 'high';
    } else if (daysToPayback && daysToPayback > 90) {
      decision = 'cull';
      reasoning = `Gydymo kaštai atsipirktų per ${daysToPayback} dienas, kas yra per ilgas laikotarpis.`;
      confidence = 'high';
    } else if (daysToPayback && daysToPayback > 30) {
      decision = 'monitor';
      reasoning = `Gydymo kaštai atsipirktų per ~${daysToPayback} dienas. Stebėkite situaciją.`;
      confidence = 'medium';
    } else if (animal.success_rate_percentage && animal.success_rate_percentage < 50) {
      decision = 'monitor';
      reasoning = `Gydymo sėkmės rodiklis yra žemas (${animal.success_rate_percentage}%). Apsvarstykite alternatyvas.`;
      confidence = 'medium';
    } else {
      decision = 'treat';
      reasoning = daysToPayback
        ? `Gydymo kaštai atsipirktų per ~${daysToPayback} dienas. Gera investicija.`
        : 'Gyvulys yra produktyvus ir verta jį gydyti.';
      confidence = 'high';
    }

    setDecisionResult({
      decision,
      reasoning,
      confidence,
      daysToPayback,
      dailyRevenue,
      currentProfit: animal.net_profit,
      successRate: animal.success_rate_percentage
    });
  };

  const getSortedAndFilteredData = () => {
    let filtered = profitabilityData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (item.tag_no?.toLowerCase().includes(searchLower) || false) ||
        (item.collar_no?.toString().includes(searchLower) || false)
      );
    });

    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'net_profit':
          aVal = a.net_profit;
          bVal = b.net_profit;
          break;
        case 'milk_revenue':
          aVal = a.milk_revenue;
          bVal = b.milk_revenue;
          break;
        case 'total_costs':
          aVal = a.total_costs;
          bVal = b.total_costs;
          break;
        case 'tag_no':
          aVal = a.tag_no || '';
          bVal = b.tag_no || '';
          break;
        default:
          aVal = a.net_profit;
          bVal = b.net_profit;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const getProfitabilityColor = (profit: number) => {
    if (profit > 50) return 'text-emerald-700 bg-emerald-50';
    if (profit > 0) return 'text-green-700 bg-green-50';
    if (profit > -10) return 'text-yellow-700 bg-yellow-50';
    if (profit > -50) return 'text-orange-700 bg-orange-50';
    return 'text-red-700 bg-red-50';
  };

  const getProfitabilityIcon = (profit: number) => {
    if (profit > 0) return <TrendingUp className="w-4 h-4" />;
    if (profit < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'profitable':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Pelningas</span>;
      case 'monitor':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Stebėti</span>;
      case 'at_risk':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Rizikoje</span>;
      case 'chronic_case':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Lėtinis</span>;
      case 'cull_recommended':
        return <span className="px-2 py-1 bg-red-200 text-red-900 text-xs rounded-full font-semibold">Šalinti</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">—</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          Pelningumas & Finansinė Analizė
        </h1>
        <p className="mt-2 text-emerald-50">
          Išsami finansinė analizė ir gydymo sprendimų palaikymas
        </p>
      </div>

      {/* Summary Cards */}
      {herdSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bendras Pelnas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrencyLT(herdSummary.total_herd_profit)}
                </p>
              </div>
              <Euro className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Vidutiniškai: {formatCurrencyLT(herdSummary.avg_profit_per_animal)} / gyvulys
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pieno Pajamos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrencyLT(herdSummary.total_milk_revenue)}
                </p>
              </div>
              <Droplet className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatNumberLT(herdSummary.total_herd_milk)} L pieno
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gydymo Kaštai</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrencyLT(herdSummary.total_treatment_costs)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {herdSummary.overall_cost_to_revenue_ratio.toFixed(1)}% pajamų
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pelningi Gyvuliai</p>
                <p className="text-2xl font-bold text-gray-900">
                  {herdSummary.profitable_count} / {herdSummary.total_animals}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {((herdSummary.profitable_count / herdSummary.total_animals) * 100).toFixed(1)}% bandos
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pelningumas')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pelningumas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Pelningumas
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sprendimai')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sprendimai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Gydymo Sprendimai
              </div>
            </button>
            <button
              onClick={() => setActiveTab('banda')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'banda'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Bandos Analizė
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Pelningumas Tab */}
          {activeTab === 'pelningumas' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ieškoti pagal auskarą arba kaklajuostės nr..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atnaujinti
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gyvulys
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pieno Pajamos
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gydymo Kaštai
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grynasis Pelnas
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ROI
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statusas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedAndFilteredData().map((animal) => (
                      <tr key={animal.animal_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{animal.tag_no || '—'}</div>
                              <div className="text-xs text-gray-500">Kakl: {animal.collar_no || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-blue-700">
                            {formatCurrencyLT(animal.adjusted_milk_revenue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatNumberLT(animal.total_milk_liters)} L
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-orange-700">
                            {formatCurrencyLT(animal.total_costs)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {animal.treatment_count} gyd.
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className={`flex items-center justify-end gap-1 ${getProfitabilityColor(animal.net_profit)}`}>
                            {getProfitabilityIcon(animal.net_profit)}
                            <span className="text-sm font-bold">
                              {formatCurrencyLT(animal.net_profit)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-gray-700">
                            {animal.roi_percentage ? `${animal.roi_percentage}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                            {animal.current_status === 'APSĖK' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-semibold">
                                APSĖK
                              </span>
                            )}
                            {animal.current_group === 5 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                Gr. 5
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gydymo Sprendimai Tab */}
          {activeTab === 'sprendimai' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Ar Verta Gydyti Šį Gyvulį?</h3>
                <p className="text-sm text-blue-700">
                  Įveskite numatomas gydymo išlaidas ir gaukite rekomendaciją ar verta investuoti į gydymą.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pasirinkite Gyvulį
                  </label>
                  <select
                    value={selectedAnimal}
                    onChange={(e) => setSelectedAnimal(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pasirinkite --</option>
                    {roiAnalysis.map((animal) => (
                      <option key={animal.animal_id} value={animal.animal_id}>
                        {animal.tag_no || 'Nežinomas'} (Kakl: {animal.collar_no || '—'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numatoma Gydymo Kaina (EUR)
                  </label>
                  <input
                    type="number"
                    value={estimatedTreatmentCost}
                    onChange={(e) => setEstimatedTreatmentCost(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={calculateTreatmentDecision}
                disabled={!selectedAnimal || !estimatedTreatmentCost}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Skaičiuoti Rekomendaciją
              </button>

              {decisionResult && (
                <div className={`rounded-lg p-6 ${
                  decisionResult.decision === 'treat' ? 'bg-green-50 border border-green-200' :
                  decisionResult.decision === 'monitor' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-4">
                    {decisionResult.decision === 'treat' ? (
                      <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                    ) : decisionResult.decision === 'monitor' ? (
                      <AlertTriangle className="w-12 h-12 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${
                        decisionResult.decision === 'treat' ? 'text-green-900' :
                        decisionResult.decision === 'monitor' ? 'text-yellow-900' :
                        'text-red-900'
                      }`}>
                        {decisionResult.decision === 'treat' ? 'GYDYTI' :
                         decisionResult.decision === 'monitor' ? 'STEBĖTI' :
                         'ŠALINTI IŠ BANDOS'}
                      </h3>
                      <p className="text-gray-700 mb-4">{decisionResult.reasoning}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {decisionResult.daysToPayback && (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-600">Atsipirkimas</p>
                            <p className="text-lg font-bold text-gray-900">{decisionResult.daysToPayback} d.</p>
                          </div>
                        )}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-600">Dienos Pajamos</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrencyLT(decisionResult.dailyRevenue)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-600">Dabartinis Pelnas</p>
                          <p className="text-lg font-bold text-gray-900">{formatCurrencyLT(decisionResult.currentProfit)}</p>
                        </div>
                        {decisionResult.successRate && (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-600">Sėkmės Rodiklis</p>
                            <p className="text-lg font-bold text-gray-900">{decisionResult.successRate}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bandos Analizė Tab */}
          {activeTab === 'banda' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                    Pelningiausi Gyvuliai (Top 10)
                  </h3>
                  <div className="space-y-2">
                    {profitabilityData
                      .filter(a => a.net_profit > 0)
                      .sort((a, b) => b.net_profit - a.net_profit)
                      .slice(0, 10)
                      .map((animal, index) => (
                        <div key={animal.animal_id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-700">#{index + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{animal.tag_no}</span>
                          </div>
                          <span className="text-sm font-bold text-green-700">
                            {formatCurrencyLT(animal.net_profit)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Bottom Performers */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                    Nuostolingiausi Gyvuliai (Top 10)
                  </h3>
                  <div className="space-y-2">
                    {profitabilityData
                      .filter(a => a.net_profit < 0)
                      .sort((a, b) => a.net_profit - b.net_profit)
                      .slice(0, 10)
                      .map((animal, index) => (
                        <div key={animal.animal_id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-red-700">#{index + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{animal.tag_no}</span>
                          </div>
                          <span className="text-sm font-bold text-red-700">
                            {formatCurrencyLT(animal.net_profit)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Recommendations Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rekomendacijų Santrauka</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {['profitable', 'monitor', 'at_risk', 'chronic_case', 'cull_recommended'].map(rec => {
                    const count = roiAnalysis.filter(a => a.recommendation === rec).length;
                    return (
                      <div key={rec} className="text-center p-4 bg-gray-50 rounded-lg">
                        {getRecommendationBadge(rec)}
                        <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                        <p className="text-xs text-gray-600">gyvulių</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
