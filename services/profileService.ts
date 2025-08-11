import { piggusApi } from "@/client/piggusApi";
import { Profile } from "@/types/profile";
import { User } from "@supabase/supabase-js";

// Profile service functions that bridge the old client API with piggusApi

export const apiFetchProfile = async (
  user: User,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>,
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData) {
      console.error("User credentials or encryption functions are invalid");
      return {
        success: false,
        error: "User credentials or encryption functions are invalid",
      };
    }

    console.log("Fetching profile for user:", user.id);

    const profile = await piggusApi.getProfile();

    if (!profile) {
      return {
        success: true,
        data: undefined,
      };
    }

    // Decrypt the profile data
    const decryptedProfileData = await decryptData(profile.encrypted_data);

    const decryptedProfile: Profile = {
      ...profile,
      profile: decryptedProfileData,
    };

    return {
      success: true,
      data: decryptedProfile,
    };
  } catch (error: any) {
    console.error("Failed to fetch profile:", error);

    // If it's a 404-like error, return success with no data (profile doesn't exist)
    if (
      error.response?.status === 404 ||
      error.message?.includes("not found")
    ) {
      return {
        success: true,
        data: undefined,
      };
    }

    return {
      success: false,
      error: error.message || "Failed to load profile",
    };
  }
};

export const apiCreateProfile = async (
  user: User,
  username: string,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>,
  defaultCurrency: string = "EUR",
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData) {
      console.error("User credentials or encryption functions are invalid");
      return {
        success: false,
        error: "User credentials or encryption functions are invalid",
      };
    }

    if (!username) {
      return {
        success: false,
        error: "Cannot create profile: No name provided",
      };
    }

    if (!user.user_metadata?.public_key) {
      return {
        success: false,
        error: "Cannot create profile: No public key found",
      };
    }

    // Create the initial profile data
    const profileData = {
      name: null,
      avatar_url: null,
      bio: null,
      defaultCurrency: defaultCurrency,
    };

    // Encrypt the profile data
    const encryptedProfile = await encryptData(profileData);

    if (!encryptedProfile) {
      return {
        success: false,
        error: "Cannot create profile: Failed to encrypt profile data",
      };
    }

    const newProfile = await piggusApi.createProfile({
      username,
      encryptionPublicKey: user.user_metadata.public_key,
      encryptedProfile,
    });

    // Decrypt the newly created profile data
    const decryptedProfileData = await decryptData(newProfile.encrypted_data);

    const decryptedProfile: Profile = {
      ...newProfile,
      profile: decryptedProfileData,
    };

    return {
      success: true,
      data: decryptedProfile,
    };
  } catch (error: any) {
    console.error("Failed to create profile:", error);
    return {
      success: false,
      error: error.message || "Failed to create profile",
    };
  }
};

export const apiUpdateProfile = async (
  user: User,
  profileData: Partial<Profile["profile"]>,
  currentProfile: Profile,
  encryptData: (data: any) => Promise<string | null>,
  decryptData: (encryptedData: string) => Promise<any>,
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    if (!user || !encryptData || !decryptData || !currentProfile) {
      console.error(
        "User credentials, profile, or encryption functions are invalid",
      );
      return {
        success: false,
        error: "User credentials, profile, or encryption functions are invalid",
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
        error: "Cannot update profile: Failed to encrypt profile data",
      };
    }

    const updatedProfile = await piggusApi.updateProfile({
      encryptedProfile,
    });

    // Decrypt the updated profile data
    const decryptedProfileData = await decryptData(
      updatedProfile.encrypted_data,
    );

    const decryptedProfile: Profile = {
      ...updatedProfile,
      profile: decryptedProfileData,
    };

    return {
      success: true,
      data: decryptedProfile,
    };
  } catch (error: any) {
    console.error("Failed to update profile:", error);
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
};

export const apiDeleteProfile = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    await piggusApi.deleteProfile();

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Failed to delete profile:", error);
    return {
      success: false,
      error: error.message || "Failed to delete profile",
    };
  }
};
