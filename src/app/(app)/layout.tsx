import { TabBar } from "@/components/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <main className="px-4 pb-28 pt-4">{children}</main>
      <TabBar />
    </div>
  );
}
