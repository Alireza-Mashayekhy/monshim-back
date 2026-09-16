// components/pages/barber/step3.tsx
import { ArrowRight, Calendar, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getNext7Days } from '@/lib/utils';

interface Step3DateTimeProps {
  selectedDate: string | null;
  selectedTime: string | null;
  availableTimes: string[];
  timesLoading: boolean;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  serviceName: string;
}

export const Step3DateTime: React.FC<Step3DateTimeProps> = ({
  selectedDate,
  selectedTime,
  availableTimes,
  timesLoading,
  onSelectDate,
  onSelectTime,
  onConfirm,
  onBack,
  serviceName,
}) => {
  const days = getNext7Days();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* هدر */}
      <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -mr-2 text-gray-600 rounded-full hover:bg-gray-50"
        >
          <ArrowRight />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">زمان مراجعه</h2>
          <p className="text-xs text-gray-500">برای {serviceName}</p>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-8 overflow-y-auto pb-24">
        {/* انتخاب روز */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-primary-600" /> روز را انتخاب
            کنید
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {days.map(d => (
              <button
                key={d.date}
                onClick={() => {
                  onSelectDate(d.date);
                  onSelectTime(''); // ریست ساعت
                }}
                className={`min-w-[85px] p-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                  selectedDate === d.date
                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30 transform scale-105'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span
                  className={`text-xs ${selectedDate === d.date ? 'text-primary-100' : 'text-gray-400'}`}
                >
                  {d.label}
                </span>
                <span className="font-bold text-lg">
                  {d.date.split('-')[2]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* انتخاب ساعت */}
        <div
          className={`transition-opacity duration-300 ${selectedDate ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
        >
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary-600" /> ساعت را انتخاب کنید
          </h3>
          {timesLoading ? (
            <div className="text-gray-500">در حال بارگذاری زمان‌ها...</div>
          ) : availableTimes?.length === 0 ? (
            <div className="text-gray-400">
              هیچ زمانی در این تاریخ آزاد نیست
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 overflow-x-auto no-scrollbar pb-4 px-1">
              {availableTimes?.map(time => (
                <button
                  key={time} // time یک رشته است و یکتا
                  onClick={() => onSelectTime(time?.toString() || '')}
                  className={`min-w-[90px] p-4 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                    selectedTime === time
                      ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary-500 hover:text-primary-600'
                  }`}
                >
                  <span
                    className={`font-bold text-lg dir-ltr ${selectedTime === time ? 'text-white' : 'text-gray-800'}`}
                  >
                    {time}
                  </span>
                  <span className="text-[10px] text-gray-400">آزاد</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* دکمه پایین */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-100">
        <Button
          onClick={onConfirm}
          disabled={!selectedTime}
          className="w-full"
          size="lg"
        >
          تایید و ادامه
        </Button>
      </div>
    </div>
  );
};
