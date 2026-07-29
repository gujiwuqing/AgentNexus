import { PrimarySidebar } from "@/components/nav/primary-sidebar";
import { OnboardingDialog } from "@/components/nav/onboarding-dialog";
import { ShortcutsDialog } from "@/components/nav/shortcuts-dialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <PrimarySidebar />
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">{children}</div>
      <OnboardingDialog />
      <ShortcutsDialog />
    </div>
  );
}
