import { Settings } from 'lucide-react';

import ActionCard from '../cards/action-card';

export default function QuickActionSection() {
  return (
    <div className="grid grid-cols-4 gap-3">
      <ActionCard title="test" icon={Settings} href="/dashboard" />

      <ActionCard title="test" icon={Settings} href="/dashboard" />

      <ActionCard title="test" icon={Settings} href="/dashboard" />

      <ActionCard title="test" icon={Settings} href="/dashboard" />
    </div>
  );
}
