import { ScrollText } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'قوانین و شرایط استفاده | منشیم',
  description: 'قوانین و شرایط استفاده از سامانه نوبت‌دهی منشیم',
};

export default function TermsPage() {
  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        قوانین و شرایط استفاده
      </h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
            <ScrollText size={17} />
          </div>
          <p className="text-xs text-gray-500 leading-5">
            با استفاده از سامانه منشیم، شما قوانین و شرایط زیر را می‌پذیرید.
            لطفاً پیش از استفاده، این موارد را با دقت مطالعه کنید.
          </p>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              ۱. ثبت‌نام و صحت اطلاعات
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              شما متعهد می‌شوید اطلاعات درستی در زمان ثبت‌نام وارد کنید و از
              حساب خود برای انجام فعالیت‌های غیرمجاز استفاده نکنید.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              ۲. رزرو و پرداخت
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              هنگام رزرو، مجموع مبالغ خدمات به‌همراه کمیسیون سایت (۱۰٪ بیشترین
              مبلغ خدمت) دریافت می‌شود. با رزرو نوبت، شما موظف به حضور در نوبت
              انتخابی هستید و در صورت لغو نوبت از سوی کاربر، مبلغ پرداخت‌شده
              بازگردانده نمی‌شود.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              ۳. رفتار و اخلاق
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              از هرگونه رفتار توهین‌آمیز، افترا یا مزاحمت برای سالن‌ها،
              آرایشگران و سایر کاربران خودداری کنید. منشیم حق تعلیق یا حذف
              حساب‌های خلافی را دارد.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              ۴. مالکیت و مسئولیت
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              منشیم یک پلتفرم واسط برای هماهنگی نوبت‌دهی است و کیفیت خدمات نهایی
              بر عهده سالن یا آرایشگر مربوطه است. در صورت بروز هرگونه اختلاف با
              ارائه‌دهنده خدمت، می‌توانید از بخش پشتیبانی گزارش دهید.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              ۵. تغییر شرایط
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              منشیم ممکن است این قوانین را به‌روزرسانی کند. ادامه استفاده شما از
              سامانه به معنای پذیرش شرایط به‌روزشده است.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
