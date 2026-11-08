'use client';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export default function Cart() {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <ShoppingBag className="size-5" />
      </Button>
      <div
        onClick={() => setOpen(false)}
        className={`fixed top-0 w-screen h-screen bg-black/40 ${isOpen ? '' : 'hidden'}`}
      />
      <div
        className={`fixed left-0 top-0 bottom-0 bg-white h-screen min-w-[300px] border-l border-border shadow transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-center py-2"></div>
      </div>
    </>
  );
}
