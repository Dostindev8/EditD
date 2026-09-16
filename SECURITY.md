# Security notes — EditD / LCS.Dominican

## Política de secretos

- **Nunca** commits, README, issues o chats públicos con contraseñas, JWT, URI de Atlas, o URLs internas de despliegue personales.
- Credenciales solo en `.env` (gitignored), `.keys/` (gitignored) o paneles del host (Render/Vercel).
- Si un secreto se filtró alguna vez en git, **rótalo** (ver `docs/SECURITY-ROTATION.md`) y trátalo como comprometido.

## Controles actuales

- Seed de admin: falla en `production` si faltan secretos; en development puede generar secretos aleatorios por arranque.
- JWT: falla en `production` sin `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`.
- CORS: solo orígenes explícitos en `ALLOWED_ORIGINS` / `WEB_ORIGIN`.
- Redis: obligatorio en `production` para la cola salvo `ALLOW_MEMORY_QUEUE=true` (solo demos).
