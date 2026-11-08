import type { Metadata } from 'next';
import { AccountScreen } from '@/components/account/AccountScreen';

export const metadata: Metadata = { title: 'Mon compte · Faux-Semblants' };

export default function AccountPage() {
  return <AccountScreen />;
}
