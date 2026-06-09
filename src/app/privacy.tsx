import { PolicyView } from '@/components/PolicyView';

export default function Privacy() {
  return (
    <PolicyView
      title="Privacy Policy"
      intro="Your privacy matters. This explains what we collect, how we use it, and the control you have."
      sections={[
        {
          h: '1. What we collect',
          p: 'Account details (phone, optional email), your profile (name, photos, age, location, faith and the fields you choose to share), who you like, pass and match with, and messages you send. We also collect basic device and usage data to run and improve the service.',
        },
        {
          h: '2. How we use it',
          p: 'To create your profile, power matching and discovery, deliver messages and notifications, keep the community safe, process subscriptions, and provide support. Matching uses the preferences and profile details you provide.',
        },
        {
          h: '3. Sensitive information',
          p: 'Fields such as caste and religion are sensitive. Caste is private by default and shown to others only when you choose to make it visible. We use these only for matching and never sell them.',
        },
        {
          h: '4. Photos & verification',
          p: 'Profile photos are stored to display your profile. A verification selfie, if you provide one, is used only to confirm it is really you and is not shown on your profile.',
        },
        {
          h: '5. Sharing',
          p: 'We share your public profile with other members as part of the service, and with processors who help us operate (hosting, payments, messaging). We do not sell your personal data.',
        },
        {
          h: '6. Retention & deletion',
          p: 'We keep your data while your account is active. You can delete your account at any time; we then remove your personal data except where we must keep records (for example, billing or safety).',
        },
        {
          h: '7. Your rights',
          p: 'You can access, correct, export or delete your data, and object to certain processing. Contact privacy@pakiza.app to make a request.',
        },
      ]}
    />
  );
}
