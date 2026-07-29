"use server";

import { setLocale, type Locale } from "./locale";

export async function updateUserLocale(locale: Locale): Promise<void> {
  await setLocale(locale);
}
