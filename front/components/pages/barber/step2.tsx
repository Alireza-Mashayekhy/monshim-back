// components/booking/Step2Services.tsx
import { ArrowRight, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Service } from '@/services/features/barber/types';

interface Step2ServicesProps {
  services: Service[];
  selectedServiceId: string | null;
  onSelectService: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const Step2Services: React.FC<Step2ServicesProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  onConfirm,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -mr-2 text-gray-600 rounded-full hover:bg-gray-50"
        >
          <ArrowRight />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">انتخاب خدمات</h2>
          <p className="text-xs text-gray-500">سرویس مورد نظر را انتخاب کنید</p>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto pb-24">
        <div className="space-y-3">
          {services.map(service => (
            <div
              key={service.id}
              onClick={() => onSelectService(service.id)}
              className={`p-4 rounded-2xl transition-all cursor-pointer flex justify-between items-center relative overflow-hidden ${
                selectedServiceId === service.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner ${
                    selectedServiceId === service.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  ✂️
                </div>
                <div>
                  <h4 className="font-bold text-sm">{service.name}</h4>
                  <span className="text-[10px] flex items-center gap-1 text-gray-400">
                    <Clock size={10} /> {service.durationMinutes} دقیقه
                  </span>
                </div>
              </div>
              {!service.depositePrice && (
                <div className="font-bold text-sm relative z-10">
                  {formatPrice(service.price)} تومان
                </div>
              )}
              {service.depositePrice && (
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-xs relative z-10 text-gray-400">
                    مبلغ کل: {formatPrice(service.price)} تومان
                  </div>
                  <div className="font-bold text-sm relative z-10">
                    بیعانه: {formatPrice(service.depositePrice)} تومان
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-100">
        <Button
          onClick={onConfirm}
          disabled={!selectedServiceId}
          className="w-full"
          size="lg"
        >
          انتخاب زمان <ArrowRight className="rotate-180" size={20} />
        </Button>
      </div>
    </div>
  );
};
