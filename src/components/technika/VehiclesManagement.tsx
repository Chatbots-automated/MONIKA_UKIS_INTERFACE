import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Truck, Plus, Search, AlertTriangle, Calendar, User, Gauge, Edit, Trash2, X, Save, Upload, FileText, Download } from 'lucide-react';
import { VehicleDetailSidebar } from './VehicleDetailSidebar';

interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  status: string;
  current_mileage: number;
  current_engine_hours: number;
  insurance_expiry_date: string | null;
  technical_inspection_due_date: string | null;
  assigned_to: string | null;
  assignee: {
    full_name: string;
  } | null;
  notes: string | null;
  identification_number: string | null;
  technical_passport_number: string | null;
  kasko_insurance_expiry: string | null;
  kasko_insurance_number: string | null;
  civil_insurance_number: string | null;
  road_tax_expiry: string | null;
  tachograph_inspection_due: string | null;
  license_expiry: string | null;
}

interface VehicleForm {
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: string;
  status: string;
  current_mileage: string;
  current_engine_hours: string;
  insurance_expiry_date: string;
  technical_inspection_due_date: string;
  assigned_to: string;
  notes: string;
  identification_number: string;
  technical_passport_number: string;
  kasko_insurance_expiry: string;
  kasko_insurance_number: string;
  civil_insurance_number: string;
  road_tax_expiry: string;
  tachograph_inspection_due: string;
  license_expiry: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface VehiclesManagementProps {
  workerMode?: boolean;
}

export function VehiclesManagement({ workerMode = false }: VehiclesManagementProps = {}) {
  const { user, logAction } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showReadingsModal, setShowReadingsModal] = useState(false);
  const [showBulkReadingsModal, setShowBulkReadingsModal] = useState(false);
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({
    registration_number: '',
    vehicle_type: 'tractor',
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    status: 'active',
    current_mileage: '0',
    current_engine_hours: '0',
    insurance_expiry_date: '',
    technical_inspection_due_date: '',
    assigned_to: '',
    notes: '',
    identification_number: '',
    technical_passport_number: '',
    kasko_insurance_expiry: '',
    kasko_insurance_number: '',
    civil_insurance_number: '',
    road_tax_expiry: '',
    tachograph_inspection_due: '',
    license_expiry: '',
  });
  const [readingsForm, setReadingsForm] = useState({
    mileage: '',
    engine_hours: '',
  });
  const [bulkReadingsRows, setBulkReadingsRows] = useState<
    Array<{ vehicle_id: string; engine_hours: string; mileage: string }>
  >([{ vehicle_id: '', engine_hours: '', mileage: '' }]);
  const [isSavingBulkReadings, setIsSavingBulkReadings] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [vehicleDocuments, setVehicleDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingVehicle) {
      loadVehicleDocuments(editingVehicle.id);
    }
  }, [editingVehicle]);

  const loadData = async () => {
    const [vehiclesRes, usersRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select(`
          *,
          assignee:users!vehicles_assigned_to_fkey(full_name)
        `)
        .eq('is_active', true)
        .order('registration_number'),
      supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name'),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data as any);
    if (usersRes.data) setUsers(usersRes.data);
  };

  const handleOpenVehicleModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        registration_number: vehicle.registration_number,
        vehicle_type: vehicle.vehicle_type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year.toString(),
        status: vehicle.status,
        current_mileage: vehicle.current_mileage?.toString() || '0',
        current_engine_hours: vehicle.current_engine_hours?.toString() || '0',
        insurance_expiry_date: vehicle.insurance_expiry_date || '',
        technical_inspection_due_date: vehicle.technical_inspection_due_date || '',
        assigned_to: vehicle.assigned_to || '',
        notes: vehicle.notes || '',
        identification_number: vehicle.identification_number || '',
        technical_passport_number: vehicle.technical_passport_number || '',
        kasko_insurance_expiry: vehicle.kasko_insurance_expiry || '',
        kasko_insurance_number: vehicle.kasko_insurance_number || '',
        civil_insurance_number: vehicle.civil_insurance_number || '',
        road_tax_expiry: vehicle.road_tax_expiry || '',
        tachograph_inspection_due: vehicle.tachograph_inspection_due || '',
        license_expiry: vehicle.license_expiry || '',
      });
    } else {
      setEditingVehicle(null);
      setVehicleForm({
        registration_number: '',
        vehicle_type: 'tractor',
        make: '',
        model: '',
        year: new Date().getFullYear().toString(),
        status: 'active',
        current_mileage: '0',
        current_engine_hours: '0',
        insurance_expiry_date: '',
        technical_inspection_due_date: '',
        assigned_to: '',
        notes: '',
        identification_number: '',
        technical_passport_number: '',
        kasko_insurance_expiry: '',
        kasko_insurance_number: '',
        civil_insurance_number: '',
        road_tax_expiry: '',
        tachograph_inspection_due: '',
        license_expiry: '',
      });
    }
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.registration_number) {
      alert('Prašome įvesti valstybinį numerį');
      return;
    }

    try {
      const vehicleData = {
        registration_number: vehicleForm.registration_number.toUpperCase(),
        vehicle_type: vehicleForm.vehicle_type,
        make: vehicleForm.make || null,
        model: vehicleForm.model || null,
        year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
        status: vehicleForm.status,
        current_mileage: parseFloat(vehicleForm.current_mileage) || 0,
        current_engine_hours: parseFloat(vehicleForm.current_engine_hours) || 0,
        insurance_expiry_date: vehicleForm.insurance_expiry_date || null,
        technical_inspection_due_date: vehicleForm.technical_inspection_due_date || null,
        assigned_to: vehicleForm.assigned_to || null,
        notes: vehicleForm.notes || null,
        identification_number: vehicleForm.identification_number || null,
        technical_passport_number: vehicleForm.technical_passport_number || null,
        kasko_insurance_expiry: vehicleForm.kasko_insurance_expiry || null,
        kasko_insurance_number: vehicleForm.kasko_insurance_number || null,
        civil_insurance_number: vehicleForm.civil_insurance_number || null,
        road_tax_expiry: vehicleForm.road_tax_expiry || null,
        tachograph_inspection_due: vehicleForm.tachograph_inspection_due || null,
        license_expiry: vehicleForm.license_expiry || null,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        await logAction('update_vehicle', 'vehicles', editingVehicle.id);
        alert('Transporto priemonė sėkmingai atnaujinta');
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .insert({ ...vehicleData, created_by: user?.id || null })
          .select()
          .single();

        if (error) throw error;
        await logAction('create_vehicle', 'vehicles', data.id);
        alert('Transporto priemonė sėkmingai sukurta');
      }

      setShowVehicleModal(false);
      setEditingVehicle(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleOpenReadingsModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setReadingsForm({
      mileage: vehicle.current_mileage?.toString() || '0',
      engine_hours: vehicle.current_engine_hours?.toString() || '0',
    });
    setShowReadingsModal(true);
  };

  const handleUpdateReadings = async () => {
    if (!selectedVehicle) return;

    const newMileage = parseFloat(readingsForm.mileage) || 0;
    const newEngineHours = parseFloat(readingsForm.engine_hours) || 0;

    if (newMileage < selectedVehicle.current_mileage) {
      alert('Rida negali būti mažesnė nei dabartinė');
      return;
    }

    if (newEngineHours < selectedVehicle.current_engine_hours) {
      alert('Valandos negali būti mažesnės nei dabartinės');
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          current_mileage: newMileage,
          current_engine_hours: newEngineHours,
        })
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      await logAction('update_vehicle_readings', 'vehicles', selectedVehicle.id, null, {
        old_mileage: selectedVehicle.current_mileage,
        new_mileage: newMileage,
        old_engine_hours: selectedVehicle.current_engine_hours,
        new_engine_hours: newEngineHours,
      });

      alert('Rodmenys sėkmingai atnaujinti');
      setShowReadingsModal(false);
      setSelectedVehicle(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const handleOpenBulkReadingsModal = () => {
    setBulkReadingsRows([{ vehicle_id: '', engine_hours: '', mileage: '' }]);
    setShowBulkReadingsModal(true);
  };

  const handleAddBulkRow = () => {
    setBulkReadingsRows(prev => [...prev, { vehicle_id: '', engine_hours: '', mileage: '' }]);
  };

  const handleRemoveBulkRow = (index: number) => {
    setBulkReadingsRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkRowChange = (index: number, field: 'vehicle_id' | 'engine_hours' | 'mileage', value: string) => {
    setBulkReadingsRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveBulkReadings = async () => {
    if (isSavingBulkReadings) return;

    const trimmed = bulkReadingsRows
      .map(r => ({ ...r, vehicle_id: r.vehicle_id.trim(), engine_hours: r.engine_hours.trim(), mileage: r.mileage.trim() }))
      .filter(r => r.vehicle_id && (r.engine_hours || r.mileage));

    if (trimmed.length === 0) {
      alert('Prašome pasirinkti transportą ir įvesti motovalandas (ir/ar ridą)');
      return;
    }

    // Prevent duplicates
    const ids = trimmed.map(r => r.vehicle_id);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      alert('Tas pats transportas negali būti pasirinktas kelis kartus');
      return;
    }

    // Validate increasing values
    for (const row of trimmed) {
      const v = vehicles.find(x => x.id === row.vehicle_id);
      if (!v) continue;

      const newHours = row.engine_hours !== '' ? parseFloat(row.engine_hours) : null;
      const newMileage = row.mileage !== '' ? parseFloat(row.mileage) : null;

      if (newHours !== null && Number.isNaN(newHours)) {
        alert('Neteisingas motovalandų formatas');
        return;
      }
      if (newMileage !== null && Number.isNaN(newMileage)) {
        alert('Neteisingas ridos formatas');
        return;
      }

      if (newHours !== null && newHours < (v.current_engine_hours || 0)) {
        alert(`Motovalandos negali būti mažesnės nei dabartinės (${v.registration_number})`);
        return;
      }
      if (newMileage !== null && newMileage < (v.current_mileage || 0)) {
        alert(`Rida negali būti mažesnė nei dabartinė (${v.registration_number})`);
        return;
      }
    }

    setIsSavingBulkReadings(true);
    try {
      // Update vehicles one-by-one (each can have different values)
      for (const row of trimmed) {
        const v = vehicles.find(x => x.id === row.vehicle_id);
        if (!v) continue;

        const newHours = row.engine_hours !== '' ? parseFloat(row.engine_hours) : null;
        const newMileage = row.mileage !== '' ? parseFloat(row.mileage) : null;

        const update: any = {};
        if (newHours !== null) update.current_engine_hours = newHours;
        if (newMileage !== null) update.current_mileage = newMileage;

        const { error } = await supabase.from('vehicles').update(update).eq('id', v.id);
        if (error) throw error;

        await logAction('bulk_update_vehicle_readings', 'vehicles', v.id, null, {
          old_mileage: v.current_mileage,
          new_mileage: newMileage ?? v.current_mileage,
          old_engine_hours: v.current_engine_hours,
          new_engine_hours: newHours ?? v.current_engine_hours,
        });
      }

      // Optimistic local update so Planiniai aptarnavimai can reflect immediately (it reads vehicle current_engine_hours)
      setVehicles(prev =>
        prev.map(v => {
          const row = trimmed.find(r => r.vehicle_id === v.id);
          if (!row) return v;
          const newHours = row.engine_hours !== '' ? parseFloat(row.engine_hours) : null;
          const newMileage = row.mileage !== '' ? parseFloat(row.mileage) : null;
          return {
            ...v,
            current_engine_hours: newHours ?? v.current_engine_hours,
            current_mileage: newMileage ?? v.current_mileage,
          };
        })
      );

      alert('Rodmenys sėkmingai įrašyti');
      setShowBulkReadingsModal(false);
      setBulkReadingsRows([{ vehicle_id: '', engine_hours: '', mileage: '' }]);
      await loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    } finally {
      setIsSavingBulkReadings(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Ar tikrai norite ištrinti transporto priemonę ${vehicle.registration_number}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: false })
        .eq('id', vehicle.id);

      if (error) throw error;
      await logAction('delete_vehicle', 'vehicles', vehicle.id);
      alert('Transporto priemonė ištrinta');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida: ${error.message}`);
    }
  };

  const loadVehicleDocuments = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setVehicleDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingVehicle) {
      alert('Pirmiausia išsaugokite transporto priemonę');
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `vehicles/${editingVehicle.id}/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, size: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      const { data: dbData, error: dbError } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: editingVehicle.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id || null,
          document_type: 'other',
          document_name: file.name,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Document record created:', dbData);

      alert('Failas sėkmingai įkeltas!');
      loadVehicleDocuments(editingVehicle.id);
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(`Klaida įkeliant failą: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('vehicle-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert(`Klaida atsisiunčiant failą: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį dokumentą?')) return;

    try {
      const doc = vehicleDocuments.find(d => d.id === documentId);
      if (doc) {
        await supabase.storage
          .from('vehicle-documents')
          .remove([doc.file_path]);
      }

      const { error } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      alert('Dokumentas ištrintas!');
      if (editingVehicle) {
        loadVehicleDocuments(editingVehicle.id);
      }
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert(`Klaida trinant dokumentą: ${error.message}`);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch =
      vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const daysUntil = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const vehicleTypeLabels: any = {
    tractor: 'Traktorius',
    truck: 'Sunkvežimis',
    car: 'Automobilis',
    car_light: 'Lengvasis automobilis',
    harvester: 'Kombainas',
    sprayer: 'Purkštuvas',
    loader: 'Krautuvas',
    trailer: 'Priekaba',
    semi_trailer: 'Puspriekabė',
    cylinder: 'Cilindras',
    other: 'Kita',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Transporto priemonės</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBulkReadingsModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Suvesti motovalandas / ridą keliems transportams"
            >
              <Gauge className="w-4 h-4" />
              Suvesti motovalandas
            </button>
            {!workerMode && (
              <button
                onClick={() => handleOpenVehicleModal()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Pridėti transportą
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal valst. numerį, markę..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">Visi statusai</option>
            <option value="active">Aktyvūs</option>
            <option value="maintenance">Aptarnavime</option>
            <option value="inactive">Neaktyvūs</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(vehicle => {
            const insuranceExpiring = isExpiringSoon(vehicle.insurance_expiry_date);
            const insuranceExpired = isExpired(vehicle.insurance_expiry_date);
            const taExpiring = isExpiringSoon(vehicle.technical_inspection_due_date);
            const taExpired = isExpired(vehicle.technical_inspection_due_date);
            const hasWarnings = insuranceExpiring || insuranceExpired || taExpiring || taExpired;

            return (
              <div
                key={vehicle.id}
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  setShowDetailSidebar(true);
                }}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                  hasWarnings ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-slate-600" />
                    <span className="font-bold text-gray-800">{vehicle.registration_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        vehicle.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : vehicle.status === 'maintenance'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {vehicle.status === 'active' ? 'Aktyvus' : vehicle.status === 'maintenance' ? 'Aptarnavimas' : 'Neaktyvus'}
                    </span>
                  </div>
                </div>

                <h4 className="font-medium text-gray-800 mb-1">
                  {vehicle.make} {vehicle.model}
                </h4>
                <p className="text-sm text-gray-600 mb-3">{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type} · {vehicle.year}</p>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Gauge className="w-4 h-4" />
                    <span>{vehicle.current_mileage?.toLocaleString()} km</span>
                    {vehicle.current_engine_hours > 0 && <span>· {vehicle.current_engine_hours} mval.</span>}
                  </div>

                  {vehicle.assignee && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{vehicle.assignee.full_name}</span>
                    </div>
                  )}

                  {vehicle.insurance_expiry_date && (
                    <div className={`flex items-center gap-2 ${insuranceExpired ? 'text-red-600' : insuranceExpiring ? 'text-amber-600' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>Civilinis dr.: {vehicle.insurance_expiry_date}</span>
                    </div>
                  )}

                  {vehicle.technical_inspection_due_date && (
                    <div className={`flex items-center gap-2 ${taExpired ? 'text-red-600' : taExpiring ? 'text-amber-600' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>TA: {vehicle.technical_inspection_due_date}</span>
                    </div>
                  )}
                </div>

                {hasWarnings && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-lg mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reikia dėmesio</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReadingsModal(vehicle);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Gauge className="w-4 h-4" />
                    Rodmenys
                  </button>
                  {!workerMode && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVehicleModal(vehicle);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVehicle(vehicle);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Transporto priemonių nerasta</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viso transporto" value={vehicles.length.toString()} color="blue" />
        <StatCard
          title="Aktyvūs"
          value={vehicles.filter(v => v.status === 'active').length.toString()}
          color="green"
        />
        <StatCard
          title="Aptarnavime"
          value={vehicles.filter(v => v.status === 'maintenance').length.toString()}
          color="amber"
        />
        <StatCard
          title="Reikia dėmesio"
          value={vehicles.filter(v => isExpiringSoon(v.insurance_expiry_date) || isExpiringSoon(v.technical_inspection_due_date)).length.toString()}
          color="red"
        />
      </div>

      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingVehicle ? 'Redaguoti transportą' : 'Naujas transportas'}
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 border-b pb-2 mb-2">
                <h4 className="font-semibold text-gray-800">Pagrindinė informacija</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valstybinis numeris *</label>
                <input
                  type="text"
                  value={vehicleForm.registration_number}
                  onChange={e => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                  className="w-full border rounded px-3 py-2 uppercase"
                  placeholder="ABC123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
                <select
                  value={vehicleForm.vehicle_type}
                  onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="tractor">Traktorius</option>
                  <option value="truck">Sunkvežimis</option>
                  <option value="car">Automobilis</option>
                  <option value="harvester">Kombainas</option>
                  <option value="sprayer">Purkštuvas</option>
                  <option value="loader">Krautuvas</option>
                  <option value="trailer">Priekaba</option>
                  <option value="other">Kita</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Markė</label>
                <input
                  type="text"
                  value={vehicleForm.make}
                  onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="John Deere"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelis</label>
                <input
                  type="text"
                  value={vehicleForm.model}
                  onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="6120M"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metai</label>
                <input
                  type="number"
                  value={vehicleForm.year}
                  onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statusas</label>
                <select
                  value={vehicleForm.status}
                  onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Aktyvus</option>
                  <option value="maintenance">Aptarnavime</option>
                  <option value="inactive">Neaktyvus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifikavimo nr.</label>
                <input
                  type="text"
                  value={vehicleForm.identification_number}
                  onChange={e => setVehicleForm({ ...vehicleForm, identification_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="VIN arba kitas ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Techninio paso nr.</label>
                <input
                  type="text"
                  value={vehicleForm.technical_passport_number}
                  onChange={e => setVehicleForm({ ...vehicleForm, technical_passport_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="TP numeris"
                />
              </div>

              <div className="col-span-2 border-b pb-2 mb-2 mt-4">
                <h4 className="font-semibold text-gray-800">Rodmenys</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rida (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vehicleForm.current_mileage}
                  onChange={e => setVehicleForm({ ...vehicleForm, current_mileage: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motovalandos</label>
                <input
                  type="number"
                  step="0.1"
                  value={vehicleForm.current_engine_hours}
                  onChange={e => setVehicleForm({ ...vehicleForm, current_engine_hours: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2 border-b pb-2 mb-2 mt-4">
                <h4 className="font-semibold text-gray-800">Draudimai ir dokumentai</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Civilinis draudimas (galiojimas)</label>
                <input
                  type="date"
                  value={vehicleForm.insurance_expiry_date}
                  onChange={e => setVehicleForm({ ...vehicleForm, insurance_expiry_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Civilinio draudimo nr.</label>
                <input
                  type="text"
                  value={vehicleForm.civil_insurance_number}
                  onChange={e => setVehicleForm({ ...vehicleForm, civil_insurance_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Draudimo poliso nr."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kasko draudimas (galiojimas)</label>
                <input
                  type="date"
                  value={vehicleForm.kasko_insurance_expiry}
                  onChange={e => setVehicleForm({ ...vehicleForm, kasko_insurance_expiry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kasko draudimo nr.</label>
                <input
                  type="text"
                  value={vehicleForm.kasko_insurance_number}
                  onChange={e => setVehicleForm({ ...vehicleForm, kasko_insurance_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Kasko poliso nr."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TA galiojimas</label>
                <input
                  type="date"
                  value={vehicleForm.technical_inspection_due_date}
                  onChange={e => setVehicleForm({ ...vehicleForm, technical_inspection_due_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keliai (galiojimas)</label>
                <input
                  type="date"
                  value={vehicleForm.road_tax_expiry}
                  onChange={e => setVehicleForm({ ...vehicleForm, road_tax_expiry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tachografo patikra</label>
                <input
                  type="date"
                  value={vehicleForm.tachograph_inspection_due}
                  onChange={e => setVehicleForm({ ...vehicleForm, tachograph_inspection_due: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Licencija (galiojimas)</label>
                <input
                  type="date"
                  value={vehicleForm.license_expiry}
                  onChange={e => setVehicleForm({ ...vehicleForm, license_expiry: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2 border-b pb-2 mb-2 mt-4">
                <h4 className="font-semibold text-gray-800">Kita</h4>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Priskirtas darbuotojui</label>
                <select
                  value={vehicleForm.assigned_to}
                  onChange={e => setVehicleForm({ ...vehicleForm, assigned_to: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Nepriskirtas</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={vehicleForm.notes}
                  onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="col-span-2 border-b pb-2 mb-2 mt-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Failai
                </h4>
              </div>

              {editingVehicle ? (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Įkelti dokumentą (PDF, Word, Excel, nuotraukos ir kt.)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        accept="*/*"
                        className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer"
                      />
                      {uploadingFile && (
                        <span className="text-sm text-blue-600 font-medium">Įkeliama...</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Galite įkelti bet kokio tipo failą</p>
                  </div>

                  {vehicleDocuments.length > 0 ? (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Įkelti dokumentai ({vehicleDocuments.length})
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {vehicleDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate" title={doc.file_name}>
                                  {doc.file_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(doc.uploaded_at).toLocaleDateString('lt-LT', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} · {(doc.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleDownloadFile(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Atsisiųsti"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Ištrinti"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Nėra įkeltų dokumentų</p>
                        <p className="text-xs text-gray-500 mt-1">Įkelkite dokumentus naudodami mygtuką aukščiau</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-2">
                  <div className="text-center py-8 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                    <Upload className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 font-medium">Failai galės būti įkelti po transporto sukūrimo</p>
                    <p className="text-xs text-blue-600 mt-1">Pirmiausia išsaugokite transporto priemonę</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowVehicleModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveVehicle}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                <Save className="w-4 h-4" />
                {editingVehicle ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReadingsModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Atnaujinti rodmenis</h3>
              <button onClick={() => setShowReadingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Transportas</p>
                <p className="font-bold text-gray-900">
                  {selectedVehicle.registration_number} - {selectedVehicle.make} {selectedVehicle.model}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rida (km)</label>
                <input
                  type="number"
                  step="0.1"
                  min={selectedVehicle.current_mileage}
                  value={readingsForm.mileage}
                  onChange={e => setReadingsForm({ ...readingsForm, mileage: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dabartinė: {selectedVehicle.current_mileage?.toLocaleString()} km
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motovalandos</label>
                <input
                  type="number"
                  step="0.1"
                  min={selectedVehicle.current_engine_hours}
                  value={readingsForm.engine_hours}
                  onChange={e => setReadingsForm({ ...readingsForm, engine_hours: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dabartinės: {selectedVehicle.current_engine_hours} mval.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReadingsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleUpdateReadings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Atnaujinti
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkReadingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Suvesti motovalandas / ridą</h3>
              <button onClick={() => setShowBulkReadingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {bulkReadingsRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transportas</label>
                    <select
                      value={row.vehicle_id}
                      onChange={e => handleBulkRowChange(idx, 'vehicle_id', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Pasirinkite transportą</option>
                      {vehicles
                        .slice()
                        .sort((a, b) => a.registration_number.localeCompare(b.registration_number))
                        .map(v => (
                          <option key={v.id} value={v.id}>
                            {v.registration_number} - {v.make} {v.model} (dabar: {v.current_engine_hours ?? 0} mval.)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motovalandos</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={row.engine_hours}
                      onChange={e => handleBulkRowChange(idx, 'engine_hours', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="pvz. 150"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rida (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={row.mileage}
                      onChange={e => handleBulkRowChange(idx, 'mileage', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="(nebūtina)"
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      onClick={() => handleRemoveBulkRow(idx)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      disabled={bulkReadingsRows.length === 1}
                      title="Pašalinti"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <button
                  onClick={handleAddBulkRow}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti eilutę
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkReadingsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveBulkReadings}
                disabled={isSavingBulkReadings}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isSavingBulkReadings ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSavingBulkReadings ? 'Išsaugoma...' : 'Išsaugoti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailSidebar && selectedVehicle && (
        <VehicleDetailSidebar
          vehicle={selectedVehicle}
          onClose={() => {
            setShowDetailSidebar(false);
            setSelectedVehicle(null);
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
