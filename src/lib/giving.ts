/** Display helpers for the Marriage Support Fund + applications. */
import type { ApplicationStatus, DonationStatus } from '@/api/types';

export const DONATION_STATUS_LABEL: Record<DonationStatus, string> = {
  pending: 'Processing',
  succeeded: 'Received',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  accepted: 'Accepted',
  approved: 'Approved',
  funded: 'Funded',
  completed: 'Completed',
  declined: 'Not approved',
  withdrawn: 'Withdrawn',
};

/** A short, member-facing explanation of where an application stands. */
export const APPLICATION_STATUS_HINT: Record<ApplicationStatus, string> = {
  submitted: 'Your application has reached the Pakiza team.',
  under_review: 'The Pakiza team is reviewing your application.',
  accepted: 'Accepted; awaiting final approval from our finance team.',
  approved: 'Good news: your application has been approved.',
  funded: 'Support has been arranged for you.',
  completed: 'This application is complete.',
  declined: 'This application was not approved this time.',
  withdrawn: 'You withdrew this application.',
};

/** Tone key for a badge, mapped to a Text/badge color in the screen. */
export type GivingTone = 'pending' | 'progress' | 'good' | 'ended';

export function applicationTone(status: ApplicationStatus): GivingTone {
  switch (status) {
    case 'submitted':
      return 'pending';
    case 'under_review':
    case 'accepted':
      return 'progress';
    case 'approved':
    case 'funded':
    case 'completed':
      return 'good';
    case 'declined':
    case 'withdrawn':
      return 'ended';
  }
}

export function donationTone(status: DonationStatus): GivingTone {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'succeeded':
      return 'good';
    case 'failed':
    case 'refunded':
      return 'ended';
  }
}

/** A friendly date, e.g. "14 June 2026". */
export function formatGivingDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Seconds remaining to a "12m 30s" / "59s" countdown label. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m <= 0) return `${rem}s`;
  return `${m}m ${String(rem).padStart(2, '0')}s`;
}
