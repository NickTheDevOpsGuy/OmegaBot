# OmegaBot - Discord bot
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create data dir for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 9090

CMD ["node", "dist/bot.js"]
