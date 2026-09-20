export const ACTIVITY_TYPES = [
  { value: 'women', label: 'بانوان' },
  { value: 'men', label: 'آقایان' },
  { value: 'both', label: 'هردو' },
] as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number]['value'];

export const getActivityTypeLabel = (
  value: string | null | undefined,
): string => ACTIVITY_TYPES.find(t => t.value === value)?.label ?? '';
