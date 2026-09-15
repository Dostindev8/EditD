# Security notes — EditD / LCS.Dominican

## Credenciales de administrador expuestas históricamente

Los valores literales `EditDAdmin2026!` y `LCSAdmin2026!` aparecieron en `.env.example`
y en el seed de administradores en commits previos de este repositorio (ver historial de
`.env.example` en `main`).

**Estas contraseñas deben considerarse comprometidas de forma permanente**, incluso después
de este remediado. Cualquier despliegue que las haya usado debe:

1. Rotar `ADMIN_PASSWORD` y `ADMIN_PASSWORD_LCS` (ver `docs/SECURITY-ROTATION.md`).
2. Invalidar sesiones refresh existentes.
3. Confirmar que JWT RS256 y Redis están fijados como secretos persistentes.

## Controles actuales (post-remediación P0)

- Seed de admin: falla en `production` si faltan secretos; en development genera secretos aleatorios por arranque.
- JWT: falla en `production` sin `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`.
- CORS: solo orígenes explícitos en `ALLOWED_ORIGINS` / `WEB_ORIGIN` (sin `*.vercel.app`).
- Redis: obligatorio en `production` para la cola de generación.
