// Secretary System Integration Types
// Based on Importas_struktūra(865) - Purchase Document Structure

export interface SecretaryMaterial {
  id: string;
  code: number; // Nom. nr.
  name: string;
  bar_code: string | null;
  product_code: string | null;
  unit_type: string;
  price: number;
  selling_price: number;
  product_code_2: string | null;
  group_code: number | null;
  group_name: string | null;
  vat_sale: number;
  vat_purchase: number;
  markup: number;
  alcohol: number;
  is_active: boolean;
  last_synced_at: string;
}

export interface SecretaryService {
  id: string;
  code: number;
  name: string;
  additional_info: string | null;
  is_active: boolean;
  last_synced_at: string;
}

export interface SecretarySupplier {
  id: string;
  code: number; // Unique code in their system
  name: string;
  company_code: string | null;
  vat_code: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  bank_code: number | null;
  bank_account: string | null;
  vmi: number | null;
  additional_info: string | null;
  account_group: string | null;
  account_type: string | null;
  account_name: string | null;
  accounting_account: number | null;
  currency: string;
  recipient_company_code: string | null;
  is_active: boolean;
  last_synced_at: string;
}

export interface SecretaryResponsiblePerson {
  id: string;
  code: number;
  name: string;
  additional_info: string | null; // Position/role
  is_active: boolean;
  last_synced_at: string;
}

export interface SecretaryAccountingOperation {
  id: string;
  code: number;
  name: string;
  debit: string | null;
  credit: string | null;
  expense_structure: string | null;
  is_active: boolean;
  last_synced_at: string;
}

// Complete L001-L084 field structure for export
export interface SecretaryInvoiceExportPayload {
  // Header fields (mandatory)
  L001: string; // Branch number (up to 4 digits, mandatory)
  L002: string; // Document type (865 for purchases, mandatory, fixed)
  L003?: string; // Document series and number (up to 15 chars, fill if both series and number exist)
  L004?: string; // Document number only (1-7 digits, mandatory if L003 not filled)
  L005: string; // Document date (yyyymmdd format, mandatory)
  L006: string; // Supplier unique code (up to 13 chars, mandatory)
  L007: string; // Supplier name (up to 45 chars, mandatory)
  L008: string; // Supplier currency (up to 3 chars, mandatory)
  
  // Line items (array of items)
  items: SecretaryInvoiceLineItem[];
  
  // Tourism accounting fields (L040-L058) - only for tourism
  L040?: string; // 3rd accounting operation debit
  L041?: string; // 3rd accounting operation credit
  L042?: string; // 3rd accounting operation expense structure
  L043?: string; // 3rd accounting operation expense structure name
  L044?: string; // 3rd accounting operation realization direction
  L045?: string; // 3rd accounting operation realization direction name
  L046?: string; // 4th accounting operation debit
  L047?: string; // 4th accounting operation credit
  L048?: string; // 4th accounting operation expense structure
  L049?: string; // 4th accounting operation expense structure name
  L050?: string; // 4th accounting operation realization direction
  L051?: string; // 4th accounting operation realization direction name
  L052?: string; // Supplier code (tourism only)
  L053?: string; // Supplier name (tourism only)
  L054?: string; // Supplier currency (tourism only)
  L055?: string; // Buyer currency rate * 1000000000000
  L056?: string; // Supplier currency rate * 1000000000000
  L057?: string; // Discount sum * 100
  L058?: string; // Markup sum * 100
  
  // Cash payment fields
  L059?: string; // Accountable person code (mandatory if cash payment)
  L060?: string; // Accountable person name (mandatory if cash payment)
  L061?: string; // Accountable person currency (mandatory if cash payment)
  
  // Document classification
  L064?: string; // Document type (P=normal, D=debit, K=credit, M=margin)
  L065?: string; // Payer (supplier) VAT code (up to 15 chars)
  L066?: string; // Payer (supplier) company code (up to 13 chars)
  L067?: string; // Payer (supplier) address (up to 80 chars)
  L068?: string; // Order number (up to 9 digits)
  
  // VAT handling
  L069?: string; // Reverse VAT indicator (1-9, 99)
  L070?: string; // Non-VAT invoice flag (1 = non-VAT)
  L071?: string; // Buyer bank account (20 chars)
  L072?: string; // Supplier bank account (20 chars)
  L073?: string; // Total taxable amount * 100 for single VAT rate (12 digits)
  L074?: string; // Total VAT amount * 100 for single VAT rate (12 digits)
  L075?: string; // Payment due date (yyyymmdd)
  L076?: string; // Sales manager code
  L077?: string; // Sales manager name (35 chars)
  
  // Special VAT cases (construction, wood, metal scrap)
  L078?: string; // VAT debtor code (13 chars, mandatory for construction/wood/metal)
  L079?: string; // VAT debtor name (45 chars, mandatory for construction/wood/metal)
  L080?: string; // VAT creditor code (13 chars, mandatory for construction/wood/metal)
  L081?: string; // VAT creditor name (45 chars, mandatory for construction/wood/metal)
  
  // OSS (One Stop Shop) system
  L082?: string; // OSS system document (1 = OSS)
  L083?: string; // Contact email (245 chars)
  L084?: string; // OSS country code (2 chars, letters only)
  
  // Accounting operation ID from their system
  L086?: string; // Accounting operation code (from secretary_accounting_operations.code)
}

export interface SecretaryInvoiceLineItem {
  L009: number; // Product/Service flag (0=product, 1=service) - MANDATORY, USER MUST SELECT MANUALLY
  L010: string; // Product/service unique code (up to 20 chars, mandatory, UNIQUE - SKU)
  L011: string; // Product/service name (up to 35 chars, mandatory)
  L086?: string; // Accounting operation code from their system (secretary_accounting_operations.code)
  L012: string; // Unit of measure (up to 4 chars, mandatory)
  L013: number; // Quantity/sum sign (0=positive, 1=negative, mandatory)
  L014: number; // Quantity * 1000 (up to 12 digits, integer, mandatory)
  L015: number; // Sum * 100 (up to 12 digits, integer, mandatory)
  L016: string; // VAT rate * 100 OR special code (A, B, C, D, XNNN format)
  L017: number; // VAT sum * 100 (up to 12 digits, integer, mandatory)
  L018?: string; // Receiving branch (up to 4 digits)
  L019?: string; // Buyer company code (up to 13 chars)
  L020?: string; // Buyer VAT code (up to 15 chars)
  L021?: string; // Buyer address (up to 80 chars)
  L022: string; // Materially responsible person code (up to 4 digits, mandatory)
  L023: string; // Materially responsible person name (up to 35 chars, mandatory)
  L024?: string; // Structural unit code (up to 4 digits)
  L025?: string; // Structural unit name (up to 35 chars)
  L026?: string; // Object code (up to 4 digits)
  L027?: string; // Object name (up to 35 chars)
  L028: string; // 1st accounting operation debit (up to 9 chars, mandatory)
  L029: string; // 1st accounting operation credit (up to 9 chars, mandatory)
  L030?: string; // 1st accounting operation expense structure (up to 4 digits)
  L031?: string; // 1st accounting operation expense structure name (up to 35 chars)
  L032?: string; // 1st accounting operation realization direction (up to 4 digits)
  L033?: string; // 1st accounting operation realization direction name (up to 35 chars)
  L034?: string; // 2nd accounting operation debit (up to 9 chars)
  L035?: string; // 2nd accounting operation credit (up to 9 chars)
  L036?: string; // 2nd accounting operation expense structure (up to 4 digits)
  L037?: string; // 2nd accounting operation expense structure name (up to 35 chars)
  L038?: string; // 2nd accounting operation realization direction (up to 4 digits)
  L039?: string; // 2nd accounting operation realization direction name (up to 35 chars)
}

// Reverse VAT indicator options (L069)
export const REVERSE_VAT_OPTIONS = [
  { code: '1', label: 'Iš kitos ES valstybės narės įsigytos prekės' },
  { code: '2', label: 'Iš užsienio asmens neįsikūrusio šalies teritorijoje įsigytos prekės' },
  { code: '3', label: 'Prekės įsigytos PVM įstatymo 33(1) straipsnio 3 dalyje nustatytomis sąlygomis' },
  { code: '4', label: 'Turtas perimtas kaip turtinis įnašas arba dėl kito PVM mokėtojo reorganizavimo' },
  { code: '5', label: 'Perimti iš esmės pagerinti pastatai (statiniai)' },
  { code: '6', label: 'Iš Lietuvos gamintojų įsigytos prekės (Mediena, statybos darbai)' },
  { code: '7', label: 'Iš Lietuvos gamintojų įsigytos prekės (Metalo laužas)' },
  { code: '8', label: 'Iš Lietuvos gamintojų įsigytos prekės (Bankrotas/restruktūrizacija)' },
  { code: '9', label: 'Importo PVM kontroliuojamas VMI' },
  { code: '99', label: 'Pardavimas (atvirkštinis PVM)' },
];

// Document type options (L064)
export const DOCUMENT_TYPE_OPTIONS = [
  { code: 'P', label: 'Įprastas dokumentas' },
  { code: 'D', label: 'Debetinis dokumentas' },
  { code: 'K', label: 'Kreditinis dokumentas' },
  { code: 'M', label: 'Marža' },
];

// VAT special codes (L016)
export const VAT_SPECIAL_CODES = [
  { code: 'A', label: 'Neapmokestinamas' },
  { code: 'B', label: 'Nulinis' },
  { code: 'C', label: 'Ne PVM objektas' },
  { code: 'D', label: 'Nėra PVM-o' },
];

// Helper function to format date for secretary system (yyyymmdd)
export function formatDateForSecretary(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Helper function to format quantity for secretary system (multiply by 1000)
export function formatQuantityForSecretary(quantity: number): number {
  return Math.round(quantity * 1000);
}

// Helper function to format amount for secretary system (multiply by 100)
export function formatAmountForSecretary(amount: number): number {
  return Math.round(amount * 100);
}

// Validation rules
export const FIELD_VALIDATIONS = {
  L001: { maxLength: 4, type: 'numeric', mandatory: true },
  L002: { maxLength: 4, type: 'numeric', mandatory: true, fixed: '865' },
  L003: { maxLength: 15, type: 'alphanumeric', mandatory: false },
  L004: { maxLength: 7, type: 'numeric', mandatory: false }, // Mandatory if L003 not filled
  L005: { maxLength: 8, type: 'date', mandatory: true },
  L006: { maxLength: 13, type: 'alphanumeric', mandatory: true },
  L007: { maxLength: 45, type: 'text', mandatory: true },
  L008: { maxLength: 3, type: 'text', mandatory: true },
  L010: { maxLength: 20, type: 'alphanumeric', mandatory: true },
  L011: { maxLength: 35, type: 'text', mandatory: true },
  L012: { maxLength: 4, type: 'text', mandatory: true },
  L013: { maxLength: 1, type: 'numeric', mandatory: true },
  L014: { maxLength: 12, type: 'numeric', mandatory: true },
  L015: { maxLength: 12, type: 'numeric', mandatory: true },
  L016: { maxLength: 4, type: 'mixed', mandatory: true },
  L017: { maxLength: 12, type: 'numeric', mandatory: true },
  L022: { maxLength: 4, type: 'numeric', mandatory: true },
  L023: { maxLength: 35, type: 'text', mandatory: true },
  L028: { maxLength: 9, type: 'alphanumeric', mandatory: true },
  L029: { maxLength: 9, type: 'alphanumeric', mandatory: true },
};
