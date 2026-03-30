/**
 * Script to check existing users in Supabase database
 * Run this with: npx ts-node scripts/check-users.ts
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdgbuvgmzaqeajwxhldr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZ2J1dmdtemFxZWFqd3hobGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjAxNjQsImV4cCI6MjA3ODY5NjE2NH0.Cp2iEcqZe-2_ZvAQ5soG5kNtYlwWVHhwq_zjXvoY5w4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  console.log('🔍 Checking for existing users in Supabase...\n');

  try {
    // Check authenticated users
    console.log('📧 Checking authenticated users (Supabase Auth):');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️  Unable to list auth users (requires service role key)');
      console.log('   Error:', authError.message);
    } else if (users && users.length > 0) {
      console.log(`✅ Found ${users.length} authenticated user(s):\n`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`      Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log('');
      });
    } else {
      console.log('   No authenticated users found.\n');
    }

    // Check profiles table
    console.log('👤 Checking user profiles (profiles table):');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, email, name, username, created_at')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.log('❌ Error fetching profiles:', profileError.message);
    } else if (profiles && profiles.length > 0) {
      console.log(`✅ Found ${profiles.length} profile(s):\n`);
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. Name: ${profile.name}`);
        console.log(`      Username: ${profile.username}`);
        console.log(`      Email: ${profile.email}`);
        console.log(`      User ID: ${profile.user_id || 'N/A'}`);
        console.log(`      Created: ${new Date(profile.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No profiles found.\n');
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   - Authenticated users: ${users?.length || 0}`);
    console.log(`   - User profiles: ${profiles?.length || 0}`);
    console.log('');
    
    if ((users?.length || 0) === 0 && (profiles?.length || 0) === 0) {
      console.log('💡 No users found. This appears to be a fresh installation.');
      console.log('   Users can sign up through the app to create accounts.');
    }

  } catch (error: any) {
    console.error('❌ Error checking users:', error.message);
  }
}

// Run the check
checkUsers().then(() => {
  console.log('✨ Check complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
