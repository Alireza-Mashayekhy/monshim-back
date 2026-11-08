'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { getApiErrorMessage } from '@/lib/api-error';
import { onlyDigits } from '@/lib/phone';
import {
  useChangePassword,
  useRequestChangePasswordCode,
} from '@/services/features/auth/hooks';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور الزامی است'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'تکرار رمز عبور با رمز جدید مطابقت ندارد.',
    path: ['confirmPassword'],
  });

type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

const COUNTDOWN_SECONDS = 120;

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const requestCodeMutation = useRequestChangePasswordCode();
  const changePasswordMutation = useChangePassword();

  const methods = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
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

  // reset when dialog closes
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      methods.reset();
      setStep(1);
      setCode('');
      setPendingNewPassword('');
      setCountdown(COUNTDOWN_SECONDS);
      setCanResend(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setShowNew(false);
      setShowConfirm(false);
    }
    onOpenChange(nextOpen);
  };

  const onSubmitNewPassword = async (data: NewPasswordFormData) => {
    try {
      await requestCodeMutation.mutateAsync();
      setPendingNewPassword(data.newPassword);
      setStep(2);
      setCode('');
      startCountdown();
      toast.success('کد تأیید به شماره شما ارسال شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'ارسال کد تأیید انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  const onResend = async () => {
    if (!canResend || requestCodeMutation.isPending) return;
    try {
      await requestCodeMutation.mutateAsync();
      setCode('');
      startCountdown();
      toast.success('کد تأیید جدید ارسال شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'ارسال مجدد کد انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  const onVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4 || changePasswordMutation.isPending) return;
    try {
      await changePasswordMutation.mutateAsync({
        newPassword: pendingNewPassword,
        code,
      });
      toast.success('رمز عبور با موفقیت تغییر کرد.');
      methods.reset();
      setStep(1);
      setCode('');
      setPendingNewPassword('');
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'تغییر رمز عبور انجام نشد. کد را بررسی کنید.',
        ),
      );
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const eyeButton = (show: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
      aria-label={label}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            تغییر رمز عبور
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <FormProvider
            methods={methods}
            onSubmit={onSubmitNewPassword}
            className="space-y-4"
          >
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-5 text-amber-800 flex gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                برای امنیت بیشتر، بعد از وارد کردن رمز جدید، یک کد ۴ رقمی به شمارهٔ شما پیامک می‌شود. با وارد کردن کد، رمز جدید اعمال می‌شود.
              </span>
            </div>

            <RHFInput
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              label="رمز عبور جدید"
              placeholder="حداقل ۶ کاراکتر"
              dir="ltr"
              className="text-left font-mono"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={eyeButton(
                showNew,
                () => setShowNew(p => !p),
                'نمایش رمز جدید',
              )}
            />

            <RHFInput
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              label="تکرار رمز عبور جدید"
              placeholder="تکرار رمز جدید"
              dir="ltr"
              className="text-left font-mono"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={eyeButton(
                showConfirm,
                () => setShowConfirm(p => !p),
                'نمایش تکرار رمز',
              )}
            />

            <Button
              type="submit"
              className="w-full"
              loading={requestCodeMutation.isPending}
            >
              <KeyRound className="w-4 h-4 ml-1" />
              ارسال کد تایید
            </Button>
          </FormProvider>
        ) : (
          <form onSubmit={onVerifyAndChange} className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-primary border border-teal-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">
                کد تایید را وارد کنید
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-5">
                کد ۴ رقمی به شمارهٔ شما ارسال شد. آن را وارد کنید تا رمز جدید ثبت شود.
              </p>
            </div>

            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={4}
                value={code}
                onChange={val => setCode(onlyDigits(val))}
                disabled={changePasswordMutation.isPending}
                pasteTransformer={onlyDigits}
                inputMode="numeric"
                pattern="[0-9]*"
                dir="ltr"
                autoFocus
              >
                <InputOTPGroup className="gap-3 flex-row-reverse">
                  <InputOTPSlot
                    index={0}
                    className="w-12 h-12 text-lg font-bold border-2 rounded-xl! focus:border-primary transition-all"
                  />
                  <InputOTPSlot
                    index={1}
                    className="w-12 h-12 text-lg font-bold border-2 rounded-xl! focus:border-primary transition-all"
                  />
                  <InputOTPSlot
                    index={2}
                    className="w-12 h-12 text-lg font-bold border-2 rounded-xl! focus:border-primary transition-all"
                  />
                  <InputOTPSlot
                    index={3}
                    className="w-12 h-12 text-lg font-bold border-2 rounded-xl! focus:border-primary transition-all"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="text-center">
              {canResend ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onResend}
                  loading={requestCodeMutation.isPending}
                  className="text-xs text-primary hover:text-primary/80 font-semibold gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ارسال مجدد کد
                </Button>
              ) : (
                <p className="text-xs text-gray-400 font-medium">
                  ارسال مجدد تا{' '}
                  <span className="font-mono text-gray-700 font-bold dir-ltr inline-block">
                    {formatTimer(countdown)}
                  </span>{' '}
                  دیگر
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep(1);
                  setCode('');
                }}
                disabled={changePasswordMutation.isPending}
              >
                بازگشت
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={changePasswordMutation.isPending}
                disabled={code.length !== 4}
              >
                تایید و تغییر رمز
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
