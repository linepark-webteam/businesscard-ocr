# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# package.json と package-lock.json（または yarn.lock）をコピー
COPY package*.json ./
RUN npm ci

# ソース一式をコピー（ビルド済みファイルは .dockerignore で除外しておくと吉）
COPY . .

# TypeScript → JavaScript にビルド
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# ビルド成果物と package*.json をコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

CMD ["node", "dist/index.js"]
