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
  
  // L069: Only fill for foreign/special cases
  // "1" = foreign EU purchase, "2-9" = Article 96 cases
  // EMPTY for normal Lithuanian suppliers
  if (invoice.reverse_vat_indicator) {
    payload.L069 = invoice.reverse_vat_indicator;
  }
  
  if (invoice.non_vat_invoice) {
    payload.L070 = '1';
  }
  
  if (invoice.buyer_bank_account) {
    payload.L071 = truncateField(invoice.buyer_bank_account, 20);
  }
  
  // L072 (supplier bank account) - DO NOT FILL, not needed by their system
  
  if (invoice.payment_due_date) {
    payload.L075 = formatDateForSecretary(invoice.payment_due_date);
  }
  
  // L078-L081: Complex logic based on purchase type
  // 1. Foreign purchases (L069="1"): Fill L078-L081 with specific values
  // 2. Lithuanian Article 96 (L069="2-9"): Fill L078-L081 with specific values
  // 3. Lithuanian normal (L069 empty): Fill ONLY L078-L079
  // 4. Non-VAT payer: Don't fill any
  
  if (invoice.reverse_vat_indicator === '1') {
    // Foreign EU purchase - fill all four with FOREIGN-specific values
    payload.L078 = 'PVMPIRK';
    payload.L079 = 'Pirkimo PVM';
    payload.L080 = 'PVMMOK';
    payload.L081 = 'Mokėtino PVM';
  } else if (invoice.reverse_vat_indicator && invoice.reverse_vat_indicator !== '1') {
    // Article 96 cases (codes 2-9) - fill all four
    payload.L078 = 'GautPVM';
    payload.L079 = 'VMI prie LR FM';
    payload.L080 = 'MokPVM';
    payload.L081 = 'VMI prie LR FM';
  } else if (invoice.pvm_debtor_code) {
    // Lithuanian normal purchase with checkbox - fill only L078-L079
    payload.L078 = 'GautPVM';
    payload.L079 = 'Pirkimo PVM';
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

    // L009 must be manually selected by user (0=product, 1=service)
    // Validate it's filled
    if (item.product_service_flag === undefined || item.product_service_flag === null) {
      throw new Error(`Trūksta L009 (produktas/paslauga) eilutėje: ${item.description}`);
    }
    
    const lineItem: SecretaryInvoiceLineItem = {
      L009: item.product_service_flag, // MANDATORY: 0=product, 1=service (USER selects)
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
      // L030 must be numeric (up to 4 digits), skip if text
      const expenseStructure = String(item.accounting_op1_expense_structure).trim();
      if (/^\d{1,4}$/.test(expenseStructure)) {
        lineItem.L030 = expenseStructure;
      }
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
  
  const escapeCSV = (value: any, isNumeric: boolean = false): string => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value);
    
    // Numeric fields don't need quotes unless they contain special chars
    if (isNumeric) {
      return str;
    }
    
    // Text fields always wrapped in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };
  
  // Header row with ALL L-fields (L001-L084)
  const headers = [
    'L001', 'L002', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008',
    'L009', 'L010', 'L011', 'L012', 'L013', 'L014', 'L015', 'L016', 'L017',
    'L018', 'L019', 'L020', 'L021', 'L022', 'L023', 'L024', 'L025', 'L026', 'L027',
    'L028', 'L029', 'L030', 'L031', 'L032', 'L033', 'L034', 'L035', 'L036', 'L037', 'L038', 'L039',
    'L040', 'L041', 'L042', 'L043', 'L044', 'L045', 'L046', 'L047', 'L048', 'L049',
    'L050', 'L051', 'L052', 'L053', 'L054', 'L055', 'L056', 'L057', 'L058',
    'L059', 'L060', 'L061',
    'L064', 'L065', 'L066', 'L067', 'L068', 'L069', 'L070', 'L071', 'L072', 'L073', 'L074', 'L075', 'L076', 'L077',
    'L078', 'L079', 'L080', 'L081', 'L082', 'L083', 'L084'
  ];
  lines.push(headers.join(','));
  
  // Each line item becomes a row
  payload.items.forEach(item => {
    const fields: string[] = [];
    
    // Header fields (repeated for each line)
    fields.push(escapeCSV(payload.L001, true));  // Numeric: branch number
    fields.push(escapeCSV(payload.L002, true));  // Numeric: document type
    fields.push(escapeCSV(payload.L003 || ''));  // Text: series + number
    fields.push(escapeCSV(payload.L004 || '', true));  // Numeric: number only
    fields.push(escapeCSV(payload.L005, true));  // Numeric: date (yyyymmdd)
    fields.push(escapeCSV(payload.L006, true));  // Numeric: supplier code
    fields.push(escapeCSV(payload.L007));  // Text: supplier name
    fields.push(escapeCSV(payload.L008));  // Text: currency
    
    // Line item fields (L009-L039)
    fields.push(escapeCSV(item.L009, true));  // Numeric: product/service flag (MANDATORY)
    fields.push(escapeCSV(item.L010, true));  // Numeric: product code
    fields.push(escapeCSV(item.L011));  // Text: description
    fields.push(escapeCSV(item.L012));  // Text: unit type
    fields.push(escapeCSV(item.L013, true));  // Numeric: quantity sign
    fields.push(escapeCSV(item.L014, true));  // Numeric: quantity * 1000
    fields.push(escapeCSV(item.L015, true));  // Numeric: sum * 100
    fields.push(escapeCSV(item.L016, true));  // Numeric: VAT rate * 100
    fields.push(escapeCSV(item.L017, true));  // Numeric: VAT sum * 100
    fields.push(escapeCSV(item.L018 || '', true));  // Numeric: receiving branch
    fields.push(escapeCSV(item.L019 || ''));  // Text: buyer company code
    fields.push(escapeCSV(item.L020 || ''));  // Text: buyer VAT code
    fields.push(escapeCSV(item.L021 || ''));  // Text: buyer address
    fields.push(escapeCSV(item.L022, true));  // Numeric: responsible person code
    fields.push(escapeCSV(item.L023));  // Text: responsible person name
    fields.push(escapeCSV(item.L024 || '', true));  // Numeric: structural unit code
    fields.push(escapeCSV(item.L025 || ''));  // Text: structural unit name
    fields.push(escapeCSV(item.L026 || '', true));  // Numeric: object code
    fields.push(escapeCSV(item.L027 || ''));  // Text: object name
    fields.push(escapeCSV(item.L028, true));  // Numeric: accounting debit
    fields.push(escapeCSV(item.L029, true));  // Numeric: accounting credit
    fields.push(escapeCSV(item.L030 || '', true));  // Numeric: expense structure
    fields.push(escapeCSV(item.L031 || ''));  // Text: expense structure name
    fields.push(escapeCSV(item.L032 || '', true));  // Numeric: realization direction
    fields.push(escapeCSV(item.L033 || ''));  // Text: realization direction name
    fields.push(escapeCSV(item.L034 || '', true));  // Numeric: 2nd op debit
    fields.push(escapeCSV(item.L035 || '', true));  // Numeric: 2nd op credit
    fields.push(escapeCSV(item.L036 || '', true));  // Numeric: 2nd op expense structure
    fields.push(escapeCSV(item.L037 || ''));  // Text: 2nd op expense structure name
    fields.push(escapeCSV(item.L038 || '', true));  // Numeric: 2nd op realization direction
    fields.push(escapeCSV(item.L039 || ''));  // Text: 2nd op realization direction name
    
    // Tourism accounting fields (L040-L058) - empty for non-tourism
    fields.push(escapeCSV(payload.L040 || '', true));  // Numeric: 3rd op debit
    fields.push(escapeCSV(payload.L041 || '', true));  // Numeric: 3rd op credit
    fields.push(escapeCSV(payload.L042 || '', true));  // Numeric: 3rd op expense structure
    fields.push(escapeCSV(payload.L043 || ''));  // Text: 3rd op expense structure name
    fields.push(escapeCSV(payload.L044 || '', true));  // Numeric: 3rd op realization direction
    fields.push(escapeCSV(payload.L045 || ''));  // Text: 3rd op realization direction name
    fields.push(escapeCSV(payload.L046 || '', true));  // Numeric: 4th op debit
    fields.push(escapeCSV(payload.L047 || '', true));  // Numeric: 4th op credit
    fields.push(escapeCSV(payload.L048 || '', true));  // Numeric: 4th op expense structure
    fields.push(escapeCSV(payload.L049 || ''));  // Text: 4th op expense structure name
    fields.push(escapeCSV(payload.L050 || '', true));  // Numeric: 4th op realization direction
    fields.push(escapeCSV(payload.L051 || ''));  // Text: 4th op realization direction name
    fields.push(escapeCSV(payload.L052 || '', true));  // Numeric: supplier code (tourism)
    fields.push(escapeCSV(payload.L053 || ''));  // Text: supplier name (tourism)
    fields.push(escapeCSV(payload.L054 || ''));  // Text: supplier currency (tourism)
    fields.push(escapeCSV(payload.L055 || '', true));  // Numeric: buyer currency rate
    fields.push(escapeCSV(payload.L056 || '', true));  // Numeric: supplier currency rate
    fields.push(escapeCSV(payload.L057 || '', true));  // Numeric: discount sum
    fields.push(escapeCSV(payload.L058 || '', true));  // Numeric: markup sum
    
    // Cash payment fields (L059-L061) - empty for non-cash
    fields.push(escapeCSV(payload.L059 || '', true));  // Numeric: accountable person code
    fields.push(escapeCSV(payload.L060 || ''));  // Text: accountable person name
    fields.push(escapeCSV(payload.L061 || ''));  // Text: accountable person currency
    
    // Document classification and VAT fields (L064-L084)
    fields.push(escapeCSV(payload.L064 || ''));  // Text: document type flag
    fields.push(escapeCSV(payload.L065 || ''));  // Text: payer VAT code
    fields.push(escapeCSV(payload.L066 || '', true));  // Numeric: payer company code
    fields.push(escapeCSV(payload.L067 || ''));  // Text: payer address
    fields.push(escapeCSV(payload.L068 || '', true));  // Numeric: order number
    fields.push(escapeCSV(payload.L069 || '', true));  // Numeric: reverse VAT indicator
    fields.push(escapeCSV(payload.L070 || '', true));  // Numeric: non-VAT flag
    fields.push(escapeCSV(payload.L071 || ''));  // Text: buyer bank account
    fields.push(escapeCSV(payload.L072 || ''));  // Text: supplier bank account
    fields.push(escapeCSV(payload.L073 || '', true));  // Numeric: total taxable amount
    fields.push(escapeCSV(payload.L074 || '', true));  // Numeric: total VAT amount
    fields.push(escapeCSV(payload.L075 || '', true));  // Numeric: payment due date
    fields.push(escapeCSV(payload.L076 || '', true));  // Numeric: sales manager code
    fields.push(escapeCSV(payload.L077 || ''));  // Text: sales manager name
    fields.push(escapeCSV(payload.L078 || ''));  // Text: VAT debtor code
    fields.push(escapeCSV(payload.L079 || ''));  // Text: VAT debtor name
    fields.push(escapeCSV(payload.L080 || ''));  // Text: VAT creditor code
    fields.push(escapeCSV(payload.L081 || ''));  // Text: VAT creditor name
    fields.push(escapeCSV(payload.L082 || '', true));  // Numeric: OSS flag
    fields.push(escapeCSV(payload.L083 || ''));  // Text: contact email
    fields.push(escapeCSV(payload.L084 || ''));  // Text: OSS country code
    
    lines.push(fields.join(','));
  });
  
  return lines.join('\n');
}
