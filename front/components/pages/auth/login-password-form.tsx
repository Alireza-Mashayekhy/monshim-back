'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  MessageSquareCode,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFPhoneInput from '@/components/form/rhf-phone-input';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { normalizePhone, phoneSchema } from '@/lib/phone';
import { useLoginWithPassword } from '@/services/features/auth/hooks';

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const loginMutation = useLoginWithPassword();

  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync({
        phone: normalizePhone(values.phone),
        password: values.password,
      });

      toast.success('ورود با موفقیت انجام شد. خوش آمدید!');
      router.replace('/home');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'شماره موبایل یا رمز عبور وارد شده نادرست است.',
        ),
      );
    }
  };

  return (
    <div className="space-y-6">
      <FormProvider methods={methods} onSubmit={onSubmit} className="space-y-4">
        <RHFPhoneInput
          name="phone"
          label="شماره موبایل"
          placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
          isRequired
          startIcon={<Smartphone className="w-4 h-4" />}
        />

        <div className="space-y-1">
          <RHFInput
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="رمز عبور"
            placeholder="رمز عبور خود را وارد کنید"
            isRequired
            dir="ltr"
            className="text-left font-mono"
            startIcon={<Lock className="w-4 h-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
                aria-label={
                  showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'
                }
              >
                {showPassword ? (
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
          loading={loginMutation.isPending}
          size="lg"
          className="w-full mt-4 h-12 text-base font-bold shadow-md shadow-primary/20 gap-2 cursor-pointer"
        >
          <LogIn className="w-5 h-5" />
          ورود به حساب کاربری
        </Button>
      </FormProvider>

      {/* Alternative options divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400 font-medium">یا</span>
        </div>
      </div>

      {/* Quick alternative buttons */}
      <div className="space-y-3">
        <Link href="/login-otp" className="block w-full">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium cursor-pointer"
          >
            <MessageSquareCode className="w-4 h-4 text-primary" />
            ورود سریع با پیامک (کد یک‌بار مصرف)
          </Button>
        </Link>

        <div className="pt-2 text-center text-xs flex items-center justify-center gap-1 text-gray-500">
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
  );
}
