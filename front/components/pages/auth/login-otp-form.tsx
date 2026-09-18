'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { getApiErrorMessage } from '@/lib/api-error';
import { normalizePhone, onlyDigits, phoneSchema } from '@/lib/phone';
import { useLogin, useSendOtp } from '@/services/features/auth/hooks';

const phoneFormSchema = z.object({
  phone: phoneSchema,
});

type PhoneFormValues = z.infer<typeof phoneFormSchema>;

const COUNTDOWN_SECONDS = 120;

export default function LoginOtpForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const sendOtpMutation = useSendOtp();
  const loginMutation = useLogin();

  const phoneMethods = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: '',
    },
  });

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onSendPhone = async (values: PhoneFormValues) => {
    const normalized = normalizePhone(values.phone);
    try {
      await sendOtpMutation.mutateAsync({ phone: normalized });
      setPhone(normalized);
      setCode('');
      setStep(2);
      startCountdown();
      toast.success('کد تأیید برای شماره شما ارسال شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'ارسال کد تأیید با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
        ),
      );
    }
  };

  const onResendOtp = async () => {
    if (!canResend || !phone || sendOtpMutation.isPending) return;
    try {
      await sendOtpMutation.mutateAsync({ phone });
      setCode('');
      startCountdown();
      toast.success('کد تأیید جدید ارسال شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'ارسال مجدد کد انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4 || !phone || loginMutation.isPending) return;

    try {
      const response = await loginMutation.mutateAsync({
        phone,
        code,
      });

      // If user is a new user who hasn't registered yet
      if ((response as any)?.data?.newUser) {
        toast.info(
          'شما هنوز ثبت‌نام نکرده‌اید. در حال انتقال به صفحه ثبت‌نام...',
        );
        router.push(`/register?phone=${phone}`);
        return;
      }

      toast.success('ورود با موفقیت انجام شد. خوش آمدید!');
      router.replace('/home');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'کد تأیید نادرست است یا منقضی شده است. مجدداً بررسی کنید.',
        ),
      );
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {step === 1 ? (
        <div className="space-y-6">
          <FormProvider
            methods={phoneMethods}
            onSubmit={onSendPhone}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <RHFPhoneInput
                name="phone"
                label="شماره موبایل"
                placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                isRequired
                startIcon={<Smartphone className="w-4 h-4" />}
              />
              <p className="text-xs text-gray-400">
                کد یک‌بار مصرف ۴ رقمی از طریق پیامک برای شما ارسال می‌شود.
              </p>
            </div>

            <Button
              type="submit"
              loading={sendOtpMutation.isPending}
              size="lg"
              className="w-full mt-2 h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
            >
              <KeyRound className="w-5 h-5" />
              دریافت کد تأیید
            </Button>
          </FormProvider>

          {/* Alternative options */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium">
                یا
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/login" className="block w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium cursor-pointer"
              >
                <Lock className="w-4 h-4 text-primary" />
                ورود با رمز عبور
              </Button>
            </Link>

            <div className="pt-2 text-center text-xs text-gray-500">
              حساب کاربری ندارید؟{' '}
              <Link
                href="/register"
                className="text-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                ثبت‌نام در منشیم
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-6">
          <div className="relative flex flex-col items-center text-center">
            <button
              type="button"
              disabled={loginMutation.isPending}
              onClick={() => {
                setStep(1);
                setCode('');
              }}
              className="absolute -top-2 right-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="ویرایش شماره موبایل"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-primary border border-teal-100 flex items-center justify-center mb-3 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              کد تأیید را وارد کنید
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              کد ۴ رقمی ارسال شده به شماره{' '}
              <span className="font-bold text-gray-800 dir-ltr inline-block mx-1">
                {phone}
              </span>{' '}
              را وارد کنید.
            </p>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode('');
              }}
              className="text-xs text-primary hover:underline mt-2 font-medium cursor-pointer"
            >
              ویرایش شماره موبایل
            </button>
          </div>

          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={4}
              value={code}
              onChange={val => setCode(onlyDigits(val))}
              disabled={loginMutation.isPending}
              pasteTransformer={onlyDigits}
              inputMode="numeric"
              pattern="[0-9]*"
              dir="ltr"
              autoFocus
            >
              <InputOTPGroup className="gap-3 flex-row-reverse">
                <InputOTPSlot
                  index={0}
                  className="w-14 h-14 text-xl font-bold border-2 rounded-xl! focus:border-primary transition-all"
                />
                <InputOTPSlot
                  index={1}
                  className="w-14 h-14 text-xl font-bold border-2 rounded-xl! focus:border-primary transition-all"
                />
                <InputOTPSlot
                  index={2}
                  className="w-14 h-14 text-xl font-bold border-2 rounded-xl! focus:border-primary transition-all"
                />
                <InputOTPSlot
                  index={3}
                  className="w-14 h-14 text-xl font-bold border-2 rounded-xl! focus:border-primary transition-all"
                />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Resend timer */}
          <div className="text-center">
            {canResend ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResendOtp}
                loading={sendOtpMutation.isPending}
                className="text-xs text-primary hover:text-primary/80 font-semibold gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ارسال مجدد کد تأیید
              </Button>
            ) : (
              <p className="text-xs text-gray-400 font-medium">
                ارسال مجدد کد تا{' '}
                <span className="font-mono text-gray-700 font-bold dir-ltr inline-block">
                  {formatTimer(countdown)}
                </span>{' '}
                دیگر
              </p>
            )}
          </div>

          <Button
            type="submit"
            loading={loginMutation.isPending}
            disabled={code.length !== 4}
            size="lg"
            className="w-full h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
          >
            تأیید و ورود
          </Button>

          <div className="pt-2 text-center text-xs text-gray-500">
            حساب کاربری ندارید؟{' '}
            <Link
              href={`/register${phone ? `?phone=${phone}` : ''}`}
              className="text-primary font-bold hover:underline inline-flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              ثبت‌نام در منشیم
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
