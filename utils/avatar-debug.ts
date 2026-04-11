import { supabase } from '@/lib/supabase';
import { getCurrentUserProfile } from '@/lib/supabase-message-service';

export async function debugAvatarSystem() {
  console.log('=== Avatar System Debug ===');
  
  try {
    // 1. Check if avatars bucket exists
    console.log('1. Checking avatars bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }
    
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    console.log('Avatars bucket exists:', !!avatarsBucket);
    
    if (!avatarsBucket) {
      console.log('❌ Avatars bucket not found - run SQL setup');
      return;
    }
    
    // 2. Get current user profile
    console.log('2. Getting current user profile...');
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      console.log('❌ No user profile found');
      return;
    }
    
    console.log('Current user:', {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl
    });
    
    // 3. Check if avatar URL is accessible
    if (profile.avatarUrl) {
      console.log('3. Testing avatar URL accessibility...');
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
    
    // 4. Test upload permissions
    console.log('4. Testing upload permissions...');
    const testFile = new Uint8Array([1, 2, 3, 4]);
    const testFileName = `${profile.id}/debug_${Date.now()}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testFile, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test passed');
      
      // Clean up
      await supabase.storage.from('avatars').remove([testFileName]);
      console.log('Test file cleaned up');
    }
    
    console.log('=== Debug Complete ===');
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

export async function checkOtherUserAvatar(userId: string) {
  console.log('=== Checking Other User Avatar ===');
  console.log('User ID:', userId);
  
  try {
    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    console.log('User profile:', {
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatar_url
    });
    
    if (!profile.avatar_url) {
      console.log('ℹ️ No avatar URL for this user');
      return null;
    }
    
    // Test URL accessibility
    try {
      const response = await fetch(profile.avatar_url, { method: 'HEAD' });
      console.log('Avatar URL response:', response.status);
      
      if (response.ok) {
        console.log('✅ Avatar is accessible');
        return profile.avatar_url;
      } else {
        console.log('❌ Avatar not accessible:', response.status);
        return null;
      }
    } catch (fetchError) {
      console.log('❌ Error accessing avatar:', fetchError);
      return null;
    }
    
  } catch (error) {
    console.error('Error checking avatar:', error);
    return null;
  }
}
