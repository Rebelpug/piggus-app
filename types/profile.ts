export type ProfileData = {
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type Profile = {
  id: string;
  username: string;
  encryption_public_key: string;
  profile: ProfileData;
  created_at: string;
  updated_at: string;
};
