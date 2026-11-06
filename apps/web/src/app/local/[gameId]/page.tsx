'use client';

import { useParams } from 'next/navigation';
import { LocalScreen } from '@/components/local/LocalScreen';

export default function LocalPage() {
  const { gameId } = useParams<{ gameId: string }>();
  return <LocalScreen gameId={gameId} />;
}
