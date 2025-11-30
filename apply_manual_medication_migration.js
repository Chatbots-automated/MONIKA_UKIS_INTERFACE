import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('./migrate_manual_medication_entry.sql', 'utf8');

console.log('📋 Manual Medication Entry Migration');
console.log('=====================================\n');
console.log('This migration will:');
console.log('1. Create helper functions for medication quantity tracking');
console.log('2. Reset qty values to null in existing future visits');
console.log('3. Create a view to identify visits needing medication entry\n');

console.log('⚠️  This SQL needs to be run with service role permissions.');
console.log('Please run this SQL in your Supabase SQL Editor:\n');
console.log(`${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
console.log('--- SQL TO RUN ---\n');
console.log(sql);
