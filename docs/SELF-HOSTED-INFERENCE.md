# Self-hosted inference — EditD free tier (zero marginal cost per call)

This document describes how to run a GPU inference server that the API’s
`self-hosted` provider consumes. The server itself is **not** part of this
repo — only the HTTP client (`apps/api/src/generation/providers/selfhosted.provider.ts`)
and free-tier routing live here.

## Goal

Workspaces on the **free tier** (`monthlyBudgetCents` ≤ `FREE_TIER_BUDGET_CENTS`,
default `0`) are routed to `SELFHOSTED_INFERENCE_URL` instead of paid providers
(Runway / Veo / Minimax / MUAPI). Paid workspaces keep the existing provider chain.

Routing is **auditable**: the API logs
`Provider routing: self-hosted (reason=free-tier …)` or
`Provider routing: <paid-provider> (reason=paid-tier …)`.

## Minimum GPU requirements

| Workload | VRAM (minimum) | Recommended |
|----------|----------------|-------------|
| SDXL / FLUX image | 12–16 GB | 16 GB+ |
| Short video (SVD / Wan / similar) | 16–24 GB | **24 GB+** |
| Concurrent jobs (>1) | +8–16 GB | A6000 / 4090 / L40 |

CPU-only is possible for smoke tests but not production video.

## Deploy options (cost trade-off)

| Option | Cost shape | When to use |
|--------|------------|-------------|
| Own GPU box / colo | Fixed CAPEX + electricity | Steady free-tier volume |
| RunPod / Vast.ai / Lambda (hourly) | Variable $/hr | Spiky traffic; turn off when idle |
| Always-on cloud GPU | Fixed monthly | SLA for free tier during business hours |

**Rule of thumb:** if free-tier GPU utilization averages &lt; ~30% of the month,
hourly rental usually wins; above that, owned or reserved capacity is cheaper.

## Expected HTTP contract

Base URL: `SELFHOSTED_INFERENCE_URL` (no trailing slash).

### `POST /v1/generate`

Body (JSON): `prompt`, `negative_prompt`, `aspect_ratio`, `duration_sec`,
`image_url`, `end_image_url`, `audio_url`, `modality`, `model_id`, `steps`,
`cfg_scale`, `seed`, `quality`.

Response: `{ "job_id": "<id>" }` (aliases `id` / `request_id` accepted).

### `GET /v1/jobs/:jobId`

Response: `{ "status": "processing"|"completed"|"failed", "progress": 0-100,
"output_url": "...", "error": "..." }`.

Optional auth: set `SELFHOSTED_INFERENCE_TOKEN` — sent as `Authorization: Bearer …`.

## ComfyUI sketch (example)

1. Install [ComfyUI](https://github.com/comfyanonymous/ComfyUI) on a machine with
   a compatible NVIDIA driver + CUDA.
2. Expose a thin HTTP adapter (FastAPI/Flask) that:
   - Accepts `POST /v1/generate`, queues a workflow JSON into ComfyUI’s
     `/prompt` API, returns `job_id`.
   - Polls ComfyUI history / websocket and maps completion to
     `GET /v1/jobs/:id` with a public `output_url` (S3, R2, or signed URL).
3. Put the adapter behind TLS (Caddy/nginx) and set on Render/API:

```bash
SELFHOSTED_INFERENCE_URL=https://inference.example.com
SELFHOSTED_INFERENCE_TOKEN=<openssl rand -base64 32>
FREE_TIER_BUDGET_CENTS=0
```

4. Smoke-test from the API host:

```bash
curl -sS -X POST "$SELFHOSTED_INFERENCE_URL/v1/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SELFHOSTED_INFERENCE_TOKEN" \
  -d '{"prompt":"test","aspect_ratio":"16:9","duration_sec":4,"modality":"video"}'
```

## Ops notes

- Free-tier jobs bill **0 cents** in EditD; GPU cost is infra, not per-API-call.
- If `SELFHOSTED_INFERENCE_URL` is empty, free-tier routing falls back to
  `dev-mock` in non-production only; production should keep the URL set.
- Do not put GPU credentials in the frontend bundle — only in API env vars.
