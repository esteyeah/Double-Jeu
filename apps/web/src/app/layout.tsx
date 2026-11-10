import type { Metadata, Viewport } from 'next';
import './globals.css';
// Polices des univers de jeu, servies par le site (aucune dépendance à un service externe).
// Elles ne sont téléchargées par le navigateur que lorsqu'un plateau les utilise.
import '@fontsource/pirata-one';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/orbitron/600.css';
import '@fontsource/orbitron/800.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/share-tech-mono';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/special-elite';
import '@fontsource/uncial-antiqua';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/800.css';

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
