import type { Photo } from '@/api/types';

/**
 * Photos ordered so a member's FIRST image leads (their profile picture).
 * Sorted by order_index ascending; is_primary only breaks ties. The first
 * uploaded photo (lowest order_index) is always treated as the profile image.
 */
export function sortedPhotos(photos: Photo[] | null | undefined): Photo[] {
  return [...(photos ?? [])].sort(
    (a, b) => a.order_index - b.order_index || Number(b.is_primary) - Number(a.is_primary),
  );
}

/** The single avatar / profile photo for a member (their first image). */
export function primaryPhoto(
  source: { photos?: Photo[] | null } | Photo[] | null | undefined,
): Photo | undefined {
  const photos = Array.isArray(source) ? source : source?.photos;
  return sortedPhotos(photos)[0];
}

/** The single avatar / profile photo url for a member (their first image). */
export function primaryPhotoUrl(
  source: { photos?: Photo[] | null } | Photo[] | null | undefined,
): string | undefined {
  return primaryPhoto(source)?.cdn_url;
}

/**
 * Blur radius for a member's photo, honouring their privacy choice.
 * The backend derives is_blurred_public per viewer (owner's toggle AND the
 * pair is not matched), so rendering is a straight read of the flag.
 */
export const BLUR_RADIUS = 26;

export function photoBlurRadius(photo: Photo | null | undefined): number {
  return photo?.is_blurred_public ? BLUR_RADIUS : 0;
}
