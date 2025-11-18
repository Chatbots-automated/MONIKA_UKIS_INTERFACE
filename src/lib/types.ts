export type ProductCategory = 'medicines' | 'prevention' | 'vakcina' | 'reproduction' | 'treatment_materials' | 'hygiene' | 'biocide' | 'technical' | 'svirkstukai' | 'bolusas';
export type Unit = 'ml' | 'l' | 'g' | 'kg' | 'vnt' | 'tabletkė' | 'bolusas' | 'švirkštukas';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  primary_pack_unit: Unit;
  primary_pack_size: number | null;
  active_substance: string | null;
  registration_code: string | null;
  withdrawal_days: number | null;
  dosage_notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  vat_code: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  product_id: string;
  lot: string | null;
  mfg_date: string | null;
  expiry_date: string | null;
  supplier_id: string | null;
  doc_title: string | null;
  doc_number: string | null;
  doc_date: string | null;
  purchase_price: number | null;
  currency: string;
  received_qty: number;
  package_size: number | null;
  package_count: number | null;
  invoice_path: string | null;
  created_at: string;
}

export interface Animal {
  id: string;
  tag_no: string | null;
  species: string;
  sex: string | null;
  age_months: number | null;
  holder_name: string | null;
  holder_address: string | null;
  created_at: string;
}

export interface Disease {
  id: string;
  code: string | null;
  name: string;
}

export interface Treatment {
  id: string;
  reg_date: string;
  first_symptoms_date: string | null;
  animal_condition: string | null;
  tests: string | null;
  clinical_diagnosis: string | null;
  outcome: string | null;
  services: string | null;
  withdrawal_until: string | null;
  vet_name: string | null;
  vet_signature_path: string | null;
  notes: string | null;
  animal_id: string | null;
  disease_id: string | null;
  created_at: string;
}

export interface UsageItem {
  id: string;
  treatment_id: string;
  product_id: string;
  batch_id: string;
  qty: number;
  unit: Unit;
  purpose: string;
  created_at: string;
}

export interface OwnerMedAdmin {
  id: string;
  first_admin_date: string;
  product_id: string | null;
  dose_qty: number | null;
  dose_unit: Unit | null;
  supplier_name: string | null;
  purchase_proof: string | null;
  animal_ident: string | null;
  prescribing_vet: string | null;
  prescribing_vet_contacts: string | null;
  withdrawal_until: string | null;
  treatment_duration_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface BiocideUsage {
  id: string;
  product_id: string;
  batch_id: string | null;
  use_date: string;
  purpose: string | null;
  work_scope: string | null;
  qty: number;
  unit: Unit;
  used_by_name: string | null;
  user_signature_path: string | null;
  created_at: string;
}

export interface MedicalWaste {
  id: string;
  waste_code: string;
  name: string;
  period: string | null;
  date: string | null;
  qty_generated: number | null;
  qty_transferred: number | null;
  carrier: string | null;
  processor: string | null;
  transfer_date: string | null;
  doc_no: string | null;
  responsible: string | null;
  created_at: string;
}

export interface StockByBatch {
  batch_id: string;
  product_id: string;
  on_hand: number;
  expiry_date: string | null;
  lot: string | null;
  mfg_date: string | null;
}

export interface StockByProduct {
  product_id: string;
  name: string;
  category: ProductCategory;
  on_hand: number;
}

export type VisitStatus = 'Planuojamas' | 'Vykdomas' | 'Baigtas' | 'Atšauktas' | 'Neįvykęs';
export type VisitProcedure = 'Temperatūra' | 'Apžiūra' | 'Profilaktika' | 'Gydymas' | 'Vakcina' | 'Kita';

export interface AnimalVisit {
  id: string;
  animal_id: string;
  visit_datetime: string;
  procedures: VisitProcedure[];
  temperature: number | null;
  temperature_measured_at: string | null;
  status: VisitStatus;
  notes: string | null;
  vet_name: string | null;
  next_visit_required: boolean;
  next_visit_date: string | null;
  treatment_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimalVisitSummary {
  animal_id: string;
  tag_no: string | null;
  species: string;
  next_visit: string | null;
  last_visit: string | null;
}
