"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError("No se pudo enviar el código. Revisa el correo e intenta de nuevo.");
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Código incorrecto o vencido. Intenta de nuevo.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 pb-24">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">💸</div>
        <h1 className="text-2xl font-bold">Gastos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tus gastos, registrados solos con Apple Pay y Siri.
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Tu correo
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Enviando…" : "Enviarme un código"}
          </button>
          <p className="text-center text-xs text-zinc-400">
            Sin contraseñas: te mandamos un código de 6 dígitos.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="code">
            Código enviado a {email}
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="text-sm text-zinc-500 underline"
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
    </main>
  );
}
