# LCS.Dominican / editD

Plataforma unificada de creación audiovisual con IA (Logic Code Spot).

## Arranque local

```bash
npm install
copy .env.example .env
copy .env.example apps\web\.env.local
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/health

Sin Docker usa Mongo en memoria (dev). Con Docker: `docker compose up -d`.

### Administradores (seed local)

Define `ADMIN_EMAIL` / `ADMIN_PASSWORD` (y variantes `_LCS`) **solo** en `.env` local o en el panel del host. Nunca documentes contraseñas reales en este README ni en commits.

Plantilla: ver `.env.example` (`changeme-…`).

## Despliegue

- **Frontend (Vercel):** Root Directory = raíz del repo (o `apps/web`). `API_PROXY` = URL del API (sin `/api`). Deja `NEXT_PUBLIC_API_URL` vacío para cookies same-origin.
- **Backend (Render u otro):** Blueprint `render.yaml` si aplica. Configura `WEB_ORIGIN`, `MONGODB_URI` (o `ALLOW_MEMORY_MONGO=true` solo para demos temporales) y secretos JWT/admin **en el panel del host**, no en git.

## Plan gratuito (incluido)

- Subir imagen (JPG/PNG/WebP/GIF, máx 5 MB) + texto
- Agente propone **3 direcciones de video** (9:16, 1:1, 16:9) sin costo
- Consulta iterativa: eliges una opción y el agente refina el guion
- Funciona **sin API keys** (orquestador local). Con Claude/OpenAI/Groq mejora las respuestas.

## Fases

- **Fase 0 + Creator free:** auth, splash, chat, upload, opciones de video
- **Fase 1:** generación + gobierno de presupuesto + Socket.io + webhooks HMAC
- **Fase 2:** editor de video timeline + export

### Fase 1 — flujo

1. Elige una dirección de video (gratis)
2. Pulsa **Generar video** — gobierno valida presupuesto antes de encolar
3. Progreso en tiempo real vía Socket.io
4. Sin API keys de pago usa cadena free-cloud / self-hosted / mock
5. Webhooks HMAC vía `WEBHOOK_HMAC_SECRET` (solo en secretos del host)

## Verificación

```bash
npm run build
npm run build:api
npm run audit:ci
```
