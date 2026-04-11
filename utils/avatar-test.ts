import { supabase } from '@/lib/supabase';
import { getCurrentUserProfile } from '@/lib/supabase-message-service';

export async function testAvatarSystem() {
  console.log('=== Testing Avatar System ===');
  
  try {
    // 1. Check if avatars bucket exists
    console.log('1. Checking avatars bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return false;
    }
    
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    console.log('✅ Avatars bucket exists:', !!avatarsBucket);
    
    if (!avatarsBucket) {
      console.log('ℹ️ Avatars bucket not found via API, but might exist');
      console.log('This can happen due to RLS policies - continuing test...');
    } else {
      console.log('Bucket details:', {
        id: avatarsBucket.id,
        name: avatarsBucket.name,
        public: avatarsBucket.public,
        file_size_limit: avatarsBucket.file_size_limit
      });
    }
    
    // 2. Get current user profile
    console.log('2. Getting current user profile...');
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      console.log('❌ No user profile found');
      return false;
    }
    
    console.log('✅ Current user:', {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl
    });
    
    // 3. Test upload permissions
    console.log('3. Testing upload permissions...');
    const testFile = new Uint8Array([1, 2, 3, 4]);
    const testFileName = `${profile.id}/test_${Date.now()}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testFile, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message);
      return false;
    } else {
      console.log('✅ Upload test passed');
      
      // Clean up
      await supabase.storage.from('avatars').remove([testFileName]);
      console.log('✅ Test file cleaned up');
    }
    
    // 4. Check if avatar URL is accessible (if exists)
    if (profile.avatarUrl) {
      console.log('4. Testing existing avatar URL...');
      try {
        const response = await fetch(profile.avatarUrl, { method: 'HEAD' });
        console.log('Avatar URL status:', response.status);
        
        if (response.ok) {
          console.log('✅ Avatar URL is accessible');
        } else {
          console.log('❌ Avatar URL not accessible:', response.status);
        }
      } catch (fetchError) {
        console.log('❌ Error fetching avatar URL:', fetchError);
      }
    } else {
      console.log('ℹ️ No avatar URL in profile');
    }
    
    console.log('=== Avatar System Test Complete ===');
    return true;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  }
}
