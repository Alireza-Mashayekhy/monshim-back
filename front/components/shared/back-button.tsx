import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '../ui/button';

export const BackButton = ({ func }: { func?: () => void }) => {
  const router = useRouter();
  return (
    <Button
      onClick={func ? func : () => router.back()}
      size="icon"
      aria-label="بازگشت"
      variant="outline"
      className="bg-white"
    >
      <ArrowRight size={22} />
    </Button>
  );
};
