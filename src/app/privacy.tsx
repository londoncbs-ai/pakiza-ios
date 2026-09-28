import { PolicyView } from '@/components/PolicyView';

export default function Privacy() {
  return (
    <PolicyView
      title="Privacy Policy"
      intro="Your privacy matters. This explains what we collect, how we use it, and the control you have."
      sections={[
        {
          h: '1. What we collect',
          p: 'Account details (email and password, and optionally a phone number), your profile (name, photos, age, location, faith and the fields you choose to share), who you express interest in, pass on and match with, messages you send, and records of payments and donations. We also collect device and usage data, and your approximate location (country and city) worked out from your IP address, to run the service and keep it safe. If you turn on "hide from contacts", we receive one-way codes (hashes) of the phone numbers in your contacts; the names and the numbers themselves stay on your phone.',
        },
        {
          h: '2. How we use it',
          p: 'To create your profile, power matching and discovery, deliver messages and notifications, keep the community safe, process subscriptions, and provide support. Matching uses the preferences and profile details you provide.',
        },
        {
          h: '3. Sensitive information',
          p: 'Fields such as religion, ethnicity and caste are sensitive. Caste is private by default and shown to others only when you choose to make it visible. We use these only for matching and never sell them. If you complete face verification, we also process biometric information (see section 4).',
        },
        {
          h: '4. Photos & verification',
          p: 'Profile photos are stored with Amazon Web Services and delivered through its CloudFront network, and are checked by automated moderation (Amazon Rekognition). Every member completes face verification: with your agreement, a live selfie is compared with your profile photos by Amazon Rekognition to confirm it is really you. This is biometric information; we use it only for verification, and the selfie is not shown on your profile or to other members.',
        },
        {
          h: '5. Sharing',
          p: 'We share your public profile with other members as part of the service. We share data with processors who help us operate: Amazon Web Services (storage, image moderation and face comparison), Stripe (payments for donations and meeting fees), Apple and Google (subscriptions) and an email delivery provider. The app also includes the Meta (Facebook) SDK, which we use to measure how well our advertising works. It receives app events such as installs, registration, verification, subscriptions and donations (including the amount). On iOS, your advertising identifier is used only if you allow tracking when asked. We do not sell your personal data.',
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
