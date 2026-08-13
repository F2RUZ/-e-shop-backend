# Deploy va infratuzilma — to'liq yozuv

Bu fayl loyihaning **qayerda, qanday ishlayotganini** boshidan oxirigacha yozib qo'yadi.
Keyinchalik o'zingiz yoki boshqa dasturchi ochib, hech narsa so'ramasdan davom ettira olsin.

**Oxirgi yangilanish:** 2026-08-06

---

## 1. Umumiy manzara

```
                     ┌──────────────── 158.220.117.101 ────────────────┐
                     │                                                  │
  Internet ──443──▶  │  nginx                                           │
                     │   ├── admin.magnateshop.uz    → 127.0.0.1:4300   │
                     │   ├── backend.magnateshop.uz  → 127.0.0.1:4200   │
                     │   ├── api.magnateshop.uz      → 127.0.0.1:4100   │ (boshqa loyiha)
                     │   └── programistc7.uz         → 127.0.0.1:3000   │ (boshqa loyiha)
                     │                                                  │
                     │  Docker konteynerlari:                           │
                     │   ├── eshop-admin  (nginx + React build)  :4300  │
                     │   ├── eshop-api    (NestJS)               :4200  │
                     │   └── eshop-db     (PostgreSQL 16)  — tashqariga chiqmaydi
                     └──────────────────────────────────────────────────┘
```

> ⚠️ Serverda **boshqa ikkita loyiha** ishlaydi (`shop_app` 4100-portda,
> `eduenglish_app` 3000-portda). Ularga tegilmagan va tegilmasligi kerak.
> Yangi loyiha qo'shsangiz — **band bo'lmagan port** tanlang.

---

## 2. Manzillar

| Nima | Manzil |
|---|---|
| Admin panel | https://admin.magnateshop.uz |
| Backend API | https://backend.magnateshop.uz/api |
| Swagger hujjatlari | https://backend.magnateshop.uz/docs |
| Avtomobil rasmlari | https://backend.magnateshop.uz/images/cars/*.jpg |
| GitHub | https://github.com/F2RUZ/-e-shop-backend |

**Kirish:** `admin` / `admin123`

> ⚠️ Bu ochiq internetda turibdi va parol hamma biladigan default. O'quvchilar
> uchun ataylab shunday qoldirilgan. Agar keyinchalik yopish kerak bo'lsa —
> `.env` dagi `ADMIN_PASSWORD` ni o'zgartirib, `admins` jadvalini tozalab,
> konteynerni qayta ishga tushiring.

---

## 3. Serverga kirish

```bash
ssh -p 2222 euphoria@158.220.117.101
```

- OS: Ubuntu 24.04.4 LTS
- Docker 29.6 + Compose v5.1.4
- nginx 1.24 + certbot 2.9
- `sudo` parol so'raydi (parolsiz sudo yo'q)
- Loyiha papkasi: `~/e-shop-backend`

---

## 4. Portlar taqsimoti

| Port | Kim ishlatadi | Qayerdan ko'rinadi |
|---|---|---|
| 3000 | eduenglish_app (boshqa loyiha) | 127.0.0.1 |
| 4100 | shop_app (boshqa loyiha) | 127.0.0.1 |
| **4200** | **eshop-api** (bizning backend) | 127.0.0.1 |
| **4300** | **eshop-admin** (bizning panel) | 127.0.0.1 |
| 5432 | eshop-db | faqat Docker tarmog'i ichida |

Barcha konteynerlar `127.0.0.1` ga bog'langan — tashqariga faqat nginx chiqaradi.

---

## 5. Fayllar tuzilishi (serverda)

```
~/e-shop-backend/
├── .env                     ← ⚠️ git'da yo'q, faqat serverda
├── docker-compose.yml       ← db + api + admin
├── Dockerfile               ← backend (NestJS)
├── src/                     ← backend kodi
├── public/images/cars/      ← 100 ta avtomobil rasmi
└── admin/
    ├── Dockerfile           ← admin panel (React → nginx)
    ├── nginx.conf           ← SPA fallback
    └── src/                 ← panel kodi
```

---

## 6. `.env` (serverda)

```env
# Server
PORT=3000                    # konteyner ICHIDAGI port
HOST_PORT=4200               # serverda ochiladigan port
NODE_ENV=production
APP_URL=https://backend.magnateshop.uz

# PostgreSQL (docker-compose ichidagi "db" xosti)
DB_HOST=db
DB_PORT=5432
DB_USERNAME=eshop
DB_PASSWORD=<tasodifiy 32 belgi>
DB_NAME=eshop_admin
DB_SYNCHRONIZE=true

# JWT
JWT_SECRET=<tasodifiy 64 belgi>
JWT_EXPIRES_IN=7d

# Default admin
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123
ADMIN_FULL_NAME=Bosh administrator

# Namuna ma'lumot
SEED_DEMO_DATA=true

# Admin panel
ADMIN_HOST_PORT=4300
ADMIN_API_URL=https://backend.magnateshop.uz/api
```

> ⚠️ `APP_URL` — rasm havolalari **seed paytida** shu manzil bilan yoziladi.
> Domen o'zgarsa, bazani tozalab qayta seed qilish kerak.
>
> ⚠️ `ADMIN_API_URL` — Vite **build paytida** bundle ichiga yoziladi.
> O'zgarsa `docker compose up -d --build admin` qilish shart.

---

## 7. Yangilash tartibi

> ⚠️ Serverdagi `~/e-shop-backend` — **git repository EMAS**. Fayllar u yerga
> ko'chirib qo'yilgan, shuning uchun `git pull` ishlamaydi. Yangilash lokal
> kompyuterdan **rsync** bilan qilinadi.

**1-qadam — fayllarni yuborish (lokal kompyuterdan):**

```bash
cd ~/Desktop/-e-shop-backend

# Avval QURUQ SINOV — nima o'zgarishini ko'rasiz, hech narsa yozilmaydi
rsync -azn --delete --itemize-changes \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' \
  --exclude '.env' --exclude '._*' --exclude '.DS_Store' --exclude '*.tsbuildinfo' \
  ./ euphoria@158.220.117.101:e-shop-backend/

# To'g'ri bo'lsa — `n` harfini olib tashlab, haqiqiy yuborish
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' \
  --exclude '.env' --exclude '._*' --exclude '.DS_Store' --exclude '*.tsbuildinfo' \
  ./ euphoria@158.220.117.101:e-shop-backend/
```

> ⚠️ `--exclude '.env'` — **majburiy**. Serverdagi `.env` boshqacha (parollar,
> portlar). Uni ustidan yozib yuborsangiz hamma narsa buziladi.
>
> `--delete` xavfsiz: rsync exclude qilingan fayllarni **o'chirmaydi**.

**2-qadam — qayta build (serverda):**

```bash
ssh -p 2222 euphoria@158.220.117.101
cd ~/e-shop-backend

# faqat backend o'zgargan bo'lsa
docker compose up -d --build api

# faqat panel o'zgargan bo'lsa
docker compose up -d --build admin

# ikkalasi ham
docker compose up -d --build
```

**Adminni tiklash** (parol yo'qolsa yoki kimdir o'zgartirib qo'ysa):

```bash
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM admins;"'
docker compose restart api
docker compose logs api | grep "Default admin"
# -> Default admin yaratildi -> login: admin | parol: admin123
```

`.env` dagi `ADMIN_PASSWORD` qanday bo'lsa, admin shu parol bilan qayta
yaratiladi. Panel orqali parolni o'zgartirish imkoni **yo'q** (endpoint
ataylab olib tashlangan).

Tekshirish:
```bash
docker compose ps
docker compose logs -f api
curl -s https://backend.magnateshop.uz/api | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' https://admin.magnateshop.uz
```

---

## 8. Nginx konfiguratsiyalari

Ikkita fayl qo'shilgan (mavjudlariga **tegilmagan**):

- `/etc/nginx/sites-available/backend.magnateshop.uz` → `127.0.0.1:4200`
- `/etc/nginx/sites-available/admin.magnateshop.uz` → `127.0.0.1:4300`

Har biri `sites-enabled/` ga symlink qilingan. Namuna:

```nginx
server {
    listen 80;
    server_name admin.magnateshop.uz;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:4300;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### ⚠️ WebSocket uchun qo'shimcha (chat ishlashi uchun MAJBURIY)

Chat WebSocket orqali ishlaydi. Oddiy `proxy_pass` WebSocket'ni **o'tkazmaydi** —
nginx ulanishni "yangilash" (upgrade) haqidagi sarlavhalarni uzatishi kerak.

Serverda `$connection_upgrade` degan **map allaqachon bor** (boshqa loyiha uchun
qo'shilgan): `/etc/nginx/conf.d/ws-upgrade.conf`. Undan foydalanamiz.

`backend.magnateshop.uz` faylining `location /` blokiga qo'shiladigan qatorlar:

```nginx
server {
    server_name backend.magnateshop.uz;

    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;

        # ⬇️ WebSocket uchun — bularsiz chat polling'ga tushib qoladi
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Chat ulanishi uzoq turadi — 60s bo'lsa uzilib qolardi
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

> `$connection_upgrade` — WebSocket so'roviga `upgrade`, oddiy so'rovga `close`
> qaytaradigan map. Uni qo'lda `"upgrade"` deb yozib qo'yish ham ishlaydi, lekin
> map to'g'riroq: oddiy HTTP so'rovlar keraksiz sarlavha olmaydi.
>
> Map yo'q serverda uni qo'shish kerak (`http` bloki ichida yoki `conf.d/` da):
>
> ```nginx
> map $http_upgrade $connection_upgrade {
>     default upgrade;
>     ''      close;
> }
> ```

Tekshirish (`101 Switching Protocols` qaytishi kerak):

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Sec-WebSocket-Version: 13" \
  "https://backend.magnateshop.uz/socket.io/?EIO=4&transport=websocket"
```

> Bu sarlavhalar bo'lmasa ham chat **ishlashi mumkin** — socket.io oddiy
> so'rovlarga (long-polling) tushib qoladi. Lekin sekin bo'ladi va ulanish
> uzilib-ulanib turadi. Shuning uchun qo'shish shart.

O'zgartirgandan keyin **albatta**:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. SSL

Ikkala domen ham Let's Encrypt sertifikatiga ega (certbot avtomatik yangilaydi):

```bash
sudo certbot --nginx -d admin.magnateshop.uz --redirect
sudo certbot certificates          # holatni ko'rish
sudo certbot renew --dry-run       # yangilanishni sinash
```

Amal qilish muddati: **2026-11-04** gacha (avtomatik uzayadi).

---

## 10. DNS

`magnateshop.uz` zonasida A-yozuvlar:

| Nom | Turi | TTL | Qiymat |
|---|---|---|---|
| `backend` | A | 360 | 158.220.117.101 |
| `admin` | A | 360 | 158.220.117.101 |

---

## 11. Baza

PostgreSQL 16, Docker volume: `e-shop-backend_eshop-db-data`.

```bash
# Bazaga kirish
docker exec -it eshop-db psql -U eshop -d eshop_admin

# Zaxira nusxa
docker exec eshop-db pg_dump -U eshop eshop_admin | gzip > ~/eshop-$(date +%F).sql.gz

# Namuna ma'lumotni qaytadan yuklash (100 ta avtomobil)
docker exec eshop-db psql -U eshop -d eshop_admin \
  -c "TRUNCATE products, categories RESTART IDENTITY CASCADE;"
docker compose restart api
```

**Jadvallar:** `admins` · `categories` · `products`

`DB_SYNCHRONIZE=true` — TypeORM jadvallarni o'zi yaratadi/yangilaydi.
Bu o'quv loyihasi uchun qulay; jiddiy loyihada `false` qilib, migration ishlatiladi.

---

## 12. Nol holatdan qayta tiklash

Agar hammasi yo'qolsa:

```bash
git clone https://github.com/F2RUZ/-e-shop-backend.git ~/e-shop-backend
cd ~/e-shop-backend
cp .env.example .env
nano .env                      # 6-bo'limdagi qiymatlarni qo'ying
docker compose up -d --build

# nginx + SSL
sudo nano /etc/nginx/sites-available/backend.magnateshop.uz    # 8-bo'lim
sudo nano /etc/nginx/sites-available/admin.magnateshop.uz
sudo ln -s /etc/nginx/sites-available/backend.magnateshop.uz /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.magnateshop.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d backend.magnateshop.uz -d admin.magnateshop.uz --redirect
```

Baza bo'sh bo'lsa, backend birinchi ishga tushishda **admin + 100 ta avtomobilni**
o'zi yaratadi (`SEED_DEMO_DATA=true`).

---

## 13. Loyiha haqida qisqacha

### Backend (NestJS + PostgreSQL + TypeORM)

4 modul, 21 endpoint: `auth` · `categories` · `products` · `dashboard`.

Asosiy biznes qoidalar (hammasi test qilingan):

1. Avtomobili bor kategoriyani **o'chirib bo'lmaydi** → 409 + sababi tushuntirilgan xabar
2. Kategoriya nofaol qilinsa — undagi avtomobillar ham nofaol bo'ladi
3. Kategoriya qayta yoqilsa — avtomobillar avtomatik yoqilmaydi
4. Nofaol kategoriyaga avtomobil qo'shib bo'lmaydi
5. Nofaol kategoriyadagi avtomobilni faollashtirib bo'lmaydi
6. Bir xil nomli kategoriya bo'lmaydi (katta-kichik harf farqsiz)

> **Bitta qoida:** faol avtomobil faqat faol kategoriyada tura oladi.

Barcha xabarlar o'zbekcha va **nima qilish kerakligini** ham aytadi.

### Admin panel (React + MUI + Liquid Glass)

- **Yagona manba:** `admin/src/theme/tokens.ts` — barcha rang shu yerda.
  Komponentlarda **0 ta hex** (tekshirish: `admin/AGENTS.md` oxiridagi grep).
- 4 tema: Tungi · Muz · Kunduzgi (yorug') · Chuqur
- uz / ru to'liq tarjima; til · tema · ko'rinish — **uchta mustaqil o'q**
- 5 shrift o'lchami (14–26px), 15 shrift (hammasi kirill bilan)
- Har ro'yxat: `CollapsibleSection` + `PagedList` + `useAutoPageSize`
  (qator soni ekran balandligidan hisoblanadi, qat'iy son yo'q)
- Har avtomobil va kategoriya uchun **view modal** (qator bosiladi, `Enter` ham ishlaydi)

---

## 14. Muhim eslatmalar

| Nima | Nega |
|---|---|
| CORS to'liq ochiq (`origin: *`) | O'quvchilar istalgan joydan (localhost, Vercel…) ulanadi |
| `admin/admin123` o'zgartirilmagan | O'quvchilar uchun ataylab |
| `.env` git'da yo'q | Sirlar repoga tushmasin |
| Rasmlar backendning o'zida | Wikipedia hotlink 429 qaytaradi, shuning uchun yuklab olindi (13 MB) |
| Vite `VITE_*` build paytida yoziladi | Backend manzili o'zgarsa qayta build shart |
| Yangi loyiha qo'shsangiz | Band bo'lmagan port tanlang (3000/4100/4200/4300 band) |
