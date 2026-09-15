# Checklist de rotación de secretos (Render / producción)

Ejecutar **manualmente** en el dashboard de Render (o el host del API). Este documento no
rota secretos por sí solo.

## Antes de rotar

- [ ] Tener acceso al panel de Render del servicio `editd-api`.
- [ ] Tener acceso a Vercel (proyecto web) para actualizar `ALLOWED_ORIGINS` / `API_PROXY` si cambian URLs.
- [ ] Ventana de mantenimiento acordada (los usuarios deberán volver a iniciar sesión).

## Rotación

- [ ] Generar nuevas contraseñas admin:
  ```bash
  openssl rand -base64 24
  openssl rand -base64 24
  ```
- [ ] En Render → Environment: actualizar `ADMIN_PASSWORD` y `ADMIN_PASSWORD_LCS` con esos valores.
- [ ] Confirmar `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` fijadas como secretos persistentes (PEM RS256, no vacías).
  Si no existen, generar un par nuevo y fijarlo; **no** dejar que el API genere claves efímeras.
- [ ] Confirmar `REDIS_URL` apunta a una instancia real y persistente (Upstash / Redis Cloud / Redis en Render).
- [ ] Confirmar `ALLOWED_ORIGINS` (CSV) incluye solo los dominios reales de producción y staging, por ejemplo:
  `https://web-dostindevs-projects.vercel.app,https://web-ten-kappa-1umwjs6wcs.vercel.app`
- [ ] Redeploy del servicio API.

## Tras la rotación

- [ ] Forzar cierre de sesión global: incrementar `tokenVersion` de todos los usuarios **o**
      vaciar / marcar `revoked: true` en la colección de refresh sessions.
- [ ] Verificar login con las nuevas credenciales admin.
- [ ] Verificar que login con `EditDAdmin2026!` / `LCSAdmin2026!` **falla**.
- [ ] Smoke: `GET /api/health` → 200.

## Nota

Las contraseñas antiguas que vivieron en git (`.env.example`) están documentadas como
comprometidas en `SECURITY.md`.
