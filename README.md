# LCS.Dominican

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

## Plan gratuito (incluido)

- Subir imagen (JPG/PNG/WebP/GIF, máx 5 MB) + texto
- Agente propone **3 direcciones de video** (9:16, 1:1, 16:9) sin costo
- Consulta iterativa: eliges una opción y el agente refina el guion
- Funciona **sin API keys** (orquestador local). Con Claude/OpenAI/Groq mejora las respuestas.

## Fases

- **Fase 0 + Creator free:** auth, splash, chat, upload, opciones de video
- **Fase 1:** generación Runway/Veo + gobierno de presupuesto bloqueante + Socket.io + webhooks HMAC
- **Fase 2:** editor de video timeline + export

### Fase 1 — flujo

1. Elige una dirección de video (gratis)
2. Pulsa **Generar video** — gobierno valida presupuesto antes de encolar
3. Progreso en tiempo real vía Socket.io (`job:encolado`, `job:progress`, `job:completed`)
4. Sin API keys usa `dev-mock` (video demo). Con `RUNWAY_API_KEY` / `GOOGLE_VEO_API_KEY` usa proveedor real
5. Webhooks: `POST /api/generation/webhooks/runway|veo` (HMAC en `WEBHOOK_HMAC_SECRET`)

## Verificación

```bash
npm run build
npm run audit:ci
```
