import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let privateKey = "";
let publicKey = "";

export function getJwtPrivateKey() {
  return privateKey;
}
export function getJwtPublicKey() {
  return publicKey;
}

export async function loadJwtKeys() {
  const envPriv = process.env.JWT_PRIVATE_KEY?.trim();
  const envPub = process.env.JWT_PUBLIC_KEY?.trim();

  if (envPriv && envPub) {
    privateKey = envPriv.replace(/\\n/g, "\n");
    publicKey = envPub.replace(/\\n/g, "\n");
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_PRIVATE_KEY y JWT_PUBLIC_KEY deben estar definidas en producción. No se generan claves efímeras.",
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[jwt-keys] JWT_PRIVATE_KEY/JWT_PUBLIC_KEY ausentes — generando par RS256 local (solo development/test).",
  );

  const dir = join(process.cwd(), ".keys");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const privPath = join(dir, "jwt-rs256.key");
  const pubPath = join(dir, "jwt-rs256.pub");
  if (existsSync(privPath) && existsSync(pubPath)) {
    privateKey = readFileSync(privPath, "utf8");
    publicKey = readFileSync(pubPath, "utf8");
    return;
  }
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  try {
    writeFileSync(privPath, pair.privateKey, { mode: 0o600 });
    writeFileSync(pubPath, pair.publicKey, { mode: 0o644 });
  } catch {
    // Ephemeral or read-only filesystem fallback
  }
  privateKey = pair.privateKey;
  publicKey = pair.publicKey;
}
