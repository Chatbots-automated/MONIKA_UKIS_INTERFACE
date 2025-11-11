import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U'
);

const { data, error } = await supabase
  .from('gea_daily')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else {
  if (data && data[0]) {
    const columns = Object.keys(data[0]);
    console.log('Total columns:', columns.length);
    console.log('\nColumns found:');
    columns.forEach((col, idx) => {
      console.log((idx + 1) + '. ' + col);
    });
    
    console.log('\n\nSample data:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}
