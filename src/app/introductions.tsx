import { useRouter } from 'expo-router';

import DiscoverIntroductions from '@/screens/discover/ios/DiscoverIntroductions';

/**
 * Reviewing introductions, pushed from the Journey home (iOS). Android reaches
 * its own deck through the Discover tab and never navigates here.
 */
export default function Introductions() {
  const router = useRouter();
  return <DiscoverIntroductions onBack={() => router.back()} />;
}
