import type { Metadata } from 'next';
import { WordsAdmin } from '@/components/account/WordsAdmin';

export const metadata: Metadata = { title: 'Mots des jeux · Faux-Semblants', robots: { index: false } };

export default function WordsAdminPage() {
  return <WordsAdmin />;
}
