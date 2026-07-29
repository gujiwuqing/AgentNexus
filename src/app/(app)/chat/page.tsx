import { getTranslations } from "next-intl/server";

export default async function ChatIndexPage() {
  const t = await getTranslations("chat");
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <p>{t("selectAgent")}</p>
    </div>
  );
}
