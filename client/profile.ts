import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/profile';
import { User } from '@supabase/supabase-js';

export const apiFetchProfile = async (
  user: User,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData) {
      console.error('User credentials or encryption functions are invalid');
      return {
        success: false,
        error: 'User credentials or encryption functions are invalid',
      };
    }

    console.log('Fetching profile for user:', user.id);

    // Fetch profile directly from the database
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return {
        success: false,
        error: profileError.message || 'Failed to load profile',
      };
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        data: undefined,
      };
    }

    // Decrypt the profile data
    const profile = profiles[0];
    const decryptedProfileData = await decryptData(profile.profile);

    const decryptedProfile: Profile = {
      ...profile,
      profile: decryptedProfileData,
    };

    return {
      success: true,
      data: decryptedProfile,
    };
  } catch (error: any) {
    console.error('Failed to fetch profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to load profile',
    };
  }
};

export const apiCreateProfile = async (
  user: User,
  username: string,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData) {
      console.error('User credentials or encryption functions are invalid');
      return {
        success: false,
        error: 'User credentials or encryption functions are invalid',
      };
    }

    if (!username) {
      return {
        success: false,
        error: 'Cannot create profile: No name provided',
      };
    }

    if (!user.user_metadata?.public_key) {
      return {
        success: false,
        error: 'Cannot create profile: No public key found',
      };
    }

    // Create the initial profile data
    const profileData = {
      name: null,
      avatar_url: null,
      bio: null,
    };

    // Encrypt the profile data
    const encryptedProfile = await encryptData(profileData);

    if (!encryptedProfile) {
      return {
        success: false,
        error: 'Cannot create profile: Failed to encrypt profile data',
      };
    }

    // Insert directly into the profiles table
    const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username,
      encryption_public_key: user.user_metadata?.public_key,
      profile: encryptedProfile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return {
        success: false,
        error: insertError.message || 'Failed to create profile',
      };
    }

    // Fetch the newly created profile
    const result = await apiFetchProfile(user, encryptData, decryptData);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Profile created but could not be retrieved',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error('Failed to create profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to create profile',
    };
  }
};

export const apiUpdateProfile = async (
  user: User,
  profileData: Partial<Profile['profile']>,
  currentProfile: Profile,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData || !currentProfile) {
      console.error('User credentials, profile, or encryption functions are invalid');
      return {
        success: false,
        error: 'User credentials, profile, or encryption functions are invalid',
      };
    }

    // Merge the existing profile data with the new data
    const updatedProfileData = {
      ...currentProfile.profile,
      ...profileData,
    };

    // Encrypt the updated profile data
    const encryptedProfile = await encryptData(updatedProfileData);

    if (!encryptedProfile) {
      return {
        success: false,
        error: 'Cannot update profile: Failed to encrypt profile data',
      };
    }

    // Update the profile in the database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        profile: encryptedProfile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return {
        success: false,
        error: updateError.message || 'Failed to update profile',
      };
    }

    // Decrypt the updated profile data
    const decryptedProfileData = await decryptData(updatedProfile.profile);

    const decryptedProfile: Profile = {
      ...updatedProfile,
      profile: decryptedProfileData,
    };

    return {
      success: true,
      data: decryptedProfile,
    };
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to update profile',
    };
  }
};
