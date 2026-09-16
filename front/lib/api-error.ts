import axios from 'axios';

export function getErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  )
    return error.status;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
): string {
  const status = getErrorStatus(error);
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'زمان پاسخ‌گویی به پایان رسید. لطفاً دوباره تلاش کنید.'
        : 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.';
    }
    if (status === 429)
      return 'تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.';
    if (status && status >= 500)
      return 'سرور موقتاً در دسترس نیست. لطفاً بعداً تلاش کنید.';
    const message: unknown = error.response.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) {
      const messages = message.filter(
        (item): item is string => typeof item === 'string' && !!item.trim(),
      );
      if (messages.length) return messages.join('، ');
    }
  }
  if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
  if (status === 403) return 'شما اجازه دسترسی به این بخش را ندارید.';
  return fallback;
}
