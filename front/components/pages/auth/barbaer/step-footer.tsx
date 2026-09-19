'use client';

import React from 'react';

import { Button } from '@/components/ui/button';

interface StepFooterProps {
  onBack?: () => void;
  primary: React.ReactNode;
}

export default function StepFooter({ onBack, primary }: StepFooterProps) {
  return (
    <div className="mt-7 pt-5 border-t border-gray-100 flex items-center gap-3">
      {onBack && (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 flex-1 cursor-pointer"
        >
          مرحله قبل
        </Button>
      )}
      {primary}
    </div>
  );
}
