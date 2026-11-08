'use client';
import { useEffect, useState } from 'react';
export default function TableOfContents({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; level: number }[];
}) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    items.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);
  if (!items.length) return null;
  return (
    <nav
      aria-label="فهرست مطالب"
      className="my-8 rounded-xl border bg-primary-3 p-5"
    >
      <h2 className="mt-0! text-lg!">{title || 'فهرست مطالب'}</h2>
      <ol className="space-y-1">
        {items.map(item => (
          <li
            key={item.id}
            style={{ marginInlineStart: `${(item.level - 2) * 16}px` }}
          >
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              className={active === item.id ? 'font-bold' : ''}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
