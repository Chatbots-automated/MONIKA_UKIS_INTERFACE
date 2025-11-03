// Action translations for admin dashboard
export const actionTranslations: { [key: string]: string } = {
  // Navigation
  'navigate_to_page': 'Puslapio apsilankymas',

  // Authentication
  'user_login': 'Prisijungimas',
  'user_logout': 'Atsijungimas',
  'failed_login': 'Nesėkmingas prisijungimas',

  // Animals
  'create_animal': 'Gyvūno sukūrimas',
  'update_animal': 'Gyvūno redagavimas',
  'delete_animal': 'Gyvūno ištrynimas',
  'view_animal_edit': 'Gyvūno peržiūra',

  // Products
  'create_product': 'Produkto sukūrimas',
  'update_product': 'Produkto redagavimas',
  'delete_product': 'Produkto ištrynimas',

  // Treatments
  'create_treatment': 'Gydymo sukūrimas',
  'update_treatment': 'Gydymo redagavimas',
  'delete_treatment': 'Gydymo ištrynimas',
  'test_treatment_creation': 'Gydymo testavimas',

  // Usage Items
  'create_usage_items': 'Vaistų naudojimas',
  'update_usage_items': 'Vaistų naudojimo redagavimas',

  // Vaccinations
  'create_vaccination': 'Vakcinavimas',
  'create_mass_vaccination': 'Masinis vakcinavimas',
  'update_vaccination': 'Vakcinavimo redagavimas',
  'delete_vaccination': 'Vakcinavimo ištrynimas',

  // Stock
  'receive_stock': 'Atsargų gavimas',
  'update_stock': 'Atsargų atnaujinimas',
  'stock_adjustment': 'Atsargų koregavimas',

  // Suppliers
  'create_supplier': 'Tiekėjo sukūrimas',
  'update_supplier': 'Tiekėjo redagavimas',
  'delete_supplier': 'Tiekėjo ištrynimas',

  // Visits
  'create_visit': 'Vizito sukūrimas',
  'update_visit': 'Vizito redagavimas',
  'delete_visit': 'Vizito ištrynimas',

  // Biocides
  'create_biocide': 'Biocido sukūrimas',
  'update_biocide': 'Biocido redagavimas',

  // Owner Medications
  'create_owner_med': 'Savininko vaistų sukūrimas',
  'update_owner_med': 'Savininko vaistų redagavimas',

  // Medical Waste
  'create_medical_waste': 'Medicininių atliekų įrašas',
  'update_medical_waste': 'Medicininių atliekų redagavimas',

  // User Management
  'freeze_user': 'Vartotojo užšaldymas',
  'unfreeze_user': 'Vartotojo atšaldymas',
  'create_user': 'Vartotojo sukūrimas',
  'update_user': 'Vartotojo redagavimas',
  'update_user_role': 'Vartotojo rolės keitimas',
  'delete_user': 'Vartotojo ištrynimas',

  // Reports
  'generate_report': 'Ataskaitos generavimas',
  'export_report': 'Ataskaitos eksportavimas',

  // System
  'system_error': 'Sistemos klaida',
  'data_import': 'Duomenų importavimas',
  'data_export': 'Duomenų eksportavimas',
};

// Get translated action name or return original if not found
export function translateAction(action: string): string {
  return actionTranslations[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get action category for grouping
export function getActionCategory(action: string): string {
  if (action.includes('login') || action.includes('logout')) return 'Autentifikacija';
  if (action.includes('animal')) return 'Gyvūnai';
  if (action.includes('product')) return 'Produktai';
  if (action.includes('treatment') || action.includes('usage_items')) return 'Gydymas';
  if (action.includes('vaccination')) return 'Vakcinavimas';
  if (action.includes('stock')) return 'Atsargos';
  if (action.includes('supplier')) return 'Tiekėjai';
  if (action.includes('visit')) return 'Vizitai';
  if (action.includes('biocide')) return 'Biocidai';
  if (action.includes('owner_med')) return 'Savininko vaistai';
  if (action.includes('medical_waste')) return 'Medicininės atliekos';
  if (action.includes('user') || action.includes('freeze') || action.includes('unfreeze')) return 'Vartotojai';
  if (action.includes('report')) return 'Ataskaitos';
  if (action.includes('navigate')) return 'Navigacija';
  return 'Kita';
}

// Get icon color for action category
export function getActionCategoryColor(action: string): string {
  const category = getActionCategory(action);
  switch (category) {
    case 'Autentifikacija': return 'text-emerald-600';
    case 'Gyvūnai': return 'text-blue-600';
    case 'Produktai': return 'text-purple-600';
    case 'Gydymas': return 'text-red-600';
    case 'Vakcinavimas': return 'text-pink-600';
    case 'Atsargos': return 'text-orange-600';
    case 'Tiekėjai': return 'text-yellow-600';
    case 'Vizitai': return 'text-green-600';
    case 'Biocidai': return 'text-indigo-600';
    case 'Savininko vaistai': return 'text-cyan-600';
    case 'Medicininės atliekos': return 'text-gray-600';
    case 'Vartotojai': return 'text-violet-600';
    case 'Ataskaitos': return 'text-blue-600';
    case 'Navigacija': return 'text-gray-400';
    default: return 'text-gray-600';
  }
}
