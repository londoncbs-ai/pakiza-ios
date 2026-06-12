/** Display helpers for the Book-a-meet feature. */
import type { MeetingFeePayer, MeetingFeeStatus, MeetingMode, MeetingStatus } from '@/api/types';

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  reviewing: 'With the team',
  scheduled: 'Scheduled',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export const MEETING_MODE_LABEL: Record<MeetingMode, string> = {
  in_person: 'In person',
  online: 'Online',
};

export const MEETING_FEE_STATUS_LABEL: Record<MeetingFeeStatus, string> = {
  none: 'None',
  due: 'Payment due',
  paid: 'Paid',
  waived: 'Waived',
};

/**
 * Labels for the fee-payer choice, written from the viewer's point of view.
 * `mine` is the option that means "the viewer pays it all"; the other party
 * name is passed in so the copy stays generic and personal.
 */
export const FEE_PAYER_LABEL: Record<'mine' | 'theirs' | 'split', (otherName?: string | null) => string> = {
  mine: () => 'I will pay',
  theirs: (otherName) => `${otherName?.trim() || 'They'} will pay`,
  split: () => 'Split evenly',
};

/**
 * Resolve the absolute fee_payer ("requester"/"recipient"/"split") into a label
 * from the viewer's point of view, given whether the viewer is the requester.
 */
export function feePayerLabel(
  payer: MeetingFeePayer,
  isRequester: boolean,
  otherName?: string | null,
): string {
  if (payer === 'split') return FEE_PAYER_LABEL.split();
  const viewerPays = payer === 'requester' ? isRequester : !isRequester;
  return viewerPays ? FEE_PAYER_LABEL.mine() : FEE_PAYER_LABEL.theirs(otherName);
}

/** A terminal status can no longer change. */
export function isTerminal(status: MeetingStatus): boolean {
  return status === 'completed' || status === 'declined' || status === 'cancelled';
}

/** Tone key for a status badge, mapped to a Text/badge color. */
export type MeetingTone = 'pending' | 'progress' | 'scheduled' | 'done' | 'ended';

export function meetingTone(status: MeetingStatus): MeetingTone {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'accepted':
    case 'reviewing':
      return 'progress';
    case 'scheduled':
      return 'scheduled';
    case 'completed':
      return 'done';
    case 'declined':
    case 'cancelled':
      return 'ended';
  }
}

/** A friendly date + time, e.g. "Sat 14 June, 4:00 PM". */
export function formatMeetingDateTime(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Fee in pence to a £ string, e.g. 2500 -> "£25.00". */
export function formatFee(pence?: number | null, currency = 'GBP'): string | null {
  if (pence == null) return null;
  const symbol = currency.toUpperCase() === 'GBP' ? '£' : '';
  return `${symbol}${(pence / 100).toFixed(2)}`;
}
