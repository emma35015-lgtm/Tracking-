import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/tab-bar";
import { LaunchSplash } from "@/components/launch-splash";
import { Onboarding } from "@/components/onboarding";
import { NamePrompt } from "@/components/name-prompt";
import { ThemeWatcher } from "@/components/theme-watcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let missingName = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("display_name").maybeSingle();
    missingName = !(data?.display_name && data.display_name.trim());
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <LaunchSplash />
      <ThemeWatcher />
      <Onboarding />
      <NamePrompt missing={missingName} />
      <main className="px-[18px] pb-32 pt-2">{children}</main>
      <TabBar />
    </div>
  );
}
