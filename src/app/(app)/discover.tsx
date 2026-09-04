import { Platform } from 'react-native';

import DiscoverDeck from '@/screens/discover/android/DiscoverDeck';
import DiscoverReel from '@/screens/discover/ios/DiscoverReel';

/**
 * Discovery has two presentations, chosen by platform. This file is the only
 * place that decides between them.
 *
 * iOS shows one member at a time: three quarters photograph, a shallow bar that
 * pulls up into the full profile, and a scroll that records a pass on the
 * person left behind, stamped in red so it is never silent. It exists
 * because App Review read the swipe deck as another dating app, which is the
 * opposite of how Pakiza positions itself. Everything it needs lives under
 * screens/discover/ios/.
 *
 * Android deliberately keeps the original swipe deck, unchanged, under
 * screens/discover/android/. Do not fold the two back together, and do not port
 * one to the other platform, without that being a deliberate decision.
 */
export default function Discover() {
  return <DiscoverReel />;
}
