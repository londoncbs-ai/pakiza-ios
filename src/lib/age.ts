/**
 * The minimum age to use Pakiza, in one place so every screen, rule and message
 * agrees. The server enforces the same limit (schemas/profile.py: must_be_18);
 * this exists so the app can say it plainly instead of silently hiding dates.
 */
export const MIN_AGE = 18;

/** Shown wherever someone is told they cannot use Pakiza because of their age. */
export const UNDER_AGE_MESSAGE = `You must be ${MIN_AGE} or older to use Pakiza. Members under ${MIN_AGE} are not permitted.`;

/** Whole years between a date of birth and `now`. */
export function ageFromDate(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isOldEnough(dob: Date, now: Date = new Date()): boolean {
  return ageFromDate(dob, now) >= MIN_AGE;
}
