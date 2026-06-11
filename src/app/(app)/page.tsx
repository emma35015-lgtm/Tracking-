import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatTime } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthNav } from "@/components/month-nav";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; icon: string } | null;
};

const SOURCE_BADGE: Record<string, string> = {
  applepay: "",
  siri: "🎙️",
  manual: "",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month, start, end, prev, next } = resolveMonth(mes);

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, amount, currency, merchant, occurred_at, source, categories(name, icon)")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  const expenses = (data ?? []) as unknown as ExpenseRow[];
  const currency = expenses[0]?.currency ?? "MXN";
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = new Map<string, { icon: string; total: number }>();
  for (const e of expenses) {
    const name = e.categories?.name ?? "Sin categoría";
    const icon = e.categories?.icon ?? "❓";
    const entry = byCategory.get(name) ?? { icon, total: 0 };
    entry.total += Number(e.amount);
    byCategory.set(name, entry);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxCategory = categories[0]?.[1].total ?? 0;

  return (
    <div>
      <MonthNav base="/" year={year} month={month} prev={prev} next={next} />

      <div className="mb-6 rounded-2xl bg-brand p-6 text-white shadow-sm">
        <p className="text-sm opacity-80">Total del mes</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{formatMoney(total, currency)}</p>
        <p className="mt-2 text-sm opacity-80">
          {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
        </p>
      </div>

      {categories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">Por categoría</h2>
          <div className="flex flex-col gap-3">
            {categories.map(([name, { icon, total: catTotal }]) => (
              <div key={name}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span>
                    {icon} {name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(catTotal, currency)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(4, (catTotal / maxCategory) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-500">Últimos gastos</h2>
          <Link href="/gastos" className="text-sm text-brand">
            Ver todos
          </Link>
        </div>
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Sin gastos este mes.{" "}
            <Link href="/ajustes/atajos" className="text-brand underline">
              Configura tu iPhone
            </Link>{" "}
            para registrarlos automáticamente.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white shadow-sm">
            {expenses.slice(0, 5).map((e) => (
              <li key={e.id}>
                <Link href={`/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{e.categories?.icon ?? "❓"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {e.merchant ?? "Gasto"} {SOURCE_BADGE[e.source] ?? ""}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {formatTime(new Date(e.occurred_at))} ·{" "}
                      {e.categories?.name ?? "Sin categoría"}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(Number(e.amount), e.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
