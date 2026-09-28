import { Platform } from 'react-native';

import DiscoverDeck from '@/screens/discover/android/DiscoverDeck';
import JourneyHome from '@/screens/journey/ios/JourneyHome';

/**
 * The first tab has two presentations, chosen by platform. This file is the
 * only place that decides between them.
 *
 * iOS opens on the Journey: where the member is on the path to marriage, the
 * next step, a small set of today's introductions, and the matchmaker, wali
 * meetings, events and Marriage Support Fund beside it. Reviewing introductions
 * is one step of that path (/introductions), not the front door. It exists
 * because App Review read earlier versions - a swipe deck, then a photo-first
 * scroll reel - as another dating app, which is the opposite of how Pakiza
 * positions itself. Everything it needs lives under screens/journey/ios/ and
 * screens/discover/ios/.
 *
 * Android deliberately keeps the original deck, unchanged, under
 * screens/discover/android/. Do not fold the two back together, and do not port
 * one to the other platform, without that being a deliberate decision.
 */
export default function Discover() {
  return Platform.OS === 'ios' ? <JourneyHome /> : <DiscoverDeck />;
}
