"use client";

import { useEffect, useState } from "react";
import { createToken } from "@/app/(app)/actions";

// Atajos compartidos por iCloud (ya traen URL, método y JSON listos).
// Cada quien pega SU token al instalarlos.
const SHORTCUT_APPLEPAY = "https://www.icloud.com/shortcuts/becb6b8b6ee2482997ac01bc7603b3b9";
const SHORTCUT_SIRI = "https://www.icloud.com/shortcuts/21c6f812dd934320a8f2bde51ef04a20";

function AddShortcutButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-coral text-base font-extrabold text-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14 M5 12h14" />
      </svg>
      {children}
    </a>
  );
}

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
      className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
    >
      {copied ? "¡Copiado!" : (label ?? "Copiar")}
    </button>
  );
}

function CopyRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-input p-3">
      <p className="mb-1 text-xs font-semibold text-muted">{title}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </li>
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

  if (!token) {
    return (
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-2 font-semibold">Paso 1 · Genera tu token personal</h2>
        <p className="mb-3 text-sm text-muted-2">
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
        <p className="mb-3 text-sm text-muted-2">
          Cópialo ahora: al salir de esta página ya no podrás verlo (solo generar otro).
          Es lo que pegarás en el encabezado de cada atajo.
        </p>
        <CopyRow title="Valor del encabezado (pégalo en Authorization)" value={`Bearer ${token}`} />
      </div>

      {/* Cómo poner el token en un atajo instalado */}
      <div className="rounded-[24px] bg-mint px-5 py-4 text-[13px] leading-relaxed text-mint-ink">
        <p className="mb-1 font-extrabold">📌 Importante al añadir un atajo</p>
        Cada atajo necesita TU token. Después de añadirlo: ábrelo, busca la acción{" "}
        <strong>&quot;Obtener contenido de URL&quot;</strong> → en{" "}
        <strong>Encabezados</strong>, en el valor de <code>Authorization</code>, deja{" "}
        <code>Bearer </code> y pega tu token (cópialo arriba 👆). Así tus gastos llegan a
        TU cuenta, no a la de quien compartió el atajo.
      </div>

      {/* Atajo de Siri */}
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-1 font-semibold">🎙️ Siri · Gastos en efectivo</h2>
        <p className="mb-4 text-sm text-muted-2">
          Para registrar efectivo por voz: &quot;Oye Siri, Registrar Gasto&quot;.
        </p>
        <AddShortcutButton href={SHORTCUT_SIRI}>Añadir atajo de Siri</AddShortcutButton>
        <ol className="mt-4 flex flex-col gap-3">
          <Step n={1}>
            Toca el botón de arriba → en Atajos, baja y toca{" "}
            <strong>&quot;Añadir atajo&quot;</strong>.
          </Step>
          <Step n={2}>
            Ábrelo y <strong>pega tu token</strong> en el encabezado{" "}
            <code>Authorization</code> (ver el aviso verde de arriba).
          </Step>
          <Step n={3}>
            Pruébalo: di <strong>&quot;Oye Siri, Registrar Gasto&quot;</strong>, contesta
            el monto y revisa tu lista de gastos. También puedes ponerlo como widget, en
            la pantalla de bloqueo o en el botón de acción.
          </Step>
        </ol>
      </div>

      {/* Atajo de Apple Pay */}
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-1 font-semibold"> Pay · Registro automático</h2>
        <p className="mb-4 text-sm text-muted-2">
          Cada pago con Apple Pay se registra solo, con monto y comercio.
        </p>
        <AddShortcutButton href={SHORTCUT_APPLEPAY}>Añadir atajo de Apple Pay</AddShortcutButton>
        <ol className="mt-4 flex flex-col gap-3">
          <Step n={1}>
            Toca el botón de arriba → <strong>&quot;Añadir atajo&quot;</strong>. Ábrelo y{" "}
            <strong>pega tu token</strong> en el encabezado <code>Authorization</code>.
          </Step>
          <Step n={2}>
            Ahora créale el disparador automático: abre <strong>Atajos</strong> → pestaña{" "}
            <strong>Automatización</strong> → <strong>+</strong> → busca{" "}
            <strong>Transacción</strong> (o <strong>Wallet</strong>).
          </Step>
          <Step n={3}>
            Elige tu(s) <strong>tarjeta(s)</strong>, marca{" "}
            <strong>Ejecutar inmediatamente</strong> y toca <strong>Siguiente</strong>.
          </Step>
          <Step n={4}>
            Añade la acción <strong>&quot;Ejecutar atajo&quot;</strong> y elige el atajo de
            Apple Pay que acabas de añadir. <strong>Listo</strong>.
          </Step>
          <Step n={5}>
            Compra algo con Apple Pay: el gasto debe aparecer solo en unos segundos. 🪄
          </Step>
        </ol>

        <div className="mt-4 rounded-[18px] bg-mint px-4 py-3 text-xs leading-relaxed text-mint-ink">
          <p className="mb-1 font-extrabold">🛡️ Para que nunca pierdas un gasto (recomendado)</p>
          Abre el atajo y, <strong>después</strong> de &quot;Obtener contenido de URL&quot;, añade
          estas dos acciones:
          <p className="mt-2">
            <strong>1. Mostrar notificación</strong> con el texto de la respuesta (la variable{" "}
            <strong>&quot;Contenido de la URL&quot;</strong>). Así, tras cada compra te llega un
            aviso: &quot;Gasto registrado: $250…&quot;. Si NO te llega aviso, sabrás que no se
            guardó (por señal) y lo agregas a mano.
          </p>
          <p className="mt-1.5">
            <strong>2. Reintento (opcional):</strong> envuelve la acción de la URL en un{" "}
            <strong>&quot;Repetir 3 veces&quot;</strong>. Como el servidor evita duplicados, reintentar
            es seguro: si un intento falla por señal, el siguiente lo logra sin registrar dos veces.
          </p>
        </div>

        <div className="mt-3 rounded-xl bg-sand p-3 text-xs leading-relaxed text-muted-2">
          <p className="mb-1 font-semibold">Si algo falla:</p>
          <p>· Revisa que el token del encabezado sea el tuyo (sin espacios de más).</p>
          <p>· Borra cualquier encabezado vacío (renglón &quot;Clave/Texto&quot; sin llenar).</p>
          <p>· En el disparador: tu tarjeta y &quot;Ejecutar inmediatamente&quot;.</p>
          <p>
            · Si no hay internet al pagar, ese gasto no se manda (es de la red, no del atajo).
            Con el aviso de arriba te enteras y lo agregas con Siri o el botón ➕.
          </p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-2 font-semibold">Probar conexión</h2>
        <p className="mb-3 text-sm text-muted-2">
          Verifica que tu token y el servidor funcionan (es lo mismo que harán tus
          atajos):
        </p>
        <button
          onClick={handleTest}
          className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white"
        >
          Registrar un gasto de prueba
        </button>
        {testResult && <p className="mt-3 text-sm">{testResult}</p>}
      </div>
    </div>
  );
}
