import { Redirect } from 'expo-router';

/**
 * The Support Fund is now a full nav-bar tab at /fund. This route is kept so
 * existing deep links and notification payloads (screen: "support-fund") still
 * land on the fund page.
 */
export default function SupportFundRedirect() {
  return <Redirect href="/fund" />;
}
