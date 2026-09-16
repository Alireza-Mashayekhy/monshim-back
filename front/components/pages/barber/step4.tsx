// components/booking/Step4Payment.tsx
import { ArrowRight, CheckCircle, CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import {
  Barber,
  PaymentMethod,
  Service,
} from '@/services/features/barber/types';

interface Step4PaymentProps {
  barber: Barber;
  service: Service;
  selectedDate: string;
  selectedTime: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPay: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const Step4Payment: React.FC<Step4PaymentProps> = ({
  barber,
  service,
  selectedDate,
  selectedTime,
  paymentMethod,
  onPaymentMethodChange,
  onPay,
  onBack,
  isSubmitting,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-5 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -mr-2 text-gray-600 rounded-full hover:bg-gray-50"
        >
          <ArrowRight />
        </button>
        <h2 className="text-lg font-bold text-gray-800">تایید و پرداخت</h2>
      </div>

      <div className="flex-1 p-5 overflow-y-auto pb-32">
        {/* Ticket */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
          <div className="absolute top-1/2 left-0 w-6 h-6 bg-gray-50 rounded-full -translate-x-1/2 -translate-y-1/2 border-r border-gray-200" />
          <div className="absolute top-1/2 right-0 w-6 h-6 bg-gray-50 rounded-full translate-x-1/2 -translate-y-1/2 border-l border-gray-200" />

          <div className="p-6 pb-8 border-b border-dashed border-gray-200">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-gray-50 overflow-hidden mb-2">
                <img
                  src={barber.image || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-bold text-gray-800">{barber.shopName}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">سرویس</span>
                <span className="font-bold text-gray-800">{service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">تاریخ</span>
                <span className="font-bold text-gray-800 dir-ltr">
                  {selectedDate}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ساعت</span>
                <span className="font-bold text-gray-800">{selectedTime}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-between items-center">
            <span className="text-gray-600 font-bold">مبلغ کل</span>
            <span className="text-xl font-black text-primary-600">
              {formatPrice(service.price)}{' '}
              <span className="text-xs font-medium text-gray-500">تومان</span>
            </span>
          </div>
        </div>

        <h3 className="font-bold text-gray-800 mb-3 text-sm">روش پرداخت</h3>
        <div className="space-y-3">
          <label
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
              paymentMethod === 'ONLINE'
                ? 'bg-white border-primary-600 ring-1 ring-primary-600'
                : 'bg-white border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="pay"
              checked={paymentMethod === 'ONLINE'}
              onChange={() => onPaymentMethodChange('ONLINE')}
              className="hidden"
            />
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-gray-800">
                پرداخت اینترنتی
              </div>
              <div className="text-xs text-gray-400">کلیه کارت‌های بانکی</div>
            </div>
            {paymentMethod === 'ONLINE' && (
              <CheckCircle size={20} className="text-primary-600" />
            )}
          </label>

          {/* <label
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
              paymentMethod === 'WALLET'
                ? 'bg-white border-primary-600 ring-1 ring-primary-600'
                : 'bg-white border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="pay"
              checked={paymentMethod === 'WALLET'}
              onChange={() => onPaymentMethodChange('WALLET')}
              className="hidden"
            />
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-gray-800">کیف پول</div>
            </div>
            {paymentMethod === 'WALLET' && (
              <CheckCircle size={20} className="text-primary-600" />
            )}
          </label> */}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-100">
        <Button
          onClick={onPay}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting
            ? 'در حال پردازش...'
            : `پرداخت ${formatPrice(service.price)} تومان`}{' '}
        </Button>
      </div>
    </div>
  );
};
