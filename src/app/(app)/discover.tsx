import JourneyHome from '@/screens/journey/ios/JourneyHome';

/**
 * The first tab is the Journey on both platforms: where the member is on the
 * path to marriage, the next step, a small set of today's introductions, and
 * the matchmaker, wali meetings, events and Marriage Support Fund beside it.
 * Reviewing introductions is one step of that path (/introductions), not the
 * front door.
 *
 * It was built for iOS first, because App Review read earlier versions - a
 * swipe deck, then a photo-first scroll reel - as another dating app, which is
 * the opposite of how Pakiza positions itself. Android kept the swipe deck
 * until October 2026, when it moved to the Journey too. The screens still live
 * under screens/journey/ios/ and screens/discover/ios/ from that history; they
 * have no platform-specific code.
 */
export default function Discover() {
  return <JourneyHome />;
}
