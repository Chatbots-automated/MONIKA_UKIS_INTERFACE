const fs = require('fs');
const https = require('https');
require('dotenv').config();

const migrationSQL = fs.readFileSync(
  './supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql',
  'utf8'
);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('🔧 Executing migration via Supabase REST API...\n');

// Supabase doesn't provide a direct SQL execution endpoint via REST
// We need to use PostgREST's rpc functionality

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify({
  query: migrationSQL
});

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
      console.log('✅ Migration executed successfully!\n');
      console.log('🎉 Vaccinations will now automatically deduct from stock!\n');
    } else if (res.statusCode === 404) {
      console.log('❌ exec_sql function not found\n');
      console.log('📝 Please apply the migration manually using Supabase Dashboard:\n');
      console.log('   1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('   2. Copy-paste the SQL from: supabase/migrations/20251230000000_fix_vaccination_stock_deduction.sql');
      console.log('   3. Click "Run"\n');
    } else {
      console.log(`❌ Error: HTTP ${res.statusCode}`);
      console.log('Response:', responseData);
      console.log('\n📝 Please apply the migration manually using Supabase Dashboard\n');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  console.log('\n📝 Please apply the migration manually using Supabase Dashboard\n');
});

req.write(data);
req.end();
