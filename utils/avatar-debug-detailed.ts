import { supabase } from '@/lib/supabase';
import { getConversations, getUserProfile } from '@/lib/supabase-message-service';

export async function debugOtherUserAvatars() {
  console.log('=== Debug Other User Avatars ===');
  
  try {
    // 1. Check if avatars bucket exists
    console.log('1. Checking avatars bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
    } else {
      const avatarsBucket = buckets.find(b => b.name === 'avatars');
      console.log('✅ Avatars bucket exists:', !!avatarsBucket);
      
      if (avatarsBucket) {
        console.log('Bucket details:', {
          id: avatarsBucket.id,
          name: avatarsBucket.name,
          public: avatarsBucket.public,
          file_size_limit: avatarsBucket.file_size_limit
        });
      }
    }
    
    // 2. Get conversations to see other users
    console.log('\n2. Getting conversations...');
    const conversations = await getConversations();
    
    if (conversations.length === 0) {
      console.log('ℹ️ No conversations found');
      return;
    }
    
    console.log(`Found ${conversations.length} conversations`);
    
    // 2. Check each conversation's participant avatar
    for (const conv of conversations) {
      console.log(`\n--- Conversation ${conv.id} ---`);
      console.log('Participant ID:', conv.participantId);
      console.log('Participant Name:', conv.participantName);
      console.log('Participant Avatar URL:', conv.participantAvatarUrl);
      
      if (!conv.participantAvatarUrl) {
        console.log('❌ No avatar URL in conversation');
        
        // Try to get the user's profile directly
        console.log('Fetching user profile directly...');
        const profile = await getUserProfile(conv.participantId);
        console.log('Direct profile fetch:', {
          id: profile?.id,
          name: profile?.name,
          avatarUrl: profile?.avatarUrl
        });
        
        if (!profile?.avatarUrl) {
          console.log('❌ User has no avatar in profile table');
        } else {
          console.log('✅ User has avatar in profile but not showing in conversation');
        }
      } else {
        console.log('✅ Avatar URL found in conversation');
        
        // Test if URL is accessible
        try {
          const response = await fetch(conv.participantAvatarUrl, { method: 'HEAD' });
          console.log('Avatar URL accessibility:', response.status);
          
          if (response.ok) {
            console.log('✅ Avatar URL is accessible');
          } else {
            console.log('❌ Avatar URL not accessible:', response.status);
          }
        } catch (fetchError) {
          console.log('❌ Error accessing avatar URL:', fetchError);
        }
      }
    }
    
    // 3. Check profiles table directly
    console.log('\n3. Checking profiles table directly...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log(`Found ${profiles.length} users with avatars:`);
      profiles.forEach(profile => {
        console.log(`- ${profile.name} (${profile.id}): ${profile.avatar_url}`);
      });
    }
    
    // 4. Check storage bucket contents
    console.log('\n4. Checking avatars storage bucket...');
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 100 });
    
    if (filesError) {
      console.error('Error listing avatars:', filesError);
    } else {
      console.log(`Found ${files.length} files in avatars bucket:`);
      files.forEach(file => {
        console.log(`- ${file.name} (${file.id})`);
      });
    }
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

export async function testAvatarDisplay(userId: string) {
  console.log(`=== Testing Avatar Display for User ${userId} ===`);
  
  try {
    // Get user profile
    const profile = await getUserProfile(userId);
    console.log('User profile:', {
      id: profile?.id,
      name: profile?.name,
      avatarUrl: profile?.avatarUrl
    });
    
    if (!profile?.avatarUrl) {
      console.log('❌ No avatar URL for this user');
      return null;
    }
    
    // Test URL accessibility
    const response = await fetch(profile.avatarUrl, { method: 'HEAD' });
    console.log('Avatar URL response:', response.status);
    
    if (response.ok) {
      console.log('✅ Avatar is accessible');
      return profile.avatarUrl;
    } else {
      console.log('❌ Avatar not accessible:', response.status);
      return null;
    }
    
  } catch (error) {
    console.error('Error testing avatar display:', error);
    return null;
  }
}
