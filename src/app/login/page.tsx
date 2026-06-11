"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3.5 text-base font-medium text-ink outline-none focus:border-coral";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const credentials = {
      email: email.trim().toLowerCase(),
      password,
    };

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      setLoading(false);
      if (error) {
        setError(
          error.message.includes("Invalid login credentials")
            ? "Correo o contraseña incorrectos. Si eres nueva, crea tu cuenta abajo."
            : "No se pudo iniciar sesión. Intenta de nuevo."
        );
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp(credentials);
      setLoading(false);
      if (error) {
        if (error.message.includes("already registered")) {
          setError("Ese correo ya tiene cuenta. Usa \"Entrar\" con tu contraseña.");
        } else if (error.message.toLowerCase().includes("password")) {
          setError("La contraseña debe tener al menos 6 caracteres.");
        } else {
          setError("No se pudo crear la cuenta. Intenta de nuevo.");
        }
        return;
      }
      // Si la confirmación por correo está activada en Supabase, no hay sesión aún.
      if (!data.session) {
        setInfo("Te mandamos un correo de confirmación: ábrelo y luego entra aquí con tu contraseña.");
        setMode("signin");
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 pb-24">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-coral text-3xl font-extrabold text-white">
          $
        </div>
        <h1 className="text-[32px] font-extrabold tracking-tight">Gastos</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Tus gastos, registrados solos con Apple Pay y Siri.
        </p>
      </div>

      <div className="mb-4 flex rounded-2xl bg-sand p-1 text-sm font-bold">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 rounded-xl py-2.5 ${mode === "signin" ? "bg-white" : "text-muted"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-xl py-2.5 ${mode === "signup" ? "bg-white" : "text-muted"}`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-[13px] font-bold text-muted-2" htmlFor="email">
          Tu correo
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <label className="text-[13px] font-bold text-muted-2" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Tu contraseña"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-[58px] rounded-[18px] bg-coral text-lg font-extrabold tracking-tight text-white disabled:opacity-50"
        >
          {loading ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear mi cuenta"}
        </button>
        {mode === "signup" && (
          <p className="text-center text-xs font-medium text-muted">
            Tu sesión queda guardada en tu iPhone: solo entras una vez.
          </p>
        )}
      </form>

      {error && (
        <p className="mt-4 rounded-2xl bg-[#F8E3DC] px-4 py-3 text-sm font-medium text-coral-dark">
          {error}
        </p>
      )}
      {info && (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm font-medium text-mint-ink">{info}</p>
      )}
    </main>
  );
}
