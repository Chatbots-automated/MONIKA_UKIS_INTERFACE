import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = fs.readFileSync('./prevention_course_migration.sql', 'utf8');

console.log('📦 Prevention Course Support Migration');
console.log('=====================================\n');
console.log('This migration adds support for multi-day prevention courses (e.g., 3 boluses over 3 days).');
console.log('Medications are only deducted from inventory when each visit is marked as "Baigtas".\n');
console.log('⚠️  This SQL needs to be run with service role permissions.');
console.log('Please copy and run this SQL in your Supabase SQL Editor:\n');
console.log(`https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1]}/sql/new\n`);
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('\n✅ After running this SQL, prevention courses will work just like treatment courses!');
