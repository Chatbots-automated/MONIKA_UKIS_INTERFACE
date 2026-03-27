import { 
  SecretaryInvoiceExportPayload, 
  SecretaryInvoiceLineItem,
  formatDateForSecretary,
  formatQuantityForSecretary,
  formatAmountForSecretary 
} from '../types/secretary-system';

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  supplier_unique_code?: string;
  supplier_currency?: string;
  supplier_company_code?: string;
  supplier_vat_code?: string;
  supplier_address?: string;
  branch_number?: string;
  document_type?: string;
  document_series_number?: string;
  document_number_only?: string;
  document_type_flag?: string;
  reverse_vat_indicator?: string;
  non_vat_invoice?: boolean;
  buyer_bank_account?: string;
  supplier_bank_account?: string;
  payment_due_date?: string;
  pvm_debtor_code?: string;
  pvm_debtor_name?: string;
  pvm_creditor_code?: string;
  pvm_creditor_name?: string;
  oss_system_document?: boolean;
  contact_email?: string;
  oss_country_code?: string;
  total_net?: number;
  total_vat?: number;
  total_gross?: number;
}

interface InvoiceItemData {
  id: string;
  product_code?: string;
  description: string;
  unit_type?: string;
  quantity: number;
  quantity_sign?: number;
  unit_price: number;
  total_price: number;
  vat_rate?: number;
  vat_code?: string;
  vat_amount?: number;
  product_service_flag?: number;
  receiving_branch?: string;
  buyer_company_code?: string;
  buyer_vat_code?: string;
  buyer_address?: string;
  responsible_person_code?: string;
  responsible_person_name?: string;
  structural_unit_code?: string;
  structural_unit_name?: string;
  object_code?: string;
  object_name?: string;
  accounting_op1_debit?: string;
  accounting_op1_credit?: string;
  accounting_op1_expense_structure?: string;
  accounting_op1_expense_structure_name?: string;
  accounting_op1_realization_direction?: string;
  accounting_op1_realization_direction_name?: string;
  accounting_op2_debit?: string;
  accounting_op2_credit?: string;
  accounting_op2_expense_structure?: string;
  accounting_op2_expense_structure_name?: string;
  accounting_op2_realization_direction?: string;
  accounting_op2_realization_direction_name?: string;
  order_number?: string;
}

/**
 * Generate secretary system export payload from invoice data
 * Converts invoice and items into L001-L084 field structure
 */
export function generateSecretaryExportPayload(
  invoice: InvoiceData,
  items: InvoiceItemData[]
): SecretaryInvoiceExportPayload {
  
  // Validate mandatory header fields
  if (!invoice.supplier_unique_code) {
    throw new Error('Trūksta tiekėjo kodo (L006)');
  }
  
  if (!invoice.supplier_name) {
    throw new Error('Trūksta tiekėjo pavadinimo (L007)');
  }

  // Build header
  const payload: SecretaryInvoiceExportPayload = {
    L001: invoice.branch_number || '1', // Default branch
    L002: invoice.document_type || '865', // Purchase document
    L005: formatDateForSecretary(invoice.invoice_date),
    L006: invoice.supplier_unique_code,
    L007: truncateField(invoice.supplier_name, 45),
    L008: invoice.supplier_currency || 'EUR',
    items: [],
  };

  // Add document series/number
  // L003 is for series + number (e.g., ABC000254)
  // L004 is ONLY used when there's no series (just a number)
  if (invoice.document_series_number) {
    payload.L003 = truncateField(invoice.document_series_number, 15);
  } else {
    // Always use L003 with the invoice_number (which includes series if exists)
    payload.L003 = truncateField(invoice.invoice_number, 15);
  }

  // Add optional header fields
  // L064: Only "K" for credit notes, empty for normal purchases (never "P")
  if (invoice.document_type_flag === 'K') {
    payload.L064 = 'K';
  }
  
  // L069: "1" for EU purchases (default), other codes for special cases
  // Most common case is EU purchases, so default to "1" if not specified
  payload.L069 = invoice.reverse_vat_indicator || '1';
  
  if (invoice.non_vat_invoice) {
    payload.L070 = '1';
  }
  
  if (invoice.buyer_bank_account) {
    payload.L071 = truncateField(invoice.buyer_bank_account, 20);
  }
  
  if (invoice.supplier_bank_account) {
    payload.L072 = truncateField(invoice.supplier_bank_account, 20);
  }
  
  if (invoice.payment_due_date) {
    payload.L075 = formatDateForSecretary(invoice.payment_due_date);
  }
  
  // L078-L081: Only for reverse VAT purchases (foreign, electronics, round timber, construction)
  // When these fields are needed, use specific values:
  if (invoice.pvm_debtor_code || invoice.reverse_vat_indicator) {
    payload.L078 = 'GautPVM';
    payload.L079 = 'VMI prie LR FM';
    payload.L080 = 'MokPVM';
    payload.L081 = 'VMI prie LR FM';
  }
  
  if (invoice.oss_system_document) {
    payload.L082 = '1';
  }
  
  if (invoice.contact_email) {
    payload.L083 = truncateField(invoice.contact_email, 245);
  }
  
  if (invoice.oss_country_code) {
    payload.L084 = truncateField(invoice.oss_country_code, 2);
  }

  // Build line items
  payload.items = items.map(item => {
    // Validate mandatory item fields
    if (!item.product_code) {
      throw new Error(`Trūksta produkto kodo (L010) eilutėje: ${item.description}`);
    }
    
    if (!item.responsible_person_code) {
      throw new Error(`Trūksta materialiai atsakingo asmens kodo (L022) eilutėje: ${item.description}`);
    }
    
    if (!item.responsible_person_name) {
      throw new Error(`Trūksta materialiai atsakingo asmens pavadinimo (L023) eilutėje: ${item.description}`);
    }
    
    if (!item.accounting_op1_debit) {
      throw new Error(`Trūksta 1-os ūk. operacijos debeto (L028) eilutėje: ${item.description}`);
    }
    
    if (!item.accounting_op1_credit) {
      throw new Error(`Trūksta 1-os ūk. operacijos kredito (L029) eilutėje: ${item.description}`);
    }

    // Calculate VAT rate and code
    let vatRateField: string;
    if (item.vat_code && item.vat_rate === 0) {
      // Only use special code (A, B, C, D) when VAT rate is 0
      vatRateField = item.vat_code;
    } else if (item.vat_rate !== undefined && item.vat_rate !== null) {
      // Convert percentage to rate * 100 (e.g., 21% -> 2100, 5% -> 500, 9% -> 900)
      vatRateField = String(Math.round(item.vat_rate * 100));
    } else {
      // Default to 21% VAT
      vatRateField = '2100';
    }

    // Calculate VAT amount if not provided
    let vatAmount = item.vat_amount || 0;
    if (!vatAmount && item.vat_rate) {
      vatAmount = item.total_price * (item.vat_rate / 100);
    }

    const lineItem: SecretaryInvoiceLineItem = {
      L009: item.product_service_flag ?? 0,
      L010: truncateField(item.product_code, 20),
      L011: truncateField(item.description, 35),
      L012: truncateField(item.unit_type || 'vnt', 4),
      L013: item.quantity_sign ?? 0,
      L014: formatQuantityForSecretary(item.quantity),
      L015: formatAmountForSecretary(item.total_price),
      L016: vatRateField,
      L017: formatAmountForSecretary(vatAmount),
      L022: truncateField(item.responsible_person_code, 4),
      L023: truncateField(item.responsible_person_name, 35),
      L028: truncateField(item.accounting_op1_debit, 9),
      L029: truncateField(item.accounting_op1_credit, 9),
    };

    // Add optional item fields
    if (item.receiving_branch) {
      lineItem.L018 = truncateField(item.receiving_branch, 4);
    }
    
    if (item.buyer_company_code) {
      lineItem.L019 = truncateField(item.buyer_company_code, 13);
    }
    
    if (item.buyer_vat_code) {
      lineItem.L020 = truncateField(item.buyer_vat_code, 15);
    }
    
    if (item.buyer_address) {
      lineItem.L021 = truncateField(item.buyer_address, 80);
    }
    
    if (item.structural_unit_code) {
      lineItem.L024 = truncateField(item.structural_unit_code, 4);
    }
    
    if (item.structural_unit_name) {
      lineItem.L025 = truncateField(item.structural_unit_name, 35);
    }
    
    if (item.object_code) {
      lineItem.L026 = truncateField(item.object_code, 4);
    }
    
    if (item.object_name) {
      lineItem.L027 = truncateField(item.object_name, 35);
    }
    
    if (item.accounting_op1_expense_structure) {
      lineItem.L030 = truncateField(item.accounting_op1_expense_structure, 4);
    }
    
    if (item.accounting_op1_expense_structure_name) {
      lineItem.L031 = truncateField(item.accounting_op1_expense_structure_name, 35);
    }
    
    if (item.accounting_op1_realization_direction) {
      lineItem.L032 = truncateField(item.accounting_op1_realization_direction, 4);
    }
    
    if (item.accounting_op1_realization_direction_name) {
      lineItem.L033 = truncateField(item.accounting_op1_realization_direction_name, 35);
    }
    
    if (item.accounting_op2_debit) {
      lineItem.L034 = truncateField(item.accounting_op2_debit, 9);
    }
    
    if (item.accounting_op2_credit) {
      lineItem.L035 = truncateField(item.accounting_op2_credit, 9);
    }
    
    if (item.accounting_op2_expense_structure) {
      lineItem.L036 = truncateField(item.accounting_op2_expense_structure, 4);
    }
    
    if (item.accounting_op2_expense_structure_name) {
      lineItem.L037 = truncateField(item.accounting_op2_expense_structure_name, 35);
    }
    
    if (item.accounting_op2_realization_direction) {
      lineItem.L038 = truncateField(item.accounting_op2_realization_direction, 4);
    }
    
    if (item.accounting_op2_realization_direction_name) {
      lineItem.L039 = truncateField(item.accounting_op2_realization_direction_name, 35);
    }

    return lineItem;
  });

  return payload;
}

/**
 * Truncate field to maximum length
 */
function truncateField(value: string | number | undefined | null, maxLength: number): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Validate export payload before sending
 */
export function validateSecretaryPayload(payload: SecretaryInvoiceExportPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate header mandatory fields
  if (!payload.L001) errors.push('Trūksta filialo numerio (L001)');
  if (!payload.L002) errors.push('Trūksta dokumento tipo (L002)');
  if (!payload.L003 && !payload.L004) errors.push('Trūksta dokumento numerio (L003 arba L004)');
  if (!payload.L005) errors.push('Trūksta dokumento datos (L005)');
  if (!payload.L006) errors.push('Trūksta tiekėjo kodo (L006)');
  if (!payload.L007) errors.push('Trūksta tiekėjo pavadinimo (L007)');
  if (!payload.L008) errors.push('Trūksta tiekėjo valiutos (L008)');

  // Validate items
  if (!payload.items || payload.items.length === 0) {
    errors.push('Sąskaita neturi eilučių');
  } else {
    payload.items.forEach((item, index) => {
      const lineNo = index + 1;
      
      if (!item.L010) errors.push(`Eilutė ${lineNo}: Trūksta produkto kodo (L010)`);
      if (!item.L011) errors.push(`Eilutė ${lineNo}: Trūksta produkto pavadinimo (L011)`);
      if (!item.L012) errors.push(`Eilutė ${lineNo}: Trūksta mato vieneto (L012)`);
      if (item.L013 === undefined) errors.push(`Eilutė ${lineNo}: Trūksta kiekio ženklo (L013)`);
      if (!item.L014) errors.push(`Eilutė ${lineNo}: Trūksta kiekio (L014)`);
      if (!item.L015) errors.push(`Eilutė ${lineNo}: Trūksta sumos (L015)`);
      if (!item.L016) errors.push(`Eilutė ${lineNo}: Trūksta PVM tarifo (L016)`);
      if (item.L017 === undefined) errors.push(`Eilutė ${lineNo}: Trūksta PVM sumos (L017)`);
      if (!item.L022) errors.push(`Eilutė ${lineNo}: Trūksta materialiai atsakingo kodo (L022)`);
      if (!item.L023) errors.push(`Eilutė ${lineNo}: Trūksta materialiai atsakingo pavadinimo (L023)`);
      if (!item.L028) errors.push(`Eilutė ${lineNo}: Trūksta 1-os ūk. operacijos debeto (L028)`);
      if (!item.L029) errors.push(`Eilutė ${lineNo}: Trūksta 1-os ūk. operacijos kredito (L029)`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format payload for display/preview
 */
export function formatPayloadForDisplay(payload: SecretaryInvoiceExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Convert payload to CSV format
 */
export function convertPayloadToImportFile(payload: SecretaryInvoiceExportPayload): string {
  const lines: string[] = [];
  
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Header row with all L-fields
  const headers = [
    'L001', 'L002', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008',
    'L009', 'L010', 'L011', 'L012', 'L013', 'L014', 'L015', 'L016', 'L017',
    'L018', 'L019', 'L020', 'L021', 'L022', 'L023', 'L024', 'L025', 'L026', 'L027',
    'L028', 'L029', 'L030', 'L031', 'L032', 'L033', 'L034', 'L035', 'L036', 'L037', 'L038', 'L039',
    'L064', 'L068', 'L069', 'L070', 'L071', 'L072', 'L075', 'L078', 'L079', 'L080', 'L081', 'L082', 'L083', 'L084'
  ];
  lines.push(headers.join(','));
  
  // Each line item becomes a row
  payload.items.forEach(item => {
    const fields: string[] = [];
    
    // Header fields (repeated for each line)
    fields.push(escapeCSV(payload.L001));
    fields.push(escapeCSV(payload.L002));
    fields.push(escapeCSV(payload.L003 || ''));
    fields.push(escapeCSV(payload.L004 || ''));
    fields.push(escapeCSV(payload.L005));
    fields.push(escapeCSV(payload.L006));
    fields.push(escapeCSV(payload.L007));
    fields.push(escapeCSV(payload.L008));
    
    // Line item fields
    fields.push(escapeCSV(item.L009));
    fields.push(escapeCSV(item.L010));
    fields.push(escapeCSV(item.L011));
    fields.push(escapeCSV(item.L012));
    fields.push(escapeCSV(item.L013));
    fields.push(escapeCSV(item.L014));
    fields.push(escapeCSV(item.L015));
    fields.push(escapeCSV(item.L016));
    fields.push(escapeCSV(item.L017));
    fields.push(escapeCSV(item.L018 || ''));
    fields.push(escapeCSV(item.L019 || ''));
    fields.push(escapeCSV(item.L020 || ''));
    fields.push(escapeCSV(item.L021 || ''));
    fields.push(escapeCSV(item.L022));
    fields.push(escapeCSV(item.L023));
    fields.push(escapeCSV(item.L024 || ''));
    fields.push(escapeCSV(item.L025 || ''));
    fields.push(escapeCSV(item.L026 || ''));
    fields.push(escapeCSV(item.L027 || ''));
    fields.push(escapeCSV(item.L028));
    fields.push(escapeCSV(item.L029));
    fields.push(escapeCSV(item.L030 || ''));
    fields.push(escapeCSV(item.L031 || ''));
    fields.push(escapeCSV(item.L032 || ''));
    fields.push(escapeCSV(item.L033 || ''));
    fields.push(escapeCSV(item.L034 || ''));
    fields.push(escapeCSV(item.L035 || ''));
    fields.push(escapeCSV(item.L036 || ''));
    fields.push(escapeCSV(item.L037 || ''));
    fields.push(escapeCSV(item.L038 || ''));
    fields.push(escapeCSV(item.L039 || ''));
    
    // Optional header fields
    fields.push(escapeCSV(payload.L064 || ''));
    fields.push(escapeCSV(payload.L068 || ''));
    fields.push(escapeCSV(payload.L069 || ''));
    fields.push(escapeCSV(payload.L070 || ''));
    fields.push(escapeCSV(payload.L071 || ''));
    fields.push(escapeCSV(payload.L072 || ''));
    fields.push(escapeCSV(payload.L075 || ''));
    fields.push(escapeCSV(payload.L078 || ''));
    fields.push(escapeCSV(payload.L079 || ''));
    fields.push(escapeCSV(payload.L080 || ''));
    fields.push(escapeCSV(payload.L081 || ''));
    fields.push(escapeCSV(payload.L082 || ''));
    fields.push(escapeCSV(payload.L083 || ''));
    fields.push(escapeCSV(payload.L084 || ''));
    
    lines.push(fields.join(','));
  });
  
  return lines.join('\n');
}
