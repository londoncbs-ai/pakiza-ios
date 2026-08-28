import { Ionicons } from '@expo/vector-icons';

import type { MyProfile, PublicProfile } from '@/api/types';
import { label, titleCase } from './format';

/**
 * What two members actually have in common, worked out on the device.
 *
 * The backend returns `compatibility_reasons`, but they are generic by
 * construction ("Within the age range you're looking for" fires for almost
 * everyone). These lines are per-pair and specific, which is the difference
 * between a matchmaker's note and a scoreboard. The numeric `compatibility`
 * score is deliberately never surfaced anywhere: a percentage on a person's
 * face is a dating-app convention, a list of shared ground is not.
 */

export interface Ground {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

/** Split a comma-separated field into a trimmed, casefolded set. */
function csv(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function intersect(a?: string | null, b?: string | null): string[] {
  const left = csv(a);
  const right = new Set(csv(b).map((s) => s.toLowerCase()));
  return left.filter((s) => right.has(s.toLowerCase()));
}

const STUDIED = ['bachelors', 'masters', 'professional', 'phd'];

/**
 * Server reasons we never show:
 *  - the age-range line is meaningless for a member who has set no
 *    preferences, because the default window is 18 to 99
 *  - the proximity line cannot be honest, because no signup or profile-update
 *    path ever writes latitude/longitude
 */
function serverReasonAllowed(reason: string, prefsSet: boolean): boolean {
  const r = reason.toLowerCase();
  if (r.includes('near you')) return false;
  if (!prefsSet && r.includes('age range')) return false;
  return true;
}

export function commonGround(
  mine: MyProfile | null,
  theirs: PublicProfile,
  prefsSet: boolean,
): Ground[] {
  const out: Ground[] = [];
  const push = (key: string, icon: Ground['icon'], text: string) => out.push({ key, icon, text });

  if (mine) {
    if (mine.religion && theirs.religion && mine.religion === theirs.religion) {
      push('religion', 'moon-outline', `You both follow ${label.religion(theirs.religion)}`);
    }
    if (
      mine.denomination &&
      theirs.denomination &&
      mine.denomination.toLowerCase() === theirs.denomination.toLowerCase()
    ) {
      push('denomination', 'sparkles-outline', `You share the ${titleCase(theirs.denomination)} tradition`);
    }
    if (
      mine.religiosity != null &&
      theirs.religiosity != null &&
      Math.abs(mine.religiosity - theirs.religiosity) <= 1
    ) {
      push('practice', 'sparkles-outline', 'You practise at a similar level');
    }
    if (mine.city && theirs.city && mine.city.toLowerCase() === theirs.city.toLowerCase()) {
      push('city', 'location-outline', `You both live in ${titleCase(theirs.city)}`);
    }

    const langs = intersect(mine.languages_spoken, theirs.languages_spoken);
    if (langs.length > 0) {
      push('languages', 'chatbubbles-outline', `You both speak ${label.languages(langs.slice(0, 2).join(','))}`);
    }

    const hobbies = intersect(mine.hobbies, theirs.hobbies);
    if (hobbies.length > 0) {
      const shown = hobbies.slice(0, 2).map((h) => h.toLowerCase());
      push('hobbies', 'color-palette-outline', `You both listed ${shown.join(' and ')}`);
    }

    const heritage = intersect(mine.ethnicity, theirs.ethnicity);
    if (heritage.length > 0) {
      push('heritage', 'people-outline', `You share ${titleCase(heritage[0])} heritage`);
    }

    if (
      mine.education_level &&
      theirs.education_level === mine.education_level &&
      STUDIED.includes(mine.education_level)
    ) {
      const e = label.education(theirs.education_level)?.toLowerCase();
      if (e) push('education', 'school-outline', `You have both studied to ${e} level`);
    }

    if (mine.marital_status === 'single' && theirs.marital_status === 'single') {
      push('marital', 'ribbon-outline', 'Neither of you has been married before');
    }

    if (mine.wants_children && theirs.wants_children === mine.wants_children) {
      if (mine.wants_children === 'yes') push('children', 'home-outline', 'You both want children');
      else if (mine.wants_children === 'open') push('children', 'home-outline', 'You are both open to children');
    }
  }

  // Server reasons come last, and only where they add something the device has
  // not already said more precisely.
  const said = new Set(out.map((g) => g.text.toLowerCase()));
  for (const reason of theirs.compatibility_reasons ?? []) {
    if (!serverReasonAllowed(reason, prefsSet)) continue;
    if (said.has(reason.toLowerCase())) continue;
    push(`server:${reason}`, 'checkmark-circle-outline', reason);
  }

  return out;
}
