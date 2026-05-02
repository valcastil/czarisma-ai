import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzgojvdcqsgywyzfxwqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Z29qdmRjcXNneXd5emZ4d3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzIxMTIsImV4cCI6MjA5MzMwODExMn0._-OpxV63ka7A18c4Y_pMRxaatkUEaqwdY8QztemZE1o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);

  try {
    // Test 1: Check connection by calling a simple RPC or checking auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('Auth Error:', authError.message);
    } else {
      console.log('✅ Auth service is accessible');
    }

    // Test 2: Try to list tables (will fail without auth but confirms connection)
    const { data: tables, error: tablesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (tablesError) {
      console.log('Profiles table access:', tablesError.message);
      if (tablesError.message.includes('does not exist')) {
        console.log('⚠️  Table "profiles" does not exist - you may need to run migrations');
      } else if (tablesError.code === 'PGRST301') {
        console.log('⚠️  Authentication required - this is expected for anon key without RLS policies');
      }
    } else {
      console.log('✅ Profiles table is accessible');
    }

    // Test 3: Check storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
      console.log('Storage access:', storageError.message);
    } else {
      console.log('✅ Storage is accessible');
      console.log('   Buckets:', buckets.map(b => b.name).join(', ') || 'none');
    }

    console.log('\n✅ Supabase connection is working!');

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
