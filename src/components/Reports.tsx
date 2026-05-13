import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows } from '../lib/helpers';
import {
  FileText,
  Download,
  Calendar,
  Activity,
  TrendingUp,
  AlertTriangle,
  Syringe,
  Package,
  DollarSign,
  PieChart,
  BarChart3,
  Users,
  Filter,
  X,
  RefreshCw,
  Printer,
  Heart,
  Truck,
  CheckCircle,
  XCircle,
  Info,
  Plus,
  Edit2,
  Save,
  Trash2
} from 'lucide-react';
import {
  TreatedAnimalsReport,
  MedicalWasteReport,
  DrugJournalReport,
  BiocideJournalReport,
  InseminationJournalReport
} from './ReportTemplates';
import { SearchableSelect } from './SearchableSelect';
import { InvoiceViewer } from './InvoiceViewer';

interface AnalyticsData {
  totalAnimals: number;
  activeAnimals: number;
  totalTreatments: number;
  totalVaccinations: number;
  totalProductValue: number;
  lowStockProducts: number;
  expiringSoon: number;
  animalsInWithdrawal: number;
  topDiseases: Array<{ name: string; count: number }>;
  topProducts: Array<{ name: string; usage: number }>;
  treatmentsByMonth: Array<{ month: string; count: number }>;
  vaccinationsByMonth: Array<{ month: string; count: number }>;
  outcomeStats: Array<{ outcome: string; count: number }>;
  inventoryByCategory: Array<{ category: string; value: number }>;
}

interface EconomicGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

type ReportType = 'analytics' | 'drug_journal' | 'treated_animals' | 'biocide_journal' | 'insemination_journal' | 'medical_waste' | 'invoices' | 'animal_departures' | 'hoof_journal';

// Get current month's first and last day
const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0]
  };
};

export function Reports() {
  const currentMonth = getCurrentMonthDates();

  const [reportType, setReportType] = useState<ReportType>('analytics');
  const [data, setData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(currentMonth.from);
  const [dateTo, setDateTo] = useState(currentMonth.to);
  const [showFilters, setShowFilters] = useState(true);

  const [filterAnimal, setFilterAnimal] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDisease, setFilterDisease] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterVet, setFilterVet] = useState('');
  const [filterAnimalId, setFilterAnimalId] = useState(''); // For animal departures search

  const [animals, setAnimals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  const [economicGroups, setEconomicGroups] = useState<EconomicGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EconomicGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignGroupId, setBulkAssignGroupId] = useState<string>('');

  useEffect(() => {
    loadFilterOptions();
    if (reportType === 'analytics') {
      loadAnalytics();
    } else if (reportType !== 'treated_animals') {
      // For other reports, load immediately
      loadReport();
    }
    // For treated_animals, wait for date filters to be set (handled in separate useEffect)
  }, [reportType]);

  // Auto-load treated_animals report with current month filters
  useEffect(() => {
    if (reportType === 'treated_animals' && dateFrom && dateTo) {
      loadReport();
    }
  }, [reportType, dateFrom, dateTo]);

  // Realtime subscription for animal_departures
  useEffect(() => {
    if (reportType !== 'animal_departures') return;

    // Subscribe to changes in animal_departures table
    const channel = supabase
      .channel('animal_departures_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'animal_departures'
        },
        (payload) => {
          console.log('Animal departure change detected:', payload);
          // Reload the report when any change happens
          loadReport();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportType, dateFrom, dateTo]);

  const loadFilterOptions = async () => {
    try {
      const [animalsRes, productsRes, diseasesRes, usersRes] = await Promise.all([
        fetchAllRows('animals', 'id, tag_no, species', 'tag_no'),
        supabase.from('products').select('id, name').eq('is_active', true).order('name'),
        supabase.from('diseases').select('id, name').order('name'),
        supabase.from('users').select('id, full_name, email').eq('role', 'vet').order('full_name'),
      ]);

      if (animalsRes) setAnimals(animalsRes);
      if (productsRes.data) setProducts(productsRes.data);
      if (diseasesRes.data) setDiseases(diseasesRes.data);
      if (usersRes.data) setUsers(usersRes.data);

      // Load economic groups when animal_departures report is active
      if (reportType === 'animal_departures') {
        await loadEconomicGroups();
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadEconomicGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('economic_groups')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEconomicGroups(data || []);
    } catch (error) {
      console.error('Error fetching economic groups:', error);
    }
  };

  const updateEconomicGroup = async (departureId: string, groupId: string | null) => {
    try {
      console.log('Updating economic group:', { departureId, groupId });
      
      const { data, error } = await supabase
        .from('animal_departures')
        .update({ economic_group_id: groupId, updated_at: new Date().toISOString() })
        .eq('id', departureId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Update successful:', data);
      
      // Reload the report data to show updated group
      await loadReport();
    } catch (error: any) {
      console.error('Error updating economic group:', error);
      alert(`Klaida atnaujinant ekonominę grupę: ${error.message || 'Nežinoma klaida'}`);
    }
  };

  const saveEconomicGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Įveskite grupės pavadinimą');
      return;
    }

    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('economic_groups')
          .update({
            name: newGroupName,
            description: newGroupDescription,
            color: newGroupColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
      } else {
        // Create new group
        const { error } = await supabase
          .from('economic_groups')
          .insert({
            name: newGroupName,
            description: newGroupDescription,
            color: newGroupColor
          });

        if (error) throw error;
      }

      // Refresh groups and close modal
      await loadEconomicGroups();
      setShowGroupModal(false);
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3B82F6');
    } catch (error: any) {
      console.error('Error saving economic group:', error);
      if (error.code === '23505') {
        alert(`Grupė su tokiu pavadinimu "${newGroupName}" jau egzistuoja. Pasirinkite kitą pavadinimą arba redaguokite esamą grupę.`);
      } else {
        alert('Klaida išsaugant ekonominę grupę: ' + (error.message || 'Nežinoma klaida'));
      }
    }
  };

  const deleteEconomicGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Ar tikrai norite ištrinti grupę "${groupName}"?\n\nGyvūnai, priskirti šiai grupei, liks be grupės.`)) {
      return;
    }

    try {
      // Set is_active to false instead of deleting (soft delete)
      const { error } = await supabase
        .from('economic_groups')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) throw error;

      // Refresh groups list
      await loadEconomicGroups();
      alert('Grupė sėkmingai ištrinta');
    } catch (error) {
      console.error('Error deleting economic group:', error);
      alert('Klaida trinant grupę');
    }
  };

  const openGroupModal = (group?: EconomicGroup) => {
    if (group) {
      setEditingGroup(group);
      setNewGroupName(group.name);
      setNewGroupDescription(group.description || '');
      setNewGroupColor(group.color);
    } else {
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3B82F6');
    }
    setShowGroupModal(true);
  };

  const toggleAnimalSelection = (animalId: string) => {
    const newSelection = new Set(selectedAnimals);
    if (newSelection.has(animalId)) {
      newSelection.delete(animalId);
    } else {
      newSelection.add(animalId);
    }
    setSelectedAnimals(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedAnimals.size === data.length) {
      setSelectedAnimals(new Set());
    } else {
      setSelectedAnimals(new Set(data.map((d: any) => d.id)));
    }
  };

  const bulkAssignEconomicGroup = async () => {
    if (!bulkAssignGroupId || selectedAnimals.size === 0) {
      alert('Pasirinkite grupę ir bent vieną gyvūną');
      return;
    }

    try {
      console.log('Assigning group', bulkAssignGroupId, 'to animals:', Array.from(selectedAnimals));
      
      const updates = Array.from(selectedAnimals).map(animalId => 
        supabase
          .from('animal_departures')
          .update({ 
            economic_group_id: bulkAssignGroupId, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', animalId)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Errors during bulk assign:', errors);
        throw new Error(`Failed to update ${errors.length} animals`);
      }

      // Clear selection and reload
      setSelectedAnimals(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignGroupId('');
      await loadReport();
      
      alert(`Sėkmingai priskirta ${selectedAnimals.size} gyvūnų`);
    } catch (error: any) {
      console.error('Error bulk assigning economic group:', error);
      alert('Klaida masiškai priskiriant ekonominę grupę: ' + (error.message || 'Nežinoma klaida'));
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        animalsRes,
        treatmentsRes,
        vaccinationsRes,
        productsRes,
        batchesRes,
        diseasesRes,
        usageRes,
        withdrawalRes,
      ] = await Promise.all([
        fetchAllRows('animals', 'id, active'),
        supabase.from('treatments').select('id, reg_date, outcome, disease_id').gte('reg_date', sixMonthsAgo),
        supabase.from('vaccinations').select('id, vaccination_date').gte('vaccination_date', sixMonthsAgo),
        supabase.from('products').select('id, name, category, is_active'),
        supabase.from('batches').select('id, product_id, expiry_date, received_qty, purchase_price'),
        supabase.from('diseases').select('id, name'),
        supabase.from('usage_items').select('product_id, qty, treatment_id, batch_id'),
        supabase.from('treatments').select('withdrawal_until_meat, withdrawal_until_milk').or(`withdrawal_until_meat.gte.${today},withdrawal_until_milk.gte.${today}`),
      ]);

      const animals = animalsRes || [];
      const treatments = treatmentsRes.data || [];
      const vaccinations = vaccinationsRes.data || [];
      const products = productsRes.data || [];
      const batches = batchesRes.data || [];
      const diseases = diseasesRes.data || [];
      const usage = usageRes.data || [];

      const totalAnimals = animals.length;
      const activeAnimals = animals.filter(a => a.active).length;
      const totalTreatments = treatments.length;
      const totalVaccinations = vaccinations.length;

      // Calculate total value based on on-hand quantity
      const usageByBatch = new Map<string, number>();
      usage.forEach(u => {
        if (u.batch_id) {
          const current = usageByBatch.get(u.batch_id) || 0;
          usageByBatch.set(u.batch_id, current + (parseFloat(u.qty) || 0));
        }
      });

      // Filter out expired batches before calculating stock
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const validBatches = batches.filter(b => {
        if (!b.expiry_date) return true;
        const expiryDate = new Date(b.expiry_date);
        return expiryDate >= todayDate;
      });

      let totalProductValue = 0;
      validBatches.forEach(b => {
        const totalUsed = usageByBatch.get(b.id) || 0;
        const receivedQty = parseFloat(b.received_qty) || 0;
        const onHand = receivedQty - totalUsed;
        if (onHand > 0) {
          const purchasePrice = parseFloat(b.purchase_price) || 0;
          const unitPrice = receivedQty > 0 ? purchasePrice / receivedQty : 0;
          totalProductValue += unitPrice * onHand;
        }
      });

      const stockByProduct = new Map<string, number>();
      validBatches.forEach(b => {
        const current = stockByProduct.get(b.product_id) || 0;
        stockByProduct.set(b.product_id, current + parseFloat(b.received_qty || 0));
      });
      usage.forEach(u => {
        const current = stockByProduct.get(u.product_id) || 0;
        stockByProduct.set(u.product_id, current - parseFloat(u.qty || 0));
      });
      const lowStockProducts = Array.from(stockByProduct.values()).filter(qty => qty < 10).length;

      const expiryThreshold = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiringSoon = batches.filter(b => b.expiry_date && b.expiry_date <= expiryThreshold && b.expiry_date >= today).length;

      const animalsInWithdrawal = withdrawalRes.data?.length || 0;

      const diseaseCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.disease_id) {
          const count = diseaseCount.get(t.disease_id) || 0;
          diseaseCount.set(t.disease_id, count + 1);
        }
      });
      const topDiseases = Array.from(diseaseCount.entries())
        .map(([diseaseId, count]) => ({
          name: diseases.find(d => d.id === diseaseId)?.name || 'Unknown',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const productUsage = new Map<string, number>();
      usage.forEach(u => {
        const count = productUsage.get(u.product_id) || 0;
        productUsage.set(u.product_id, count + parseFloat(u.qty || 0));
      });
      const topProducts = Array.from(productUsage.entries())
        .map(([productId, usage]) => ({
          name: products.find(p => p.id === productId)?.name || 'Unknown',
          usage: Math.round(usage * 10) / 10,
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const treatmentsByMonth = new Map<string, number>();
      treatments.forEach(t => {
        const month = t.reg_date?.substring(0, 7) || '';
        const count = treatmentsByMonth.get(month) || 0;
        treatmentsByMonth.set(month, count + 1);
      });
      const treatmentsMonthly = Array.from(treatmentsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const vaccinationsByMonth = new Map<string, number>();
      vaccinations.forEach(v => {
        const month = v.vaccination_date?.substring(0, 7) || '';
        const count = vaccinationsByMonth.get(month) || 0;
        vaccinationsByMonth.set(month, count + 1);
      });
      const vaccinationsMonthly = Array.from(vaccinationsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const outcomeCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.outcome) {
          const count = outcomeCount.get(t.outcome) || 0;
          outcomeCount.set(t.outcome, count + 1);
        }
      });
      const outcomeStats = Array.from(outcomeCount.entries())
        .map(([outcome, count]) => ({ outcome, count }));

      const categoryValue = new Map<string, number>();
      validBatches.forEach(b => {
        const product = products.find(p => p.id === b.product_id);
        if (product) {
          const totalUsed = usageByBatch.get(b.id) || 0;
          const receivedQty = parseFloat(b.received_qty) || 0;
          const onHand = receivedQty - totalUsed;
          if (onHand > 0) {
            const purchasePrice = parseFloat(b.purchase_price) || 0;
            const unitPrice = receivedQty > 0 ? purchasePrice / receivedQty : 0;
            const value = unitPrice * onHand;
            const current = categoryValue.get(product.category) || 0;
            categoryValue.set(product.category, current + value);
          }
        }
      });
      const inventoryByCategory = Array.from(categoryValue.entries())
        .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      setAnalytics({
        totalAnimals,
        activeAnimals,
        totalTreatments,
        totalVaccinations,
        totalProductValue: Math.round(totalProductValue * 100) / 100,
        lowStockProducts,
        expiringSoon,
        animalsInWithdrawal,
        topDiseases,
        topProducts,
        treatmentsByMonth: treatmentsMonthly,
        vaccinationsByMonth: vaccinationsMonthly,
        outcomeStats,
        inventoryByCategory,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let result: any[] = [];

      switch (reportType) {
        case 'drug_journal': {
          let query = supabase.from('vw_vet_drug_journal').select('*');
          if (dateFrom) query = query.gte('receipt_date', dateFrom);
          if (dateTo) query = query.lte('receipt_date', dateTo);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          if (filterInvoice) {
            result = result.filter(r => r.invoice_number?.toLowerCase().includes(filterInvoice.toLowerCase()));
          }
          break;
        }

        case 'treated_animals': {
          // Build filters array for fetchAllRows
          const filters: { column: string; value: any; operator?: string }[] = [];
          
          if (dateFrom) filters.push({ column: 'registration_date', value: dateFrom, operator: 'gte' });
          if (dateTo) filters.push({ column: 'registration_date', value: dateTo, operator: 'lte' });
          if (filterAnimal) filters.push({ column: 'animal_id', value: filterAnimal });
          if (filterDisease) filters.push({ column: 'disease_id', value: filterDisease });

          // Use fetchAllRows to handle pagination automatically
          result = await fetchAllRows('vw_treated_animals_detailed', '*', 'registration_date', filters);

          // Apply additional filters that can't be done in the query
          if (filterProduct) {
            result = result.filter(r => {
              const product = products.find(p => p.id === filterProduct);
              return product && r.medications_used?.toLowerCase().includes(product.name.toLowerCase());
            });
          }
          if (filterVet) {
            result = result.filter(r => r.veterinarian?.toLowerCase().includes(filterVet.toLowerCase()));
          }
          
          // Sort by registration_date (descending - newest first) and created_at
          result.sort((a, b) => {
            const dateCompare = b.registration_date.localeCompare(a.registration_date); // Reversed for descending
            if (dateCompare !== 0) return dateCompare;
            return b.created_at.localeCompare(a.created_at); // Reversed for descending
          });
          
          break;
        }


        case 'biocide_journal': {
          let query = supabase.from('vw_biocide_journal').select('*');
          if (dateFrom) query = query.gte('use_date', dateFrom);
          if (dateTo) query = query.lte('use_date', dateTo);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          break;
        }

        case 'insemination_journal': {
          let query = supabase
            .from('insemination_records')
            .select(`
              *,
              animal:animals(tag_no, species),
              sperm_product:insemination_products!insemination_records_sperm_product_id_fkey(name, unit),
              glove_product:insemination_products!insemination_records_glove_product_id_fkey(name, unit)
            `)
            .order('insemination_date', { ascending: false });

          if (dateFrom) query = query.gte('insemination_date', dateFrom);
          if (dateTo) query = query.lte('insemination_date', dateTo);
          if (filterAnimal) query = query.eq('animal_id', filterAnimal);

          const { data, error } = await query;
          if (error) throw error;
          result = data || [];
          break;
        }

        case 'animal_departures': {
          let query = supabase.from('vw_animal_departures_with_conflicts').select('*');
          
          if (dateFrom) query = query.gte('departure_date', dateFrom);
          if (dateTo) query = query.lte('departure_date', dateTo);

          const { data, error } = await query.order('departure_date', { ascending: false });
          if (error) throw error;
          result = data || [];
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'medical_waste': {
          let query = supabase.from('vw_medical_waste').select('*');
          if (dateFrom) query = query.gte('record_date', dateFrom);
          if (dateTo) query = query.lte('record_date', dateTo);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'hoof_journal': {
          let query = supabase
            .from('hoof_records')
            .select(`
              *,
              animal:animals(tag_no, species),
              condition:hoof_condition_codes(code, name_lt, name_en, severity_default),
              product:products(name),
              batch:batches(lot, expiry_date)
            `)
            .order('examination_date', { ascending: false });

          if (dateFrom) query = query.gte('examination_date', dateFrom);
          if (dateTo) query = query.lte('examination_date', dateTo);
          if (filterAnimal) query = query.eq('animal_id', filterAnimal);
          if (filterVet) query = query.ilike('technician_name', `%${filterVet}%`);

          const { data, error } = await query;
          if (error) throw error;
          result = data || [];
          break;
        }

        default:
          return;
      }

      setData(result);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    // For treated_animals, reset to current month instead of clearing
    if (reportType === 'treated_animals') {
      const currentMonth = getCurrentMonthDates();
      setDateFrom(currentMonth.from);
      setDateTo(currentMonth.to);
    } else {
      setDateFrom('');
      setDateTo('');
    }
    setFilterAnimal('');
    setFilterProduct('');
    setFilterDisease('');
    setFilterInvoice('');
    setFilterBatch('');
    setFilterVet('');
  };

  const handleExport = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (filterAnimal) count++;
    if (filterProduct) count++;
    if (filterDisease) count++;
    if (filterInvoice) count++;
    if (filterBatch) count++;
    if (filterVet) count++;
    return count;
  };

  const renderAnalytics = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 font-medium">Gyvūnai</p>
                <span className="text-3xl font-bold">{analytics.totalAnimals}</span>
                <p className="text-xs text-blue-100 mt-1">Aktyvūs: {analytics.activeAnimals}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100 font-medium">Gydymai</p>
                <span className="text-3xl font-bold">{analytics.totalTreatments}</span>
                <p className="text-xs text-emerald-100 mt-1">Per 6 mėn.</p>
              </div>
              <Syringe className="w-12 h-12 text-emerald-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-100 font-medium">Atsargų vertė</p>
                <span className="text-3xl font-bold">€{analytics.totalProductValue.toLocaleString()}</span>
                <p className="text-xs text-amber-100 mt-1">Bendrai</p>
              </div>
              <Package className="w-12 h-12 text-amber-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-100 font-medium">Įspėjimai</p>
                <span className="text-3xl font-bold">{analytics.lowStockProducts + analytics.expiringSoon}</span>
                <p className="text-xs text-red-100 mt-1">Reikia dėmesio</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-200 opacity-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Dažniausios ligos</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topDiseases.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topDiseases.map((disease, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{disease.name}</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{disease.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Populiariausi produktai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{product.name}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{product.usage}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Gydymai per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.treatmentsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.treatmentsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-8 rounded-full transition-all flex items-center justify-end pr-3"
                          style={{ width: `${(item.count / Math.max(...analytics.treatmentsByMonth.map(t => t.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-gray-900">Vakcinacijos per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.vaccinationsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.vaccinationsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-400 to-sky-500 h-8 rounded-full transition-all flex items-center justify-end pr-3"
                          style={{ width: `${(item.count / Math.max(...analytics.vaccinationsByMonth.map(v => v.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">Gydymo rezultatai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.outcomeStats.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.outcomeStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all">
                      <span className={`text-sm font-semibold capitalize ${
                        stat.outcome === 'recovered' ? 'text-green-600' :
                        stat.outcome === 'ongoing' ? 'text-amber-600' :
                        stat.outcome === 'died' ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {stat.outcome === 'recovered' ? '✓ Pasveiko' :
                         stat.outcome === 'ongoing' ? '⟳ Tęsiasi' :
                         stat.outcome === 'died' ? '✕ Žuvo' : stat.outcome}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">{stat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-bold text-gray-900">Atsargos pagal kategoriją</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.inventoryByCategory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.inventoryByCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all">
                      <span className="text-sm font-semibold text-gray-700 capitalize">
                        {cat.category}
                      </span>
                      <span className="text-xl font-bold text-orange-600">€{cat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHoofJournal = () => {
    const stats = {
      totalRecords: data.length,
      totalTreated: data.filter((r: any) => r.was_treated).length,
      totalTrimmed: data.filter((r: any) => r.was_trimmed).length,
      withConditions: data.filter((r: any) => r.condition_code && r.condition_code !== 'OK').length,
      requireFollowup: data.filter((r: any) => r.requires_followup && !r.followup_completed).length,
    };

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{stats.totalRecords}</div>
            <div className="text-sm font-medium text-blue-700">Iš viso apžiūrų</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
            <div className="text-3xl font-bold text-green-900">{stats.totalTreated}</div>
            <div className="text-sm font-medium text-green-700">Gydyta</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
            <div className="text-3xl font-bold text-purple-900">{stats.totalTrimmed}</div>
            <div className="text-sm font-medium text-purple-700">Kirpta</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-200">
            <div className="text-3xl font-bold text-red-900">{stats.withConditions}</div>
            <div className="text-sm font-medium text-red-700">Su pažeidimais</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
            <div className="text-3xl font-bold text-orange-900">{stats.requireFollowup}</div>
            <div className="text-sm font-medium text-orange-700">Reikia kontrolės</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvulys</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Koja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nagas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zona</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Būklė</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sunkumas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kirpta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydyta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preparatas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technikas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((record: any, idx: number) => (
                  <tr key={record.id || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{record.examination_date}</td>
                    <td className="px-4 py-3 text-sm font-medium">{record.animal?.tag_no || record.animal_id}</td>
                    <td className="px-4 py-3 text-sm">{record.leg}</td>
                    <td className="px-4 py-3 text-sm">{record.claw === 'inner' ? 'Vidinis' : 'Išorinis'}</td>
                    <td className="px-4 py-3 text-sm">
                      {record.zone !== null && record.zone !== undefined ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Z{record.zone}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{record.condition?.name_lt || record.condition_code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${record.severity === 0 ? 'bg-green-100 text-green-800' : ''}
                        ${record.severity === 1 ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${record.severity === 2 ? 'bg-orange-100 text-orange-800' : ''}
                        ${record.severity === 3 ? 'bg-red-100 text-red-800' : ''}
                        ${record.severity === 4 ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {record.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{record.was_trimmed ? '✓' : ''}</td>
                    <td className="px-4 py-3 text-sm text-center">{record.was_treated ? '✓' : ''}</td>
                    <td className="px-4 py-3 text-sm">{record.product?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{record.technician_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">Nėra duomenų šiai ataskaitai</p>
          <p className="text-sm text-gray-400 mt-2">Pabandykite pakeisti filtrus arba datos intervalą</p>
        </div>
      );
    }

    switch (reportType) {
      case 'treated_animals':
        return <TreatedAnimalsReport data={data} />;
      case 'medical_waste':
        return <MedicalWasteReport data={data} />;
      case 'drug_journal':
        return <DrugJournalReport data={data} />;
      case 'biocide_journal':
        return <BiocideJournalReport data={data} />;
      case 'insemination_journal':
        return <InseminationJournalReport data={data} />;
      case 'animal_departures':
        return renderAnimalDepartures();
      case 'hoof_journal':
        return renderHoofJournal();
      default:
        return null;
    }
  };

  const renderAnimalDepartures = () => {
    // Filter data by animal ID search
    const filteredData = data.filter(d => 
      !filterAnimalId || d.animal_number.toLowerCase().includes(filterAnimalId.toLowerCase())
    );

    const stats = {
      total: filteredData.length,
      conflicts: filteredData.filter(d => d.has_withdrawal_conflict).length,
      notFound: filteredData.filter(d => !d.animal_id).length,
      clean: filteredData.filter(d => d.animal_id && !d.has_withdrawal_conflict).length,
    };

    const conflictRate = stats.total > 0 ? ((stats.conflicts / stats.total) * 100).toFixed(1) : '0';

    return (
      <div className="space-y-4">
        {/* Search Filter */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ieškoti pagal gyvūno numerį
          </label>
          <input
            type="text"
            value={filterAnimalId}
            onChange={(e) => setFilterAnimalId(e.target.value)}
            placeholder="Įveskite gyvūno numerį (pvz., LT000008945497)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterAnimalId && (
            <p className="text-sm text-gray-600 mt-2">
              Rasta: <strong>{filteredData.length}</strong> iš {data.length} gyvūnų
            </p>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Viso</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-gray-600">Konfliktai</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.conflicts}</p>
          </div>

          <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600">Be konfliktų</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.clean}</p>
          </div>

          <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Nerasta DB</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.notFound}</p>
          </div>

          <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Konfliktų %</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{conflictRate}%</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-gray-700" />
                <h3 className="text-lg font-bold text-gray-900">Išvežtų Gyvūnų Sąrašas</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 font-medium">
                  Rodoma: <strong>{data.length}</strong> įrašų
                </span>
                {selectedAnimals.size > 0 && (
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Priskirti grupę ({selectedAnimals.size})
                  </button>
                )}
                <button
                  onClick={() => openGroupModal()}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Valdyti grupes
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedAnimals.size === data.length && data.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Statusas
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Gyvūno Nr.
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Lytis / Gimimo Data
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Išvežimo Data
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ekonominė grupė
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Paskutinis Gydymas
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Pieno Karencija
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Mėsos Karencija
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Vieta / Bandos Nr.
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Konflikto Aprašymas
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Įvedėjas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((departure: any) => (
                  <tr
                    key={departure.id}
                    className={
                      departure.has_withdrawal_conflict
                        ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
                        : !departure.animal_id
                        ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500'
                        : selectedAnimals.has(departure.id)
                        ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAnimals.has(departure.id)}
                        onChange={() => toggleAnimalSelection(departure.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {departure.has_withdrawal_conflict ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-red-200 text-red-900 border border-red-400">
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          KONFLIKTAS
                        </span>
                      ) : !departure.animal_id ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-200 text-yellow-900 border border-yellow-400">
                          <Info className="w-3.5 h-3.5 mr-1.5" />
                          NERASTA
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-green-200 text-green-900 border border-green-400">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{departure.animal_number}</div>
                      {departure.vet_reason_code && (
                        <div className="text-xs text-gray-500">Vet. priež.: {departure.vet_reason_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{departure.gender || '-'}</div>
                      {departure.birth_date && (
                        <div className="text-xs text-gray-500">{new Date(departure.birth_date).toLocaleDateString('lt-LT')}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {new Date(departure.departure_date).toLocaleDateString('lt-LT')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(departure.departure_date).toLocaleDateString('lt-LT', { weekday: 'short' })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <select
                        value={departure.economic_group_id || ''}
                        onChange={(e) => updateEconomicGroup(departure.id, e.target.value || null)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1 w-full"
                      >
                        <option value="">Nepriskirta</option>
                        {economicGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      {departure.economic_group_name && (
                        <div>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: departure.economic_group_color }}
                          >
                            {departure.economic_group_name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {departure.last_treatment_date ? (
                        <div>
                          <div className="text-gray-900 font-medium">
                            {new Date(departure.last_treatment_date).toLocaleDateString('lt-LT')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Prieš {Math.floor((new Date(departure.departure_date).getTime() - new Date(departure.last_treatment_date).getTime()) / (1000 * 60 * 60 * 24))} d.
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Nėra duomenų</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {departure.last_withdrawal_milk ? (
                        <div>
                          <div className={`font-medium ${departure.milk_conflict_days > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                            {new Date(departure.last_withdrawal_milk).toLocaleDateString('lt-LT')}
                          </div>
                          {departure.milk_conflict_days > 0 && (
                            <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">
                              ⚠ +{departure.milk_conflict_days} d.
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {departure.last_withdrawal_meat ? (
                        <div>
                          <div className={`font-medium ${departure.meat_conflict_days > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                            {new Date(departure.last_withdrawal_meat).toLocaleDateString('lt-LT')}
                          </div>
                          {departure.meat_conflict_days > 0 && (
                            <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">
                              ⚠ +{departure.meat_conflict_days} d.
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="max-w-xs">
                        <div className="text-gray-900 font-medium truncate" title={departure.destination_name || ''}>
                          {departure.destination_name || '-'}
                        </div>
                        {departure.destination_herd_number && (
                          <div className="text-xs text-gray-500">Bandos: {departure.destination_herd_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="max-w-md">
                        {departure.has_withdrawal_conflict ? (
                          <div className="text-red-700 font-medium leading-relaxed">
                            {departure.conflict_details}
                          </div>
                        ) : (
                          <div className="text-gray-600">
                            {departure.conflict_details || '-'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900 font-medium">{departure.entered_by || '-'}</div>
                      {departure.created_at && (
                        <div className="text-xs text-gray-500">
                          {new Date(departure.created_at).toLocaleDateString('lt-LT')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Economic Groups Management Modal */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingGroup ? 'Redaguoti ekonominę grupę' : 'Ekonominių grupių valdymas'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowGroupModal(false);
                      setEditingGroup(null);
                      setNewGroupName('');
                      setNewGroupDescription('');
                      setNewGroupColor('#3B82F6');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Create/Edit Group Form */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {editingGroup ? 'Redaguoti grupę' : 'Sukurti naują grupę'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pavadinimas *
                      </label>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Pvz., Pelningos karvės"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aprašymas
                      </label>
                      <textarea
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Pasirenkamas aprašymas..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Spalva
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={newGroupColor}
                          onChange={(e) => setNewGroupColor(e.target.value)}
                          className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <span className="text-sm text-gray-600">{newGroupColor}</span>
                        <span
                          className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: newGroupColor }}
                        >
                          Pavyzdys
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEconomicGroup}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {editingGroup ? 'Išsaugoti' : 'Sukurti'}
                      </button>
                      {editingGroup && (
                        <button
                          onClick={() => {
                            setEditingGroup(null);
                            setNewGroupName('');
                            setNewGroupDescription('');
                            setNewGroupColor('#3B82F6');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Atšaukti
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Existing Groups List */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Esamos grupės</h4>
                  <div className="space-y-2">
                    {economicGroups.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nėra sukurtų ekonominių grupių
                      </p>
                    ) : (
                      economicGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white"
                              style={{ backgroundColor: group.color }}
                            >
                              {group.name}
                            </span>
                            {group.description && (
                              <span className="text-sm text-gray-600">{group.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openGroupModal(group)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Redaguoti"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEconomicGroup(group.id, group.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Ištrinti"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assignment Modal */}
        {showBulkAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Masiškai priskirti ekonominę grupę
                </h3>
                <button
                  onClick={() => {
                    setShowBulkAssignModal(false);
                    setBulkAssignGroupId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Pasirinkta gyvūnų: <strong>{selectedAnimals.size}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pasirinkite ekonominę grupę *
                  </label>
                  <select
                    value={bulkAssignGroupId}
                    onChange={(e) => setBulkAssignGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pasirinkite grupę --</option>
                    {economicGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {bulkAssignGroupId && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {economicGroups.find(g => g.id === bulkAssignGroupId) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Pasirinkta grupė:</span>
                        <span
                          className="inline-flex items-center px-3 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: economicGroups.find(g => g.id === bulkAssignGroupId)?.color }}
                        >
                          {economicGroups.find(g => g.id === bulkAssignGroupId)?.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={bulkAssignEconomicGroup}
                    disabled={!bulkAssignGroupId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Priskirti grupę
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkAssignModal(false);
                      setBulkAssignGroupId('');
                    }}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Atšaukti
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const reportTypeInfo = {
    analytics: { name: 'Analitika', icon: PieChart, color: 'blue' },
    invoices: { name: 'Sąskaitų Priskirimas', icon: FileText, color: 'indigo' },
    drug_journal: { name: 'Veterinarinių vaistų žurnalas', icon: Syringe, color: 'emerald' },
    treated_animals: { name: 'Gydomų gyvūnų registras', icon: Activity, color: 'teal' },
    biocide_journal: { name: 'Biocidų žurnalas', icon: Package, color: 'purple' },
    insemination_journal: { name: 'Sėklinimo žurnalas', icon: Heart, color: 'rose' },
    medical_waste: { name: 'Medicininių atliekų žurnalas', icon: AlertTriangle, color: 'orange' },
    animal_departures: { name: 'Išvežti Gyvūnai', icon: Truck, color: 'red' },
    hoof_journal: { name: 'Nagų žurnalas', icon: Activity, color: 'amber' },
  };

  const currentReport = reportTypeInfo[reportType];
  const CurrentIcon = currentReport.icon;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`bg-${currentReport.color}-50 p-3 rounded-xl shadow-sm`}>
              <CurrentIcon className={`w-7 h-7 text-${currentReport.color}-600`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ataskaitos ir analitika</h2>
              <p className="text-sm text-gray-600">Peržiūrėkite duomenis ir generuokite ataskaitas</p>
            </div>
          </div>

          {reportType !== 'analytics' && data.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Spausdinti
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Eksportuoti
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(reportTypeInfo).map(([key, info]) => {
            const Icon = info.icon;
            const isActive = reportType === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setReportType(key as ReportType);
                  // For treated_animals, set current month dates and clear other filters
                  if (key === 'treated_animals') {
                    const currentMonth = getCurrentMonthDates();
                    setDateFrom(currentMonth.from);
                    setDateTo(currentMonth.to);
                    setFilterAnimal('');
                    setFilterProduct('');
                    setFilterDisease('');
                    setFilterVet('');
                  } else {
                    clearFilters();
                  }
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? `border-${info.color}-500 bg-${info.color}-50 shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? `bg-${info.color}-100` : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? `text-${info.color}-600` : 'text-gray-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${isActive ? `text-${info.color}-900` : 'text-gray-700'}`}>
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>

        {reportType !== 'analytics' && (
          <div className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-bold text-gray-900">Filtrai</h3>
                {getActiveFilterCount() > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {getActiveFilterCount()}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                {showFilters ? 'Slėpti' : 'Rodyti'}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Data nuo</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Data iki</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {(reportType === 'treated_animals' || reportType === 'insemination_journal' || reportType === 'hoof_journal') && (
                    <SearchableSelect
                      label="Gyvūnas"
                      placeholder="Pasirinkite gyvūną"
                      emptyLabel="Visi gyvūnai"
                      value={filterAnimal}
                      onChange={setFilterAnimal}
                      options={animals.map(animal => ({
                        value: animal.id,
                        label: `${animal.tag_no} - ${animal.species}`
                      }))}
                    />
                  )}

                  {(reportType === 'treated_animals' || reportType === 'drug_journal' || reportType === 'biocide_journal') && (
                    <SearchableSelect
                      label="Produktas"
                      placeholder="Pasirinkite produktą"
                      emptyLabel="Visi produktai"
                      value={filterProduct}
                      onChange={setFilterProduct}
                      options={products.map(product => ({
                        value: product.id,
                        label: product.name
                      }))}
                    />
                  )}

                  {reportType === 'treated_animals' && (
                    <SearchableSelect
                      label="Liga"
                      placeholder="Pasirinkite ligą"
                      emptyLabel="Visos ligos"
                      value={filterDisease}
                      onChange={setFilterDisease}
                      options={diseases.map(disease => ({
                        value: disease.id,
                        label: disease.name
                      }))}
                    />
                  )}

                  {(reportType === 'drug_journal' || reportType === 'biocide_journal') && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Serijos nr.</label>
                      <input
                        type="text"
                        value={filterBatch}
                        onChange={(e) => setFilterBatch(e.target.value)}
                        placeholder="Įveskite serijos numerį"
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  {reportType === 'drug_journal' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Sąskaitos nr.</label>
                      <input
                        type="text"
                        value={filterInvoice}
                        onChange={(e) => setFilterInvoice(e.target.value)}
                        placeholder="Įveskite sąskaitos numerį"
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  {(reportType === 'treated_animals' || reportType === 'hoof_journal') && (
                    <div>
                      <SearchableSelect
                        label={reportType === 'hoof_journal' ? 'Technikas' : 'Veterinaras'}
                        options={users.map(user => ({ value: user.full_name, label: user.full_name }))}
                        value={filterVet}
                        onChange={(value) => setFilterVet(value)}
                        placeholder={reportType === 'hoof_journal' ? 'Pasirinkite techniką...' : 'Pasirinkite veterinarą...'}
                        emptyLabel={reportType === 'hoof_journal' ? 'Visi technikai' : 'Visi veterinarai'}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={loadReport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generuoti ataskaitą
                  </button>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Išvalyti
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {reportType === 'analytics' ? renderAnalytics() : reportType === 'invoices' ? <InvoiceViewer /> : renderReport()}
      </div>
    </div>
  );
}
