import Link from 'next/link';

export interface Crumb {
  href: string;
  label: string;
}

/**
 * بردکرامب (مسیر صفحه) برای صفحات لندینگ داخلی.
 * داده ساخت‌یافته BreadcrumbList مربوطه به صورت جداگانه در صفحه تزریق می‌شود.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="مسیر صفحه"
      className="custom-container py-6 text-xs text-muted-foreground"
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="font-bold text-foreground">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="hover:text-primary">
                    {item.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
