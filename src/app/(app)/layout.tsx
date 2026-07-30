import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PrimarySidebar } from "@/components/nav/primary-sidebar";
import { OnboardingDialog } from "@/components/nav/onboarding-dialog";
import { ShortcutsDialog } from "@/components/nav/shortcuts-dialog";
import { CommandPalette } from "@/components/nav/command-palette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <PrimarySidebar user={user} />
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">{children}</div>
      <OnboardingDialog />
      <ShortcutsDialog />
      <CommandPalette />
    </div>
  );
}
