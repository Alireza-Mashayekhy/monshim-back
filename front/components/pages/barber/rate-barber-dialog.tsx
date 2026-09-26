'use client';

import { Loader2, MessageSquareText, Star } from 'lucide-react';
import { useState } from 'react';

import { StarRatingInput } from '@/components/shared/star-rating';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBarberReview } from '@/services/features/barber/hooks';

interface RateBarberDialogProps {
  barberId: number | string | null;
  barberName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RateBarberDialog({
  barberId,
  barberName,
  open,
  onOpenChange,
}: RateBarberDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const createReview = useCreateBarberReview();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRating(0);
      setComment('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!barberId || rating < 1) return;

    createReview.mutate(
      {
        barberId,
        dto: {
          rating,
          comment: comment.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star size={18} className="fill-yellow-400 text-yellow-400" />
            ثبت نظر و امتیاز
          </DialogTitle>
          <DialogDescription>
            {barberName
              ? `نظر شما درباره ${barberName} پس از تایید ادمین نمایش داده می‌شود.`
              : 'نظر شما پس از تایید ادمین نمایش داده می‌شود.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <span className="text-xs font-bold text-gray-600">
              امتیاز شما به این آرایشگر
            </span>
            <StarRatingInput
              value={rating}
              onChange={setRating}
              disabled={createReview.isPending}
            />
            {rating > 0 && (
              <span className="text-[11px] text-gray-400">{rating} از ۵</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="review-comment"
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700"
            >
              <MessageSquareText size={13} />
              متن نظر (اختیاری)
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="تجربه خود از این آرایشگر را بنویسید..."
              rows={4}
              maxLength={1000}
              disabled={createReview.isPending}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            onClick={handleSubmit}
            disabled={rating < 1 || createReview.isPending}
            className="w-full"
          >
            {createReview.isPending && (
              <Loader2 size={15} className="animate-spin" />
            )}
            ثبت نظر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
