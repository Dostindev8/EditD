const SIGNATURES: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    mime: "image/webp",
    check: (b) =>
      b.slice(0, 4).toString("ascii") === "RIFF" &&
      b.slice(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "image/gif",
    check: (b) =>
      b.slice(0, 6).toString("ascii") === "GIF87a" ||
      b.slice(0, 6).toString("ascii") === "GIF89a",
  },
];

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  for (const sig of SIGNATURES) {
    if (sig.check(buffer)) return sig.mime;
  }
  return null;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
