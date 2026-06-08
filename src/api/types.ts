/** TypeScript mirrors of the backend Pydantic schemas (app/schemas/*). */

export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export type Religion =
  | 'islam'
  | 'christianity'
  | 'judaism'
  | 'hinduism'
  | 'buddhism'
  | 'sikhism'
  | 'other'
  | 'prefer_not_to_say';

export type EducationLevel =
  | 'no_formal_education'
  | 'high_school'
  | 'some_college'
  | 'bachelors'
  | 'masters'
  | 'phd'
  | 'professional'
  | 'vocational';

export type MaritalStatus = 'single' | 'divorced' | 'widowed' | 'separated' | 'annulled';

export type WantsChildren = 'yes' | 'no' | 'open' | 'has_and_wants_more' | 'has_does_not_want_more';

export type SmokingDrinking = 'never' | 'occasionally' | 'regularly' | 'prefer_not_to_say';

export type RelocationWillingness = 'yes' | 'no' | 'maybe';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterResponse {
  message: string;
  debug_otp?: string | null; // present only when backend DEBUG=true
}

export interface Photo {
  id: string;
  cdn_url: string;
  thumbnail_cdn_url: string | null;
  is_primary: boolean;
  is_blurred_public: boolean;
  order_index: number;
}

/** Discover feed / match card — PublicProfileResponse. */
export interface PublicProfile {
  id: string; // profile id
  user_id: string; // the person's user id — used to like/pass
  display_name: string;
  age: number | null;
  city: string | null;
  country_name: string | null;
  ethnicity: string | null;
  religion: Religion | null;
  denomination: string | null;
  religiosity: number | null;
  caste: string | null;
  height_cm: number | null;
  education_level: EducationLevel | null;
  occupation: string | null;
  marital_status: string | null;
  wants_children: string | null;
  languages_spoken: string | null;
  bio: string | null;
  photos: Photo[];
  profile_complete_pct: number;
}

/** Own full profile — ProfileResponse. */
export interface MyProfile extends PublicProfile {
  user_id: string;
  date_of_birth: string;
  gender: Gender;
  caste_is_visible: boolean;
  photos_blurred: boolean;
}

export interface SwipeResult {
  match_id: string;
  is_matched: boolean;
  matched_profile: PublicProfile | null;
}

export interface MatchSummary {
  id: string;
  matched_at: string;
  compatibility_score: number | null;
  profile: PublicProfile;
  conversation_id: string | null;
}

export interface CreateProfileInput {
  display_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: Gender;
  city?: string;
  country_name?: string;
  ethnicity?: string;
  bio?: string;
  religion?: Religion;
  denomination?: string;
  religiosity?: number; // 1–5
  caste?: string; // caste / biradari / jati / gotra
  caste_is_visible?: boolean; // hidden from others unless true
  occupation?: string;
  education_level?: EducationLevel;
  height_cm?: number;
  marital_status?: MaritalStatus;
  wants_children?: WantsChildren;
  languages_spoken?: string;
  willing_to_relocate?: RelocationWillingness;
}

export type UpdateProfileInput = Partial<CreateProfileInput>;
