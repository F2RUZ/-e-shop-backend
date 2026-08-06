# E-Shop — Admin panel uchun Backend

Internet magazinning **admin tomoni** uchun sodda, lekin real loyihaga tayyor backend.
NestJS + PostgreSQL + TypeORM + JWT + Swagger.

> Bu loyiha o‘quv maqsadida yozilgan: kod sodda, izohlar o‘zbekcha,
> backenddan qaytadigan xabarlar esa aniq va tushunarli.

---

## Ichida nima bor

| Modul | Vazifasi |
|---|---|
| **Auth** | Admin tizimga kiradi, JWT token oladi, parolini o‘zgartiradi |
| **Categories** | Kategoriya qo‘shish / ko‘rish / yangilash / o‘chirish / faol-nofaol qilish |
| **Products** | Mahsulot qo‘shish / ko‘rish / yangilash / o‘chirish / faol-nofaol qilish |
| **Dashboard** | Umumiy statistika: mahsulotlar, kategoriyalar, ombor, kam qolganlar |

**Default admin:** `admin` / `admin123`

---

## Ishga tushirish

### 1. Talablar
- Node.js 18+
- PostgreSQL 14+

### 2. Paketlarni o‘rnatish
```bash
npm install
```

### 3. Bazani yaratish
```bash
createdb eshop_admin
```

### 4. `.env` faylini tayyorlash
```bash
cp .env.example .env
```
So‘ng `.env` ichidagi baza ma‘lumotlarini o‘zingiznikiga moslang:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=parolingiz
DB_NAME=eshop_admin
```

### 5. Serverni ishga tushirish
```bash
npm run dev      # ishlab chiqish rejimi (o'zgarishni o'zi ko'radi)
npm run build    # production uchun yig'ish
npm run start:prod
```

Server ishga tushgach terminalda ko‘rasiz:
```
Server ishga tushdi  ->  http://localhost:4000/api
Swagger hujjatlari   ->  http://localhost:4000/docs
```

Birinchi ishga tushirishda avtomatik ravishda:
- **admin / admin123** foydalanuvchi yaratiladi;
- `SEED_DEMO_DATA=true` bo‘lsa — 4 ta kategoriya va 10 ta mahsulot qo‘shiladi.

---

## Swagger bilan qanday ishlash

1. Brauzerda **http://localhost:4000/docs** ni oching.
2. `1. Auth` → **POST /api/auth/login** → *Try it out* →
   ```json
   { "login": "admin", "password": "admin123" }
   ```
   → **Execute**
3. Javobdan `data.accessToken` ni nusxalang.
4. Sahifa yuqorisidagi 🔓 **Authorize** tugmasini bosing, tokenni qo‘ying (`Bearer` so‘zisiz), **Authorize**.
5. Endi barcha endpointlarni sinab ko‘rishingiz mumkin.

---

## Javoblar ko‘rinishi

Loyihada **barcha** javoblar bir xil ko‘rinishda qaytadi — frontend uchun juda qulay.

**Muvaffaqiyatli:**
```json
{
  "success": true,
  "message": "Mahsulot qo‘shildi",
  "data": { "id": 11, "name": "iPhone 15 Pro", "price": 15990000 }
}
```

**Ro‘yxat (sahifalash bilan):**
```json
{
  "success": true,
  "message": "Mahsulotlar ro‘yxati",
  "data": {
    "items": [ ... ],
    "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 }
  }
}
```

**Xatolik:**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "«Telefonlar» kategoriyasini o‘chira olmaysiz, chunki unda 3 ta mahsulot bor. ...",
  "path": "/api/categories/1",
  "timestamp": "2026-08-06T13:21:55.660Z"
}
```

---

## Endpointlar ro‘yxati

### Auth
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/auth/login` | Tizimga kirish, token olish (**token kerak emas**) |
| GET | `/api/auth/me` | Hozirgi admin ma‘lumotlari |
| PATCH | `/api/auth/change-password` | Parolni o‘zgartirish |

### Categories
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/categories` | Yangi kategoriya qo‘shish |
| GET | `/api/categories` | Ro‘yxat (`search`, `isActive`, `sortBy`, `order`, `page`, `limit`) |
| GET | `/api/categories/:id` | Bitta kategoriya + mahsulotlar soni |
| PUT | `/api/categories/:id` | To‘liq yangilash |
| PATCH | `/api/categories/:id` | Qisman yangilash |
| PATCH | `/api/categories/:id/status` | Faol / nofaol qilish |
| DELETE | `/api/categories/:id` | O‘chirish (mahsuloti bo‘lmasa) |

### Products
| Metod | Manzil | Vazifasi |
|---|---|---|
| POST | `/api/products` | Yangi mahsulot qo‘shish |
| GET | `/api/products` | Ro‘yxat (`search`, `categoryId`, `isActive`, `minPrice`, `maxPrice`, `inStock`, `sortBy`, `order`, `page`, `limit`) |
| GET | `/api/products/:id` | Bitta mahsulot + kategoriyasi |
| PUT | `/api/products/:id` | To‘liq yangilash |
| PATCH | `/api/products/:id` | Qisman yangilash |
| PATCH | `/api/products/:id/status` | Faol / nofaol qilish |
| DELETE | `/api/products/:id` | O‘chirish |

### Dashboard
| Metod | Manzil | Vazifasi |
|---|---|---|
| GET | `/api/dashboard/stats` | Umumiy raqamlar (bosh sahifa kartochkalari) |
| GET | `/api/dashboard/category-stats` | Har bir kategoriya kesimida statistika |
| GET | `/api/dashboard/low-stock` | Omborda kam qolgan mahsulotlar |

---

## Asosiy biznes qoidalar

Bu loyihaning eng muhim qismi — qoidalar buzilganda **aniq va tushunarli** xabar qaytadi.

**1. Mahsuloti bor kategoriyani o‘chirib bo‘lmaydi**
```
DELETE /api/categories/1   ->  409
«Telefonlar» kategoriyasini o‘chira olmaysiz, chunki unda 3 ta mahsulot bor.
Avval o‘sha mahsulotlarni o‘chiring yoki boshqa kategoriyaga ko‘chiring.
Ularni ko‘rish uchun: GET /api/products?categoryId=1.
Agar shunchaki sotuvdan olib qo‘ymoqchi bo‘lsangiz — o‘chirish o‘rniga nofaol qiling.
```

**2. Kategoriya nofaol qilinsa — mahsulotlari ham nofaol bo‘ladi**
```
PATCH /api/categories/1/status  { "isActive": false }   ->  200
«Telefonlar» kategoriyasi nofaol qilindi. U bilan birga 3 ta mahsulot ham nofaol qilindi.
```

**3. Kategoriya qayta faollashtirilsa — mahsulotlar avtomatik yoqilmaydi**
```
PATCH /api/categories/1/status  { "isActive": true }    ->  200
«Telefonlar» kategoriyasi faollashtirildi.
Ichidagi 3 ta mahsulot hali nofaol — kerakligini alohida faollashtiring.
```

**4. Nofaol kategoriyaga mahsulot qo‘shib bo‘lmaydi**
```
POST /api/products   ->  409
Bu kategoriyaga mahsulot qo‘sha olmaysiz: «Telefonlar» kategoriyasi hozir nofaol.
Avval uni faollashtiring: PATCH /api/categories/1/status  { "isActive": true }
```

**5. Nofaol kategoriyadagi mahsulotni faollashtirib bo‘lmaydi**
```
PATCH /api/products/1/status  { "isActive": true }   ->  409
«iPhone 15 Pro» mahsulotini faollashtira olmaysiz, chunki uning «Telefonlar»
kategoriyasi nofaol. Avval kategoriyani faollashtiring.
```

**6. Bir xil nomli kategoriya bo‘lmaydi** (katta-kichik harf farqi hisobga olinmaydi)
```
POST /api/categories  { "name": "telefonlar" }   ->  409
«Telefonlar» nomli kategoriya allaqachon mavjud (ID = 1). Boshqa nom tanlang.
```

> **Qisqacha qoida:** faol mahsulot faqat faol kategoriyada tura oladi.

---

## PUT va PATCH farqi

| | PUT | PATCH |
|---|---|---|
| Nima yuboriladi | **Hamma** maydon | Faqat o‘zgartiriladigani |
| Yuborilmagan maydon | **Tozalanadi** (`null` / `0`) | O‘zgarmaydi |
| Qachon ishlatiladi | Hammasini qaytadan yozganda | Kundalik tahrirlashda |

```jsonc
// PATCH — faqat narxni o‘zgartirish, qolgani o‘z holicha qoladi
{ "price": 14500000 }

// PUT — hammasini yuborish shart, aks holda description va stock tozalanadi
{ "name": "iPhone 15 Pro", "price": 14500000, "stock": 10, "categoryId": 1 }
```

---

## Loyiha tuzilishi

```
src/
├── main.ts                  # dastur kirish nuqtasi, Swagger va global sozlamalar
├── app.module.ts            # asosiy modul, baza ulanishi
├── app.controller.ts        # GET /api — server ishlayaptimi
│
├── common/                  # umumiy, qayta ishlatiladigan qismlar
│   ├── decorators/          # @Public, @ResponseMessage, @CurrentAdmin
│   ├── dto/                 # sahifalash, status, natija DTO'lari
│   ├── filters/             # barcha xatoliklarni bir xil ko'rinishga keltiradi
│   ├── interceptors/        # barcha javoblarni bir xil ko'rinishga keltiradi
│   ├── pipes/               # :id ni songa aylantirish
│   ├── swagger/             # Swagger uchun yordamchi dekoratorlar
│   └── transformers/        # boolean va numeric o'girish
│
├── auth/                    # login, token, parol
├── categories/              # kategoriyalar
├── products/                # mahsulotlar
├── dashboard/               # statistika
└── database/                # birinchi admin va namuna ma'lumotlar
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
| `DB_HOST` / `DB_PORT` | Baza manzili | `localhost` / `5432` |
| `DB_USERNAME` / `DB_PASSWORD` | Baza foydalanuvchisi | `postgres` |
| `DB_NAME` | Baza nomi | `eshop_admin` |
| `DB_SYNCHRONIZE` | Jadvallarni avtomatik yaratish | `true` |
| `JWT_SECRET` | Token maxfiy kaliti — **productionda albatta o‘zgartiring** | — |
| `JWT_EXPIRES_IN` | Token muddati | `7d` |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | Default admin | `admin` / `admin123` |
| `SEED_DEMO_DATA` | Namuna ma‘lumot qo‘shish | `true` |

---

## Serverga qo‘yish (deploy)

```bash
git clone <repo>
cd e-shop
npm install
cp .env.example .env      # va .env ni to'ldiring
npm run build
```

**Production `.env` uchun majburiy o‘zgarishlar:**
```env
NODE_ENV=production
JWT_SECRET=<uzun va tasodifiy matn>
ADMIN_PASSWORD=<kuchli parol>
SEED_DEMO_DATA=false
```

**PM2 bilan doimiy ishlatish:**
```bash
npm install -g pm2
pm2 start dist/main.js --name e-shop-backend
pm2 save
pm2 startup
```

**Nginx (domen ulash):**
```nginx
location /api/ { proxy_pass http://127.0.0.1:3000; }
location /docs { proxy_pass http://127.0.0.1:3000; }
```

---

## Foydali buyruqlar

```bash
npm run dev          # ishlab chiqish rejimi
npm run build        # production build
npm run start:prod   # build'ni ishga tushirish
npm run format       # kodni chiroyli formatlash
```
