import type { Metadata } from 'next';
import { RecordsScreen } from '@/components/RecordsScreen';

export const metadata: Metadata = { title: 'Records · Faux-Semblants' };

export default function RecordsPage() {
  return <RecordsScreen />;
}
