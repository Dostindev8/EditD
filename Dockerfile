# EditD API only — never build/start the Next.js web app on this image.
FROM node:22-bookworm-slim

WORKDIR /app

# Native deps for argon2 / mongodb-memory-server fallback
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --include=dev

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY tsconfig.json tsconfig.json

RUN npm run build:api

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start:api"]
