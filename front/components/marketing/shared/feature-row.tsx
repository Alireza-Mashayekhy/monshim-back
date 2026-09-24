import { Check } from 'lucide-react';
import Image from 'next/image';

interface FeatureRowProps {
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  imageSrc: string;
  imageAlt: string;
  /** تصویر در سمت مقابل متن قرار گیرد */
  reverse?: boolean;
  id?: string;
}

/**
 * ردیف ویژگی تصویری با چیدمان زیگزاگی — بلوک محتوایی اصلی صفحات لندینگ داخلی.
 * هر ردیف یک H2 با کلیدواژه هدف و متن سئو شده دارد.
 */
export default function FeatureRow({
  eyebrow,
  title,
  description,
  bullets,
  imageSrc,
  imageAlt,
  reverse = false,
  id,
}: FeatureRowProps) {
  return (
    <article
      id={id}
      className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:gap-12 lg:py-14"
    >
      <div
        className={`text-center lg:text-start ${reverse ? 'lg:order-2' : ''}`}
      >
        <p className="mb-3 inline-flex items-center rounded-full bg-primary-2 px-4 py-1 text-xs font-bold text-primary">
          {eyebrow}
        </p>
        <h2 className="text-xl font-extrabold leading-[1.7] text-foreground sm:text-2xl lg:text-[1.7rem] lg:leading-[1.7]">
          {title}
        </h2>
        <p className="mt-4 leading-8 text-muted-foreground">{description}</p>

        {bullets.length ? (
          <ul className="mt-6 space-y-3 text-start">
            {bullets.map(bullet => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-sm leading-7 text-foreground/90"
              >
                <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-2">
                  <Check className="size-3 text-primary" aria-hidden="true" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={reverse ? 'lg:order-1' : ''}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1200}
          height={800}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="h-auto w-full rounded-3xl border border-primary-100/50 shadow-sm"
        />
      </div>
    </article>
  );
}
