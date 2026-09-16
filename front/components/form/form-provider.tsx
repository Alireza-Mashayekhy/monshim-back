'use client';
import {
  FormProvider as Form,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';

type Props = {
  children: React.ReactNode;
  methods: UseFormReturn<any>;
  onSubmit?: SubmitHandler<any>;
  style?: React.CSSProperties;
  className?: string;
};

export default function FormProvider({
  children,
  methods,
  onSubmit,
  style,
  className = '',
}: Props) {
  return (
    <Form {...methods}>
      <form
        onSubmit={onSubmit ? methods.handleSubmit(onSubmit) : undefined}
        style={style}
        className={className}
      >
        {children}
      </form>
    </Form>
  );
}
