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

// Clave en localStorage: el token se guarda en ESTE dispositivo para que siga
// visible aunque cierres y reabras la app. En la BD solo queda el hash, así que
// si abres la app en otro iPhone tendrás que generar uno nuevo.
const TOKEN_KEY = "gastos_token";

export function ShortcutSetup({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [showFromScratch, setShowFromScratch] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    // Migra el token de quien lo tenía en sessionStorage (versiones previas).
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    const saved = localStorage.getItem(TOKEN_KEY);
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
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setConfirmReplace(false);
    setTokenInvalid(false);
    setTestResult(null);
  }

  async function handleTest() {
    if (!token) return;
    setTestResult(null);
    setTokenInvalid(false);
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
      if (data.ok) {
        setTestResult(
          "✅ ¡Funciona! Se registró un gasto de prueba de $1 — revisa tu lista de gastos (puedes borrarlo)."
        );
      } else {
        if (res.status === 401) setTokenInvalid(true);
        setTestResult(`❌ ${data.error ?? `Error ${res.status}`}`);
      }
    } catch {
      setTestResult("❌ No se pudo conectar. Revisa tu internet.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Token: si ya lo tienes en este dispositivo se queda visible; si no, lo generas. */}
      {token ? (
        <div className="rounded-2xl border-2 border-brand bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Tu token personal</h2>
          <p className="mb-3 text-sm text-muted-2">
            Guardado en este iPhone, así que sigue aquí cuando vuelvas. Es lo que pegas
            en el encabezado <code>Authorization</code> de cada atajo.
          </p>
          <div className="rounded-xl bg-input p-3">
            <p className="mb-1 text-xs font-semibold text-muted">Valor del encabezado (pégalo en Authorization)</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-xs">
                {revealed ? `Bearer ${token}` : `Bearer ${"•".repeat(Math.min(token.length, 24))}`}
              </code>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="shrink-0 rounded-lg bg-sand px-3 py-1.5 text-xs font-semibold text-muted-2"
              >
                {revealed ? "Ocultar" : "Mostrar"}
              </button>
              <CopyButton value={`Bearer ${token}`} />
            </div>
          </div>

          {confirmReplace ? (
            <div className="mt-3">
              <div className="mb-2 rounded-[16px] bg-sand px-4 py-3 text-[13px] font-medium leading-relaxed text-muted-2">
                ⚠️ Si generas uno nuevo, los atajos que ya configuraste{" "}
                <strong>dejarán de funcionar</strong> hasta que pegues el token nuevo en cada uno.
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Generando…" : "Sí, reemplazar mi token"}
              </button>
              <button
                onClick={() => setConfirmReplace(false)}
                className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-muted-2"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReplace(true)}
              className="mt-3 text-sm font-semibold text-coral-link"
            >
              Generar uno nuevo
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="rounded-[24px] bg-white p-5">
          <h2 className="mb-2 font-semibold">Paso 1 · Genera tu token personal</h2>
          <p className="mb-3 text-sm text-muted-2">
            Es la llave con la que tu iPhone se identifica con la app. Se guarda en este
            dispositivo para que siga visible cuando vuelvas
            {hasToken ? "; ya tienes uno activo, generar otro lo reemplaza." : "."}
          </p>

          {hasToken && confirmReplace && (
            <div className="mb-3 rounded-[16px] bg-sand px-4 py-3 text-[13px] font-medium leading-relaxed text-muted-2">
              ⚠️ Ya tienes un token activo. Si generas uno nuevo, el atajo que ya
              configuraste en tu iPhone <strong>dejará de funcionar</strong> hasta que
              abras el atajo y pegues el token nuevo en el encabezado <code>Authorization</code>.
            </div>
          )}

          {hasToken && !confirmReplace ? (
            <button
              onClick={() => setConfirmReplace(true)}
              className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white"
            >
              Generar token nuevo
            </button>
          ) : (
            <>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Generando…" : hasToken ? "Sí, reemplazar mi token" : "Generar mi token"}
              </button>
              {hasToken && (
                <button
                  onClick={() => setConfirmReplace(false)}
                  className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-muted-2"
                >
                  Cancelar
                </button>
              )}
            </>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

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

        <div className="mt-3 rounded-[14px] bg-sand px-4 py-3 text-xs leading-relaxed text-muted-2">
          <p className="font-semibold">¿Por qué no se activa solo todavía?</p>
          El botón de arriba instala el atajo en la pestaña <strong>&quot;Mis Atajos&quot;</strong> (manual).
          iOS no permite compartir automatizaciones por link. Para que se dispare con Apple Pay
          necesitas crear la automatización tú mismo — es rápido, sigue los pasos de abajo.
        </div>

        <ol className="mt-4 flex flex-col gap-3">
          <Step n={1}>
            Toca <strong>&quot;Añadir atajo&quot;</strong> arriba. Ábrelo desde{" "}
            <strong>Mis Atajos</strong> y <strong>pega tu token</strong> en el encabezado{" "}
            <code>Authorization</code> (ver el aviso verde de arriba).
          </Step>
          <Step n={2}>
            Abre <strong>Atajos</strong> → pestaña <strong>Automatización</strong> (abajo al
            centro) → toca <strong>+</strong> → busca <strong>Transacción</strong>{" "}
            (o <strong>Wallet</strong>).
          </Step>
          <Step n={3}>
            Elige tu(s) <strong>tarjeta(s)</strong>, activa{" "}
            <strong>&quot;Ejecutar inmediatamente&quot;</strong> (sin pedir confirmación) y toca{" "}
            <strong>Siguiente</strong>.
          </Step>
          <Step n={4}>
            Añade la acción <strong>&quot;Ejecutar atajo&quot;</strong> y elige{" "}
            <strong>el atajo de Apple Pay</strong> que instalaste en el paso 1.
            Toca <strong>Listo</strong>.
          </Step>
          <Step n={5}>
            Compra algo con Apple Pay: el gasto debe aparecer solo en unos segundos.
          </Step>
        </ol>

        <div className="mt-4 rounded-[18px] bg-mint px-4 py-3 text-xs leading-relaxed text-mint-ink">
          <p className="mb-1 font-extrabold">🛡️ Para que nunca pierdas un gasto (recomendado)</p>
          Abre el atajo (desde <strong>Mis Atajos</strong>) y ajusta el orden así:
          <p className="mt-2">
            <strong>1. Repetir 3 veces</strong> — envuelve <em>dentro</em> del bloque tanto{" "}
            <strong>&quot;Obtener contenido de URL&quot;</strong> como{" "}
            <strong>&quot;Mostrar notificación&quot;</strong>. Si la señal falla en el primer
            intento, el bloque lo vuelve a intentar. El servidor evita duplicados, así que
            reintentar es seguro.
          </p>
          <p className="mt-1.5">
            <strong>2. Mostrar notificación</strong> (dentro del bloque Repetir) con la variable{" "}
            <strong>&quot;Contenido de la URL&quot;</strong>. Tras cada compra recibes un aviso:
            &quot;Gasto registrado: $250…&quot;. Si no llega aviso, sabrás que no se guardó y lo
            agregas a mano.
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

        {/* Crear desde cero */}
        <button
          type="button"
          onClick={() => setShowFromScratch((v) => !v)}
          className="mt-4 w-full rounded-[14px] bg-sand py-2.5 text-xs font-bold text-muted-2"
        >
          {showFromScratch ? "Ocultar instrucciones" : "¿El link no funciona? Créalo desde cero"}
        </button>

        {showFromScratch && (
          <div className="mt-3 flex flex-col gap-3 rounded-[18px] border-[1.6px] border-input-border p-4 text-xs leading-relaxed text-ink">
            <p className="font-extrabold text-sm">Crear el atajo desde cero</p>

            <p className="font-semibold text-muted-2">Parte 1 · El atajo (Mis Atajos)</p>
            <ol className="flex flex-col gap-2.5">
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">1</span>
                <span>Abre <strong>Atajos</strong> → pestaña <strong>Mis Atajos</strong> → toca <strong>+</strong> para crear uno nuevo. Ponle nombre: <em>Apple Pay Gastos</em>.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">2</span>
                <span>Busca y añade: <strong>&quot;Recibir Transacción de Wallet como entrada&quot;</strong>. Esta acción captura automáticamente el monto y el comercio de tu pago.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">3</span>
                <span>Busca y añade: <strong>&quot;Repetir&quot;</strong>. Cambia el número a <strong>3</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">4</span>
                <span>
                  Dentro del bloque Repetir añade <strong>&quot;Obtener contenido de URL&quot;</strong> y configúralo así:
                  <br /><br />
                  <strong>URL:</strong> <code className="break-all">{origin}/api/ingest</code><br />
                  <strong>Método:</strong> POST<br />
                  <strong>Encabezados →</strong> Clave: <code>Authorization</code> · Valor: <code>Bearer </code> + tu token<br />
                  <strong>Cuerpo → JSON:</strong>
                  <br />· <code>amount</code> → variable mágica <em>&quot;Monto de la transacción&quot;</em>
                  <br />· <code>merchant</code> → variable mágica <em>&quot;Nombre del comerciante&quot;</em>
                  <br />· <code>source</code> → texto literal <code>apple-pay</code>
                  <br />· <code>idempotency_key</code> → variable mágica <em>&quot;Identificador de transacción&quot;</em>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">5</span>
                <span>
                  Todavía dentro del bloque Repetir, añade <strong>&quot;Mostrar notificación&quot;</strong> y pon como mensaje la variable <em>&quot;Contenido de la URL&quot;</em> (la respuesta del servidor).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">6</span>
                <span>Guarda el atajo con el ícono ✓ arriba a la derecha.</span>
              </li>
            </ol>

            <p className="mt-1 font-semibold text-muted-2">Parte 2 · La automatización (se dispara con Apple Pay)</p>
            <ol className="flex flex-col gap-2.5">
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">1</span>
                <span>En <strong>Atajos</strong> → pestaña <strong>Automatización</strong> → <strong>+</strong> → busca <strong>Transacción</strong> (o <strong>Wallet</strong>).</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">2</span>
                <span>Elige tu tarjeta, activa <strong>&quot;Ejecutar inmediatamente&quot;</strong> → Siguiente.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">3</span>
                <span>Añade la acción <strong>&quot;Ejecutar atajo&quot;</strong> y selecciona <em>Apple Pay Gastos</em> (el que creaste en la Parte 1). Toca <strong>Listo</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">4</span>
                <span>Haz un pago con Apple Pay y revisa que llegue la notificación con el gasto registrado.</span>
              </li>
            </ol>
          </div>
        )}
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
        {tokenInvalid && (
          <div className="mt-3 rounded-[16px] bg-sand px-4 py-3 text-[13px] leading-relaxed text-muted-2">
            <p className="mb-2 font-semibold">
              El token guardado en este navegador ya no es válido — casi siempre es
              porque generaste otro después (solo puede haber uno por cuenta). Genera
              uno nuevo y vuelve a pegarlo en tus atajos.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Generando…" : "Generar token nuevo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
