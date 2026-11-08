interface SectionHeadingProps {
  as?: 'h2' | 'h3';
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'start';
  id?: string;
}

/** تیتر استاندارد بخش‌های لندینگ با برچسب (eyebrow) و توضیح */
export default function SectionHeading({
  as: Tag = 'h2',
  eyebrow,
  title,
  description,
  align = 'center',
  id,
}: SectionHeadingProps) {
  return (
    <div
      className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : 'text-start'}`}
    >
      {eyebrow ? (
        <p className="mb-3 inline-flex items-center rounded-full bg-primary-2 px-4 py-1 text-xs font-bold text-primary">
          {eyebrow}
        </p>
      ) : null}
      <Tag
        id={id}
        className="text-2xl font-extrabold leading-[1.6] text-foreground sm:text-3xl lg:text-[2rem] lg:leading-[1.6]"
      >
        {title}
      </Tag>
      {description ? (
        <p className="mt-4 leading-8 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
