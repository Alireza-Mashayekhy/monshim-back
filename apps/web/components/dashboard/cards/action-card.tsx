import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import AppCard from '@/components/shared/app-card';

interface Props {
  title: string;
  icon: LucideIcon;
  href: string;
}

export default function ActionCard({ title, icon: Icon, href }: Props) {
  return (
    <Link href={href}>
      <AppCard className="flex flex-col items-center gap-3 py-6 hover:border-primary">
        <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center ">
          <Icon className="text-primary" />
        </div>

        <span className="text-sm font-medium">{title}</span>
      </AppCard>
    </Link>
  );
}
