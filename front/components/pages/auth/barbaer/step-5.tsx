'use client';

import { ImageIcon, Loader2, Scissors, Store, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import StepFooter from '@/components/pages/auth/barbaer/step-footer';
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
import { getActivityTypeLabel } from '@/constants/activity-types';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { getApiErrorMessage, getErrorStatus } from '@/lib/api-error';
import { jalaliToIso } from '@/lib/date-utils';
import { getImageUploadError } from '@/lib/image-upload';
import { toFa } from '@/lib/jalali';
import { isValidPhone, normalizePhone, onlyDigits } from '@/lib/phone';
import { formatPrice } from '@/lib/utils';
import { useRegisterBarber, useSendOtp } from '@/services/features/auth/hooks';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

const MIN_DEPOSIT = 100_000;
const DEPOSIT_MAX_RATIO = 0.3;

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
    activityType,
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
    if (!activityType) {
      toast.error('نوع فعالیت سالن را در مرحله قبل انتخاب کنید.');
      return false;
    }
    if (
      !services.length ||
      services.length > 10 ||
      services.some(service => {
        const price = Number(service.price.replace(/,/g, ''));
        const duration = Number(service.duration);
        const depositRaw = (service.depositPrice ?? '').trim();

        let depositOk = true;
        if (depositRaw) {
          const deposit = Number(depositRaw.replace(/,/g, ''));
          depositOk =
            Number.isFinite(deposit) &&
            deposit >= MIN_DEPOSIT &&
            deposit <= price * DEPOSIT_MAX_RATIO;
        }

        return (
          !service.name.trim() ||
          !Number.isFinite(price) ||
          price <= 0 ||
          !Number.isInteger(duration) ||
          duration <= 0 ||
          !depositOk
        );
      })
    ) {
      toast.error(
        'نام، قیمت، بیعانه و مدت زمان خدمات را در مرحله قبل اصلاح کنید.',
      );
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
        activityType,
        bio: bio || '',
        code: otpCode,
        birthDate: jalaliToIso(birthDate) || undefined,
        services: services.map(s => {
          const depositRaw = (s.depositPrice ?? '').trim();
          const deposit = depositRaw
            ? Number(depositRaw.replace(/,/g, ''))
            : undefined;
          return {
            name: s.name,
            price: Number(s.price.replace(/,/g, '')),
            durationMinutes: parseInt(s.duration, 10),
            ...(deposit ? { depositPrice: deposit } : {}),
          };
        }),
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
    <div className="space-y-5 animate-fade-in">
      {/* کارت‌های پیش‌نمایش */}
      <div className="space-y-4">
        {/* اطلاعات فردی */}
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
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
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
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
              <span className="text-gray-500 shrink-0">نوع فعالیت</span>
              <span className="font-medium text-left">
                {getActivityTypeLabel(activityType) || '—'}
              </span>
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
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
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
                  className="w-full aspect-square object-cover rounded-xl border"
                />
              ))}
              {portfolio.length > 4 && (
                <div className="flex items-center justify-center w-full aspect-square bg-gray-100 rounded-xl text-xs text-gray-500 border">
                  +{toFa(portfolio.length - 4)} بیشتر
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
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Scissors size={16} className="text-primary-600" />
            <h3 className="font-bold text-sm">خدمات</h3>
          </div>
          {services.length > 0 ? (
            <div className="space-y-2">
              {services.map(s => {
                const deposit = Number(
                  (s.depositPrice ?? '').replace(/,/g, ''),
                );
                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-2"
                  >
                    <div className="flex justify-between items-center gap-2 text-sm">
                      <span className="font-bold">{s.name || 'بدون نام'}</span>
                      <span className="text-gray-600 font-medium">
                        {s.price ? toFa(formatPrice(s.price)) : '—'}
                        {' تومان / '}
                        {s.duration ? `${toFa(s.duration)} دقیقه` : '—'}
                      </span>
                    </div>
                    {deposit > 0 && (
                      <p className="text-[11px] text-primary-600 font-medium mt-1">
                        بیعانه: {toFa(formatPrice(deposit))} تومان
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">هیچ خدمتی ثبت نشده است.</p>
          )}
        </div>
      </div>

      {/* کد معرف (اختیاری) */}
      <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
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
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-primary-500 outline-none transition-colors dir-ltr text-center font-mono tracking-wider"
          value={referralCode}
          onChange={e =>
            updateData({ referralCode: e.target.value.toUpperCase() })
          }
          maxLength={8}
        />
      </div>

      <StepFooter
        onBack={store.prevStep}
        primary={
          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={registerMutation.isPending || isSendingOtp}
            className="flex-1 h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
          >
            {isSendingOtp ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                ارسال کد...
              </>
            ) : (
              'ثبت نهایی'
            )}
          </Button>
        }
      />

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
              <InputOTPGroup className="w-full gap-2 flex-row-reverse justify-center">
                <InputOTPSlot
                  index={0}
                  className="h-12 w-12 border rounded-md"
                />
                <InputOTPSlot
                  index={1}
                  className="h-12 w-12 border rounded-md"
                />
                <InputOTPSlot
                  index={2}
                  className="h-12 w-12 border rounded-md"
                />
                <InputOTPSlot
                  index={3}
                  className="h-12 w-12 border rounded-md"
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
