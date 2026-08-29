import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookHmac(rawBody: Buffer | string | undefined, signature: string | undefined): boolean {
  const secret = process.env.WEBHOOK_HMAC_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!rawBody || !signature) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const provided = signature.replace(/^sha256=/, "").trim();

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return expected === provided;
  }
}

export function signWebhookPayload(payload: string): string {
  const secret = process.env.WEBHOOK_HMAC_SECRET ?? "dev-hmac";
  return createHmac("sha256", secret).update(payload).digest("hex");
}
