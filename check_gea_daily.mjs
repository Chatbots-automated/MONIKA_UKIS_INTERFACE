import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

console.log('Checking gea_daily table...\n');

// Get sample data
const { data, error } = await supabase
  .from('gea_daily')
  .select('*')
  .limit(3);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Sample rows:', JSON.stringify(data, null, 2));
  if (data && data[0]) {
    console.log('\nColumns:', Object.keys(data[0]).join(', '));
  }
}

// Get count
const { count } = await supabase
  .from('gea_daily')
  .select('*', { count: 'exact', head: true });

console.log('\nTotal rows:', count);
