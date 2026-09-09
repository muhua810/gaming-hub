FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ .
RUN npx vite build

FROM node:20-alpine AS server-build

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/package.json ./
COPY --from=server-build /app/server/src ./src
COPY --from=server-build /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=client-build /app/client/dist ./public

EXPOSE 3000

# Push schema on start, then run server
CMD npx prisma db push --skip-generate && node --import tsx src/index.ts
