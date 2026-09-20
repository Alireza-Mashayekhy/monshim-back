'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import { PersianDatePicker } from '@/components/form/persian-date-picker';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import RHFSelect from '@/components/form/rhf-select';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { getApiErrorMessage } from '@/lib/api-error';
import { jalaliToIso } from '@/lib/date-utils';
import { normalizePhone, onlyDigits, phoneSchema } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { useSendOtp, useSignUp } from '@/services/features/auth/hooks';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';

const registerSchema = z
  .object({
    gender: z.enum(['male', 'female'], {
      message: 'لطفاً جنسیت خود را انتخاب کنید.',
    }),
    firstName: z
      .string()
      .trim()
      .min(2, 'نام باید حداقل ۲ کاراکتر باشد.')
      .max(50, 'نام بسیار طولانی است.'),
    lastName: z
      .string()
      .trim()
      .min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد.')
      .max(50, 'نام خانوادگی بسیار طولانی است.'),
    phone: phoneSchema,
    provinceId: z.string().trim().nonempty('انتخاب استان اجباری است.'),
    cityId: z.string().trim().nonempty('انتخاب شهر اجباری است.'),
    birthDate: z.string().trim().min(1, 'انتخاب تاریخ تولد اجباری است.'),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور اجباری است.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'تکرار رمز عبور با رمز عبور مطابقت ندارد.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const COUNTDOWN_SECONDS = 120;

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';
  const initialProvinceId = searchParams.get('provinceId') || '';
  const initialCityId = searchParams.get('cityId') || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<RegisterFormValues | null>(null);
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const sendOtpMutation = useSendOtp();
  const signUpMutation = useSignUp();

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      gender: 'male',
      firstName: '',
      lastName: '',
      phone: initialPhone,
      provinceId: initialProvinceId,
      cityId: initialCityId,
      birthDate: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedProvinceId = useWatch({
    control: methods.control,
    name: 'provinceId',
  });

  // دریافت لیست استان‌ها
  const { data: provinces } = useProvinceList();
  // دریافت لیست شهرها بر اساس استان انتخاب‌شده
  const { data: cities } = useCityList(parseInt(selectedProvinceId));

  const provinceOptions = provinces?.data?.map((p: any) => ({
    value: p.id.toString(),
    text: p.name,
  }));

  const cityOptions = cities?.data?.map((c: any) => ({
    value: c.id.toString(),
    text: c.name,
  }));

  const previousProvince = useRef(selectedProvinceId);
  useEffect(() => {
    if (previousProvince.current !== selectedProvinceId) {
      methods.setValue('cityId', '', { shouldValidate: true });
      previousProvince.current = selectedProvinceId;
    }
  }, [selectedProvinceId, methods]);

  // Pre-fill phone from URL param if available
  useEffect(() => {
    if (initialPhone) {
      methods.setValue('phone', initialPhone);
    }
  }, [initialPhone, methods]);

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

  const onRegisterStep1 = async (values: RegisterFormValues) => {
    const normalizedPhone = normalizePhone(values.phone);
    try {
      await sendOtpMutation.mutateAsync({ phone: normalizedPhone });
      setFormData(values);
      setCode('');
      setStep(2);
      startCountdown();
      toast.success('کد تأیید به شماره موبایل شما پیامک شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'خطا در ارسال کد تأیید. لطفاً شماره موبایل را بررسی کنید.',
        ),
      );
    }
  };

  const onResendOtp = async () => {
    if (!canResend || !formData?.phone || sendOtpMutation.isPending) return;
    try {
      await sendOtpMutation.mutateAsync({
        phone: normalizePhone(formData.phone),
      });
      setCode('');
      startCountdown();
      toast.success('کد تأیید جدید ارسال شد.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'ارسال مجدد کد انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  const onCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || code.length !== 4 || signUpMutation.isPending) return;

    try {
      const province = provinces?.data?.find(
        (p: any) => String(p.id) === String(formData.provinceId),
      );
      const city = cities?.data?.find(
        (c: any) => String(c.id) === String(formData.cityId),
      );
      if (!province || !city) {
        toast.error('استان و شهر معتبر انتخاب کنید.');
        return;
      }

      const normalizedPhone = normalizePhone(formData.phone);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const birthDateIso = jalaliToIso(formData.birthDate) || undefined;

      await signUpMutation.mutateAsync({
        phone: normalizedPhone,
        code,
        fullName,
        gender: formData.gender,
        birthDate: birthDateIso,
        password: formData.password,
        provinceId: Number(formData.provinceId),
        cityId: Number(formData.cityId),
      });

      toast.success('ثبت‌نام شما با موفقیت انجام شد! خوش آمدید.');
      router.replace('/home');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'خطا در ثبت‌نام. کد تأیید را بررسی کرده و مجدداً تلاش کنید.',
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
        <FormProvider
          methods={methods}
          onSubmit={onRegisterStep1}
          className="space-y-4"
        >
          {/* Gender selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              جنسیت <span className="text-red-500">*</span>
            </label>
            <Controller
              name="gender"
              control={methods.control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange('male')}
                      className={cn(
                        'flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border-2 transition-all cursor-pointer font-medium text-sm',
                        field.value === 'male'
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-gray-50/50',
                      )}
                    >
                      <User className="w-4 h-4" />
                      <span>آقا (مرد)</span>
                      {field.value === 'male' && (
                        <Check className="w-4 h-4 text-primary ms-auto" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => field.onChange('female')}
                      className={cn(
                        'flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border-2 transition-all cursor-pointer font-medium text-sm',
                        field.value === 'female'
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-gray-50/50',
                      )}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>خانم (زن)</span>
                      {field.value === 'female' && (
                        <Check className="w-4 h-4 text-primary ms-auto" />
                      )}
                    </button>
                  </div>
                  {fieldState.error && (
                    <p className="text-xs text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          {/* First name & Last name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RHFInput
              name="firstName"
              label="نام"
              isRequired
              startIcon={<User className="w-4 h-4" />}
            />
            <RHFInput
              name="lastName"
              label="نام خانوادگی"
              isRequired
              startIcon={<User className="w-4 h-4" />}
            />
          </div>

          {/* Mobile phone */}
          <RHFPhoneInput
            name="phone"
            label="شماره موبایل"
            placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
            isRequired
            startIcon={<Smartphone className="w-4 h-4" />}
          />

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-gray-700">
                محل زندگی <span className="text-red-500">*</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <RHFSelect
                  name="provinceId"
                  label="استان"
                  items={provinceOptions}
                  placeholder="انتخاب استان..."
                />
              </div>
              <div className="space-y-1">
                <RHFSelect
                  name="cityId"
                  label="شهر"
                  items={cityOptions}
                  placeholder={
                    selectedProvinceId
                      ? 'انتخاب شهر...'
                      : 'ابتدا استان را انتخاب کنید'
                  }
                  disabled={!selectedProvinceId}
                />
              </div>
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-1">
            <PersianDatePicker
              name="birthDate"
              label="تاریخ تولد"
              placeholder="انتخاب تاریخ تولد (روز / ماه / سال)"
              required
            />
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RHFInput
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="رمز عبور"
              placeholder="حداقل ۶ کاراکتر"
              isRequired
              dir="ltr"
              className="text-left font-mono"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'مخفی کردن' : 'نمایش'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />

            <RHFInput
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              label="تکرار رمز عبور"
              placeholder="تکرار رمز عبور"
              isRequired
              dir="ltr"
              className="text-left font-mono"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(p => !p)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  aria-label={showConfirmPassword ? 'مخفی کردن' : 'نمایش'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />
          </div>

          <Button
            type="submit"
            loading={sendOtpMutation.isPending}
            size="lg"
            className="w-full mt-4 h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
          >
            <KeyRound className="w-5 h-5" />
            دریافت کد تأیید و ادامه
          </Button>

          <div className="pt-2 text-center text-xs text-gray-500">
            قبلاً حساب کاربری دارید؟{' '}
            <Link
              href="/login"
              className="text-primary font-bold hover:underline"
            >
              ورود با رمز عبور
            </Link>{' '}
            یا{' '}
            <Link
              href="/login-otp"
              className="text-primary font-bold hover:underline"
            >
              ورود سریع با پیامک
            </Link>
          </div>
        </FormProvider>
      ) : (
        <form onSubmit={onCompleteRegistration} className="space-y-6">
          <div className="relative flex flex-col items-center text-center">
            <button
              type="button"
              disabled={signUpMutation.isPending}
              onClick={() => {
                setStep(1);
                setCode('');
              }}
              className="absolute -top-2 right-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="اصلاح اطلاعات ثبت‌نام"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-primary border border-teal-100 flex items-center justify-center mb-3 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              تأیید شماره و تکمیل ثبت‌نام
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              کد ۴ رقمی ارسال شده به شماره{' '}
              <span className="font-bold text-gray-800 dir-ltr inline-block mx-1">
                {formData?.phone}
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
              اصلاح اطلاعات و شماره موبایل
            </button>
          </div>

          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={4}
              value={code}
              onChange={val => setCode(onlyDigits(val))}
              disabled={signUpMutation.isPending}
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
            loading={signUpMutation.isPending}
            disabled={code.length !== 4}
            size="lg"
            className="w-full h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            تکمیل ثبت‌نام و ورود به منشیم
          </Button>

          <div className="pt-2 text-center text-xs text-gray-500">
            قبلاً ثبت‌نام کرده‌اید؟{' '}
            <Link
              href="/login"
              className="text-primary font-bold hover:underline"
            >
              ورود با رمز عبور
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RegisterForm() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-gray-400">
          در حال بارگذاری فرم ثبت‌نام...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
