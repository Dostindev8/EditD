import { BadRequestException } from "@nestjs/common";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function isPrivateOrReservedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("::ffff:")) {
      return isPrivateOrReservedIp(lower.slice("::ffff:".length));
    }
    return false;
  }
  return true;
}

/**
 * Rejects non-HTTPS (except http://localhost in non-production), private/link-local
 * hosts, and cloud metadata endpoints. Resolves DNS so literal hostnames that map
 * to private IPs cannot bypass the check.
 */
export async function assertSafeExternalUrl(raw: string | undefined | null, field: string): Promise<string | undefined> {
  if (raw == null || String(raw).trim() === "") return undefined;
  const value = String(raw).trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException(`${field} no es una URL válida`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new BadRequestException(`${field} solo admite http(s)`);
  }

  if (url.protocol === "http:") {
    const host = url.hostname.toLowerCase();
    const localOk =
      process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1");
    if (!localOk) {
      throw new BadRequestException(`${field} requiere HTTPS en producción`);
    }
  }

  if (url.username || url.password) {
    throw new BadRequestException(`${field} no puede incluir credenciales en la URL`);
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(hostname) && process.env.NODE_ENV === "production") {
    throw new BadRequestException(`${field} apunta a un host no permitido`);
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new BadRequestException(`${field} apunta a una IP privada o reservada`);
    }
    return value;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        throw new BadRequestException(`${field} resuelve a una IP privada o reservada`);
      }
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException(`${field} no se pudo resolver`);
  }

  return value;
}
