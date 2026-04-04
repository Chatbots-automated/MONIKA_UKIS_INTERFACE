import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try with AWS region endpoint
const client = new pg.Client({
  connectionString: 'postgresql://postgres.olxnahsxvyiadknybagt:bwhbdWIlcp3B9NuF@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`);
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', filename), 'utf8');
  
  try {
    await client.query(sql);
    console.log(`✓ ${filename} completed successfully`);
    return true;
  } catch (err) {
    console.error(`✗ Error in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected');

    const migrations = [
      '20260213000007_fix_overnight_hours_step1.sql',
      '20260213000008_fix_overnight_hours_step2.sql',
      '20260213000009_fix_overnight_hours_step3.sql',
      '20260213000010_fix_overnight_hours_step4.sql'
    ];

    for (const migration of migrations) {
      const success = await runMigration(migration);
      if (!success) {
        console.log('\nStopping due to error.');
        process.exit(1);
      }
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
