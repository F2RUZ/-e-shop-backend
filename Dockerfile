# ─────────────────────────────────────────────────────────────
#  1-bosqich: loyihani yig'amiz (build)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Avval faqat package fayllarini ko'chiramiz — kesh yaxshiroq ishlaydi
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# ─────────────────────────────────────────────────────────────
#  2-bosqich: faqat ishlash uchun kerakli narsalar (runtime)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Salon videolarini siqish uchun ffmpeg — bepul, ochiq kodli dastur.
# Image taxminan 90 MB kattalashadi. Busiz video yuklash ishlamaydi.
RUN apk add --no-cache ffmpeg

# Faqat production paketlari — image ancha yengil bo'ladi
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Yig'ilgan kod va mashinalar rasmlari
COPY --from=builder /app/dist ./dist
COPY public ./public

# Yuklangan videolar uchun papka. DIQQAT: bu papka image ichida BO'SH turadi —
# haqiqiy fayllar docker-compose.yml dagi volume orqali serverdan ulanadi.
RUN mkdir -p uploads/pickup-points uploads/tmp

EXPOSE 3000

# Konteyner sog'ligini tekshirish
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
