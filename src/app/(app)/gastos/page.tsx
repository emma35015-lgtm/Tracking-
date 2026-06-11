import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatMoney, formatTime } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthNav } from "@/components/month-nav";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  note: string | null;
  categories: { name: string; icon: string } | null;
};

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month, start, end, prev, next } = resolveMonth(mes);

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, amount, currency, merchant, occurred_at, source, note, categories(name, icon)")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });

  const expenses = (data ?? []) as unknown as ExpenseRow[];

  const byDay = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    const day = e.occurred_at.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(e);
    byDay.set(day, list);
  }

  return (
    <div>
      <MonthNav base="/gastos" year={year} month={month} prev={prev} next={next} />

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          Sin gastos este mes.
        </div>
      ) : (
        [...byDay.entries()].map(([day, list]) => {
          const dayTotal = list.reduce((sum, e) => sum + Number(e.amount), 0);
          return (
            <section key={day} className="mb-5">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold capitalize text-zinc-500">
                  {formatDay(new Date(day + "T12:00:00Z"))}
                </h2>
                <span className="text-xs tabular-nums text-zinc-400">
                  {formatMoney(dayTotal, list[0].currency)}
                </span>
              </div>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white shadow-sm">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link href={`/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{e.categories?.icon ?? "❓"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {e.merchant ?? "Gasto"}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {formatTime(new Date(e.occurred_at))} ·{" "}
                          {e.categories?.name ?? "Sin categoría"}
                          {e.source === "applepay" && " ·  Pay"}
                          {e.source === "siri" && " · 🎙️ Siri"}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(Number(e.amount), e.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
