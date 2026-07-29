import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/chat");
  const t = await getTranslations("auth");
  return (
    <main>
      <title>{t("login")}</title>
      <LoginForm />
    </main>
  );
}
