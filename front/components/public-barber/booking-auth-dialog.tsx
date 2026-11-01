'use client';

import {
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage, getErrorStatus } from '@/lib/api-error';
import { normalizePhone, onlyDigits } from '@/lib/phone';
import { cn, toPersianDigits } from '@/lib/utils';
import {
  useLogin,
  useSendOtp,
  useSignUp,
} from '@/services/features/auth/hooks';

type Step = 'phone' | 'code' | 'profile';
type Gender = 'male' | 'female' | '';
const RESEND_SECONDS = 60;

export default function BookingAuthDialog({
  open,
  onOpenChange,
  salonName,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonName: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [remaining, setRemaining] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const sendOtp = useSendOtp();
  const login = useLogin();
  const signUp = useSignUp();

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => {
      // Use a deadline rather than tick counts so background-tab throttling
      // does not keep the resend button disabled after the cooldown expires.
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setResendAt(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const startCooldown = () => {
    setRemaining(RESEND_SECONDS);
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
  };

  const submitPhone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (working) return;
    // normalizePhone intentionally truncates for other forms. Check the full
    // input first so an extra digit cannot silently send an OTP to a different
    // number; accept the usual local and +98/0098 formats.
    if (!/^(?:0|98|0098)?9\d{9}$/.test(onlyDigits(phone))) {
      setError('شماره موبایل معتبر وارد کنید.');
      return;
    }
    const normalized = normalizePhone(phone);
    setError('');
    setWorking(true);
    try {
      await sendOtp.mutateAsync({ phone: normalized });
      setPhone(normalized);
      setCode('');
      startCooldown();
      setStep('code');
    } catch (failure) {
      setError(
        getApiErrorMessage(failure, 'ارسال کد انجام نشد. دوباره تلاش کنید.'),
      );
    } finally {
      setWorking(false);
    }
  };

  const resend = async () => {
    if (working || remaining > 0) return;
    setError('');
    setWorking(true);
    try {
      await sendOtp.mutateAsync({ phone });
      setCode('');
      startCooldown();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'ارسال دوباره کد انجام نشد.'));
    } finally {
      setWorking(false);
    }
  };

  const submitCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (working) return;
    if (!/^\d{4}$/.test(code)) {
      setError('کد چهاررقمی پیامک‌شده را وارد کنید.');
      return;
    }
    setError('');
    setWorking(true);
    try {
      const result = await login.mutateAsync({ phone, code });
      if (result.data?.newUser === true) setStep('profile');
      else if (result.data?.newUser === false) onComplete();
      else throw new Error('Invalid login response');
    } catch (failure) {
      setError(
        getApiErrorMessage(failure, 'تأیید کد انجام نشد. دوباره تلاش کنید.'),
      );
    } finally {
      setWorking(false);
    }
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (working) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (first.length < 2 || last.length < 2) {
      setError('نام و نام خانوادگی باید هرکدام حداقل ۲ حرف باشند.');
      return;
    }
    if (!gender) {
      setError('لطفاً جنسیت خود را انتخاب کنید.');
      return;
    }
    setError('');
    setWorking(true);
    try {
      await signUp.mutateAsync({
        phone,
        code,
        fullName: `${first} ${last}`,
        gender,
      });
      onComplete();
    } catch (failure) {
      if (getErrorStatus(failure) === 409) {
        // If the same verified number was registered elsewhere meanwhile,
        // log into that account instead of trapping the user in registration.
        try {
          const result = await login.mutateAsync({ phone, code });
          if (result.data?.newUser === false) {
            onComplete();
            return;
          }
        } catch (loginFailure) {
          setError(getApiErrorMessage(loginFailure, 'ورود به حساب انجام نشد.'));
          return;
        }
      }
      setError(
        getApiErrorMessage(failure, 'ثبت‌نام انجام نشد. دوباره تلاش کنید.'),
      );
    } finally {
      setWorking(false);
    }
  };

  const changeStep = (next: Step) => {
    setError('');
    setStep(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!working) onOpenChange(value);
      }}
    >
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 rounded-[28px] border border-primary/10 bg-white p-6 shadow-2xl sm:max-w-md sm:p-7"
        onEscapeKeyDown={event => {
          if (working) event.preventDefault();
        }}
        onPointerDownOutside={event => {
          if (working) event.preventDefault();
        }}
      >
        <DialogClose asChild>
          <button
            type="button"
            disabled={working}
            aria-label="بستن"
            className="absolute left-5 top-5 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={19} />
          </button>
        </DialogClose>

        <DialogHeader className="items-start text-right">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary-2 text-primary">
            {step === 'phone' ? (
              <CalendarCheck size={23} />
            ) : (
              <ShieldCheck size={23} />
            )}
          </div>
          <DialogTitle className="text-xl font-black text-gray-900">
            {step === 'phone'
              ? 'ورود برای رزرو نوبت'
              : step === 'code'
                ? 'کد تأیید را وارد کنید'
                : 'تکمیل اطلاعات حساب'}
          </DialogTitle>
          <DialogDescription className="mt-1 leading-6 text-gray-500">
            {step === 'phone'
              ? `برای ادامه رزرو در ${salonName}، شماره موبایل خود را وارد کنید.`
              : step === 'code'
                ? `کد چهاررقمی ارسال‌شده به ${toPersianDigits(phone)} را وارد کنید.`
                : 'برای ساخت حساب و ادامه رزرو، اطلاعات خود را تکمیل کنید.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' && (
          <form onSubmit={submitPhone} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="booking-phone"
                className="text-sm font-bold text-gray-800"
              >
                شماره موبایل
              </label>
              <div className="relative">
                <Input
                  id="booking-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value);
                    setError('');
                  }}
                  disabled={working}
                  aria-invalid={!!error}
                  className="h-12 rounded-xl border-gray-200 pl-11 text-left"
                />
                <Smartphone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs leading-6 text-red-700"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              loading={working}
              className="h-12 w-full rounded-xl font-bold"
            >
              دریافت کد تأیید
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="booking-code"
                className="text-sm font-bold text-gray-800"
              >
                کد تأیید
              </label>
              <Input
                id="booking-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={4}
                placeholder="----"
                value={code}
                onChange={event => {
                  setCode(onlyDigits(event.target.value).slice(0, 4));
                  setError('');
                }}
                disabled={working}
                aria-invalid={!!error}
                className="h-14 rounded-xl border-gray-200 text-center text-xl font-bold tracking-[0.5em]"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <button
                type="button"
                disabled={working}
                onClick={() => changeStep('phone')}
                className="text-gray-500 hover:text-gray-800 disabled:opacity-50"
              >
                ویرایش شماره
              </button>
              <button
                type="button"
                disabled={working || remaining > 0}
                onClick={() => void resend()}
                className="text-primary disabled:text-gray-400"
              >
                {remaining > 0
                  ? `ارسال دوباره تا ${toPersianDigits(remaining)} ثانیه`
                  : 'ارسال دوباره کد'}
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs leading-6 text-red-700"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              loading={working}
              className="h-12 w-full rounded-xl font-bold"
            >
              تأیید و ادامه رزرو
            </Button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={submitProfile} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="booking-first-name"
                  className="text-sm font-bold text-gray-800"
                >
                  نام
                </label>
                <Input
                  id="booking-first-name"
                  autoComplete="given-name"
                  maxLength={50}
                  value={firstName}
                  onChange={event => {
                    setFirstName(event.target.value);
                    setError('');
                  }}
                  disabled={working}
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="booking-last-name"
                  className="text-sm font-bold text-gray-800"
                >
                  نام خانوادگی
                </label>
                <Input
                  id="booking-last-name"
                  autoComplete="family-name"
                  maxLength={50}
                  value={lastName}
                  onChange={event => {
                    setLastName(event.target.value);
                    setError('');
                  }}
                  disabled={working}
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>
            </div>
            <fieldset className="space-y-2" disabled={working}>
              <legend className="mb-2 text-sm font-bold text-gray-800">
                جنسیت
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: 'male', label: 'آقا' },
                    { value: 'female', label: 'خانم' },
                  ] as const
                ).map(option => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition',
                      gender === option.value
                        ? 'border-primary bg-primary-3 text-primary'
                        : 'border-gray-200 text-gray-600',
                    )}
                  >
                    <input
                      type="radio"
                      name="booking-gender"
                      value={option.value}
                      checked={gender === option.value}
                      onChange={() => {
                        setGender(option.value);
                        setError('');
                      }}
                      className="accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs leading-6 text-red-700"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              loading={working}
              className="h-12 w-full rounded-xl font-bold"
            >
              ثبت‌نام و ادامه رزرو
            </Button>
            <button
              type="button"
              disabled={working}
              onClick={() => changeStep('code')}
              className="mx-auto flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary disabled:opacity-50"
            >
              <ArrowRight size={14} /> بازگشت به کد تأیید
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
