# 💸 Gastos

App (PWA) para llevar el tracking de tus gastos **de forma automática** desde tu iPhone:

- **Apple Pay** → cada pago se registra solo (monto + comercio) vía una Automatización de Atajos.
- **Efectivo** → "Oye Siri, registrar gasto".
- **Categorización automática** por comercio, que además aprende cuando corriges una categoría.
- **Multi-usuario**: compártela con tus amigos con solo pasarles el link; cada quien ve únicamente sus datos.
- Se instala en el iPhone desde Safari: Compartir → **Añadir a pantalla de inicio**.

Stack: Next.js + Tailwind + Supabase (Auth con código por email, Postgres con RLS). Pensada para desplegarse gratis en Vercel.

## Puesta en marcha

### 1. Supabase (gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. En **Authentication → Email Templates → Magic Link**, cambia el cuerpo para mostrar el código en español, por ejemplo:

   ```html
   <h2>Tu código para entrar a Gastos</h2>
   <p style="font-size:32px;letter-spacing:8px"><strong>{{ .Token }}</strong></p>
   <p>Escríbelo en la app. Vence en una hora.</p>
   ```

4. Copia de **Settings → API**: la URL del proyecto, la `anon` key y la `service_role` key.

### 2. Local

```bash
cp .env.example .env.local   # pega ahí las llaves de Supabase
npm install
npm run dev
```

### 3. Despliegue en Vercel (gratis)

1. Importa este repositorio en [vercel.com](https://vercel.com).
2. Añade las 3 variables de entorno de `.env.example`.
3. Deploy. Tu app queda en `https://tu-app.vercel.app` — ese es el link que compartes.
4. En Supabase, **Authentication → URL Configuration**: pon esa URL como *Site URL*.

### 4. Conecta tu iPhone

Dentro de la app: **Ajustes → Configurar mi iPhone**. Ahí generas tu token personal y vienen los pasos (en español) para:

- la Automatización de **Transacción** de Wallet (registro automático con Apple Pay), y
- el atajo de **Siri** para gastos en efectivo.

Cada amigo que use la app genera su propio token desde su cuenta y sigue los mismos pasos.

## API

`POST /api/ingest` con header `Authorization: Bearer <token>`:

```json
{ "amount": 125.50, "merchant": "OXXO", "source": "applepay" }
```

Solo `amount` es obligatorio (acepta `"$125.50"` como string). Tiene idempotencia: si Atajos dispara dos veces el mismo pago, no se duplica.

## Probar la API con curl

```bash
curl -s -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer TU_TOKEN" -H "Content-Type: application/json" \
  -d '{"amount": 125.50, "merchant": "OXXO CONDESA", "source": "applepay"}'
```
