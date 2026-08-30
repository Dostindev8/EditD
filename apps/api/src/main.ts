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

async function bootstrap() {
  await loadJwtKeys();
  await connectMongo();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", process.env.TRUST_PROXY !== "false");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());
  const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isAllowedOrigin = (origin: string) => {
    if (webOrigins.includes("*") || webOrigins.includes(origin)) return true;
    try {
      const host = new URL(origin).hostname;
      if (host === "localhost" || host === "127.0.0.1") return true;
      if (host.endsWith(".vercel.app")) return true;
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

bootstrap();
