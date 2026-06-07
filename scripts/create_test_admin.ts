import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestAdmin() {
  console.log('Creating test admin user...');
  
  const email = 'admin@zivatkauskuukis.lt';
  const password = 'admin123';
  
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Admin'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('Auth user created:', authData.user?.id);

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user!.id,
        email: email,
        full_name: 'Test Admin',
        role: 'admin',
        phone: '+370',
        is_frozen: false
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return;
    }

    console.log('\n✅ Test admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestAdmin();
