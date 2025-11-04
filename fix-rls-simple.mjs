import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://olxnahsxvyiadknybagt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seG5haHN4dnlpYWRrbnliYWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzE3ODYsImV4cCI6MjA2ODM0Nzc4Nn0.VWlE-VheDuyTNvvA59sjlNWOtWh4jN-phWoTCSR7VVU'
);

// Try to create a test visit
(async () => {
  try {
    // First, sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // You'll need to use actual credentials
      password: 'testpassword'
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('Authenticated as:', authData.user.email);

    // Try to insert a visit
    const { data, error } = await supabase
      .from('animal_visits')
      .insert({
        animal_id: 'some-uuid',
        visit_datetime: new Date().toISOString(),
        procedures: ['Gydymas'],
        status: 'Planuojamas'
      })
      .select();

    if (error) {
      console.error('Insert error:', error);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
