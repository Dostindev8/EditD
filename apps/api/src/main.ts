import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { loadJwtKeys } from "./auth/jwt-keys.js";
import { connectMongo } from "./mongo.js";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

function parseAllowedOrigins(): string[] {
  const fromAllowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fromWeb = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...new Set([...fromAllowed, ...fromWeb])];
  if (merged.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ALLOWED_ORIGINS (o WEB_ORIGIN) debe definir al menos un origen permitido en producción.",
      );
    }
    return ["http://localhost:3000"];
  }
  return merged;
}

async function bootstrap() {
  await loadJwtKeys();
  await connectMongo();

  if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL?.trim()) {
    if (process.env.ALLOW_MEMORY_QUEUE === "true") {
      // Free/demo Render: jobs live only in the process; lost on spin-down/redeploy.
      console.warn(
        "[boot] REDIS_URL ausente con ALLOW_MEMORY_QUEUE=true — cola en memoria (no apto para producción real).",
      );
    } else {
      throw new Error(
        "REDIS_URL es obligatoria en producción. Define REDIS_URL o ALLOW_MEMORY_QUEUE=true (solo demos).",
      );
    }
  }

  const allowedOrigins = parseAllowedOrigins();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", process.env.TRUST_PROXY !== "false");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", ...allowedOrigins, "wss:", "ws:"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());

  const isAllowedOrigin = (origin: string) => {
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
    try {
      const host = new URL(origin).hostname;
      if (process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1")) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("CORS origin denied"), false);
    },
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`EditD AI API listening on 0.0.0.0:${port}/api`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
