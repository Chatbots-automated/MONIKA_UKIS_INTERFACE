const fs = require('fs');
require('dotenv').config();

console.log('🔧 Vaccination Stock Deduction Fix\n');
console.log('═══════════════════════════════════════════════════════════\n');

const migrationPath = './supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql';
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📝 Migration file ready: ' + migrationPath);
console.log('📏 Size: ' + Math.round(migrationSQL.length / 1024) + ' KB\n');

console.log('To apply this migration, use ONE of the following methods:\n');

console.log('1️⃣  SUPABASE DASHBOARD (Recommended)');
console.log('   ┌─────────────────────────────────────────────────┐');
console.log('   │ a) Open your Supabase project dashboard        │');
console.log('   │ b) Navigate to SQL Editor                      │');
console.log('   │ c) Create a new query                          │');
console.log('   │ d) Copy-paste the SQL from the migration file  │');
console.log('   │ e) Click "Run"                                 │');
console.log('   └─────────────────────────────────────────────────┘\n');

console.log('2️⃣  SUPABASE CLI (if installed)');
console.log('   $ supabase db push\n');

console.log('3️⃣  MANUAL EXECUTION (for reference)');
console.log('   The migration will:');
console.log('   ✓ Add vaccination_id column to usage_items');
console.log('   ✓ Create trigger to auto-generate usage_items from vaccinations');
console.log('   ✓ Backfill existing vaccinations into usage_items');
console.log('   ✓ Prevent double-counting in reports\n');

console.log('═══════════════════════════════════════════════════════════\n');
console.log('⚡ After applying, vaccinations will automatically deduct stock!\n');
