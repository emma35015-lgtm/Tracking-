"use client";

import { useEffect, useState } from "react";
import { createToken } from "@/app/(app)/actions";

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
    >
      {copied ? "¡Copiado!" : (label ?? "Copiar")}
    </button>
  );
}

function CopyRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3">
      <p className="mb-1 text-xs font-semibold text-zinc-500">{title}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export function ShortcutSetup({ hasToken }: { hasToken: boolean }) {
  // El token vive solo en memoria/sessionStorage: en la BD queda únicamente el hash.
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = sessionStorage.getItem("gastos_token");
    if (saved) setToken(saved);
  }, []);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    const result = await createToken();
    setLoading(false);
    if (result.error || !result.token) {
      setError(result.error ?? "Algo salió mal.");
      return;
    }
    sessionStorage.setItem("gastos_token", result.token);
    setToken(result.token);
  }

  async function handleTest() {
    if (!token) return;
    setTestResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 1,
          merchant: "Prueba de conexión",
          source: "manual",
          idempotency_key: `test-${Date.now()}`,
        }),
      });
      const data = await res.json();
      setTestResult(
        data.ok
          ? "✅ ¡Funciona! Se registró un gasto de prueba de $1 — revisa tu lista de gastos (puedes borrarlo)."
          : `❌ Error: ${data.error ?? res.status}`
      );
    } catch {
      setTestResult("❌ No se pudo conectar. Revisa tu internet.");
    }
  }

  const ingestUrl = `${origin || "https://TU-APP.vercel.app"}/api/ingest`;

  if (!token) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Paso 1 · Genera tu token personal</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Es la llave con la que tu iPhone se identifica con la app. Se muestra una
          sola vez{hasToken ? ". Ya tienes uno activo; generar otro lo reemplaza." : "."}
        </p>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Generando…" : hasToken ? "Generar token nuevo" : "Generar mi token"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border-2 border-brand bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Tu token personal</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Guárdalo ahora: al salir de esta página ya no podrás verlo (solo generar otro).
        </p>
        <CopyRow title="Token" value={token} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold"> Pay · Registro automático</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Cada pago con Apple Pay se registrará solo, con monto y comercio.
        </p>
        <ol className="mb-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Abre la app <strong>Atajos</strong> → pestaña <strong>Automatización</strong> →{" "}
            <strong>Nueva automatización</strong> (+).
          </li>
          <li>
            Elige <strong>Transacción</strong> → selecciona tus tarjetas → marca{" "}
            <strong>Ejecutar inmediatamente</strong> → Siguiente.
          </li>
          <li>
            Añade la acción <strong>Obtener contenido de URL</strong> y configúrala:
            <div className="mt-2 flex flex-col gap-2">
              <CopyRow title="URL" value={ingestUrl} />
              <p className="text-xs text-zinc-500">
                Método: <strong>POST</strong> · En <strong>Encabezados</strong> añade:
              </p>
              <CopyRow title="Clave del encabezado" value="Authorization" />
              <CopyRow title="Valor del encabezado" value={`Bearer ${token}`} />
              <p className="text-xs text-zinc-500">
                En <strong>Cuerpo de la solicitud</strong> elige <strong>JSON</strong> y añade
                estos campos:
              </p>
              <div className="rounded-xl bg-zinc-100 p-3 text-xs leading-relaxed">
                <p>
                  <code>amount</code> → variable mágica <strong>Cantidad</strong> (de la
                  transacción)
                </p>
                <p>
                  <code>merchant</code> → variable mágica <strong>Comercio</strong>
                </p>
                <p>
                  <code>source</code> → texto <code>applepay</code>
                </p>
              </div>
            </div>
          </li>
          <li>Listo: paga algo con Apple Pay y aparecerá aquí solo.</li>
        </ol>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">🎙️ Siri · Gastos en efectivo</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Crea un atajo normal (pestaña <strong>Atajos</strong> → +) llamado{" "}
          <strong>Registrar gasto</strong>:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Acción <strong>Solicitar entrada</strong> → tipo <strong>Número</strong> → pregunta
            &quot;¿Cuánto gastaste?&quot;.
          </li>
          <li>
            Acción <strong>Obtener contenido de URL</strong> con la misma URL y encabezado de
            arriba; en el cuerpo JSON: <code>amount</code> → variable{" "}
            <strong>Entrada proporcionada</strong>, <code>source</code> → texto{" "}
            <code>siri</code>.
          </li>
          <li>
            Di <strong>&quot;Oye Siri, registrar gasto&quot;</strong>. También puedes ponerlo en
            la pantalla de bloqueo o el botón de acción.
          </li>
        </ol>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Probar conexión</h2>
        <button
          onClick={handleTest}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white"
        >
          Registrar un gasto de prueba
        </button>
        {testResult && <p className="mt-3 text-sm">{testResult}</p>}
      </div>
    </div>
  );
}
