'use client';

import { useParams } from 'next/navigation';
import { RoomScreen } from '@/components/online/RoomScreen';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  return <RoomScreen code={decodeURIComponent(code).toUpperCase()} />;
}
