const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://olxnahsxvyiadknybagt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwOTQ4NTcsImV4cCI6MjA0OTY3MDg1N30.Uu8YzGRLQfvSHVFmZcyJtKwUOhDMBZPJAYvl-FrRvJE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔄 Adding "Tiekėjo paslaugos" category...\n');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260408000005_add_supplier_services_category.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📝 Changes:');
    console.log('   - Added "Tiekėjo paslaugos" category');
    console.log('   - This category will be used for supplier services');
    console.log('   - Items with this category will auto-create nurašymo acts');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
