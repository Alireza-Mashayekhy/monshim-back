"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toaster برنامه.
 *
 * قبلاً برای خواندن تم از `next-themes` (`useTheme`) استفاده می‌شد، اما:
 *   • اپ فقط تم روشن دارد (هیچ `ThemeProvider`/`dark class` در ریشه ست
 *     نمی‌شود)، پس تم همیشه `"light"` است.
 *   • `next-themes` فقط برای این یک مصرف، چند کیلوبایت JS اضافه می‌کرد.
 *
 * بنابراین تم hardcode شد و وابستگی `next-themes` از `package.json` حذف
 * می‌شود.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
