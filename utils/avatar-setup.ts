import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export async function setupAvatarsBucket(): Promise<boolean> {
  try {
    console.log('Setting up avatars bucket...');
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
    
    if (!avatarsBucket) {
      console.log('Avatars bucket not found, creating...');
      
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        console.error('Error creating avatars bucket:', createError);
        return false;
      }
      
      console.log('Avatars bucket created successfully');
    } else {
      console.log('Avatars bucket already exists');
    }
    
    // Test upload permission
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('Testing avatar upload permissions...');
      
      const testFile = new Uint8Array([1, 2, 3, 4]); // Small test file
      const testFileName = `${session.user.id}/test_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(testFileName, testFile, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Avatar upload test failed:', uploadError);
        console.log('You may need to set up RLS policies for the avatars bucket.');
        console.log('Please run the SQL migration: supabase/migrations/20241230_create_avatars_bucket.sql');
        return false;
      } else {
        console.log('Avatar upload test passed');
        
        // Clean up test file
        await supabase.storage.from('avatars').remove([testFileName]);
        console.log('Test file cleaned up');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up avatars bucket:', error);
    return false;
  }
}

export async function testAvatarUrl(userId: string): Promise<string | null> {
  try {
    console.log('Testing avatar URL for user:', userId);
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }
    
    console.log('Profile avatar_url:', profile.avatar_url);
    
    if (!profile.avatar_url) {
      console.log('No avatar_url in profile');
      return null;
    }
    
    // Test if URL is accessible
    try {
      const response = await fetch(profile.avatar_url, { method: 'HEAD' });
      console.log('Avatar URL response status:', response.status);
      
      if (response.ok) {
        console.log('Avatar URL is accessible');
        return profile.avatar_url;
      } else {
        console.log('Avatar URL is not accessible:', response.status);
        return null;
      }
    } catch (fetchError) {
      console.error('Error fetching avatar URL:', fetchError);
      return null;
    }
  } catch (error) {
    console.error('Error testing avatar URL:', error);
    return null;
  }
}
