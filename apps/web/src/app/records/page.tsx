import type { Metadata } from 'next';
import { RecordsScreen } from '@/components/RecordsScreen';

export const metadata: Metadata = { title: 'Records · Double Jeu' };

export default function RecordsPage() {
  return <RecordsScreen />;
}
