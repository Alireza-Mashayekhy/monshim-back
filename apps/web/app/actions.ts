'use server';

import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

export async function submitForm(formData: FormData) {
  return Sentry.withServerActionInstrumentation(
    'submitForm',
    {
      headers: await headers(),
      formData,
      recordResponse: true,
    },
    async () => {
      // منطق واقعی Server Action اینجا قرار می‌گیرد
      const name = formData.get('name');

      return {
        success: true,
        data: {
          name,
        },
      };
    },
  );
}
