import { ChevronDown } from 'lucide-react';

import SectionHeading from './section-heading';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  heading: string;
  items: FaqItem[];
}

/**
 * Native details/summary keeps every answer in the initial server HTML while
 * retaining a keyboard-accessible, no-JavaScript disclosure interaction.
 */
export default function FaqSection({ heading, items }: FaqSectionProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="custom-container py-8 lg:py-14"
    >
      <SectionHeading
        id="faq-heading"
        eyebrow="سوالات متداول"
        title={heading}
      />
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-white px-5 sm:px-7">
        {items.map((item, index) => (
          <details
            key={item.question}
            open={index === 0}
            className="group py-1"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-start marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-bold leading-7 text-foreground transition-colors group-open:text-primary sm:text-base">
                {item.question}
              </h3>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="pb-4 pe-8 text-sm leading-8 text-muted-foreground">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
