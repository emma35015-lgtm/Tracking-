import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dayKey, formatDayLabel, formatMoneyShort, formatTime } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthHeader } from "@/components/month-header";
import { CategoryIcon, categoryColor } from "@/lib/category-style";

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
    const key = dayKey(new Date(e.occurred_at));
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }

  return (
    <div className="screen-in">
      <MonthHeader base="/gastos" subtitle="Movimientos" year={year} month={month} prev={prev} next={next} />

      {expenses.length === 0 ? (
        <div className="mt-6 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes.
        </div>
      ) : (
        <div className="mt-[22px] flex flex-col gap-5">
          {[...byDay.entries()].map(([key, list]) => {
            const dayTotal = list.reduce((sum, e) => sum + Number(e.amount), 0);
            return (
              <section key={key}>
                <div className="flex items-baseline justify-between px-1 pb-2.5">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-muted">
                    {formatDayLabel(key)}
                  </span>
                  <span className="text-[13px] font-extrabold tabular-nums">
                    {formatMoneyShort(dayTotal, list[0].currency)}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[22px] bg-white">
                  {list.map((e, i) => (
                    <Link
                      key={e.id}
                      href={`/gastos/${e.id}`}
                      className={`flex items-center gap-[13px] px-4 py-3.5 ${
                        i < list.length - 1 ? "border-b border-crema" : ""
                      }`}
                    >
                      <div
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px]"
                        style={{ background: categoryColor(e.categories?.name) }}
                      >
                        <CategoryIcon
                          name={e.categories?.name}
                          emoji={e.categories?.icon}
                          color="#15140F"
                          size={20}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold tracking-tight">
                          {e.merchant ?? "Gasto"}
                        </div>
                        <div className="text-xs font-medium text-muted">
                          {formatTime(new Date(e.occurred_at))} ·{" "}
                          {e.categories?.name ?? "Sin categoría"}
                          {e.source === "applepay" && " ·  Pay"}
                          {e.source === "siri" && " · Siri"}
                        </div>
                      </div>
                      <div className="text-base font-extrabold tracking-tight tabular-nums">
                        {formatMoneyShort(Number(e.amount), e.currency)}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
