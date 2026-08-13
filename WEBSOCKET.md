# WEBSOCKET — jonli chat, noldan oxirigacha

> Bu fayl chatni **noldan yozib chiqish** uchun. Har bir qadam kodi bilan.
> O'qib chiqib, o'zingiz ham xuddi shunday yoza olasiz.
>
> Qisqartirilgan varianti Swagger'da ham bor: **/docs** → «5. Chat» bo'limi.

---

## Mundarija

- [1. WebSocket nima va nega kerak](#1-websocket-nima-va-nega-kerak)
- [2. Loyihaga nima qo'shildi](#2-loyihaga-nima-qoshildi)
- [3. Ma'lumot modeli](#3-malumot-modeli)
- [4. Backend — qadamma-qadam](#4-backend--qadamma-qadam)
- [5. Hodisalar ma'lumotnomasi](#5-hodisalar-malumotnomasi)
- [6. Mijoz sahifasi (sof JavaScript)](#6-mijoz-sahifasi-sof-javascript)
- [7. Admin panel (React)](#7-admin-panel-react)
- [8. Sinash](#8-sinash)
- [9. Serverga chiqarish](#9-serverga-chiqarish)
- [10. Topshiriqlar](#10-topshiriqlar)

---

## 1. WebSocket nima va nega kerak

REST'ni bilasiz: so'rov yuborasiz — javob keladi — ulanish uziladi.

```
mijoz  ──── GET /api/products ────►  server
mijoz  ◄──── [100 ta avtomobil] ───  server
       (ulanish uzildi)
```

Chatda bu ishlamaydi. Admin javob yozganda **server o'zi** mijozga xabar
berishi kerak. REST'da server mijozga o'zi murojaat qila olmaydi.

WebSocket esa ulanishni **ochiq** qoldiradi:

```
mijoz  ══════ ulanish ochiq ══════  server
mijoz  ──── chat:message ────────►  server
mijoz  ◄──── chat:message ────────  server   (admin javobi — biz so'ramadik!)
mijoz  ◄──── chat:typing ─────────  server
```

| | REST | WebSocket |
|---|---|---|
| Ulanish | har safar yangi | bir marta, ochiq turadi |
| Kim boshlaydi | doim mijoz | ikkala taraf |
| Manzil | `/api/products` | manzil yo'q — **hodisa nomi**: `chat:message` |
| Swagger | ko'rsatadi | ko'rsata olmaydi |

### Nega Swagger ko'rsata olmaydi?

Swagger — **OpenAPI** standartining ko'rinishi. OpenAPI esa faqat HTTP'ni
tavsiflaydi: metod, manzil, status kod. WebSocket'da bularning hech biri yo'q.

Shuning uchun biz hodisalarni **qo'lda** hujjatlashtirdik:

- `GET /api/chat/events` — hodisalar ro'yxati JSON ko'rinishida
- Swagger'dagi «5. Chat» tegining tavsifi — to'liq qo'llanma
- shu fayl

> **Eslatma:** WebSocket uchun ham standart bor — **AsyncAPI**. Lekin u alohida
> vosita talab qiladi. O'quv loyihasi uchun yuqoridagi uch usul yetarli.

---

## 2. Loyihaga nima qo'shildi

### Paketlar

```bash
# backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# admin panel
cd admin && npm install socket.io-client
```

> **socket.io** — bu WebSocket ustidagi qulay qobiq. U o'zi qayta ulanadi,
> «xona» (room) tushunchasini beradi va hodisalarga nom qo'yish imkonini
> beradi. Sof WebSocket bilan bularning hammasini qo'lda yozish kerak bo'lardi.

### Fayllar

```
src/chat/
├── chat.events.ts            ⭐ hodisa nomlari — YAGONA MANBA
├── chat.docs.ts                 Swagger uchun qo'llanma matni
├── chat.gateway.ts           ⭐ WebSocket qismi
├── chat.controller.ts           HTTP qismi (5 ta endpoint)
├── chat.service.ts              baza bilan ishlash
├── chat.module.ts
├── dto/start-chat.dto.ts
└── entities/
    ├── chat.entity.ts           suhbat
    └── message.entity.ts        xabar

public/chat.html              ⭐ mijoz sahifasi (bitta fayl, build kerak emas)

admin/src/
├── api/socket.ts                ulanish + hodisa nomlari
└── pages/ChatPage.tsx        ⭐ admin tomoni
```

---

## 3. Ma'lumot modeli

Ikkita jadval. Bu Category ↔ Product bog'lanishining aynan o'zi.

```
chats (suhbat)                    messages (xabar)
├── id                            ├── id
├── guestKey   ⭐ mijozning kaliti ├── chatId  ──► chats.id
├── guestName                     ├── sender  'guest' | 'admin'
├── lastMessage                   ├── text
├── lastMessageAt                 └── createdAt
└── unreadForAdmin
```

### `guestKey` nima uchun kerak?

Mijoz ro'yxatdan o'tmaydi, paroli yo'q. Unda uni qanday tanib olamiz?

```
1. Mijoz ismini yozadi     -> POST /api/chat/start
2. Server tasodifiy kalit qaytaradi (randomUUID)
3. Brauzer uni localStorage'da saqlaydi
4. Keyingi safar o'sha kalit yuboriladi -> eski suhbat qaytadi
```

Kalit **parol o'rnida**. Usiz istalgan odam `chatId` ni `1, 2, 3` deb terib
boshqalarning yozishmasini o'qib olardi.

### `onDelete` farqi — diqqat qiling

```ts
// Product -> Category
@ManyToOne(() => Category, ..., { onDelete: 'RESTRICT' })
// avtomobili bor kategoriyani O'CHIRIB BO'LMAYDI

// Message -> Chat
@ManyToOne(() => Chat, ..., { onDelete: 'CASCADE' })
// suhbat o'chsa — xabarlari ham BIRGA o'chadi
```

Sabab: kategoriyadagi avtomobil o'z-o'zicha qimmatli, xabar esa suhbatsiz
ma'nosiz.

---

## 4. Backend — qadamma-qadam

### 4.1 Hodisa nomlarini bir joyga yozamiz

Eng birinchi qadam — nomlarni **bitta faylga**. Backend, admin panel va
mijoz sahifasi shu nomlarni ishlatadi.

```ts
// src/chat/chat.events.ts
export const CHAT_EVENTS = {
  // biz qabul qilamiz
  JOIN: 'chat:join',
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  READ: 'chat:read',
  // biz yuboramiz
  READY: 'chat:ready',
  HISTORY: 'chat:history',
  CHATS: 'chat:chats',
  ERROR: 'chat:error',
} as const;

/** Bitta suhbatning «xonasi» */
export const chatRoom = (chatId: number) => `chat:${chatId}`;

/** Barcha adminlar shu xonada turadi */
export const ADMIN_ROOM = 'admins';
```

**Xona (room)** — socket.io ning eng foydali tushunchasi. Xonaga xabar
yuborsangiz, o'sha xonadagi hamma oladi:

```
xona "chat:1"   ->  [mijoz Aziz, admin]
xona "chat:2"   ->  [mijoz Bek]
xona "admins"   ->  [admin]
```

### 4.2 Gateway skeleti

```ts
// src/chat/chat.gateway.ts
@Public()                        // ⬅️ pastda tushuntiriladi
@WebSocketGateway({
  namespace: '/chat',            // ulanish manzili: ws://localhost:3000/chat
  cors: { origin: '*' },         // admin panel boshqa domenda
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}
}
```

`@Controller` → `@WebSocketGateway`, `@Get` → `@SubscribeMessage`. Qolgani
NestJS'ning odatiy tartibi: DI, servis, modul.

### 4.3 ⚠️ Nega `@Public()` kerak?

Loyihada global guard bor:

```ts
// app.module.ts
providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }]
```

Global guard **gateway handlerlariga ham** qo'llanadi. Lekin passport tokenni
`Authorization` sarlavhasidan qidiradi — WebSocket'da esa bunday sarlavha yo'q.
Natijada barcha hodisalar bloklanib qolardi.

Shuning uchun gateway'ni `@Public()` qilamiz va tokenni **o'zimiz** tekshiramiz:

```ts
handleConnection(socket: Socket): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    socket.data.role = 'guest';              // token yo'q -> mehmon
    socket.emit(CHAT_EVENTS.READY, { role: 'guest' });
    return;
  }

  try {
    this.jwtService.verify(token);           // token bor -> tekshiramiz
  } catch {
    socket.emit(CHAT_EVENTS.ERROR, { message: 'Token noto‘g‘ri yoki muddati tugagan...' });
    socket.disconnect();
    return;
  }

  socket.data.role = 'admin';
  void socket.join(ADMIN_ROOM);              // adminlar xonasiga
  socket.emit(CHAT_EVENTS.READY, { role: 'admin' });
}
```

`socket.data` — shu ulanish haqida eslab qolinadigan joy. Biz u yerda ikki
narsani saqlaymiz: `role` va hozir ochiq turgan `chatId`.

`JwtService` ni olish uchun `AuthModule` unga yo'l ochib berdi:

```ts
// auth.module.ts
exports: [TypeOrmModule, JwtModule]     // ⬅️ JwtModule qo'shildi

// chat.module.ts
imports: [TypeOrmModule.forFeature([Chat, Message]), AuthModule]
```

### 4.4 `chat:join` — suhbatga qo'shilish

```ts
@SubscribeMessage(CHAT_EVENTS.JOIN)
async onJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinPayload) {
  try {
    const chat = await this.resolveChat(socket, body);   // huquqni tekshiradi
    const previousChatId = socket.data.chatId;

    // Admin boshqa suhbatga o'tsa — eskisidan CHIQADI,
    // aks holda u yerdagi xabarlarni ham olaveradi
    if (previousChatId && previousChatId !== chat.id) {
      void socket.leave(chatRoom(previousChatId));
    }

    void socket.join(chatRoom(chat.id));
    socket.data.chatId = chat.id;

    socket.emit(CHAT_EVENTS.HISTORY, {
      chatId: chat.id,
      messages: await this.chatService.history(chat.id),
    });

    if (socket.data.role === 'admin') await this.chatService.markReadByAdmin(chat.id);
    await this.broadcastChats();
  } catch (error) {
    this.fail(socket, error);
  }
}
```

Huquq tekshiruvi — eng muhim qism:

```ts
private async resolveChat(socket: Socket, body: JoinPayload): Promise<Chat> {
  const chatId = Number(body?.chatId);

  if (!Number.isInteger(chatId) || chatId < 1) {
    throw new Error('chatId butun son bo‘lishi kerak. Uni POST /api/chat/start javobidan olasiz.');
  }

  const chat = await this.chatService.findOneOrFail(chatId);

  // Mijoz faqat O'Z suhbatiga kira oladi
  if (socket.data.role === 'guest' && chat.guestKey !== body?.guestKey) {
    throw new Error('Bu suhbat sizniki emas. POST /api/chat/start orqali o‘z suhbatingizni oching...');
  }

  return chat;
}
```

### 4.5 `chat:message` — xabar yuborish

```ts
@SubscribeMessage(CHAT_EVENTS.MESSAGE)
async onMessage(@ConnectedSocket() socket: Socket, @MessageBody() body: MessagePayload) {
  try {
    const chatId = this.ensureJoined(socket, body?.chatId);
    const text = String(body?.text ?? '').trim();

    if (!text) throw new Error('Xabar bo‘sh bo‘lishi mumkin emas — avval matn yozing.');
    if (text.length > 1000) throw new Error(`Xabar juda uzun (${text.length} ta belgi)...`);

    const message = await this.chatService.addMessage(chatId, socket.data.role, text);

    // ⭐ server.to(...) — xonadagi HAMMAGA, yuboruvchining O'ZIGA HAM
    this.server.to(chatRoom(chatId)).emit(CHAT_EVENTS.MESSAGE, message);

    await this.broadcastChats();
  } catch (error) {
    this.fail(socket, error);
  }
}
```

### ⭐ `server.to` va `socket.to` farqi — buni yodda tuting

```ts
this.server.to(room).emit(...)   // xonadagi HAMMAGA, yuboruvchi ham
socket.to(room).emit(...)        // yuboruvchidan BOSHQA hammaga
```

- **Xabar** — `server.to`: yuboruvchi o'z xabarini ekranda ko'rishi kerak
- **«yozmoqda…»** — `socket.to`: o'zining yozayotganini ko'rish kulgili

Shu tanlov tufayli frontendda xabarni qo'lda qo'shish shart emas:

```js
socket.emit('chat:message', { chatId, text });   // yuborildi
socket.on('chat:message', showMessage);          // qaytib keldi -> chizildi
```

### 4.6 Xatolikni qanday qaytaramiz

Gateway ichida **hech qachon `throw` qilmaymiz**. Sabab: loyihadagi global
`AllExceptionsFilter` HTTP javobi uchun yozilgan (`response.status(...).json(...)`),
WebSocket'da esa `response` degan narsa yo'q.

Shuning uchun har bir handler `try/catch` ichida, xato esa hodisa bo'lib qaytadi:

```ts
private fail(socket: Socket, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi.';
  this.logger.warn(message);
  socket.emit(CHAT_EVENTS.ERROR, { message });   // faqat xato qilgan odamga
}
```

### 4.7 Nega WS payloadlari `class` emas, `interface`?

Loyihada global `ValidationPipe` bor:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, ... })
```

Agar payloadni `class` qilsak, pipe uni tekshirishga urinadi va xato
`BadRequestException` bo'lib chiqadi — u esa yana HTTP filtriga boradi.

`interface` bo'lsa TypeScript'dan keyin hech narsa qolmaydi, pipe uni
o'tkazib yuboradi va biz tekshiruvni o'zimiz, aniq o'zbekcha matn bilan
qilamiz. O'quv loyihasi uchun bu ancha tushunarli.

---

## 5. Hodisalar ma'lumotnomasi

### Siz yuborasiz (`socket.emit`)

#### `chat:join`
```js
socket.emit('chat:join', { chatId: 1, guestKey: '6f1c...' });
```
| Maydon | Kim uchun | Izoh |
|---|---|---|
| `chatId` | ikkalasi | `POST /api/chat/start` javobidan |
| `guestKey` | faqat mijoz | adminga kerak emas |

**Javobi:** `chat:history`
**Xatolari:** «chatId butun son bo'lishi kerak», «Bu suhbat sizniki emas», «suhbat topilmadi»

#### `chat:message`
```js
socket.emit('chat:message', { chatId: 1, text: 'Salom!' });
```
**Javobi:** xonadagi hammaga `chat:message`
**Xatolari:** «Avval suhbatga qo'shiling», «Xabar bo'sh», «Xabar juda uzun»

#### `chat:typing`
```js
socket.emit('chat:typing', { chatId: 1, isTyping: true });
```
Bazaga yozilmaydi. Qarshi tarafga `chat:typing` bo'lib boradi.

#### `chat:read`
```js
socket.emit('chat:read', { chatId: 1 });
```
Faqat admin uchun — `unreadForAdmin` ni 0 qiladi.

### Sizga keladi (`socket.on`)

| Hodisa | Ichida | Qachon |
|---|---|---|
| `chat:ready` | `{ role: 'guest' \| 'admin' }` | ulanish tayyor bo'lganda |
| `chat:history` | `{ chatId, messages[] }` | `chat:join` javobiga |
| `chat:message` | `{ id, chatId, sender, text, createdAt }` | yangi xabar |
| `chat:typing` | `{ chatId, from, isTyping }` | qarshi taraf yozmoqda |
| `chat:chats` | `{ chats[] }` | ro'yxat o'zgardi (faqat admin) |
| `chat:error` | `{ message }` | xatolik |

### HTTP endpointlari

| Metod | Manzil | Token | Vazifasi |
|---|---|---|---|
| GET | `/api/chat/events` | ✖️ | hodisalar hujjati |
| POST | `/api/chat/start` | ✖️ | suhbat ochish |
| GET | `/api/chat/chats` | ✔️ | suhbatlar ro'yxati |
| GET | `/api/chat/chats/{id}/messages` | ✔️ | yozishmalar |
| DELETE | `/api/chat/chats/{id}` | ✔️ | suhbatni o'chirish |

---

## 6. Mijoz sahifasi (sof JavaScript)

To'liq ishlaydigan kod: **`public/chat.html`**. Bitta fayl, build kerak emas,
backend uni o'zi tarqatadi: `http://localhost:3000/chat.html`

Kutubxonani ham backend beradi:

```html
<script src="/socket.io/socket.io.js"></script>
```

### To'liq oqim

```js
const API_URL = location.origin + '/api';
const WS_URL  = location.origin + '/chat';

// ── 1-QADAM. Suhbat ochish (HTTP) ──────────────────────────────
async function startChat(name) {
  const res = await fetch(API_URL + '/chat/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      guestKey: localStorage.getItem('chat-key') || undefined,
    }),
  });

  const body = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

const chat = await startChat('Aziz');
localStorage.setItem('chat-key', chat.guestKey);      // ⚠️ SHART

// ── 2-QADAM. Ulanish ────────────────────────────────────────────
const socket = io(WS_URL);

// ── 3-QADAM. Qo'shilish ─────────────────────────────────────────
socket.on('chat:ready', () => {
  socket.emit('chat:join', { chatId: chat.id, guestKey: chat.guestKey });
});

socket.on('chat:history', (p) => {
  messagesEl.innerHTML = '';
  p.messages.forEach(showMessage);
});

// ── 4-QADAM. Yozish va o'qish ───────────────────────────────────
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  socket.emit('chat:message', { chatId: chat.id, text: textInput.value.trim() });
  textInput.value = '';
});

socket.on('chat:message', showMessage);
socket.on('chat:typing', (p) => typingEl.textContent = p.isTyping ? 'operator yozmoqda…' : '');
socket.on('chat:error',  (p) => alert(p.message));
```

### Xabarni chizish — XSS haqida

```js
function showMessage(m) {
  const el = document.createElement('div');
  el.className = m.sender === 'guest' ? 'msg mine' : 'msg';

  el.textContent = m.text;   // ✅
  // el.innerHTML = m.text;  // ❌ kimdir <script> yozsa — u ishlab ketadi

  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
```

### «yozmoqda…» — har harfda emas

```js
let typingTimer = null;
let typingSent = false;

function sendTyping(isTyping) {
  if (typingSent === isTyping) return;      // holat o'zgarmagan — yubormaymiz
  typingSent = isTyping;
  socket.emit('chat:typing', { chatId: chat.id, isTyping });
}

textInput.addEventListener('input', () => {
  sendTyping(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => sendTyping(false), 1500);
});
```

---

## 7. Admin panel (React)

To'liq kod: **`admin/src/pages/ChatPage.tsx`**

Farqi bitta — **token**:

```ts
// admin/src/api/socket.ts
export function createChatSocket(): Socket {
  return io(WS_URL, {
    auth: { token: localStorage.getItem(TOKEN_KEY) },
  });
}
```

### ⚠️ React'dagi 3 ta tuzoq

#### 1. Ulanish har renderda takrorlanadi

```tsx
useEffect(() => {
  const socket = createChatSocket();
  socketRef.current = socket;

  socket.on('chat:history', (p) => setMessages(p.messages));
  socket.on('chat:message', (m) => setMessages((list) => [...list, m]));

  // ⚠️ Busiz: har renderda yangi ulanish, xabar 2-3 marta ko'rinadi
  return () => socket.close();
}, []);
```

#### 2. `socket.on` ichida state ESKI qiymatda qotib qoladi

`socket.on(...)` bir marta yoziladi. Uning ichidagi o'zgaruvchilar o'sha
paytdagi qiymatda qoladi — buni **stale closure** deyishadi.

```tsx
const [activeId, setActiveId] = useState<number | null>(null);
const activeIdRef = useRef<number | null>(null);     // ⬅️ ikkinchi nusxa

const openChat = (id: number) => {
  activeIdRef.current = id;    // hodisa ichida o'qish uchun
  setActiveId(id);             // ekranga chizish uchun
  socketRef.current?.emit('chat:join', { chatId: id });
};

socket.on('chat:message', (m) => {
  if (m.chatId !== activeIdRef.current) return;      // ✅ doim yangi qiymat
  setMessages((list) => [...list, m]);
});
```

#### 3. State'ni joyida o'zgartirish

```tsx
setMessages((list) => [...list, m]);    // ✅ yangi massiv
// list.push(m); setMessages(list);     // ❌ React sezmaydi
```

### Bonus: react-query'ni WebSocket bilan yangilash

Ro'yxatni qayta so'ramasdan, kelgan ma'lumotni to'g'ridan-to'g'ri qo'yamiz:

```tsx
const chatsQuery = useQuery({ queryKey: ['chat','chats'], queryFn: () => chatApi.list() });

socket.on('chat:chats', (p) => qc.setQueryData(['chat','chats'], p.chats));
```

Ya'ni: **birinchi yuklash — REST, keyingi yangilanishlar — WebSocket.**

---

## 8. Sinash

### Ikki oyna bilan (eng oson)

```bash
npm run dev                 # backend
cd admin && npm run dev     # admin panel
```

1. Brauzerda `http://localhost:3000/chat.html` — mijoz
2. Yonida `http://localhost:5173` → «Chat» — admin
3. Yozing

### Terminaldan

```bash
# socket.io kutubxonasi backenddan berilyaptimi?
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/socket.io/socket.io.js

# suhbat ochish
curl -s -X POST http://localhost:3000/api/chat/start \
  -H 'Content-Type: application/json' -d '{"name":"Aziz"}'

# hodisalar hujjati
curl -s http://localhost:3000/api/chat/events
```

### Brauzer konsolidan

`/chat.html` ni ochib, F12 → Console:

```js
socket.emit('chat:message', { chatId: 1, text: 'konsoldan' });
socket.emit('chat:message', { chatId: 1, text: '' });        // xato ko'ramiz
socket.emit('chat:join', { chatId: 999, guestKey: 'x' });    // xato ko'ramiz
```

---

## 9. Serverga chiqarish

Chat ishlashi uchun **nginx'ga ikki qator** qo'shish shart:

```nginx
location / {
    proxy_pass http://127.0.0.1:4200;
    proxy_http_version 1.1;

    proxy_set_header Upgrade    $http_upgrade;      # ⬅️ WebSocket uchun
    proxy_set_header Connection "upgrade";          # ⬅️ WebSocket uchun

    proxy_read_timeout 3600s;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Batafsil: **DEPLOYMENT.md → 8-bo'lim**.

Docker'da qo'shimcha port ochish **kerak emas** — WebSocket o'sha 3000-portdan
ketadi.

---

## 10. Topshiriqlar

Chat ishlagach shularni o'zingiz qo'shing. Hammasi mavjud hodisalar bilan hal bo'ladi.

**Oson:**
1. Yangi xabar kelganda tovush chiqarish
2. Aloqa uzilganda tepada qizil chiziq ko'rsatish
3. Xabar 1000 belgidan uzun bo'lsa, yuborishdan oldin o'zingiz ogohlantirish

**O'rta:**
4. Sahifa sarlavhasida o'qilmagan xabarlar sonini ko'rsatish: `(3) Avtosalon`
5. Xabarlarni kunlar bo'yicha ajratish: «Bugun», «Kecha»
6. Admin onlayn ekanini mijozga ko'rsatish (yangi hodisa qo'shing: `chat:presence`)

**Qiyin:**
7. Rasm yuborish (avval `POST /api/chat/upload`, keyin havolani xabar qilib)
8. Xabarni o'chirish (`chat:delete` hodisasi + huquq tekshiruvi)
9. Bir nechta admin bo'lganda «suhbatni men olaman» tugmasi

---

## Qisqacha xulosa

| Savol | Javob |
|---|---|
| Chat qayerga ulanadi? | `ws://localhost:3000/chat` |
| Kutubxona qayerdan? | `/socket.io/socket.io.js` — backendning o'zidan |
| Admin qanday tanaladi? | `io(url, { auth: { token } })` |
| Mijoz qanday tanaladi? | `guestKey` — `localStorage`da |
| Xabar kimga boradi? | `server.to(room)` — xonadagi hammaga |
| «yozmoqda» kimga? | `socket.to(room)` — o'zidan boshqaga |
| Xatolik qanday keladi? | `chat:error` hodisasi, matni o'zbekcha |
| Swagger'da ko'rinadimi? | Hodisalar yo'q, lekin qo'llanma bor: /docs → «5. Chat» |
