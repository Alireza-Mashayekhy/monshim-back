import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import SectionHeading from './section-heading';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  /** عنوان بخش — حاوی کلیدواژه هدف صفحه */
  heading: string;
  items: FaqItem[];
}

/**
 * بخش سوالات متداول صفحات لندینگ.
 * داده این بخش به صورت FAQPage با JSON-LD هم در صفحه تزریق می‌شود
 * تا شانس نمایش در ریچ‌ریزالت گوگل افزایش یابد.
 */
export default function FaqSection({ heading, items }: FaqSectionProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="custom-container py-16 lg:py-24"
    >
      <SectionHeading
        id="faq-heading"
        eyebrow="سوالات متداول"
        title={heading}
      />
      <div className="mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-start text-sm font-bold leading-7 hover:text-primary hover:no-underline sm:text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-8 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
