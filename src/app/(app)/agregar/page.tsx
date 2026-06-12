import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/expense-form";

export default async function AgregarPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("name");

  return (
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Nuevo gasto</h1>
      <ExpenseForm categories={categories ?? []} />
      <p className="mt-5 text-center text-xs font-medium text-muted">
        Tip: para no teclear nada,{" "}
        <Link href="/ajustes/atajos" className="font-bold text-coral-link">
          configura los Atajos de tu iPhone
        </Link>
        . ¿Cuenta compartida?{" "}
        <Link href="/dividir" className="font-bold text-coral-link">
          Divide el ticket
        </Link>
        .
      </p>
    </div>
  );
}
