/** Human-friendly labels for backend enum values. */

export function titleCase(s?: string | null): string | null {
  if (!s) return null;
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const EDUCATION: Record<string, string> = {
  no_formal_education: 'No formal education',
  high_school: 'High school',
  some_college: 'Some college',
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: 'PhD',
  professional: 'Professional degree',
  vocational: 'Vocational training',
};

const MARITAL: Record<string, string> = {
  single: 'Single',
  divorced: 'Divorced',
  widowed: 'Widowed',
  separated: 'Separated',
  annulled: 'Annulled',
};

const WANTS_CHILDREN: Record<string, string> = {
  yes: 'Wants children',
  no: "Doesn't want children",
  open: 'Open to children',
  has_and_wants_more: 'Has kids, wants more',
  has_does_not_want_more: 'Has kids, no more',
};

const RELIGIOSITY: Record<number, string> = {
  1: 'Not practising',
  2: 'Somewhat practising',
  3: 'Moderately practising',
  4: 'Practising',
  5: 'Very devout',
};

const SMOKE_DRINK: Record<string, string> = {
  never: 'Never',
  occasionally: 'Occasionally',
  regularly: 'Regularly',
  prefer_not_to_say: 'Prefer not to say',
};

const RELOCATE: Record<string, string> = {
  yes: 'Willing to relocate',
  maybe: 'Open to relocating',
  no: 'Not willing to relocate',
};

export const label = {
  education: (v?: string | null) => (v ? EDUCATION[v] ?? titleCase(v) : null),
  marital: (v?: string | null) => (v ? MARITAL[v] ?? titleCase(v) : null),
  wantsChildren: (v?: string | null) => (v ? WANTS_CHILDREN[v] ?? titleCase(v) : null),
  religiosity: (v?: number | null) => (v ? RELIGIOSITY[v] ?? null : null),
  religion: (v?: string | null) => titleCase(v),
  bodyType: (v?: string | null) => titleCase(v),
  smokeDrink: (v?: string | null) => (v ? SMOKE_DRINK[v] ?? titleCase(v) : null),
  relocate: (v?: string | null) => (v ? RELOCATE[v] ?? null : null),
  hasChildren: (v?: boolean | null) => (v == null ? null : v ? 'Has children' : 'No children'),
  weight: (kg?: number | null) => (kg ? `${kg} kg` : null),
  height: (cm?: number | null) => {
    if (!cm) return null;
    const totalIn = Math.round(cm / 2.54);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn % 12;
    return `${cm} cm · ${ft}'${inch}"`;
  },
  languages: (v?: string | null) => {
    if (!v) return null;
    const map: Record<string, string> = {
      en: 'English', ar: 'Arabic', ur: 'Urdu', fr: 'French', tr: 'Turkish',
      es: 'Spanish', hi: 'Hindi', bn: 'Bengali', fa: 'Farsi', so: 'Somali', pa: 'Punjabi',
    };
    return v
      .split(',')
      .map((c) => map[c.trim().toLowerCase()] ?? titleCase(c.trim()))
      .join(', ');
  },
};
