import { cookies } from "next/headers";

export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

const COOKIE_NAME = "NEXT_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(COOKIE_NAME)?.value;
  return isLocale(stored) ? stored : defaultLocale;
}

export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(COOKIE_NAME, locale);
}
