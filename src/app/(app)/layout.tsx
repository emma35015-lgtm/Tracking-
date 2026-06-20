import { TabBar } from "@/components/tab-bar";
import { LaunchSplash } from "@/components/launch-splash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <LaunchSplash />
      <main className="px-[18px] pb-32 pt-2">{children}</main>
      <TabBar />
    </div>
  );
}
