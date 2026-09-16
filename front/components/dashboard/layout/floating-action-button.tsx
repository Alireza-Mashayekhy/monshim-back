'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function FloatingActionButton() {
  return (
    <Button
      size="icon"
      className="absolute left-1/2 -translate-x-1/2 -top-4 h-14 w-14 rounded-full bg-primary shadow-xl hover:scale-105 active:scale-95 transition z-10"
    >
      <Plus className="w-7 h-7" />
    </Button>
  );
}
