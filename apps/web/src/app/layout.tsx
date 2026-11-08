import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Double Jeu · jeux de société de bluff et de déduction',
  description:
    'Jeux à rôles cachés et de bluff, en ligne entre amis ou sur un seul téléphone.',
};

export const viewport: Viewport = {
  themeColor: '#0a0d16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
