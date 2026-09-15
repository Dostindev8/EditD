import { BadRequestException } from "@nestjs/common";
import { assertSafeExternalUrl } from "./url-safety.js";

describe("assertSafeExternalUrl", () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it("accepts empty / undefined", async () => {
    await expect(assertSafeExternalUrl(undefined, "f")).resolves.toBeUndefined();
    await expect(assertSafeExternalUrl("", "f")).resolves.toBeUndefined();
  });

  it("rejects private IPv4 literals", async () => {
    process.env.NODE_ENV = "production";
    await expect(assertSafeExternalUrl("https://127.0.0.1/x", "f")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(assertSafeExternalUrl("https://10.0.0.5/x", "f")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(assertSafeExternalUrl("https://192.168.1.1/x", "f")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects http in production", async () => {
    process.env.NODE_ENV = "production";
    await expect(assertSafeExternalUrl("http://cdn.example.com/a.png", "f")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects credentialed URLs", async () => {
    process.env.NODE_ENV = "production";
    await expect(
      assertSafeExternalUrl("https://user:pass@example.com/a.png", "f"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepts a public https URL", async () => {
    process.env.NODE_ENV = "production";
    await expect(assertSafeExternalUrl("https://example.com/a.png", "f")).resolves.toBe(
      "https://example.com/a.png",
    );
  });
});
