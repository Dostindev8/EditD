import { createHash, generateKeyPairSync } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { AuthService } from "./auth.service.js";
import * as jwtKeys from "./jwt-keys.js";

describe("AuthService", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeAll(() => {
    jest.spyOn(jwtKeys, "getJwtPrivateKey").mockReturnValue(privateKey);
    jest.spyOn(jwtKeys, "getJwtPublicKey").mockReturnValue(publicKey);
  });

  function mockRes() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as never;
  }

  it("login with Argon2id emits RS256 access cookie and refresh cookie", async () => {
    const password = "StrongPass123!";
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const user = {
      _id: "507f1f77bcf86cd799439011",
      email: "admin@editd.ai",
      name: "Admin",
      passwordHash,
      tokenVersion: 0,
    };

    const users = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const sessions = {
      create: jest.fn().mockResolvedValue({}),
    };
    const service = new AuthService(
      users as never,
      {} as never,
      {} as never,
      sessions as never,
    );

    const res = mockRes();
    const out = await service.login(user.email, password, res);
    expect(out.user.email).toBe(user.email);
    expect((res as { cookie: jest.Mock }).cookie).toHaveBeenCalledWith(
      "lcs_access",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
    expect((res as { cookie: jest.Mock }).cookie).toHaveBeenCalledWith(
      "lcs_refresh",
      expect.stringMatching(/^[0-9a-f-]{36}\./),
      expect.objectContaining({ httpOnly: true, path: "/api/auth" }),
    );

    const access = (res as { cookie: jest.Mock }).cookie.mock.calls.find(
      (c) => c[0] === "lcs_access",
    )?.[1] as string;
    const decoded = jwt.verify(access, publicKey, { algorithms: ["RS256"] }) as {
      sub: string;
      email: string;
    };
    expect(decoded.email).toBe(user.email);
    expect(decoded.sub).toBe(String(user._id));
  });

  it("revokes the whole refresh family when a rotated token is reused", async () => {
    const familyId = "11111111-1111-1111-1111-111111111111";
    const raw = "old-refresh-token-value";
    // After rotation the previous session row is already revoked; reuse must wipe the family.
    const session = {
      familyId,
      userId: "507f1f77bcf86cd799439011",
      tokenHash: createHash("sha256").update(raw).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
      revoked: true,
      save: jest.fn(),
    };

    const sessions = {
      findOne: jest.fn().mockResolvedValue(session),
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
    };
    const users = {
      findById: jest.fn(),
    };
    const service = new AuthService(
      users as never,
      {} as never,
      {} as never,
      sessions as never,
    );

    const res = mockRes();
    await expect(service.refresh(`${familyId}.${raw}`, res)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.updateMany).toHaveBeenCalledWith({ familyId }, { revoked: true });
    expect((res as { clearCookie: jest.Mock }).clearCookie).toHaveBeenCalled();
  });
});
