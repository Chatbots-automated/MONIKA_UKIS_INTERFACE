import pg from 'npm:pg@8.11.3';
import { config } from 'dotenv';

config();

const connectionString = 'postgresql://postgres.olxnahsxvyiadknybagt:FarmManagementSystem@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices'
    ORDER BY ordinal_position;
  `);
  
  console.log('Invoices table columns (' + result.rows.length + ' total):');
  result.rows.forEach((row, idx) => {
    console.log((idx + 1) + '. ' + row.column_name + ' (' + row.data_type + ') - Nullable: ' + row.is_nullable);
  });
  
  console.log('\n--- Checking migrations table ---');
  const migrations = await client.query(`
    SELECT version, name 
    FROM supabase_migrations.schema_migrations 
    WHERE name LIKE '%invoice%'
    ORDER BY version;
  `);
  
  console.log('Invoice-related migrations:');
  migrations.rows.forEach(row => {
    console.log(row.version + ' - ' + row.name);
  });
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await client.end();
}
