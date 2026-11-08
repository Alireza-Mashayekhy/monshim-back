'use client';
import { MenuIcon } from 'lucide-react';
import { useState } from 'react';

import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';

export default function Menu() {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <MenuIcon className="size-5" />
      </Button>
      <div
        onClick={() => setOpen(false)}
        className={`fixed top-0 w-screen h-screen bg-black/40 ${isOpen ? '' : 'hidden'}`}
      />
      <div
        className={`fixed right-0 top-0 bottom-0 bg-white h-screen min-w-[300px] border-l border-border shadow transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-center border-b border-border py-2">
          <Logo />
        </div>
      </div>
    </>
  );
}
