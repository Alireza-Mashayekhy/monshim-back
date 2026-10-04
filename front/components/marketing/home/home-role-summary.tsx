import Link from 'next/link';

export default function HomeRoleSummary() {
  return (
    <section
      aria-labelledby="home-audiences-heading"
      className="custom-container py-8 lg:py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="home-audiences-heading"
          className="text-xl font-black leading-8 text-foreground sm:text-2xl"
        >
          منشیم برای مشتری‌ها و سالن‌های آرایش
        </h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          مشتری‌ها می‌توانند سالن‌های تأییدشده را بدون ورود به حساب جست‌وجو
          کنند، خدمات و قیمت‌ها را ببینند و برای رزرو زمان انتخاب کنند.
          سالن‌داران هم از صفحهٔ اختصاصی و ابزارهای مدیریت نوبت و مشتریان
          استفاده می‌کنند.
        </p>
      </div>

      <div className="mx-auto mt-7 grid max-w-5xl gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-primary-100/70 bg-white p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-foreground">
            برای پیدا کردن و رزرو آرایشگاه
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            جست‌وجو و مشاهدهٔ پروفایل عمومی به ثبت‌نام نیاز ندارد. برای
            نهایی‌کردن رزرو و پرداخت، وارد حساب کاربری شوید.
          </p>
          <Link
            href="/explore"
            className="mt-4 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            جست‌وجوی آرایشگاه‌ها
          </Link>
        </article>

        <article className="rounded-2xl border border-primary-100/70 bg-white p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-foreground">
            برای مدیریت سالن
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            خدمات و ساعات کاری را تنظیم کنید، لینک صفحهٔ سالن را با مشتریان
            به‌اشتراک بگذارید و نوبت‌ها و اطلاعات مالی را از پنل مدیریت کنید.
          </p>
          <Link
            href="/barber-management"
            className="mt-4 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            آشنایی با امکانات مدیریت سالن
          </Link>
        </article>
      </div>
    </section>
  );
}
