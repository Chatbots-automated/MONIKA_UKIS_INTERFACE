import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'olxnahsxvyiadknybagt';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc3MTc4NiwiZXhwIjoyMDY4MzQ3Nzg2fQ.PvB43f77FD-zVVO8Kf_OxJ5pUQg3xbDA7nuL4S3Dt5U';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`);
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', filename), 'utf8');
  
  try {
    await executeSQL(sql);
    console.log(`✓ ${filename} completed successfully`);
    return true;
  } catch (err) {
    console.error(`✗ Error in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  const migrations = [
    '20260213000007_fix_overnight_hours_step1.sql',
    '20260213000008_fix_overnight_hours_step2.sql',
    '20260213000009_fix_overnight_hours_step3.sql',
    '20260213000010_fix_overnight_hours_step4.sql'
  ];

  console.log('Starting migrations...\n');

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.log('\nStopping due to error.');
      process.exit(1);
    }
    // Add a small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✓ All migrations completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
