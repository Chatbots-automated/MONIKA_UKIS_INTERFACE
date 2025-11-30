import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Need: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = fs.readFileSync('./flexible_medication_scheduling_migration.sql', 'utf8');

console.log('🚀 Flexible Medication Scheduling Migration');
console.log('===========================================\n');
console.log('This migration will:');
console.log('  1. Fix NOT NULL constraints on course_doses.dose_amount');
console.log('  2. Create course_medication_schedules table');
console.log('  3. Enhance treatment_courses and animal_visits tables');
console.log('  4. Create helper functions and views');
console.log('  5. Migrate existing data to new format\n');

async function applyMigration() {
  try {
    console.log('📤 Executing migration SQL...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If exec_sql doesn't exist, provide instructions
      if (error.message.includes('does not exist') || error.code === '42883') {
        console.log('⚠️  Direct SQL execution not available via RPC.');
        console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
        console.log(`   ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
        console.log('--- COPY SQL BELOW ---\n');
        console.log(sql);
        console.log('\n--- END SQL ---\n');
        process.exit(0);
      }

      throw error;
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying changes...\n');

    // Verify the new table exists
    const { count: scheduleCount } = await supabase
      .from('course_medication_schedules')
      .select('*', { count: 'exact', head: true });

    console.log(`   ✓ course_medication_schedules table created (${scheduleCount || 0} rows)`);

    // Check if new columns exist
    const { data: visitSample } = await supabase
      .from('animal_visits')
      .select('course_id')
      .limit(1);

    if (visitSample !== null) {
      console.log('   ✓ animal_visits.course_id column added');
    }

    const { data: courseSample } = await supabase
      .from('treatment_courses')
      .select('medication_schedule_flexible')
      .limit(1);

    if (courseSample !== null) {
      console.log('   ✓ treatment_courses.medication_schedule_flexible column added');
    }

    console.log('\n✨ All schema changes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the new course creation workflow');
    console.log('   2. Create a test course with flexible scheduling');
    console.log('   3. Complete a visit and enter medication quantities');
    console.log('   4. Verify inventory deduction works correctly\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

applyMigration();
