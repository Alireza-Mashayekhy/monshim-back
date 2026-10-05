import Image from 'next/image';
import Link from 'next/link';

/**
 * `label` اختیاری است تا جایی که لوگو داخل یک لینک دیگر نیست، نام دسترس‌پذیر
 * داشته باشد. توجه: لوگو خودش `<Link>` است؛ هرگز نباید داخل `<Link>` دیگری
 * رندر شود (HTML نامعتبر `<a>` داخل `<a>` → خطای hydration و رندر دوباره‌ی
 * کل درخت در مرورگر).
 */
export default function Logo({ label }: { label?: string }) {
  return (
    <Link href="/" aria-label={label}>
      <Image src="/logo/logo.png" width={40} height={40} alt="logo" />
    </Link>
  );
}
