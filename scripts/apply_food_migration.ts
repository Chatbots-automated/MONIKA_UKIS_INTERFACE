import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const connectionString = `postgresql://postgres.${projectRef}:${supabaseKey.split('.')[2]}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function runMigration(filename: string) {
  console.log(`\nRunning: ${filename}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('  Connected to database');
    
    await client.query(sql);
    console.log('✓ Success');
    
    await client.end();
    return true;
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    await client.end();
    return false;
  }
}

async function main() {
  console.log('Applying Food Preferences migration...');
  console.log('This will create the "Pietūs" (Food) module tables and views.\n');
  
  const migrations = [
    '20260405000000_create_food_preferences.sql',
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('\nMigration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n✓ Food preferences migration completed successfully!');
  console.log('\nYou can now:');
  console.log('1. Workers can log in and mark their food preferences in the "Pietūs" tab');
  console.log('2. Admins can view food orders in Admin Dashboard > Pietūs');
}

main();
