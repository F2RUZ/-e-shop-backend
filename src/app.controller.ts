import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { ResponseMessage } from './common/decorators/response-message.decorator';

@ApiTags('0. Boshlanish')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ResponseMessage('E-Shop Admin API ishlayapti')
  @ApiOperation({
    summary: 'Server ishlayaptimi? (health check)',
    description:
      'Token talab qilmaydi. Serverni tekshirish va hujjatlarga havolani olish uchun ishlatiladi.',
  })
  getRoot() {
    return {
      name: 'E-Shop Admin API',
      version: '1.0.0',
      docs: '/docs',
      modules: ['auth', 'admins', 'categories', 'products', 'dashboard', 'chat'],
      chat: { page: '/chat.html', websocket: '/chat', events: '/api/chat/events' },
      defaultAdmin: { login: 'admin', password: 'admin123' },
    };
  }

  @Public()
  @Get('health')
  @ApiExcludeEndpoint()
  getHealth() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
