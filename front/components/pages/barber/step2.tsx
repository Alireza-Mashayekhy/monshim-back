// components/booking/Step2Services.tsx
import { ArrowRight, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BackButton } from '@/components/shared/back-button';
import { Button } from '@/components/ui/button';
import {
  FA_MONTHS,
  FA_WEEKDAYS,
  formatJalaliDate,
  getMonthGrid,
  gregorianToJalali,
  JalaliDayCell,
  toFa,
  toISODate,
} from '@/lib/jalali';
import { formatPrice } from '@/lib/utils';
import { Barber, Service } from '@/services/features/barber/types';

interface Step2BookConfirmProps {
  barber: Barber;
  selectedServiceIds: string[];
  availableTimes: string[];
  timesLoading: boolean;
  selectedDateISO: string | null;
  selectedTime: string | null;
  onSelectDateISO: (iso: string) => void;
  onSelectTime: (t: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const Step2BookConfirm: React.FC<Step2BookConfirmProps> = ({
  barber,
  selectedServiceIds,
  availableTimes,
  timesLoading,
  selectedDateISO,
  selectedTime,
  onSelectDateISO,
  onSelectTime,
  onConfirm,
  onBack,
  isSubmitting,
}) => {
  const today = useMemo(() => new Date(), []);
  const initialJ = gregorianToJalali(today);
  const [viewJy, setViewJy] = useState(initialJ.jy);
  const [viewJm, setViewJm] = useState(initialJ.jm);

  const selectedDate = selectedDateISO ? new Date(selectedDateISO) : null;

  const weeks = useMemo(() => getMonthGrid(viewJy, viewJm), [viewJy, viewJm]);

  const selectedServices: Service[] = useMemo(
    () =>
      (barber.services || []).filter(s => selectedServiceIds.includes(s.id)),
    [barber.services, selectedServiceIds],
  );

  const totalPrice = selectedServices.reduce(
    (sum, s) => Number(sum) + Number(s.price),
    0,
  );
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );

  // کمیسیون سایت: ۱۰٪ بیشترین مبلغ خدمات انتخاب‌شده (نه ۱۰٪ جمع کل)
  const maxServicePrice = selectedServices.reduce(
    (max, s) => Math.max(max, Number(s.price)),
    0,
  );
  const commissionAmount = Math.round(maxServicePrice * 0.1);
  // مبلغ قابل پرداخت = مجموع خدمات + کمیسیون سایت
  const totalPayable = totalPrice + commissionAmount;

  const goPrevMonth = () => {
    const jm = viewJm === 1 ? 12 : viewJm - 1;
    const jy = viewJm === 1 ? viewJy - 1 : viewJy;
    setViewJm(jm);
    setViewJy(jy);
  };
  const goNextMonth = () => {
    const jm = viewJm === 12 ? 1 : viewJm + 1;
    const jy = viewJm === 12 ? viewJy + 1 : viewJy;
    setViewJm(jm);
    setViewJy(jy);
  };

  const isSelectedDay = (c: JalaliDayCell) =>
    !!selectedDate && toISODate(c.date) === toISODate(selectedDate);

  const canGoPrev = useMemo(() => {
    // Don't allow going before current month
    const t = gregorianToJalali(today);
    return !(viewJy === t.jy && viewJm === t.jm);
  }, [viewJy, viewJm, today]);

  const formattedDate = selectedDate ? formatJalaliDate(selectedDate) : 'تاریخ';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-5 border-b sticky top-0 z-10 flex items-center gap-3">
        <div className="absolute">
          <BackButton func={onBack} />
        </div>

        <h2 className="text-2xl font-black text-gray-900 text-center w-full">
          انتخاب زمان
        </h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Calendar */}
        <div className="bg-white max-w-lg mx-auto rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={goPrevMonth}
              disabled={!canGoPrev}
              className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
            >
              <ChevronRight size={22} />
            </button>
            <div className="text-xl font-black text-gray-900">
              {FA_MONTHS[viewJm - 1]} {toFa(viewJy)}
            </div>
            <button
              onClick={goNextMonth}
              className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition"
            >
              <ChevronLeft size={22} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-3">
            {FA_WEEKDAYS.map(w => (
              <div
                key={w}
                className="text-center text-sm font-bold text-gray-400"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-2">
            {weeks.flat().map((c, i) => {
              const selected = isSelectedDay(c);
              const clickable = c.isInMonth && !c.isPast;
              return (
                <button
                  key={i}
                  disabled={!clickable}
                  onClick={() => onSelectDateISO(toISODate(c.date))}
                  className={`relative aspect-square flex items-center justify-center mx-1 rounded-xl text-base font-bold transition-all ${
                    selected
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : clickable
                        ? 'text-gray-800 hover:bg-primary/10'
                        : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {toFa(c.jd)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div>
            <h3 className="font-bold text-gray-800 mb-4 text-lg">
              ساعت‌های خالی {toFa(gregorianToJalali(selectedDate).jd)}{' '}
              {FA_MONTHS[gregorianToJalali(selectedDate).jm - 1]}
            </h3>
            {timesLoading ? (
              <div className="bg-white rounded-3xl p-6 text-center text-gray-400 border border-gray-100">
                در حال بارگذاری زمان‌ها...
              </div>
            ) : availableTimes.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center text-gray-400 border border-gray-100">
                <Lock size={22} className="mx-auto mb-2 text-gray-300" />
                در این تاریخ نوبت خالی وجود ندارد
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {availableTimes.map(time => {
                  const disabled = false;
                  const selected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      disabled={disabled}
                      onClick={() => onSelectTime(time)}
                      className={`p-3 rounded-2xl flex items-center justify-center border-2 text-base font-bold transition-all active:scale-95 ${
                        selected
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                          : disabled
                            ? 'bg-gray-50 text-gray-300 border-gray-100 relative line-through'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-primary/40'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-gray-900">خلاصه رزرو</h3>
            <div>
              <p className="text-xs text-gray-400">
                {toFa(totalDuration)} دقیقه
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            {selectedServices.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-gray-700 font-semibold">{s.name}</span>
                <span className="font-bold text-primary text-base">
                  {toFa(formatPrice(s.price))} تومان
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <span className="text-gray-500">تاریخ و ساعت</span>
              <span className="font-bold text-gray-900 text-base">
                {selectedTime ? `${formattedDate}، ${selectedTime}` : '- ، -'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">مجموع خدمات</span>
              <span className="font-bold text-gray-900 text-base">
                {toFa(formatPrice(totalPrice))} تومان
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                کمیسیون سایت (۱۰٪ بیشترین خدمت)
              </span>
              <span className="font-bold text-primary text-base">
                {toFa(formatPrice(commissionAmount))} تومان
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 mt-3">
              <span className="font-bold text-gray-900 text-lg">
                مجموع قابل پرداخت
              </span>
              <span className="font-black text-primary text-xl">
                {toFa(formatPrice(totalPayable))} تومان
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={onConfirm}
          disabled={!selectedTime || !selectedDate || isSubmitting}
          className="w-full h-14 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:shadow-none flex items-center justify-center gap-2"
          size="lg"
        >
          {isSubmitting
            ? 'در حال پردازش...'
            : `تأیید و پرداخت ${toFa(formatPrice(totalPayable))} تومان`}{' '}
          <ArrowRight size={20} className="rotate-180" />
        </Button>
      </div>
    </div>
  );
};
