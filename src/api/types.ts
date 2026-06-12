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

/** Discover feed / match card - PublicProfileResponse. */
export interface PublicProfile {
  id: string; // profile id
  user_id: string; // the person's user id - used to like/pass
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
  willing_to_relocate: RelocationWillingness | null;
  languages_spoken: string | null;
  bio: string | null;
  photos: Photo[];
  profile_complete_pct: number;
  compatibility: number | null; // 0-100, set by the discovery feed (matching algorithm)
  compatibility_reasons?: string[]; // plain-language "why you match", feed only
}

/** Own full profile - ProfileResponse (includes private fields). */
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

/** Partner preferences - drives the matching algorithm. CSV fields hold comma-separated enum values. */
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

export interface Quota {
  is_premium: boolean;
  likes_remaining: number | null; // null = unlimited (premium)
  likes_limit: number | null;
  likes_reset_seconds: number;
  active_matches: number;
  match_limit: number | null; // null = unlimited (premium)
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
  | 'moderation'
  | 'meeting_request'
  | 'meeting_accepted'
  | 'meeting_declined'
  | 'meeting_scheduled'
  | 'meeting_update';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export type MessageType = 'text' | 'voice' | 'image' | 'system' | 'wali' | 'meeting';

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
  /** Type-specific extra data. For a `meeting` message: { kind, meeting_id, status }. */
  metadata?: Record<string, any> | null;
}

export interface Conversation {
  id: string;
  match_id: string;
  is_active: boolean;
  last_message_at: string | null;
  other_profile: PublicProfile;
  unread_count: number;
  wali_id: string | null;
  locked: boolean; // free-tier: beyond the open-chat limit
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
  religiosity?: number; // 1-5
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

// ── Events ──────────────────────────────────────────────────────────────────
export type EventCategory =
  | 'matrimonial_meet'
  | 'speed_matching'
  | 'webinar'
  | 'workshop'
  | 'community'
  | 'family';

export type RSVPStatus = 'going' | 'interested';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  is_online: boolean;
  location_name: string | null;
  city: string | null;
  country_name: string | null;
  cover_image_url: string | null;
  host_name: string | null;
  capacity: number | null;
  price_label: string | null;
  is_featured: boolean;
  going_count: number;
  my_rsvp: RSVPStatus | null;
}

// ── News / articles ─────────────────────────────────────────────────────────
export type ArticleCategory = 'advice' | 'success_story' | 'faith' | 'guide' | 'announcement';

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: ArticleCategory;
  author_name: string;
  cover_image_url: string | null;
  read_minutes: number;
  published_at: string;
  is_featured: boolean;
}

export interface Article extends ArticleItem {
  body: string;
}

// ── Support chat (member <-> support team) ──────────────────────────────────
export type SupportSender = 'member' | 'admin' | 'system';
export type SupportThreadStatus = 'open' | 'closed';

export interface SupportChatMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_role: SupportSender;
  body: string;
  read_by_member: boolean;
  read_by_admin: boolean;
  created_at: string;
}

export interface SupportThread {
  id: string;
  status: SupportThreadStatus;
  last_message_at: string | null;
  messages: SupportChatMessage[];
}

// ── Book-a-meet (supervised meetings, arranged by the Pakiza team) ───────────
export type MeetingStatus =
  | 'pending'
  | 'accepted'
  | 'reviewing'
  | 'scheduled'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type MeetingMode = 'in_person' | 'online';

export type MeetingFeeStatus = 'none' | 'due' | 'paid' | 'waived';

/** Who covers the meeting fee. With "split" each side pays half. */
export type MeetingFeePayer = 'requester' | 'recipient' | 'split';

/** Member-facing view of a meeting - MeetingResponse. */
export interface MeetingRequest {
  id: string;
  conversation_id: string;
  match_id: string;
  requester_id: string;
  recipient_id: string;
  status: MeetingStatus;
  mode: MeetingMode;
  proposed_at: string | null;
  proposed_location: string | null;
  note: string | null;
  scheduled_at: string | null;
  confirmed_location: string | null;
  decline_reason: string | null;
  cancel_reason: string | null;
  /** The requester's wali (added at booking). */
  wali_name: string;
  wali_relationship: string;
  wali_verified: boolean;
  /** The recipient's wali (added when they accept); null until then. */
  recipient_wali_name: string | null;
  recipient_wali_relationship: string | null;
  recipient_wali_verified: boolean;
  fee_pence: number | null;
  fee_status: MeetingFeeStatus;
  created_at: string;
  updated_at: string;
  /** Viewer-relative: true when the current user opened the request. */
  is_requester: boolean;
  other_party_name: string | null;
  /** Who covers the fee. */
  fee_payer: MeetingFeePayer;
  /** Whether each side has paid their share. */
  requester_paid: boolean;
  recipient_paid: boolean;
  /** The assigned Pakiza team member ("Pakiza team" once assigned), null while unassigned. */
  organiser_name: string | null;
  /** What the viewer owes for the fee, given the split. */
  my_share_pence: number;
  /** Whether the viewer has paid their share. */
  i_have_paid: boolean;
}

/** A coordination-thread message (both members + the Pakiza team). */
export interface MeetingMessage {
  id: string;
  sender_role: 'member' | 'team' | 'system';
  sender_label: string;
  is_me: boolean;
  body: string;
  created_at: string;
}

/** Body for POST /meetings. */
export interface CreateMeetingInput {
  conversation_id: string;
  mode: MeetingMode;
  proposed_at?: string;
  proposed_location?: string;
  note?: string;
  wali_name: string;
  wali_relationship: string;
  wali_phone: string;
  wali_email?: string;
}

/** Body for POST /meetings/{id}/accept (the recipient adds their own wali). */
export interface AcceptMeetingInput {
  wali_name: string;
  wali_relationship: string;
  wali_phone: string;
  wali_email?: string;
}

/** Response from POST /meetings/{id}/checkout. */
export interface MeetingCheckout {
  mode: string;
  client_secret: string | null;
  publishable_key: string | null;
  amount: number | null;
  currency: string;
}
