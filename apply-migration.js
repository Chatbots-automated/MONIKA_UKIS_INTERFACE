const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://olxnahsxvyiadknybagt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.s8Pd2oJYw5gk3FqF5mWVqgRU8H5D4cBjLlJZX5Iq8D8'
);

const sql = fs.readFileSync('./supabase/migrations/20251102190151_create_audit_logging_system.sql', 'utf8');

(async () => {
  try {
    const response = await fetch('https://olxnahsxvyiadknybagt.supabase.co/rest/v1/rpc/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzE3ODYsImV4cCI6MjA2ODM0Nzc4Nn0.VWlE-VheDuyTNvvA59sjlNWOtWh4jN-phWoTCSR7VVU'
      },
      body: JSON.stringify({ query: sql })
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
