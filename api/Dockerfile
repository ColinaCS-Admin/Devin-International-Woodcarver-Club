# Build context is the repository root so the schema in db/ can be copied in.
FROM node:22-alpine AS build
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/tsconfig.json ./
COPY api/src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/api/dist ./dist
COPY db /app/db
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
