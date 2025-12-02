import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTimeLT, formatNumberLT } from '../lib/formatters';
import { calculateSafeUnitCost, formatCost, formatUnitCost } from '../lib/costCalculations';
import { fetchAllRows } from '../lib/helpers';
import { Package, Search, RefreshCw, ChevronDown, ChevronRight, Calendar, Activity, TrendingUp, Filter } from 'lucide-react';

interface ProductUsageRecord {
  product_id: string;
  product_name: string;
  category: string | null;
  subcategory: string | null;
  total_quantity: number;
  unit: string;
  total_cost: number;
  usage_count: number;
  animals_treated: number;
  usages: UsageDetail[];
}

interface UsageDetail {
  date: string;
  animal_tag: string | null;
  animal_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  visit_id: string | null;
  treatment_id: string | null;
  source: 'usage_items' | 'vaccinations' | 'planned_medications';
}

export function ProductUsageAnalysis() {
  const [usageData, setUsageData] = useState<ProductUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'cost' | 'usage_count'>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadProductUsage();
  }, []);

  const loadProductUsage = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading product usage data...');

      // 1. Get all usage_items with product details
      const usageItems = await fetchAllRows<any>(
        'usage_items',
        'id, qty, created_at, treatment_id, product_id, batch_id'
      );

      console.log('✅ Usage items loaded:', usageItems.length);

      // 2. Get all vaccinations
      const vaccinations = await fetchAllRows<any>(
        'vaccinations',
        'id, dose_amount, unit, vaccination_date, animal_id, product_id, batch_id'
      );

      console.log('✅ Vaccinations loaded:', vaccinations.length);

      // 3. Get all animal_visits with planned_medications
      const visits = await fetchAllRows<any>(
        'animal_visits',
        'id, visit_datetime, animal_id, planned_medications',
        undefined,
        [{ column: 'planned_medications', value: null, operator: 'not.is' }]
      );

      console.log('✅ Visits with planned meds loaded:', visits.length);

      // Process all data into product-centric view
      const productMap = new Map<string, ProductUsageRecord>();

      // Process usage_items
      console.log('📦 Processing usage_items...');
      for (const item of usageItems || []) {
        if (!item.product_id || !item.batch_id || !item.qty) continue;

        // Fetch product details
        const { data: product } = await supabase
          .from('products')
          .select('id, name, category, subcategory, primary_pack_unit')
          .eq('id', item.product_id)
          .maybeSingle();

        if (!product) continue;

        // Fetch batch details
        const { data: batch } = await supabase
          .from('batches')
          .select('purchase_price, received_qty')
          .eq('id', item.batch_id)
          .maybeSingle();

        if (!batch) continue;

        // Fetch treatment and animal details
        let animalTag = null;
        let animalId = null;
        if (item.treatment_id) {
          const { data: treatment } = await supabase
            .from('treatments')
            .select('animal_id, animals(tag_no)')
            .eq('id', item.treatment_id)
            .maybeSingle();

          if (treatment) {
            animalId = treatment.animal_id;
            animalTag = (treatment.animals as any)?.tag_no || null;
          }
        }

        const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
        const totalCost = item.qty * unitCost;

        const productId = product.id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            total_quantity: 0,
            unit: product.primary_pack_unit || 'vnt',
            total_cost: 0,
            usage_count: 0,
            animals_treated: 0,
            usages: [],
          });
        }

        const record = productMap.get(productId)!;
        record.total_quantity += item.qty;
        record.total_cost += totalCost;
        record.usage_count += 1;
        record.usages.push({
          date: item.created_at,
          animal_tag: animalTag,
          animal_id: animalId || '',
          quantity: item.qty,
          unit_cost: unitCost,
          total_cost: totalCost,
          visit_id: null,
          treatment_id: item.treatment_id,
          source: 'usage_items',
        });
      }
      console.log('✅ Usage items processed:', productMap.size, 'products');

      // Process vaccinations
      console.log('💉 Processing vaccinations...');
      for (const vacc of vaccinations || []) {
        if (!vacc.product_id || !vacc.batch_id || !vacc.dose_amount) continue;

        // Fetch product details
        const { data: product } = await supabase
          .from('products')
          .select('id, name, category, subcategory, primary_pack_unit')
          .eq('id', vacc.product_id)
          .maybeSingle();

        if (!product) continue;

        // Fetch batch details
        const { data: batch } = await supabase
          .from('batches')
          .select('purchase_price, received_qty')
          .eq('id', vacc.batch_id)
          .maybeSingle();

        if (!batch) continue;

        // Fetch animal details
        const { data: animal } = await supabase
          .from('animals')
          .select('tag_no')
          .eq('id', vacc.animal_id)
          .maybeSingle();

        const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
        const totalCost = vacc.dose_amount * unitCost;

        const productId = product.id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            total_quantity: 0,
            unit: vacc.unit || product.primary_pack_unit || 'vnt',
            total_cost: 0,
            usage_count: 0,
            animals_treated: 0,
            usages: [],
          });
        }

        const record = productMap.get(productId)!;
        record.total_quantity += vacc.dose_amount;
        record.total_cost += totalCost;
        record.usage_count += 1;
        record.usages.push({
          date: vacc.vaccination_date,
          animal_tag: animal?.tag_no || null,
          animal_id: vacc.animal_id,
          quantity: vacc.dose_amount,
          unit_cost: unitCost,
          total_cost: totalCost,
          visit_id: null,
          treatment_id: null,
          source: 'vaccinations',
        });
      }
      console.log('✅ Vaccinations processed');

      // Process planned_medications from visits
      console.log('📋 Processing planned medications...');
      for (const visit of visits || []) {
        const plannedMeds = visit.planned_medications as any[];

        if (!plannedMeds || !Array.isArray(plannedMeds)) continue;

        // Fetch animal details
        const { data: animal } = await supabase
          .from('animals')
          .select('tag_no')
          .eq('id', visit.animal_id)
          .maybeSingle();

        for (const med of plannedMeds) {
          if (!med.product_id || !med.batch_id || !med.qty) continue;

          // Fetch product and batch details
          const { data: product } = await supabase
            .from('products')
            .select('id, name, category, subcategory, primary_pack_unit')
            .eq('id', med.product_id)
            .maybeSingle();

          const { data: batch } = await supabase
            .from('batches')
            .select('purchase_price, received_qty')
            .eq('id', med.batch_id)
            .maybeSingle();

          if (!product || !batch) continue;

          const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
          const totalCost = med.qty * unitCost;

          const productId = product.id;
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              product_id: productId,
              product_name: product.name,
              category: product.category,
              subcategory: product.subcategory,
              total_quantity: 0,
              unit: med.unit || product.primary_pack_unit || 'vnt',
              total_cost: 0,
              usage_count: 0,
              animals_treated: 0,
              usages: [],
            });
          }

          const record = productMap.get(productId)!;
          record.total_quantity += med.qty;
          record.total_cost += totalCost;
          record.usage_count += 1;
          record.usages.push({
            date: visit.visit_datetime,
            animal_tag: animal?.tag_no || null,
            animal_id: visit.animal_id,
            quantity: med.qty,
            unit_cost: unitCost,
            total_cost: totalCost,
            visit_id: visit.id,
            treatment_id: null,
            source: 'planned_medications',
          });
        }
      }
      console.log('✅ Planned medications processed');

      // Calculate unique animals per product
      for (const record of productMap.values()) {
        const uniqueAnimals = new Set(record.usages.map(u => u.animal_id));
        record.animals_treated = uniqueAnimals.size;
      }

      setUsageData(Array.from(productMap.values()));
      console.log('📦 Product usage loaded:', productMap.size, 'unique products');
    } catch (error) {
      console.error('Error loading product usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  // Filter data
  const filteredData = usageData.filter(product => {
    // Search filter
    if (searchTerm && !product.product_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && product.category !== categoryFilter) {
      return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const productUsagesInRange = product.usages.filter(usage => {
        const usageDate = new Date(usage.date);
        if (startDate && usageDate < new Date(startDate)) return false;
        if (endDate && usageDate > new Date(endDate + 'T23:59:59')) return false;
        return true;
      });
      if (productUsagesInRange.length === 0) return false;
    }

    return true;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'name':
        compareValue = a.product_name.localeCompare(b.product_name, 'lt');
        break;
      case 'quantity':
        compareValue = a.total_quantity - b.total_quantity;
        break;
      case 'cost':
        compareValue = a.total_cost - b.total_cost;
        break;
      case 'usage_count':
        compareValue = a.usage_count - b.usage_count;
        break;
    }
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  const totalStats = usageData.reduce(
    (acc, product) => ({
      totalProducts: acc.totalProducts + 1,
      totalCost: acc.totalCost + product.total_cost,
      totalUsages: acc.totalUsages + product.usage_count,
      totalAnimals: acc.totalAnimals + product.animals_treated,
    }),
    { totalProducts: 0, totalCost: 0, totalUsages: 0, totalAnimals: 0 }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vaistų Panaudojimas</h2>
              <p className="text-sm text-gray-600">Detalus visų produktų panaudojimo ataskaita</p>
            </div>
          </div>
          <button
            onClick={loadProductUsage}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Produktų</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalProducts}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Panaudojimų</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{totalStats.totalUsages}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Viso išlaidų</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCost(totalStats.totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Filtrai</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti produkto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Visos kategorijos</option>
            <option value="medicines">Vaistai</option>
            <option value="prevention">Prevencija</option>
            <option value="reproduction">Reprodukcija</option>
            <option value="hygiene">Higiena</option>
            <option value="supplies">Priemonės</option>
          </select>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nuo datos"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Iki datos"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Rūšiuoti pagal:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="cost">Kaina</option>
            <option value="quantity">Kiekis</option>
            <option value="usage_count">Panaudojimų skaičius</option>
            <option value="name">Pavadinimas</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ Mažėjančia' : '↑ Didėjančia'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nerasta produktų panaudojimo duomenų</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Produktas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Panaudota
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Panaudojimų
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Gyvūnų
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Viso kaina
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((product) => {
                  const isExpanded = expandedProduct === product.product_id;

                  return (
                    <React.Fragment key={product.product_id}>
                      <tr
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(product.product_id)}
                      >
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{product.product_name}</div>
                          {product.subcategory && (
                            <div className="text-xs text-gray-500 mt-1">{product.subcategory}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {product.category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-gray-900">
                            {formatNumberLT(product.total_quantity)} {product.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-gray-900">{product.usage_count}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-gray-900">{product.animals_treated}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCost(product.total_cost)}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <div className="text-sm font-bold text-gray-700 mb-3">
                                Panaudojimo istorija ({product.usages.length})
                              </div>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {product.usages
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .map((usage, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-900">
                                              {formatDateTimeLT(usage.date)}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                              Gyvūnas: {usage.animal_tag || 'N/A'}
                                            </span>
                                          </div>
                                          <div className="text-sm text-gray-600 mt-1">
                                            {formatNumberLT(usage.quantity)} {product.unit} × {formatUnitCost(usage.unit_cost)}/{product.unit}
                                          </div>
                                        </div>
                                        <div className="font-bold text-blue-600 text-lg ml-4">
                                          {formatCost(usage.total_cost)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
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
