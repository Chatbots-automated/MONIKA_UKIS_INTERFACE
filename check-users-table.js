import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsersTable() {
  console.log('Checking users table structure...\n');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Users table columns:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('No data in users table');
  }
}

checkUsersTable();
