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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 text-sm text-zinc-700">{children}</div>
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
          Cópialo ahora: al salir de esta página ya no podrás verlo (solo generar otro).
          Lo usarás en el paso del encabezado, más abajo.
        </p>
        <CopyRow title="Token" value={token} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold"> Pay · Registro automático</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Al terminar, cada pago con Apple Pay se registrará solo, con monto y
          comercio. Son ~3 minutos, una sola vez.
        </p>

        <ol className="flex flex-col gap-4">
          <Step n={1}>
            Abre la app <strong>Atajos</strong> de tu iPhone (ícono de dos cuadros de
            colores; si no la tienes, está gratis en el App Store).
          </Step>
          <Step n={2}>
            Abajo toca la pestaña <strong>Automatización</strong> y luego el{" "}
            <strong>+</strong> de arriba a la derecha (Nueva automatización).
          </Step>
          <Step n={3}>
            En la lista busca <strong>Transacción</strong> 💳 — en algunos iPhone
            aparece como <strong>Wallet</strong>. Es el mismo: elige el que te salga.
          </Step>
          <Step n={4}>
            Configura el disparador: selecciona tu(s) <strong>tarjeta(s)</strong> de
            Apple Pay, marca <strong>Ejecutar inmediatamente</strong> (¡importante!) y,
            si aparece, apaga &quot;Notificar al ejecutar&quot;. Toca{" "}
            <strong>Siguiente</strong>.
          </Step>
          <Step n={5}>
            Toca <strong>Nueva automatización en blanco</strong> y añade la acción{" "}
            <strong>&quot;Obtener contenido de URL&quot;</strong> (búscala por nombre).
          </Step>
          <Step n={6}>
            En el campo de la URL, pega esto:
            <div className="mt-2">
              <CopyRow title="URL" value={ingestUrl} />
            </div>
          </Step>
          <Step n={7}>
            Toca la flechita <strong>&gt;</strong> junto a la URL para ver más opciones.
            Toca <strong>Método</strong> (dice GET) y cámbialo a <strong>POST</strong>.
            Al hacerlo aparecen las secciones &quot;Encabezados&quot; y &quot;Cuerpo de
            la solicitud&quot;.
          </Step>
          <Step n={8}>
            En <strong>Encabezados</strong> toca &quot;Añadir nuevo campo&quot; y llena
            los dos espacios (la clave va sin dos puntos):
            <div className="mt-2 flex flex-col gap-2">
              <CopyRow title="Clave" value="Authorization" />
              <CopyRow title="Texto (Bearer + espacio + tu token)" value={`Bearer ${token}`} />
            </div>
          </Step>
          <Step n={9}>
            En <strong>Cuerpo de la solicitud</strong> (déjalo en <strong>JSON</strong>)
            vas a añadir <strong>3 campos</strong>. Cada vez que toques &quot;Añadir
            nuevo campo&quot; te pregunta el tipo: elige <strong>Texto</strong> las 3
            veces.
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-zinc-100 p-3 text-xs leading-relaxed">
              <p>
                <strong>Campo 1</strong> · Clave: <code>amount</code> · Texto: toca el
                espacio del valor y, arriba del teclado, toca la variable azul{" "}
                <strong>&quot;Entrada de atajo&quot;</strong>. Luego toca la burbujita
                azul que se insertó y en el menú elige <strong>Cantidad</strong>.
              </p>
              <p>
                <strong>Campo 2</strong> · Clave: <code>merchant</code> · Texto: igual
                que el anterior, pero al tocar la burbuja elige{" "}
                <strong>Comercio</strong> (o &quot;Nombre&quot; si no aparece).
              </p>
              <p>
                <strong>Campo 3</strong> · Clave: <code>source</code> · Texto: escribe
                con el teclado: <code>applepay</code>
              </p>
            </div>
          </Step>
          <Step n={10}>
            Toca <strong>Listo</strong>. Para probar: compra cualquier cosa con Apple
            Pay y abre esta app — el gasto debe aparecer solo en unos segundos, ya
            categorizado. 🪄
          </Step>
        </ol>

        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <p className="mb-1 font-semibold">Si no funciona, revisa esto (en orden):</p>
          <p>· El Método debe decir POST, no GET.</p>
          <p>
            · El encabezado: clave <code>Authorization</code> (sin &quot;:&quot;) y el
            valor con un espacio entre <code>Bearer</code> y el token.
          </p>
          <p>· En el disparador: tu tarjeta seleccionada y &quot;Ejecutar inmediatamente&quot;.</p>
          <p>
            · A veces el banco tarda en avisar y un pago no dispara la automatización —
            eso es del banco, no tuyo. Agrégalo con Siri o con el botón ➕.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold">🎙️ Siri · Gastos en efectivo</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Para registrar efectivo sin abrir la app: &quot;Oye Siri, registrar gasto&quot;.
        </p>
        <ol className="flex flex-col gap-4">
          <Step n={1}>
            En Atajos, ve a la pestaña <strong>Atajos</strong> (la primera) y toca{" "}
            <strong>+</strong> para crear uno nuevo.
          </Step>
          <Step n={2}>
            Toca el nombre de arriba y ponle <strong>Registrar gasto</strong> — con ese
            nombre lo llamarás con Siri.
          </Step>
          <Step n={3}>
            Añade la acción <strong>&quot;Solicitar entrada&quot;</strong>: cambia el
            tipo a <strong>Número</strong> y en la pregunta escribe{" "}
            <em>¿Cuánto gastaste?</em>
          </Step>
          <Step n={4}>
            Añade la acción <strong>&quot;Obtener contenido de URL&quot;</strong> y
            configúrala igual que en la sección de Apple Pay: misma URL, Método{" "}
            <strong>POST</strong> y el mismo encabezado <code>Authorization</code>.
          </Step>
          <Step n={5}>
            En el cuerpo JSON añade 2 campos tipo <strong>Texto</strong>:
            <div className="mt-2 rounded-xl bg-zinc-100 p-3 text-xs leading-relaxed">
              <p>
                <strong>Campo 1</strong> · Clave: <code>amount</code> · Texto: la
                variable <strong>&quot;Entrada proporcionada&quot;</strong> (sale arriba
                del teclado).
              </p>
              <p>
                <strong>Campo 2</strong> · Clave: <code>source</code> · Texto:{" "}
                <code>siri</code>
              </p>
            </div>
          </Step>
          <Step n={6}>
            Dale <strong>Listo</strong> y pruébalo: di{" "}
            <strong>&quot;Oye Siri, registrar gasto&quot;</strong>, contesta el monto y
            revisa tu lista de gastos. También puedes poner el atajo como widget, en la
            pantalla de bloqueo o en el botón de acción.
          </Step>
        </ol>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Probar conexión</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Verifica que tu token y el servidor funcionan (es lo mismo que harán tus
          atajos):
        </p>
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
