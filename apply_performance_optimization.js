import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = fs.readFileSync('./apply_performance_optimization.sql', 'utf8');

console.log('📊 Performance Optimization Migration');
console.log('=====================================\n');
console.log('This migration creates a view for latest animal collar numbers');
console.log('to dramatically improve page load times across the application.\n');
console.log('⚠️  This SQL needs to be run with service role permissions.');
console.log('Please run this SQL in your Supabase SQL Editor:\n');
console.log('https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new\n');
console.log('--- SQL to execute ---\n');
console.log(sql);
