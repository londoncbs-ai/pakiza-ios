import { PolicyView } from '@/components/PolicyView';

export default function Community() {
  return (
    <PolicyView
      title="Community Guidelines"
      intro="Pakiza is a community for people seeking marriage with intention and respect. These guidelines keep it safe and meaningful."
      sections={[
        {
          h: '1. Be genuine',
          p: 'Use your real name and recent photos of yourself. Impersonation, fake profiles, and misleading information are not allowed.',
        },
        {
          h: '2. Marry with intention',
          p: 'Pakiza is for people genuinely looking for marriage. Treat every member as someone with families and futures that matter.',
        },
        {
          h: '3. Be respectful',
          p: 'No harassment, hate speech, or pressure. Honour boundaries, including the choice to involve a guardian (wali) in a conversation.',
        },
        {
          h: '4. Keep it appropriate',
          p: 'No nudity, sexual content, or inappropriate photos. Images are moderated and may be removed.',
        },
        {
          h: '5. Stay safe',
          p: 'Never send money to other members. Be cautious sharing personal details. Report anything that feels off using the report and block tools.',
        },
        {
          h: '6. Consequences',
          p: 'Breaking these guidelines can lead to warnings, feature limits, or permanent removal. We act on reports to protect the community.',
        },
        {
          h: '7. Reporting',
          p: 'Use the report or block option on any profile or chat. Our team reviews reports and takes appropriate action.',
        },
      ]}
    />
  );
}
