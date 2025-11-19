import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Applying synchronization system migration...\n');

async function runMigration() {
  try {
    // Step 1: Create synchronization_protocols table
    console.log('Creating synchronization_protocols table...');
    const { error: e1 } = await supabase.from('synchronization_protocols').select('id').limit(1);
    if (e1 && e1.code === 'PGRST204') {
      console.log('❌ Need to create tables using database admin access');
      console.log('\nPlease run this SQL directly in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/olxnahsxvyiadknybagt/sql/new');
      console.log('\n--- Copy the SQL from supabase/migrations/20251119000000_create_synchronization_system.sql ---\n');
      return;
    }

    console.log('✅ Tables already exist or created!');

    // Step 2: Insert default protocols
    console.log('\nInserting default protocols...');

    const protocols = [
      {
        name: 'Ovsinhr 56',
        description: 'Basic synchronization protocol with 3 medication steps',
        steps: [
          {step: 1, medication: "Ovarelin", day_offset: 0},
          {step: 2, medication: "Enzaprost", day_offset: 2},
          {step: 3, medication: "Ovarelin vakare", day_offset: 3, is_evening: true},
          {step: 4, medication: "Sėklinti", day_offset: 4, is_insemination: true}
        ]
      },
      {
        name: 'GGPG',
        description: 'Extended synchronization protocol with 4 medication steps',
        steps: [
          {step: 1, medication: "Ovarelin", day_offset: 0},
          {step: 2, medication: "Ovarelin", day_offset: 7},
          {step: 3, medication: "Enzaprost", day_offset: 14},
          {step: 4, medication: "Ovarelin vakare", day_offset: 16, is_evening: true},
          {step: 5, medication: "Sėklinti", day_offset: 17, is_insemination: true}
        ]
      },
      {
        name: 'G7G',
        description: 'Advanced synchronization protocol with 5 medication steps',
        steps: [
          {step: 1, medication: "Enzaprost", day_offset: 0},
          {step: 2, medication: "Ovarelin", day_offset: 3},
          {step: 3, medication: "Ovarelin", day_offset: 10},
          {step: 4, medication: "Enzaprost", day_offset: 17},
          {step: 5, medication: "Ovarelin Vakare", day_offset: 19, is_evening: true},
          {step: 6, medication: "Sėklinti", day_offset: 20, is_insemination: true}
        ]
      }
    ];

    for (const protocol of protocols) {
      const { data, error } = await supabase
        .from('synchronization_protocols')
        .upsert(protocol, { onConflict: 'name' })
        .select();

      if (error) {
        console.log(`  ⚠️  ${protocol.name}: ${error.message}`);
      } else {
        console.log(`  ✅ ${protocol.name}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify tables exist in Supabase dashboard');
    console.log('2. Check that 3 protocols were inserted');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
