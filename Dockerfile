# Build and run instructions for Google Cloud Run
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
# Cloud Run sets PORT (8080 by default); the server reads it
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
