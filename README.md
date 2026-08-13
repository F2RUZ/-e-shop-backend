# E-Shop — Avtosalon admin panel uchun Backend

Internet magazinning (avtosalonning) **admin tomoni** uchun sodda, lekin real loyihaga tayyor backend.
NestJS + PostgreSQL + TypeORM + JWT + Swagger + Docker.

> O‘quv maqsadida yozilgan: kod sodda, izohlar o‘zbekcha,
> backenddan qaytadigan xabarlar aniq va sababi tushuntirilgan.

---

## 🌐 Jonli server

| | |
|---|---|
| **Admin panel** | https://admin.magnateshop.uz |
| **API** | https://backend.magnateshop.uz/api |
| **Swagger** | https://backend.magnateshop.uz/docs |
| **Login** | `admin` / `admin123` |

> 📘 **[XOTIRA.md](XOTIRA.md)** — loyiha qanday qurilgani, **kodi bilan**:
> backend va admin panelning har bir qatlami, uchragan muammolar va yechimlari.
>
> 📄 **[DEPLOYMENT.md](DEPLOYMENT.md)** — serverdagi sozlamalar: portlar, nginx,
> SSL, `.env`, yangilash tartibi, nol holatdan tiklash.
>
> 💬 **[WEBSOCKET.md](WEBSOCKET.md)** — jonli chat (WebSocket) qanday yozilgani va
> uni noldan yozib chiqish uchun qadamma-qadam qo‘llanma.

Bazada **100 ta real avtomobil** va **8 ta kategoriya** bor. Har bir mashinaning
o‘z nomiga mos haqiqiy rasmi bor va rasmlar shu backendning o‘zidan tarqatiladi.

---

## Ichida nima bor

| Modul | Vazifasi |
|---|---|
| **Auth** | Admin tizimga kiradi va JWT token oladi |
| **Categories** | Kategoriya qo‘shish / ko‘rish / yangilash / o‘chirish / faol-nofaol qilish |
| **Products** | Mashina qo‘shish / ko‘rish / yangilash / o‘chirish / faol-nofaol qilish |
| **Dashboard** | Umumiy statistika: mashinalar, kategoriyalar, ombor, kam qolganlar |
| **Chat** | Mijoz bilan admin o‘rtasida **jonli yozishuv** (WebSocket) |

---

## Ishga tushirish

### Variant 1 — Docker (eng oson)

```bash
git clone https://github.com/F2RUZ/-e-shop-backend.git
cd -e-shop-backend
cp .env.example .env      # va .env ni to'ldiring
docker compose up -d --build
```

Baza ham, backend ham o‘zi ko‘tariladi. Tekshirish:
```bash
curl http://localhost:3000/api
```

### Variant 2 — qo‘lda

**Talablar:** Node.js 18+, PostgreSQL 14+

```bash
npm install
createdb eshop_admin
cp .env.example .env      # baza ma'lumotlarini o'zingiznikiga moslang
npm run dev
```

Server ishga tushgach terminalda ko‘rasiz:
```
Server ishga tushdi  ->  http://localhost:3000/api
Swagger hujjatlari   ->  http://localhost:3000/docs
```

Birinchi ishga tushirishda avtomatik:
- **admin / admin123** foydalanuvchi yaratiladi;
- `SEED_DEMO_DATA=true` bo‘lsa — 8 ta kategoriya va 100 ta avtomobil qo‘shiladi.

---

## Swagger bilan ishlash

1. Brauzerda **/docs** ni oching.
2. `1. Auth` → **POST /api/auth/login** → *Try it out* →
   ```json
   { "login": "admin", "password": "admin123" }
   ```
   → **Execute**
3. Javobdan `data.accessToken` ni nusxalang.
4. Sahifa yuqorisidagi **Authorize** tugmasini bosing, tokenni qo‘ying (`Bearer` so‘zisiz).
5. Endi barcha endpointlarni sinab ko‘rishingiz mumkin.

---

## Javoblar ko‘rinishi

Loyihada **barcha** javoblar bir xil ko‘rinishda qaytadi — frontend uchun juda qulay.

**Muvaffaqiyatli:**
```json
{
  "success": true,
  "message": "Mahsulot qo‘shildi",
  "data": { "id": 101, "name": "Toyota Camry 2.5 Hybrid", "price": 545000000 }
}
```

**Ro‘yxat (sahifalash bilan):**
```json
{
  "success": true,
  "message": "Mahsulotlar ro‘yxati",
  "data": {
    "items": [ ... ],
    "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
  }
}
```

**Xatolik:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "«Sedan» kategoriyasini o‘chira olmaysiz, chunki unda 17 ta mahsulot bor. ...",
  "path": "/api/categories/1",
  "timestamp": "2026-08-06T13:21:55.660Z"
}
```

---

## Endpointlar

### Auth
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/auth/login` | Tizimga kirish, token olish (**token kerak emas**) |
| GET | `/api/auth/me` | Hozirgi admin ma‘lumotlari |

> Parolni o‘zgartirish endpointi **ataylab yo‘q**. Hamma bitta `admin` hisobidan
> foydalanadi — kimdir parolni o‘zgartirsa, qolganlar kira olmay qoladi.
> Parol faqat serverdagi `.env` faylida (`ADMIN_PASSWORD`) belgilanadi.

### Categories
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/categories` | Yangi kategoriya qo‘shish |
| GET | `/api/categories` | Ro‘yxat (`search`, `isActive`, `sortBy`, `order`, `page`, `limit`) |
| GET | `/api/categories/:id` | Bitta kategoriya + mashinalar soni |
| PUT | `/api/categories/:id` | To‘liq yangilash |
| PATCH | `/api/categories/:id` | Qisman yangilash |
| PATCH | `/api/categories/:id/status` | Faol / nofaol qilish |
| DELETE | `/api/categories/:id` | O‘chirish (mashinasi bo‘lmasa) |

### Products
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/products` | Yangi mashina qo‘shish |
| GET | `/api/products` | Ro‘yxat (`search`, `categoryId`, `isActive`, `minPrice`, `maxPrice`, `inStock`, `sortBy`, `order`, `page`, `limit`) |
| GET | `/api/products/:id` | Bitta mashina + kategoriyasi |
| PUT | `/api/products/:id` | To‘liq yangilash |
| PATCH | `/api/products/:id` | Qisman yangilash |
| PATCH | `/api/products/:id/status` | Faol / nofaol qilish |
| DELETE | `/api/products/:id` | O‘chirish |

### Dashboard
| Metod | Manzil | Vazifasi |
|---|---|---|
| GET | `/api/dashboard/stats` | Umumiy raqamlar (bosh sahifa kartochkalari) |
| GET | `/api/dashboard/category-stats` | Har bir kategoriya kesimida statistika |
| GET | `/api/dashboard/low-stock` | Omborda kam qolgan mashinalar |

### Chat (jonli yozishuv)
| Metod | Manzil | Vazifasi |
|---|---|---|
| GET | `/api/chat/events` | WebSocket hodisalari hujjati (**token kerak emas**) |
| POST | `/api/chat/start` | Mijoz suhbat ochadi (**token kerak emas**) |
| GET | `/api/chat/chats` | Suhbatlar ro‘yxati |
| GET | `/api/chat/chats/:id/messages` | Bitta suhbat yozishmalari |
| DELETE | `/api/chat/chats/:id` | Suhbatni o‘chirish |

Yozishuvning o‘zi HTTP orqali emas — **WebSocket** orqali ketadi:

```
ws://localhost:3000/chat
```

| Hodisa | Yo‘nalish | Vazifasi |
|---|---|---|
| `chat:join` | yuborasiz | suhbatga qo‘shilish |
| `chat:message` | ikki tomonlama | xabar yuborish / qabul qilish |
| `chat:typing` | ikki tomonlama | «yozmoqda…» |
| `chat:read` | yuborasiz | admin o‘qidi |
| `chat:ready` | keladi | ulanish tayyor |
| `chat:history` | keladi | eski yozishmalar |
| `chat:chats` | keladi | suhbatlar ro‘yxati (admin) |
| `chat:error` | keladi | xatolik sababi |

**Sinash:** `http://localhost:3000/chat.html` — tayyor mijoz sahifasi. Uni
admin panelning «Chat» bo‘limi bilan yonma-yon qo‘yib yozishib ko‘ring.

📘 **[WEBSOCKET.md](WEBSOCKET.md)** — chatni noldan yozish uchun to‘liq qo‘llanma.
Qisqartirilgani Swagger'da ham bor: **/docs** → «5. Chat» bo‘limi.

---

## Asosiy biznes qoidalar

Bu loyihaning eng muhim qismi — qoida buzilganda **aniq va tushunarli** xabar qaytadi.

**1. Mashinasi bor kategoriyani o‘chirib bo‘lmaydi**
```
DELETE /api/categories/1   ->  409
«Sedan» kategoriyasini o‘chira olmaysiz, chunki unda 17 ta mahsulot bor.
Avval o‘sha mahsulotlarni o‘chiring yoki boshqa kategoriyaga ko‘chiring.
Ularni ko‘rish uchun: GET /api/products?categoryId=1.
Agar shunchaki sotuvdan olib qo‘ymoqchi bo‘lsangiz — o‘chirish o‘rniga nofaol qiling.
```

**2. Kategoriya nofaol qilinsa — mashinalari ham nofaol bo‘ladi**
```
PATCH /api/categories/1/status  { "isActive": false }   ->  200
«Sedan» kategoriyasi nofaol qilindi. U bilan birga 17 ta mahsulot ham nofaol qilindi.
```

**3. Kategoriya qayta faollashtirilsa — mashinalar avtomatik yoqilmaydi**
```
PATCH /api/categories/1/status  { "isActive": true }    ->  200
«Sedan» kategoriyasi faollashtirildi.
Ichidagi 17 ta mahsulot hali nofaol — kerakligini alohida faollashtiring.
```

**4. Nofaol kategoriyaga mashina qo‘shib bo‘lmaydi**
```
POST /api/products   ->  409
Bu kategoriyaga mahsulot qo‘sha olmaysiz: «Sedan» kategoriyasi hozir nofaol.
Avval uni faollashtiring: PATCH /api/categories/1/status  { "isActive": true }
```

**5. Nofaol kategoriyadagi mashinani faollashtirib bo‘lmaydi**
```
PATCH /api/products/1/status  { "isActive": true }   ->  409
«Toyota Camry 2.5 Hybrid» mahsulotini faollashtira olmaysiz, chunki uning
«Sedan» kategoriyasi nofaol. Avval kategoriyani faollashtiring.
```

**6. Bir xil nomli kategoriya bo‘lmaydi** (katta-kichik harf farqi hisobga olinmaydi)
```
POST /api/categories  { "name": "sedan" }   ->  409
«Sedan» nomli kategoriya allaqachon mavjud (ID = 1). Boshqa nom tanlang.
```

> **Qisqacha qoida:** faol mashina faqat faol kategoriyada tura oladi.

---

## PUT va PATCH farqi

| | PUT | PATCH |
|---|---|---|
| Nima yuboriladi | **Hamma** maydon | Faqat o‘zgartiriladigani |
| Yuborilmagan maydon | **Tozalanadi** (`null` / `0`) | O‘zgarmaydi |
| Qachon ishlatiladi | Hammasini qaytadan yozganda | Kundalik tahrirlashda |

```jsonc
// PATCH — faqat narxni o‘zgartirish, qolgani o‘z holicha qoladi
{ "price": 520000000 }

// PUT — hammasini yuborish shart, aks holda description va stock tozalanadi
{ "name": "Toyota Camry 2.5 Hybrid", "price": 520000000, "stock": 7, "categoryId": 1 }
```

---

## Loyiha tuzilishi

```
src/
├── main.ts                  # kirish nuqtasi, Swagger, global sozlamalar
├── app.module.ts            # asosiy modul, baza ulanishi
├── app.controller.ts        # GET /api — server ishlayaptimi
│
├── common/                  # umumiy, qayta ishlatiladigan qismlar
│   ├── decorators/          # @Public, @ResponseMessage, @CurrentAdmin
│   ├── dto/                 # sahifalash, status DTO'lari
│   ├── filters/             # barcha xatoliklarni bir xil ko'rinishga keltiradi
│   ├── helpers/             # withMessage()
│   ├── interceptors/        # barcha javoblarni bir xil ko'rinishga keltiradi
│   ├── pipes/               # :id ni songa aylantirish
│   └── transformers/        # boolean va numeric o'girish
│
├── auth/                    # login, token, parol
├── categories/              # kategoriyalar
├── products/                # mashinalar
├── dashboard/               # statistika
└── database/                # birinchi admin + 100 ta mashina (cars.data.ts)

public/images/cars/          # 100 ta avtomobil rasmi (server o'zi tarqatadi)

admin/                       # React + MUI admin paneli (Liquid Glass dizayn tizimi)
├── src/theme/               # tokens.ts — 4 tema, barcha rang shu yerda
├── src/providers/           # tema · ko'rinish · til · auth · toast
├── src/components/          # layout va umumiy UI bloklari
├── src/pages/               # Login · Dashboard · Kategoriyalar · Avtomobillar · Sozlamalar
├── src/locales/             # uz.json · ru.json
└── AGENTS.md                # ⛔ rang/shriftni qotib yozish taqiqi
```

Har bir modul bir xil tuzilishda:
```
<modul>/
├── <modul>.module.ts        # modulni yig'adi
├── <modul>.controller.ts    # endpointlar + Swagger hujjati
├── <modul>.service.ts       # biznes mantiq (qoidalar shu yerda)
├── dto/                     # kiruvchi ma'lumot va uni tekshirish
└── entities/                # baza jadvali
```

---

## `.env` sozlamalari

| O‘zgaruvchi | Ma‘nosi | Default |
|---|---|---|
| `PORT` | Server porti | `3000` |
| `HOST_PORT` | Docker: serverda ochiladigan port | `3000` |
| `APP_URL` | Rasm havolalari shu manzil bilan quriladi | `http://localhost:3000` |
| `DB_HOST` / `DB_PORT` | Baza manzili | `localhost` / `5432` |
| `DB_USERNAME` / `DB_PASSWORD` | Baza foydalanuvchisi | `postgres` |
| `DB_NAME` | Baza nomi | `eshop_admin` |
| `DB_SYNCHRONIZE` | Jadvallarni avtomatik yaratish | `true` |
| `JWT_SECRET` | Token maxfiy kaliti — **productionda albatta o‘zgartiring** | — |
| `JWT_EXPIRES_IN` | Token muddati | `7d` |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | Default admin | `admin` / `admin123` |
| `SEED_DEMO_DATA` | 100 ta mashinani qo‘shish | `true` |

> ⚠️ `APP_URL` seed paytida rasm havolalariga yoziladi. Domen o‘zgarsa —
> bazani tozalab qayta seed qilish kerak.

---

## Serverga qo‘yish (deploy)

Bu loyiha `backend.magnateshop.uz` ga shu tartibda qo‘yilgan:

**1. Kodni serverga yuklash**
```bash
git clone https://github.com/F2RUZ/-e-shop-backend.git ~/e-shop-backend
cd ~/e-shop-backend
```

**2. `.env` ni production uchun sozlash**
```env
NODE_ENV=production
HOST_PORT=4200                              # boshqa loyihalar bilan to'qnashmasin
APP_URL=https://backend.magnateshop.uz
DB_HOST=db                                  # docker-compose ichidagi baza nomi
DB_PASSWORD=<kuchli parol>
JWT_SECRET=<uzun tasodifiy matn>
```

**3. Docker bilan ko‘tarish**
```bash
docker compose up -d --build
docker compose logs -f api
```

**4. Nginx (`/etc/nginx/sites-available/backend.magnateshop.uz`)**
```nginx
server {
    listen 80;
    server_name backend.magnateshop.uz;

    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/backend.magnateshop.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**5. SSL (HTTPS)**
```bash
sudo certbot --nginx -d backend.magnateshop.uz
```

**Yangilash (keyingi safar):**
```bash
cd ~/e-shop-backend && git pull && docker compose up -d --build
```

---

## Foydali buyruqlar

```bash
npm run dev          # ishlab chiqish rejimi
npm run build        # production build
npm run start:prod   # build'ni ishga tushirish
npm run format       # kodni chiroyli formatlash

docker compose up -d --build     # Docker bilan ko'tarish
docker compose logs -f api       # loglarni ko'rish
docker compose down              # to'xtatish
docker compose down -v           # to'xtatish + bazani o'chirish
```
