import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Animal,
  HoofRecord,
  HoofConditionCode,
  HoofLeg,
  HoofClaw,
  Product,
  Batch,
  Unit
} from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { HoofInterfaceNew } from './HoofInterfaceNew';
import { SearchableSelect } from './SearchableSelect';
import {
  Activity,
  Plus,
  Save,
  X,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  Box
} from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { fetchAllRows, formatAnimalDisplay, sortByLithuanian } from '../lib/helpers';
import { showNotification } from './NotificationToast';

interface ExtendedHoofRecord extends HoofRecord {
  zone?: number;
}

interface ClawExamination {
  leg: HoofLeg;
  claw: HoofClaw;
  zone?: number;
  condition_code: string;
  severity: number;
  was_trimmed: boolean;
  was_treated: boolean;
  treatment_product_id?: string;
  treatment_batch_id?: string;
  treatment_quantity?: number;
  treatment_unit?: Unit;
  treatment_notes?: string;
  bandage_applied: boolean;
  requires_followup: boolean;
  followup_date?: string;
  notes?: string;
}

export function Hoofs3D() {
  const { user, logAction } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalCollarNumbers, setAnimalCollarNumbers] = useState<Map<string, number>>(new Map());
  const [conditions, setConditions] = useState<HoofConditionCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [hoofRecords, setHoofRecords] = useState<ExtendedHoofRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExaminationForm, setShowExaminationForm] = useState(false);
  const [use3DView, setUse3DView] = useState(true);

  // Workflow stages: 'select_animal' | 'choose_action' | 'examination'
  const [workflowStage, setWorkflowStage] = useState<'select_animal' | 'choose_action' | 'examination'>('select_animal');
  const [previousHoofVisits, setPreviousHoofVisits] = useState<Array<{ date: string; count: number }>>([]);

  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [searchEarTag, setSearchEarTag] = useState<string>('');
  const [searchCollarNo, setSearchCollarNo] = useState<string>('');
  const [examinationDate, setExaminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState(user?.username || '');
  const [generalNotes, setGeneralNotes] = useState('');

  const [selectedLeg, setSelectedLeg] = useState<HoofLeg | null>(null);
  const [selectedClaw, setSelectedClaw] = useState<HoofClaw | null>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedZones, setSelectedZones] = useState<Array<{ zone: number; claw: HoofClaw }>>([]);
  const [currentExaminations, setCurrentExaminations] = useState<ClawExamination[]>([]);

  const [showClawModal, setShowClawModal] = useState(false);
  const [showMultiZoneModal, setShowMultiZoneModal] = useState(false);
  const [clawFormData, setClawFormData] = useState<Partial<ClawExamination>>({
    condition_code: 'OK',
    severity: 0,
    was_trimmed: false,
    was_treated: false,
    bandage_applied: false,
    requires_followup: false
  });
  
  // Multi-zone product tracking
  interface ProductUsage {
    product_id: string;
    batch_id: string;
    quantity: number;
    unit: Unit;
  }
  const [multiZoneProducts, setMultiZoneProducts] = useState<ProductUsage[]>([]);
  // Track all products from multi-zone treatments for stock deduction
  const [pendingMultiZoneProductDeductions, setPendingMultiZoneProductDeductions] = useState<ProductUsage[]>([]);

  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSubscription({
    table: 'hoof_records',
    onInsert: useCallback(() => {
      loadData();
    }, []),
    onUpdate: useCallback(() => {
      loadData();
    }, []),
    onDelete: useCallback(() => {
      loadData();
    }, []),
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const [animalsData, conditionsRes, productsRes, batchesRes, usersRes, recordsData, collarRes] = await Promise.all([
        fetchAllRows<Animal>('animals'),
        supabase.from('hoof_condition_codes').select('*').eq('is_active', true).order('name_lt'),
        // Only load hoof_care category products for nagos
        supabase.from('products').select('*').eq('is_active', true).eq('category', 'hoof_care').order('name'),
        supabase.from('batches').select('*').order('expiry_date', { ascending: false }),
        supabase.from('users').select('id, full_name, email').eq('role', 'vet').order('full_name'),
        fetchAllRows<ExtendedHoofRecord>('hoof_records'),
        supabase.from('vw_animal_latest_collar').select('*')
      ]);

      if (conditionsRes.error) console.error('❌ Condition codes error:', conditionsRes.error);
      if (productsRes.error) console.error('❌ Products error:', productsRes.error);
      if (batchesRes.error) console.error('❌ Batches error:', batchesRes.error);
      if (usersRes.error) console.error('❌ Users error:', usersRes.error);
      if (collarRes.error) console.error('❌ Collar data error:', collarRes.error);

      setAnimals(animalsData);
      setConditions(conditionsRes.data || []);
      setProducts(productsRes.data || []);
      setBatches(batchesRes.data || []);
      setUsers(usersRes.data || []);
      setHoofRecords(recordsData);

      console.log('📊 Data loaded:', {
        animals: animalsData.length,
        conditions: conditionsRes.data?.length || 0,
        products: productsRes.data?.length || 0,
        batches: batchesRes.data?.length || 0,
        users: usersRes.data?.length || 0,
        records: recordsData.length
      });

      const collarMap = new Map<string, number>();
      (collarRes.data || []).forEach((row: any) => {
        collarMap.set(row.animal_id, row.collar_no);
      });
      setAnimalCollarNumbers(collarMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLegSelect = (leg: HoofLeg) => {
    if (leg === selectedLeg) {
      // If clicking the same leg, reset to cow view
      setSelectedLeg(null);
      setSelectedClaw(null);
      setSelectedZone(null);
    } else {
      setSelectedLeg(leg);
      setSelectedClaw(null);
      setSelectedZone(null);
    }
  };

  const handleClawSelect = (claw: HoofClaw) => {
    if (claw === selectedClaw) {
      // If clicking the same claw, go back to leg selection
      setSelectedClaw(null);
      setSelectedZone(null);
    } else {
      setSelectedClaw(claw);
      setSelectedZone(null);
    }
  };

  const handleZoneSelect = (zone: number, clawOverride?: HoofClaw) => {
    // Handle deselection
    if (zone === -1) {
      setSelectedZone(null);
      return;
    }

    setSelectedZone(zone);
    
    // Use clawOverride if provided, otherwise fall back to selectedClaw
    const clawToUse = clawOverride || selectedClaw;
    
    if (!selectedLeg || !clawToUse) return;

    // Add zone to selected zones list (multi-select mode)
    const zoneKey = `${zone}-${clawToUse}`;
    const existingIndex = selectedZones.findIndex(
      z => z.zone === zone && z.claw === clawToUse
    );
    
    if (existingIndex >= 0) {
      // Remove if already selected (toggle)
      setSelectedZones(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add to selection
      setSelectedZones(prev => [...prev, { zone, claw: clawToUse }]);
    }
  };

  const saveClawExamination = () => {
    if (!selectedLeg || !selectedClaw) return;

    const examination: ClawExamination = {
      leg: selectedLeg,
      claw: selectedClaw,
      zone: selectedZone || undefined,
      condition_code: clawFormData.condition_code || 'OK',
      severity: clawFormData.severity || 0,
      was_trimmed: clawFormData.was_trimmed || false,
      was_treated: clawFormData.was_treated || false,
      treatment_product_id: clawFormData.treatment_product_id,
      treatment_batch_id: clawFormData.treatment_batch_id,
      treatment_quantity: clawFormData.treatment_quantity,
      treatment_unit: clawFormData.treatment_unit,
      treatment_notes: clawFormData.treatment_notes,
      bandage_applied: clawFormData.bandage_applied || false,
      requires_followup: clawFormData.requires_followup || false,
      followup_date: clawFormData.followup_date,
      notes: clawFormData.notes
    };

    setCurrentExaminations(prev => {
      const filtered = prev.filter(
        e => !(e.leg === selectedLeg && e.claw === selectedClaw && e.zone === selectedZone)
      );
      return [...filtered, examination];
    });

    setShowClawModal(false);
    
    // Reset to cow view so user can easily select another leg/claw/zone
    setSelectedLeg(null);
    setSelectedClaw(null);
    setSelectedZone(null);
    
    showNotification(`Pridėta: ${selectedLeg} - ${selectedClaw === 'inner' ? 'Vidinis' : 'Išorinis'}${selectedZone !== null ? ` - Zona ${selectedZone}` : ''}`, 'success');
  };

  const saveMultiZoneExaminations = () => {
    if (!selectedLeg || selectedZones.length === 0) return;
    
    // Create examinations for all selected zones
    const newExaminations: ClawExamination[] = selectedZones.map(z => ({
      leg: selectedLeg,
      claw: z.claw,
      zone: z.zone,
      condition_code: clawFormData.condition_code || 'OK',
      severity: clawFormData.severity || 0,
      was_trimmed: clawFormData.was_trimmed || false,
      was_treated: multiZoneProducts.length > 0,
      // DON'T store product data in individual zone records for multi-zone treatments
      // This prevents double-counting stock deduction
      treatment_product_id: undefined,
      treatment_batch_id: undefined,
      treatment_quantity: undefined,
      treatment_unit: undefined,
      // Store all products in notes for reference
      treatment_notes: multiZoneProducts.length > 0
        ? `Naudoti produktai (${selectedZones.length} zonos): ${multiZoneProducts.map((p, i) => {
            const prod = products.find(pr => pr.id === p.product_id);
            return `${i+1}. ${prod?.name || 'Nežinomas'} - ${p.quantity} ${p.unit}`;
          }).join('; ')}`
        : undefined,
      bandage_applied: clawFormData.bandage_applied || false,
      requires_followup: clawFormData.requires_followup || false,
      followup_date: clawFormData.followup_date,
      notes: clawFormData.notes
    }));

    // Add ALL products from this multi-zone treatment to pending deductions
    // The quantities entered are TOTAL amounts used, not per-zone
    // These will be deducted ONCE during saveAllExaminations
    if (multiZoneProducts.length > 0) {
      setPendingMultiZoneProductDeductions(prev => [...prev, ...multiZoneProducts]);
    }

    setCurrentExaminations(prev => [...prev, ...newExaminations]);
    setShowMultiZoneModal(false);
    setSelectedZones([]);
    setMultiZoneProducts([]);
    setSelectedLeg(null);
    setSelectedClaw(null);
    setSelectedZone(null);
    
    showNotification(`Pridėta ${selectedZones.length} zonų apžiūrų su ${multiZoneProducts.length} produktais`, 'success');
  };

  // Filter animals based on search terms (like in Animals tab)
  const getFilteredAnimals = () => {
    return animals.filter(animal => {
      let matchesEar = true;
      let matchesCollar = true;

      // Filter by ear tag
      if (searchEarTag.trim()) {
        const searchLower = searchEarTag.toLowerCase().trim();
        const tagNo = animal.tag_no?.toLowerCase() || '';
        
        // Search in tag number (including last 5 digits reversed)
        const last5Digits = tagNo.slice(-5);
        const reversed = last5Digits.split('').reverse().join('');
        
        matchesEar = tagNo.includes(searchLower) || reversed.includes(searchLower);
      }

      // Filter by collar number
      if (searchCollarNo.trim()) {
        const collarTrimmed = searchCollarNo.trim();
        const collarNo = animalCollarNumbers.get(animal.id);
        matchesCollar = collarNo?.toString() === collarTrimmed;
      }

      return matchesEar && matchesCollar;
    });
  };

  // Select animal from filtered list
  const selectAnimal = async (animal: Animal) => {
    setSelectedAnimalId(animal.id);
    await loadPreviousVisits(animal.id);
    setWorkflowStage('choose_action');
  };

  // Load previous hoof visits for selected animal
  const loadPreviousVisits = async (animalId: string) => {
    try {
      const { data, error } = await supabase
        .from('hoof_records')
        .select('examination_date')
        .eq('animal_id', animalId)
        .order('examination_date', { ascending: false });

      if (error) throw error;

      if (data) {
        // Group by date and count
        const visitsByDate = new Map<string, number>();
        data.forEach(record => {
          const count = visitsByDate.get(record.examination_date) || 0;
          visitsByDate.set(record.examination_date, count + 1);
        });
        
        const visits = Array.from(visitsByDate.entries()).map(([date, count]) => ({
          date,
          count
        }));
        
        setPreviousHoofVisits(visits);
      }
    } catch (error) {
      console.error('Error loading previous visits:', error);
      setPreviousHoofVisits([]);
    }
  };

  // Save healthy examination (no damage)
  const saveHealthyExamination = async () => {
    if (!selectedAnimalId) {
      showNotification('Pasirinkite gyvulį', 'error');
      return;
    }

    try {
      // Create a single record indicating healthy examination
      const { error } = await supabase
        .from('hoof_records')
        .insert({
          animal_id: selectedAnimalId,
          examination_date: examinationDate,
          leg: 'FL', // Default leg for healthy check
          claw: 'outer', // Default claw
          zone: null,
          condition_code: 'OK',
          severity: 0,
          was_trimmed: false,
          was_treated: false,
          treatment_product_id: null,
          treatment_batch_id: null,
          treatment_quantity: null,
          treatment_unit: null,
          treatment_notes: null,
          bandage_applied: false,
          requires_followup: false,
          followup_date: null,
          technician_name: technicianName,
          notes: '✅ Nėra pažeidimų - Sveikas patikrinimas'
        });

      if (error) throw error;

      await logAction('create', 'hoof_records', null,
        `Įrašytas sveikas nagų patikrinimas gyvuliui ${selectedAnimalId}`);

      // Reset form to select another animal
      setSelectedAnimalId('');
      setSearchEarTag('');
      setSearchCollarNo('');
      setWorkflowStage('select_animal');
      setPreviousHoofVisits([]);

      await loadData();
      showNotification('Sveikas patikrinimas išsaugotas!', 'success');
    } catch (error) {
      console.error('Error saving healthy examination:', error);
      showNotification('Klaida išsaugant patikrinimą', 'error');
    }
  };

  // Reset examination form
  const resetExaminationForm = () => {
    setShowExaminationForm(false);
    setWorkflowStage('select_animal');
    setCurrentExaminations([]);
    setPendingMultiZoneProductDeductions([]);
    setSelectedAnimalId('');
    setSearchEarTag('');
    setSearchCollarNo('');
    setSelectedLeg(null);
    setSelectedClaw(null);
    setSelectedZone(null);
    setSelectedZones([]);
    setPreviousHoofVisits([]);
  };

  const saveAllExaminations = async () => {
    if (!selectedAnimalId || currentExaminations.length === 0) {
      showNotification('Pasirinkite gyvulį ir įveskite bent vieną nago būklę', 'error');
      return;
    }

    try {
      const recordsToInsert = currentExaminations.map(exam => ({
        animal_id: selectedAnimalId,
        examination_date: examinationDate,
        leg: exam.leg,
        claw: exam.claw,
        zone: exam.zone || null,
        condition_code: exam.condition_code,
        severity: exam.severity,
        was_trimmed: exam.was_trimmed,
        was_treated: exam.was_treated,
        treatment_product_id: exam.treatment_product_id || null,
        treatment_batch_id: exam.treatment_batch_id || null,
        treatment_quantity: exam.treatment_quantity || null,
        treatment_unit: exam.treatment_unit || null,
        treatment_notes: exam.treatment_notes || null,
        bandage_applied: exam.bandage_applied,
        requires_followup: exam.requires_followup,
        followup_date: exam.followup_date || null,
        technician_name: technicianName,
        notes: exam.notes || generalNotes || null
      }));

      const { error } = await supabase
        .from('hoof_records')
        .insert(recordsToInsert);

      if (error) throw error;

      // Deduct stock for treatments
      // Group by batch_id to avoid double deduction
      const batchDeductions = new Map<string, number>();
      
      // Add deductions from examinations that have individual product data
      for (const exam of currentExaminations) {
        if (exam.was_treated && exam.treatment_batch_id && exam.treatment_quantity) {
          const currentDeduction = batchDeductions.get(exam.treatment_batch_id) || 0;
          batchDeductions.set(exam.treatment_batch_id, currentDeduction + exam.treatment_quantity);
        }
      }

      // Add deductions from multi-zone products (these are tracked separately)
      for (const product of pendingMultiZoneProductDeductions) {
        if (product.batch_id && product.quantity) {
          const currentDeduction = batchDeductions.get(product.batch_id) || 0;
          batchDeductions.set(product.batch_id, currentDeduction + product.quantity);
        }
      }

      // Apply deductions
      for (const [batchId, totalQty] of batchDeductions.entries()) {
        const batch = batches.find(b => b.id === batchId);
        if (batch) {
          const newQuantity = (batch.qty_left || 0) - totalQty;
          const { error: stockError } = await supabase
            .from('batches')
            .update({ 
              qty_left: Math.max(0, newQuantity),
              updated_at: new Date().toISOString()
            })
            .eq('id', batchId);

          if (stockError) {
            console.error('Stock deduction error:', stockError);
            showNotification(`Įspėjimas: Klaida atimant atsargas partijai ${batch.lot}`, 'error');
          }
        }
      }

      await logAction('create', 'hoof_records', null,
        `Įrašyta ${currentExaminations.length} nagų apžiūrų gyvuliui ${selectedAnimalId}`);

      // Reset to select another animal
      setCurrentExaminations([]);
      setPendingMultiZoneProductDeductions([]); // Clear pending deductions after successful save
      setSelectedAnimalId('');
      setSearchEarTag('');
      setSearchCollarNo('');
      setGeneralNotes('');
      setWorkflowStage('select_animal');
      setSelectedLeg(null);
      setSelectedClaw(null);
      setSelectedZone(null);
      setPreviousHoofVisits([]);

      await loadData();
      showNotification(`Sėkmingai išsaugota ${currentExaminations.length} nagų apžiūrų!`, 'success');
    } catch (error) {
      console.error('Error saving examinations:', error);
      showNotification('Klaida išsaugant apžiūras', 'error');
    }
  };

  const getExaminedZones = () => {
    const set = new Set<string>();
    currentExaminations
      .filter(exam => exam.leg === selectedLeg && exam.claw === selectedClaw)
      .forEach(exam => {
        if (exam.zone !== undefined) {
          set.add(`${exam.zone}`);
        }
      });
    return set;
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    const collarNo = animalCollarNumbers.get(animal.id);
    return (
      animal.tag_no?.toLowerCase().includes(searchLower) ||
      collarNo?.toString().includes(searchLower)
    );
  });

  const filteredRecords = hoofRecords.filter(record => {
    if (filterCondition !== 'all' && record.condition_code !== filterCondition) return false;
    if (filterSeverity !== 'all' && record.severity?.toString() !== filterSeverity) return false;
    if (dateFrom && record.examination_date < dateFrom) return false;
    if (dateTo && record.examination_date > dateTo) return false;
    return true;
  });

  const getAnimalById = (id: string) => animals.find(a => a.id === id);
  const getConditionByCode = (code: string | null) =>
    conditions.find(c => c.code === code);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            Nagų sveikata (3D)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Nagų kirpimas, būklės registravimas su 3D zona pasirinkimu
          </p>
        </div>
        <button
          onClick={() => setShowExaminationForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nauja apžiūra
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Iš viso apžiūrų</p>
              <p className="text-2xl font-bold text-gray-900">{hoofRecords.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reikia kontrolės</p>
              <p className="text-2xl font-bold text-orange-600">
                {hoofRecords.filter(r => r.requires_followup && !r.followup_completed).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Su pažeidimais</p>
              <p className="text-2xl font-bold text-red-600">
                {hoofRecords.filter(r => r.condition_code && r.condition_code !== 'OK').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gydyta šį mėnesį</p>
              <p className="text-2xl font-bold text-green-600">
                {hoofRecords.filter(r => {
                  const date = new Date(r.examination_date);
                  const now = new Date();
                  return r.was_treated &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Apžiūrų istorija</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paieška</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ausies nr, kaklo nr..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Būklė</label>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visos</option>
              {conditions.map(c => (
                <option key={c.code} value={c.code}>{c.name_lt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sunkumas</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visi</option>
              <option value="0">0 - Sveikas</option>
              <option value="1">1 - Lengvas</option>
              <option value="2">2 - Vidutinis</option>
              <option value="3">3 - Sunkus</option>
              <option value="4">4 - Labai sunkus</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data nuo</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data iki</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.slice(0, 50).map(record => {
                const animal = getAnimalById(record.animal_id);
                const condition = getConditionByCode(record.condition_code);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDateLT(record.examination_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {animal ? formatAnimalDisplay(animal) : record.animal_id}
                    </td>
                    <td className="px-4 py-3 text-sm">{record.leg}</td>
                    <td className="px-4 py-3 text-sm">
                      {record.claw === 'inner' ? 'Vidinis' : 'Išorinis'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.zone !== null && record.zone !== undefined ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Z{record.zone}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{condition?.name_lt || record.condition_code}</td>
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
                    <td className="px-4 py-3 text-sm">
                      {record.was_trimmed ? '✓' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.was_treated ? '✓' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showExaminationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                {workflowStage === 'select_animal' && 'Nauja nagų apžiūra - Pasirinkite gyvulį'}
                {workflowStage === 'choose_action' && 'Pasirinkite veiksmą'}
                {workflowStage === 'examination' && 'Nagų apžiūra'}
              </h3>
              <button
                onClick={resetExaminationForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* STAGE 1: SELECT ANIMAL */}
              {workflowStage === 'select_animal' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Gyvūno ausies nr
                      </label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={searchEarTag}
                          onChange={(e) => {
                            setSearchEarTag(e.target.value);
                            setSearchCollarNo(''); // Clear the other field
                          }}
                          placeholder="Pvz: LT123456 arba paskutiniai 5 skaičiai..."
                          className="w-full pl-12 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Arba kaklo nr
                      </label>
                      <div className="relative">
                        <Activity className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500" />
                        <input
                          type="text"
                          value={searchCollarNo}
                          onChange={(e) => {
                            setSearchCollarNo(e.target.value);
                            setSearchEarTag(''); // Clear the other field
                          }}
                          placeholder="Pvz: 123"
                          className="w-full pl-12 pr-4 py-3 text-lg border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Apžiūros data <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={examinationDate}
                        onChange={(e) => setExaminationDate(e.target.value)}
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Technikas
                      </label>
                      <select
                        value={technicianName}
                        onChange={(e) => setTechnicianName(e.target.value)}
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pasirinkite techniką...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.full_name}>{user.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filtered Animals List */}
                  {(searchEarTag.trim() || searchCollarNo.trim()) && (
                    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Rasti gyvūnai ({getFilteredAnimals().length})
                        </h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {getFilteredAnimals().length === 0 ? (
                          <div className="text-center py-12">
                            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nerasta gyvūnų</p>
                            <p className="text-gray-400 text-sm mt-1">Pabandykite kitą paieškos užklausą</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {getFilteredAnimals().map((animal) => {
                              const collarNo = animalCollarNumbers.get(animal.id);
                              return (
                                <button
                                  key={animal.id}
                                  onClick={() => selectAnimal(animal)}
                                  className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-100"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-semibold text-lg text-gray-900">
                                        {animal.tag_no}
                                      </div>
                                      {collarNo && (
                                        <div className="text-sm text-emerald-600 font-medium mt-1">
                                          Kaklo nr: {collarNo}
                                        </div>
                                      )}
                                      {animal.holder_name && (
                                        <div className="text-sm text-gray-600 mt-1">
                                          {animal.holder_name}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-blue-600">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!searchEarTag.trim() && !searchCollarNo.trim() && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <p className="text-base text-blue-800">
                        ℹ️ Pradėkite rašyti ausies numerį arba kaklo numerį, kad pamatytumėte gyvūnų sąrašą.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* STAGE 2: CHOOSE ACTION */}
              {workflowStage === 'choose_action' && (
                <>
                  <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {getAnimalById(selectedAnimalId)?.tag_no || selectedAnimalId}
                      </h4>
                      {previousHoofVisits.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Ankstesnės apžiūros: {previousHoofVisits.slice(0, 3).map(v => formatDateLT(v.date)).join(', ')}
                          {previousHoofVisits.length > 3 && ` (+${previousHoofVisits.length - 3})`}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setWorkflowStage('examination')}
                        className="flex flex-col items-center gap-3 px-6 py-8 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <AlertCircle className="w-12 h-12" />
                        <span className="text-xl font-bold">Reikia gydymo</span>
                        <span className="text-sm opacity-90">Nagas pažeistas, reikia apžiūros ir gydymo</span>
                      </button>

                      <button
                        onClick={saveHealthyExamination}
                        className="flex flex-col items-center gap-3 px-6 py-8 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <CheckCircle className="w-12 h-12" />
                        <span className="text-xl font-bold">Nėra pažeidimų</span>
                        <span className="text-sm opacity-90">Nagai sveiki, nereikia gydymo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setWorkflowStage('select_animal');
                        setSelectedAnimalId('');
                        setSearchEarTag('');
                        setSearchCollarNo('');
                        setPreviousHoofVisits([]);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      ← Grįžti atgal
                    </button>
                  </div>
                </>
              )}

              {/* STAGE 3: EXAMINATION */}
              {workflowStage === 'examination' && (
                <>
                  <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 rounded-lg">
                    <HoofInterfaceNew
                      selectedLeg={selectedLeg}
                      selectedClaw={selectedClaw}
                      selectedZone={selectedZone}
                      selectedZones={selectedZones}
                      onLegSelect={handleLegSelect}
                      onClawSelect={handleClawSelect}
                      onZoneSelect={handleZoneSelect}
                      examinedZones={getExaminedZones()}
                      animalId={selectedAnimalId}
                    />
                  </div>

                  {selectedZones.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-purple-900 flex items-center gap-2 text-sm">
                          <Layers className="w-4 h-4 text-purple-600" />
                          Pasirinktos zonos ({selectedZones.length})
                        </h4>
                        <button
                          onClick={() => setSelectedZones([])}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Išvalyti
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        {selectedZones.map((z, idx) => (
                          <div 
                            key={idx} 
                            className="text-xs bg-white p-1.5 rounded border border-purple-300"
                          >
                            <div className="font-medium text-gray-800">
                              {selectedLeg} - {z.claw === 'inner' ? 'V' : 'I'}
                              <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]">
                                Z{z.zone}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setMultiZoneProducts([]);
                          setShowMultiZoneModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <Box className="w-4 h-4" />
                        Tęsti - Pasirinkti produktus
                      </button>
                    </div>
                  )}

                  {currentExaminations.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Įvestos būklės ({currentExaminations.length})
                        </h4>
                        <button
                          onClick={() => setCurrentExaminations([])}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Išvalyti visas
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {currentExaminations.map((exam, idx) => {
                          const condition = getConditionByCode(exam.condition_code);
                          return (
                            <div 
                              key={idx} 
                              className="text-xs bg-white p-1.5 rounded border border-green-300 hover:border-green-500 transition-colors cursor-pointer group relative"
                              onClick={() => {
                                setSelectedLeg(exam.leg);
                                setSelectedClaw(exam.claw);
                                setSelectedZone(exam.zone || null);
                                setClawFormData(exam);
                                setShowClawModal(true);
                              }}
                            >
                              <div className="font-medium text-gray-800">
                                {exam.leg} - {exam.claw === 'inner' ? 'V' : 'I'}
                                {exam.zone !== undefined && (
                                  <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                                    Z{exam.zone}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-700 font-medium text-[11px]">{condition?.name_lt || exam.condition_code}</div>
                              <div className="text-gray-500 text-[10px]">
                                S: {exam.severity}
                                {exam.was_treated && ' • Gydyta'}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentExaminations(prev => 
                                    prev.filter((_, i) => i !== idx)
                                  );
                                }}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                title="Pašalinti"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-[10px] text-gray-600 italic">
                        💡 Spustelėkite kortelę redaguoti. Pasirinkite kitą koją daugiau apžiūrų.
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setWorkflowStage('choose_action');
                        setSelectedLeg(null);
                        setSelectedClaw(null);
                        setSelectedZone(null);
                        setSelectedZones([]);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      ← Grįžti atgal
                    </button>
                    <button
                      onClick={saveAllExaminations}
                      disabled={!selectedAnimalId || currentExaminations.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!selectedAnimalId ? 'Pasirinkite gyvulį' : currentExaminations.length === 0 ? 'Įveskite bent vieną nago būklę' : 'Išsaugoti visas apžiūras'}
                    >
                      <Save className="w-5 h-5" />
                      Išsaugoti visas ({currentExaminations.length})
                    </button>
                  </div>
                  {(!selectedAnimalId || currentExaminations.length === 0) && (
                    <div className="text-sm text-gray-500 text-right mt-2">
                      {!selectedAnimalId && '⚠️ Pasirinkite gyvulį'}
                      {selectedAnimalId && currentExaminations.length === 0 && '⚠️ Pridėkite bent vieną nago būklę'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showMultiZoneModal && selectedLeg && selectedZones.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Produktai ({selectedZones.length} zonos)
              </h3>
              <button
                onClick={() => {
                  setShowMultiZoneModal(false);
                  setMultiZoneProducts([]);
                }}
                className="text-purple-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Selected Zones Summary - Compact */}
              <div className="bg-purple-50 border border-purple-200 rounded p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-700" />
                  <h4 className="text-xs font-semibold text-purple-900">Zonos ({selectedZones.length})</h4>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedZones.map((z, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-white border border-purple-300 rounded text-xs">
                      {selectedLeg} {z.claw === 'inner' ? 'V' : 'I'} Z{z.zone}
                    </span>
                  ))}
                </div>
              </div>

              {/* Condition & Severity - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Būklė
                  </label>
                  <select
                    value={clawFormData.condition_code || 'OK'}
                    onChange={(e) => setClawFormData({...clawFormData, condition_code: e.target.value})}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                  >
                    {conditions.length === 0 ? (
                      <option value="OK">Sveikas</option>
                    ) : (
                      conditions.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name_lt}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sunkumas: <span className="font-bold text-purple-700">{clawFormData.severity || 0}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={clawFormData.severity || 0}
                    onChange={(e) => setClawFormData({...clawFormData, severity: parseInt(e.target.value)})}
                    className="w-full h-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                    <span>0</span>
                    <span>4</span>
                  </div>
                </div>
              </div>

              {/* Products Section - Compact */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-blue-600" />
                    Produktai
                  </h4>
                  <button
                    onClick={() => {
                      setMultiZoneProducts([...multiZoneProducts, {
                        product_id: '',
                        batch_id: '',
                        quantity: 0,
                        unit: 'ml'
                      }]);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Plus className="w-3 h-3" />
                    Pridėti
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mb-2 italic">
                  💡 Kiekis = bendras kiekis visoms {selectedZones.length} zonoms
                </p>

                <div className="space-y-2">
                  {multiZoneProducts.map((product, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <select
                            value={product.product_id}
                            onChange={(e) => {
                              const productId = e.target.value;
                              const selectedProduct = products.find(p => p.id === productId);
                              const availableBatches = batches
                                .filter(b => 
                                  b.product_id === productId && 
                                  (b.qty_left === null || b.qty_left === undefined || b.qty_left > 0) &&
                                  (!b.expiry_date || new Date(b.expiry_date) >= new Date())
                                )
                                .sort((a, b) => {
                                  const dateA = a.mfg_date ? new Date(a.mfg_date) : new Date(a.created_at);
                                  const dateB = b.mfg_date ? new Date(b.mfg_date) : new Date(b.created_at);
                                  return dateA.getTime() - dateB.getTime();
                                });
                              
                              const newProducts = [...multiZoneProducts];
                              newProducts[idx] = {
                                ...product,
                                product_id: productId,
                                batch_id: availableBatches.length > 0 ? availableBatches[0].id : '',
                                unit: (selectedProduct?.primary_pack_unit as Unit) || 'ml'
                              };
                              setMultiZoneProducts(newProducts);
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Preparatas...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>

                          {product.product_id && (
                            <>
                              <select
                                value={product.batch_id}
                                onChange={(e) => {
                                  const newProducts = [...multiZoneProducts];
                                  newProducts[idx] = {...product, batch_id: e.target.value};
                                  setMultiZoneProducts(newProducts);
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Partija...</option>
                                {batches
                                  .filter(b => 
                                    b.product_id === product.product_id && 
                                    (b.qty_left === null || b.qty_left === undefined || b.qty_left > 0) &&
                                    (!b.expiry_date || new Date(b.expiry_date) >= new Date())
                                  )
                                  .sort((a, b) => {
                                    const dateA = a.mfg_date ? new Date(a.mfg_date) : new Date(a.created_at);
                                    const dateB = b.mfg_date ? new Date(b.mfg_date) : new Date(b.created_at);
                                    return dateA.getTime() - dateB.getTime();
                                  })
                                  .map(b => {
                                    const prod = products.find(p => p.id === b.product_id);
                                    return (
                                      <option key={b.id} value={b.id}>
                                        {b.lot || b.id.slice(0, 8)} - {b.qty_left} {prod?.primary_pack_unit} {b.expiry_date ? `(${b.expiry_date})` : ''}
                                      </option>
                                    );
                                  })}
                              </select>

                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={product.quantity || ''}
                                  onChange={(e) => {
                                    const newProducts = [...multiZoneProducts];
                                    newProducts[idx] = {...product, quantity: parseFloat(e.target.value) || 0};
                                    setMultiZoneProducts(newProducts);
                                  }}
                                  placeholder="Kiekis"
                                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                />
                                <div className="w-12 px-2 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded flex items-center justify-center font-medium text-gray-700">
                                  {product.unit || 'ml'}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setMultiZoneProducts(multiZoneProducts.filter((_, i) => i !== idx));
                          }}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 p-1"
                          title="Pašalinti"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {multiZoneProducts.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      <Box className="w-8 h-8 mx-auto mb-1 opacity-20" />
                      <p>Pridėkite naudotus produktus</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes - Compact */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pastabos (pasirinktinai)</label>
                <textarea
                  value={clawFormData.notes || ''}
                  onChange={(e) => setClawFormData({...clawFormData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                  placeholder="Papildomos pastabos..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowMultiZoneModal(false);
                    setMultiZoneProducts([]);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={saveMultiZoneExaminations}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-medium"
                >
                  Išsaugoti visas zonas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClawModal && selectedLeg && selectedClaw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedLeg} - {selectedClaw === 'inner' ? 'Vidinis' : 'Išorinis'} nagas
                {selectedZone !== null && ` - Zona ${selectedZone}`}
              </h3>
              <button
                onClick={() => {
                  setShowClawModal(false);
                  setSelectedZone(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Būklė {conditions.length === 0 && <span className="text-red-500 text-xs">(Nėra duomenų)</span>}
                </label>
                <select
                  value={clawFormData.condition_code || 'OK'}
                  onChange={(e) => setClawFormData({...clawFormData, condition_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {conditions.length === 0 ? (
                    <option value="OK">Sveikas (Nėra būklių duomenų)</option>
                  ) : (
                    conditions.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name_lt}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sunkumas: {clawFormData.severity || 0}
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={clawFormData.severity || 0}
                  onChange={(e) => setClawFormData({...clawFormData, severity: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0 - Sveikas</span>
                  <span>1 - Lengvas</span>
                  <span>2 - Vidutinis</span>
                  <span>3 - Sunkus</span>
                  <span>4 - Labai sunkus</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.was_treated || false}
                    onChange={(e) => setClawFormData({...clawFormData, was_treated: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Gydyta</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.requires_followup || false}
                    onChange={(e) => setClawFormData({
                      ...clawFormData,
                      requires_followup: e.target.checked,
                      followup_date: e.target.checked
                        ? new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0]
                        : undefined
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Reikia kontrolės</span>
                </label>
              </div>

              {clawFormData.was_treated && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium text-gray-800">Gydymas</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preparatas</label>
                    <select
                      value={clawFormData.treatment_product_id || ''}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const selectedProduct = products.find(p => p.id === productId);
                        // Filter available batches with stock and sort by date ASCENDING (oldest first = FIFO)
                        const availableBatches = batches
                          .filter(b => 
                            b.product_id === productId && 
                            (b.qty_left === null || b.qty_left === undefined || b.qty_left > 0) &&
                            (!b.expiry_date || new Date(b.expiry_date) >= new Date()) // Not expired
                          )
                          .sort((a, b) => {
                            // Sort by date ascending (earliest date first = oldest stock = FIFO)
                            // Use mfg_date or created_at to determine oldest batch
                            const dateA = a.mfg_date ? new Date(a.mfg_date) : new Date(a.created_at);
                            const dateB = b.mfg_date ? new Date(b.mfg_date) : new Date(b.created_at);
                            return dateA.getTime() - dateB.getTime();
                          });
                        
                        // Auto-select the first available batch (oldest = FIFO) and unit from product
                        setClawFormData({
                          ...clawFormData,
                          treatment_product_id: productId || undefined,
                          treatment_batch_id: availableBatches.length > 0 ? availableBatches[0].id : undefined,
                          treatment_unit: (selectedProduct?.primary_pack_unit as Unit) || undefined
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Pasirinkite preparatą...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {clawFormData.treatment_product_id && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Partija</label>
                        <select
                          value={clawFormData.treatment_batch_id || ''}
                          onChange={(e) => setClawFormData({
                            ...clawFormData,
                            treatment_batch_id: e.target.value || undefined
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Pasirinkite partiją...</option>
                          {batches
                            .filter(b => 
                              b.product_id === clawFormData.treatment_product_id && 
                              (b.qty_left === null || b.qty_left === undefined || b.qty_left > 0) &&
                              (!b.expiry_date || new Date(b.expiry_date) >= new Date()) // Not expired
                            )
                            .sort((a, b) => {
                              // Sort by date ascending (earliest date first = oldest stock = FIFO)
                              const dateA = a.mfg_date ? new Date(a.mfg_date) : new Date(a.created_at);
                              const dateB = b.mfg_date ? new Date(b.mfg_date) : new Date(b.created_at);
                              return dateA.getTime() - dateB.getTime();
                            })
                            .map(b => {
                              const product = products.find(p => p.id === b.product_id);
                              return (
                                <option key={b.id} value={b.id}>
                                  {b.lot || 'Partija ' + b.id.slice(0, 8)} {b.qty_left !== null && b.qty_left !== undefined ? `- Likutis: ${b.qty_left} ${product?.primary_pack_unit || ''}` : ''} {b.expiry_date ? `(galioja iki: ${b.expiry_date})` : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis</label>
                          <input
                            type="number"
                            step="0.1"
                            value={clawFormData.treatment_quantity || ''}
                            onChange={(e) => setClawFormData({
                              ...clawFormData,
                              treatment_quantity: parseFloat(e.target.value) || undefined
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center font-medium text-gray-700">
                            {clawFormData.treatment_unit || 'ml'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {clawFormData.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kontrolės data</label>
                  <input
                    type="date"
                    value={clawFormData.followup_date || ''}
                    onChange={(e) => setClawFormData({...clawFormData, followup_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={clawFormData.notes || ''}
                  onChange={(e) => setClawFormData({...clawFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Papildomos pastabos apie šį nagą..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowClawModal(false);
                    setSelectedZone(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={saveClawExamination}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Išsaugoti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
