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

export type BodyType = 'slim' | 'athletic' | 'average' | 'curvy' | 'heavy_set' | 'prefer_not_to_say';

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
  body_type: BodyType | null;
  education_level: EducationLevel | null;
  occupation: string | null;
  marital_status: MaritalStatus | null;
  has_children: boolean | null;
  wants_children: WantsChildren | null;
  languages_spoken: string | null;
  bio: string | null;
  photos: Photo[];
  profile_complete_pct: number;
  compatibility: number | null; // 0–100, set by the discovery feed (matching algorithm)
}

/** Own full profile — ProfileResponse (includes private fields). */
export interface MyProfile extends PublicProfile {
  user_id: string;
  date_of_birth: string;
  gender: Gender;
  country_code: string | null;
  caste_is_visible: boolean;
  weight_kg: number | null;
  body_type: BodyType | null;
  education_field: string | null;
  has_children: boolean | null;
  smoking: SmokingDrinking | null;
  drinking: SmokingDrinking | null;
  willing_to_relocate: RelocationWillingness | null;
  photos_blurred: boolean;
  hide_from_contacts: boolean;
  incognito_mode: boolean;
}

/** Partner preferences — drives the matching algorithm. CSV fields hold comma-separated enum values. */
export interface PartnerPreferences {
  pref_min_age: number | null;
  pref_max_age: number | null;
  pref_min_height_cm: number | null;
  pref_max_height_cm: number | null;
  pref_religion: string | null; // csv of Religion
  pref_denomination: string | null;
  pref_caste: string | null;
  pref_ethnicity: string | null;
  pref_education_min: EducationLevel | null;
  pref_marital_status: string | null; // csv of MaritalStatus
  pref_has_children: boolean | null;
  pref_wants_children: string | null; // csv of WantsChildren
  pref_country_codes: string | null;
  pref_max_distance_km: number | null;
  pref_religiosity_min: number | null;
  pref_religiosity_max: number | null;
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

export type SubscriptionPlan = 'free' | 'premium' | 'gold';
export type SubscriptionStore = 'app_store' | 'play_store' | 'stripe' | 'promo';

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: string;
  starts_at: string;
  expires_at: string | null;
  auto_renews: boolean;
  daily_like_limit: number | null;
  boosts_remaining: number;
  can_see_who_liked: boolean;
}

export type NotificationType =
  | 'match'
  | 'new_message'
  | 'like'
  | 'superlike'
  | 'profile_view'
  | 'wali_request'
  | 'system'
  | 'moderation';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export type MessageType = 'text' | 'voice' | 'image' | 'system' | 'wali';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content: string | null;
  media_url: string | null;
  media_duration_secs: number | null;
  is_read: boolean;
  is_delivered: boolean;
  sent_at: string;
  deleted_at: string | null;
}

export interface Conversation {
  id: string;
  match_id: string;
  is_active: boolean;
  last_message_at: string | null;
  other_profile: PublicProfile;
  unread_count: number;
  wali_id: string | null;
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
  education_field?: string;
  height_cm?: number;
  weight_kg?: number;
  body_type?: BodyType;
  marital_status?: MaritalStatus;
  has_children?: boolean;
  wants_children?: WantsChildren;
  languages_spoken?: string;
  smoking?: SmokingDrinking;
  drinking?: SmokingDrinking;
  willing_to_relocate?: RelocationWillingness;
  // privacy
  photos_blurred?: boolean;
  hide_from_contacts?: boolean;
  incognito_mode?: boolean;
}

export type UpdateProfileInput = Partial<CreateProfileInput>;
