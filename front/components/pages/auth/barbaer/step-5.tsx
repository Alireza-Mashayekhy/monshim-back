'use client';

import {
  CheckCircle,
  ImageIcon,
  Loader2,
  Scissors,
  Store,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { getApiErrorMessage, getErrorStatus } from '@/lib/api-error';
import { jalaliToIso } from '@/lib/date-utils';
import { getImageUploadError } from '@/lib/image-upload';
import { isValidPhone, normalizePhone, onlyDigits } from '@/lib/phone';
import { formatPrice } from '@/lib/utils';
import { useRegisterBarber, useSendOtp } from '@/services/features/auth/hooks';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  const validationError = getImageUploadError(blob);
  if (validationError) throw new Error(validationError);
  return blob;
};

export default function BarbaerStep5() {
  const router = useRouter();
  const store = useBarberSignupStore();
  const [otpCode, setOtpCode] = useState('');
  const busy = useRef(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // هنگام باز شدن کیبورد، مودال در فضای واقعاً قابل‌مشاهده وسط‌چین می‌شود
  const { height: viewportHeight, top: viewportTop } =
    useVisualViewport(isOtpModalOpen);

  const registerMutation = useRegisterBarber();
  const sendOtpMutation = useSendOtp();

  const {
    fullName,
    phone,
    image,
    shopName,
    provinceId,
    cityId,
    provinceName,
    cityName,
    address,
    bio,
    portfolio,
    services,
    referralCode,
    birthDate,
    updateData,
  } = store;

  // Persisted drafts can bypass earlier steps; revalidate before sending OTP.
  const validateDraft = () => {
    if (
      !fullName.trim() ||
      !isValidPhone(phone) ||
      !shopName.trim() ||
      !provinceId ||
      !cityId ||
      !address.trim()
    ) {
      toast.error('اطلاعات فردی و سالن را در مراحل قبل تکمیل کنید.');
      return false;
    }
    if (
      !services.length ||
      services.length > 10 ||
      services.some(service => {
        const price = Number(service.price.replace(/,/g, ''));
        const duration = Number(service.duration);
        return (
          !service.name.trim() ||
          !Number.isFinite(price) ||
          price <= 0 ||
          !Number.isInteger(duration) ||
          duration <= 0
        );
      })
    ) {
      toast.error('نام، قیمت و مدت زمان خدمات را در مرحله قبل اصلاح کنید.');
      return false;
    }
    if (portfolio.length > 5) {
      toast.error('حداکثر ۵ نمونه‌کار مجاز است.');
      return false;
    }
    return true;
  };

  // مرحله ۱: ارسال OTP
  const handleSendOtp = async () => {
    if (busy.current || !validateDraft()) return;
    busy.current = true;
    setIsSendingOtp(true);
    try {
      await sendOtpMutation.mutateAsync({ phone: normalizePhone(phone) });
      setOtpCode('');
      setIsOtpModalOpen(true);
      toast.success('کد تأیید به شماره شما ارسال شد.');
    } catch (error) {
      if (getErrorStatus(error) === 400) {
        setOtpCode('');
        setIsOtpModalOpen(true);
      } else {
        toast.error(getApiErrorMessage(error, 'خطا در ارسال کد تأیید'));
      }
    } finally {
      setIsSendingOtp(false);
      busy.current = false;
    }
  };

  // مرحله ۲: تأیید کد و ثبت نهایی
  const handleFinalSubmit = async () => {
    if (busy.current || !validateDraft()) return;
    if (!/^\d{4}$/.test(otpCode)) {
      toast.error('کد تأیید چهاررقمی را وارد کنید.');
      return;
    }
    busy.current = true;
    try {
      // ساخت FormData
      const formData = new FormData();

      // فیلدهای متنی به صورت JSON
      const payload: any = {
        fullName: fullName.trim(),
        phone: normalizePhone(phone),
        salonName: shopName.trim(),
        provinceId,
        cityId,
        address,
        bio: bio || '',
        code: otpCode,
        birthDate: jalaliToIso(birthDate) || undefined,
        services: services.map(s => ({
          name: s.name,
          price: Number(s.price.replace(/,/g, '')),
          durationMinutes: parseInt(s.duration, 10),
        })),
      };

      // اضافه کردن کد معرف (در صورت وجود)
      if (referralCode && referralCode.trim()) {
        payload.referralCode = referralCode.trim();
      }
      formData.append('data', JSON.stringify(payload));

      // عکس پروفایل
      if (image) {
        const imageBlob = base64ToBlob(image);
        formData.append(
          'profileImage',
          imageBlob,
          `profile.${imageBlob.type.split('/')[1]}`,
        );
      }

      // نمونه کارها
      portfolio.forEach((img, index) => {
        const blob = base64ToBlob(img);
        formData.append(
          'portfolio',
          blob,
          `portfolio-${index + 1}.${blob.type.split('/')[1]}`,
        );
      });

      await registerMutation.mutateAsync(formData);

      toast.success('ثبت‌نام شما با موفقیت انجام شد!');
      setIsOtpModalOpen(false);
      setOtpCode('');
      store.reset();
      router.replace('/dashboard/profile');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          error instanceof Error && !('isAxiosError' in error)
            ? error.message
            : 'خطا در ارسال اطلاعات. لطفاً مجدداً تلاش کنید.',
        ),
      );
    } finally {
      busy.current = false;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-600 border border-primary-100 shadow-sm">
          <CheckCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">تایید و ثبت نهایی</h2>
        <p className="text-xs text-gray-500 mt-1">
          لطفاً اطلاعات زیر را بررسی کنید و در صورت صحت، ثبت نام را نهایی کنید.
        </p>
      </div>

      {/* کارت‌های پیش‌نمایش */}
      <div className="space-y-4">
        {/* اطلاعات فردی */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <User size={16} className="text-primary-600" />
            <h3 className="font-bold text-sm">اطلاعات فردی</h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">نام و نام خانوادگی</span>
              <span className="font-medium text-left">{fullName || '—'}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">شماره موبایل</span>
              <span className="font-medium text-left dir-ltr">
                {phone || '—'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">تاریخ تولد</span>
              <span className="font-medium text-left">{birthDate || '—'}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-gray-500 shrink-0">عکس پروفایل</span>
              {image ? (
                <img
                  src={image}
                  alt="پروفایل"
                  className="w-10 h-10 rounded-full object-cover border"
                />
              ) : (
                <span className="text-gray-400">انتخاب نشده</span>
              )}
            </div>
          </div>
        </div>

        {/* اطلاعات سالن */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <Store size={16} className="text-primary-600" />
            <h3 className="font-bold text-sm">اطلاعات سالن</h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">نام آرایشگاه</span>
              <span className="font-medium text-left">{shopName || '—'}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">استان</span>
              <span className="font-medium text-left">
                {provinceName || '—'}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">شهر</span>
              <span className="font-medium text-left">{cityName || '—'}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-500 shrink-0">آدرس</span>
              <span className="font-medium text-left leading-5">
                {address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* نمونه کارها */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <ImageIcon size={16} className="text-primary-600" />
            <h3 className="font-bold text-sm">نمونه کارها</h3>
          </div>
          {portfolio.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {portfolio.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`نمونه کار ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
              ))}
              {portfolio.length > 4 && (
                <div className="flex items-center justify-center w-full aspect-square bg-gray-100 rounded-lg text-xs text-gray-500 border">
                  +{portfolio.length - 4} بیشتر
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              هیچ نمونه کاری انتخاب نشده است.
            </p>
          )}
        </div>

        {/* خدمات */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Scissors size={16} className="text-primary-600" />
            <h3 className="font-bold text-sm">خدمات</h3>
          </div>
          {services.length > 0 ? (
            <div className="space-y-1">
              {services.map(s => (
                <div
                  key={s.id}
                  className="flex justify-between text-sm border-b border-gray-50 py-1 last:border-0"
                >
                  <span className="font-medium">{s.name || 'بدون نام'}</span>
                  <span className="text-gray-600">
                    {s.price ? `${formatPrice(s.price)} تومان` : '—'}
                    {' / '}
                    {s.duration ? `${s.duration} دقیقه` : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">هیچ خدمتی ثبت نشده است.</p>
          )}
        </div>
      </div>

      {/* کد معرف (اختیاری) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-600"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
          <h3 className="font-bold text-sm">کد معرف (اختیاری)</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          اگر کد معرف آرایشگری را دارید، در اینجا وارد کنید.
        </p>
        <input
          type="text"
          placeholder="کد معرف ۸ کاراکتری"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:bg-white focus:border-primary-500 outline-none transition-colors dir-ltr text-center font-mono tracking-wider"
          value={referralCode}
          onChange={e =>
            updateData({ referralCode: e.target.value.toUpperCase() })
          }
          maxLength={8}
        />
      </div>

      {/* دکمه‌های پایین */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={store.prevStep}
            disabled={registerMutation.isPending || isSendingOtp}
          >
            مرحله قبل
          </Button>
          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={registerMutation.isPending || isSendingOtp}
            className="min-w-[120px]"
          >
            {isSendingOtp ? (
              <>
                <Loader2 size={18} className="animate-spin ml-2" />
                ارسال کد...
              </>
            ) : (
              'ثبت نهایی'
            )}
          </Button>
        </div>
      </div>

      {/* مودال ورود کد */}
      <Dialog
        open={isOtpModalOpen}
        onOpenChange={open => {
          if (!busy.current) setIsOtpModalOpen(open);
        }}
      >
        {' '}
        <DialogContent
          className="sm:max-w-md overflow-y-auto transition-[top,max-height] duration-200 ease-out"
          style={
            viewportHeight > 0
              ? {
                  // وسطِ فضای واقعاً قابل‌مشاهده (بالای کیبورد)
                  top: viewportTop + viewportHeight / 2,
                  // مودال هیچ‌وقت از فضای قابل‌مشاهده بیرون نمی‌زند
                  maxHeight: Math.max(viewportHeight - 16, 200),
                }
              : undefined
          }
        >
          <DialogHeader>
            <DialogTitle>تأیید شماره موبایل</DialogTitle>
            <DialogDescription>
              کد تأیید به شماره {phone} ارسال شد. لطفاً آن را وارد کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <InputOTP
              maxLength={4}
              value={otpCode}
              onChange={value => setOtpCode(onlyDigits(value))}
              pasteTransformer={onlyDigits}
              inputMode="numeric"
              pattern="[0-9]*"
              dir="ltr"
              id="input-otp-ltr"
              autoFocus
            >
              <InputOTPGroup className="w-full gap-2 flex-row-reverse">
                <InputOTPSlot
                  index={0}
                  className="w-full h-11 border rounded-md"
                />
                <InputOTPSlot
                  index={1}
                  className="w-full h-11 border rounded-md"
                />
                <InputOTPSlot
                  index={2}
                  className="w-full h-11 border rounded-md"
                />
                <InputOTPSlot
                  index={3}
                  className="w-full h-11 border rounded-md"
                />
              </InputOTPGroup>
            </InputOTP>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={registerMutation.isPending}
                onClick={() => {
                  setIsOtpModalOpen(false);
                  setOtpCode('');
                }}
              >
                انصراف
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={otpCode.length < 4 || registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin ml-2" />
                    در حال ثبت...
                  </>
                ) : (
                  'تأیید و ثبت'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
