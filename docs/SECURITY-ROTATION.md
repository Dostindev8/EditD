# Checklist de rotación de secretos (producción)

Ejecutar **manualmente** en el panel del host del API. Este documento no rota secretos por sí solo y **no** debe contener contraseñas reales.

## Antes de rotar

- [ ] Acceso al panel del servicio API y del frontend.
- [ ] Ventana de mantenimiento (los usuarios deberán volver a iniciar sesión).

## Rotación

- [ ] Generar nuevas contraseñas admin:
  ```bash
  openssl rand -base64 24
  openssl rand -base64 24
  ```
- [ ] Actualizar `ADMIN_PASSWORD` y `ADMIN_PASSWORD_LCS` en el environment del host.
- [ ] Confirmar `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` persistentes (PEM RS256).
- [ ] Confirmar `REDIS_URL` (o demos explícitas con cola en memoria).
- [ ] Confirmar `ALLOWED_ORIGINS` solo con dominios reales de producción/staging (sin pegarlos en git).
- [ ] Redeploy del API.

## Tras la rotación

- [ ] Invalidar refresh sessions / incrementar `tokenVersion`.
- [ ] Verificar login con las **nuevas** credenciales (fuera de este repo).
- [ ] Verificar que las contraseñas antiguas filtradas **fallan**.
- [ ] Smoke: `GET /api/health` → 200.
