import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CHAT_TAG } from './chat.docs';
import { CHAT_EVENTS, WS_EVENT_DOCS } from './chat.events';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/start-chat.dto';

/**
 * Chatning HTTP qismi.
 *
 * Yozishuvning o'zi WebSocket orqali ketadi (ChatGateway), lekin ba'zi
 * ishlarni oddiy HTTP bilan qilgan qulayroq:
 *
 *   - suhbat ochish        -> POST /api/chat/start
 *   - suhbatlar ro'yxati   -> GET  /api/chat/chats
 *   - yozishmalar tarixi   -> GET  /api/chat/chats/{id}/messages
 *   - suhbatni o'chirish   -> DELETE /api/chat/chats/{id}
 *   - WS hodisalari hujjati-> GET  /api/chat/events
 */
@ApiTags(CHAT_TAG)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════ Hujjat ══════════════════════════════════

  @Public()
  @Get('events')
  @ResponseMessage('WebSocket hodisalari ro‘yxati')
  @ApiOperation({
    summary: '⭐ WebSocket hodisalari ro‘yxati (chatning «hujjati»)',
    description: `Swagger WebSocket hodisalarini o'zi ko'rsata olmaydi — u faqat HTTP haqida biladi.

Shuning uchun barcha hodisalarni shu endpoint qaytaradi: nomi, yo'nalishi, ichidagi
ma'lumot namunasi va nima ish qilishi.

**Token kerak emas** — istalgan payt ochib ko'rishingiz mumkin.

Javob ichida:

- \`namespace\` — qayerga ulanish kerak
- \`client\` — socket.io kutubxonasining manzili (backendning o'zidan)
- \`events\` — hodisalar ro'yxati

Ulanish namunasi javobning \`example\` maydonida ham bor.`,
  })
  events() {
    const appUrl = this.configService
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    return {
      namespace: `${appUrl}/chat`,
      client: `${appUrl}/socket.io/socket.io.js`,
      demoPage: `${appUrl}/chat.html`,
      example: {
        guest: `const socket = io('${appUrl}/chat');`,
        admin: `const socket = io('${appUrl}/chat', { auth: { token: '<accessToken>' } });`,
        firstStep: `socket.on('${CHAT_EVENTS.READY}', () => socket.emit('${CHAT_EVENTS.JOIN}', { chatId: 1, guestKey: '...' }));`,
      },
      events: WS_EVENT_DOCS,
    };
  }

  // ═══════════════════════════ Mijoz ═══════════════════════════════════

  @Public()
  @Post('start')
  @ResponseMessage('Suhbat tayyor')
  @ApiOperation({
    summary: 'Suhbatni boshlash (mijoz uchun, token kerak emas)',
    description: `Mijoz ismini yuboradi va suhbat oladi. WebSocket'ga ulanishdan **oldin** shu chaqiriladi,
chunki \`chat:join\` uchun \`chatId\` va \`guestKey\` kerak.

**Birinchi marta** — faqat ism yuboriladi:

\`\`\`json
{ "name": "Aziz" }
\`\`\`

Javobda \`id\` va \`guestKey\` keladi. \`guestKey\` — mijozning maxfiy kaliti,
uni brauzerda saqlang:

\`\`\`js
localStorage.setItem('chat-key', data.guestKey);
\`\`\`

**Keyingi safar** — saqlangan kalit ham yuboriladi:

\`\`\`json
{ "name": "Aziz", "guestKey": "6f1c9c1e-..." }
\`\`\`

Shunda yangi suhbat ochilmaydi — eskisi yozishmalari bilan qaytadi.

**Nega kalit kerak?** Usiz istalgan odam \`chatId\` ni 1, 2, 3 deb terib
boshqalarning yozishmasini o'qib olardi. WebSocket'da \`chat:join\` aynan shu
kalitni tekshiradi.`,
  })
  start(@Body() dto: StartChatDto) {
    return this.chatService.start(dto);
  }

  // ═══════════════════════════ Admin ═══════════════════════════════════

  @ApiBearerAuth()
  @Get('chats')
  @ResponseMessage('Suhbatlar ro‘yxati')
  @ApiOperation({
    summary: 'Barcha suhbatlar (admin uchun)',
    description: `Suhbatlarni eng oxirgi yozilgani birinchi bo'lib qaytaradi.

Har birida:

- \`guestName\` — mijozning ismi
- \`lastMessage\` / \`lastMessageAt\` — oxirgi xabar va vaqti
- \`unreadForAdmin\` — admin hali o'qimagan xabarlar soni

**Eslatma:** admin panel bu endpointni faqat **birinchi ochilishda** chaqiradi.
Keyin ro'yxat WebSocket orqali o'zi yangilanib turadi — \`chat:chats\` hodisasi.
Ya'ni sahifani yangilash yoki har soniyada so'rov yuborish kerak emas.`,
  })
  chats() {
    return this.chatService.findAll();
  }

  @ApiBearerAuth()
  @Get('chats/:id/messages')
  @ResponseMessage('Suhbat yozishmalari')
  @ApiOperation({
    summary: 'Bitta suhbatning yozishmalari (admin uchun)',
    description: `Oxirgi 100 ta xabarni eskisidan yangisiga qarab qaytaradi.

Aynan shu ma'lumotni WebSocket ham beradi — \`chat:join\` javobiga keladigan
\`chat:history\` hodisasi. Ikkalasi bir xil, xohlaganini ishlatasiz:

- **REST** — sahifani ochishda bir marta yuklab olish uchun qulay
- **WebSocket** — ulanish bilan birga kelgani uchun qulay`,
  })
  @ApiParam({ name: 'id', description: 'Suhbat ID raqami', example: 1 })
  messages(@Param('id', ParseIdPipe) id: number) {
    return this.chatService.history(id);
  }

  @ApiBearerAuth()
  @Delete('chats/:id')
  @ApiOperation({
    summary: 'Suhbatni o‘chirish (admin uchun)',
    description: `Suhbatni va uning **barcha xabarlarini** o'chiradi. Bu amalni qaytarib bo'lmaydi.

Kategoriyadan farqi bor:

- Kategoriyada \`onDelete: 'RESTRICT'\` — avtomobili bori o'chirilmaydi
- Bu yerda \`onDelete: 'CASCADE'\` — suhbat bilan xabarlari ham ketadi

O'chirilgach barcha adminlarga \`chat:chats\` hodisasi yuboriladi — ro'yxat
o'zi yangilanadi.`,
  })
  @ApiParam({ name: 'id', description: 'Suhbat ID raqami', example: 1 })
  async remove(@Param('id', ParseIdPipe) id: number) {
    const result = await this.chatService.remove(id);

    // Gateway'ni controllerga ham inject qilsa bo'ladi — u oddiy provider.
    // Shu yo'l bilan HTTP orqali qilingan o'zgarish WebSocket'ga ham yetadi.
    await this.chatGateway.broadcastChats();

    return result;
  }
}
