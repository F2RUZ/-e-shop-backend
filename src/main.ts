import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { join } from 'path';
import { AppModule } from './app.module';
// CHAT VAQTINCHA O'CHIRILGAN (2026-08-22) — app.module.ts ga ham qarang.
// import { CHAT_GUIDE, CHAT_TAG } from './chat/chat.docs';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { UPLOAD_ROOT, UPLOAD_URL_PREFIX } from './pickup-points/upload.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('E-Shop');

  // Avtomobillar rasmlari: public/images/cars/... -> /images/cars/...
  app.useStaticAssets(join(process.cwd(), 'public'), {
    maxAge: '7d', // brauzer rasmlarni 7 kun kesh qiladi
  });

  // Yuklangan salon videolari: uploads/pickup-points/... -> /uploads/pickup-points/...
  // Token talab qilinmaydi: <video src="..."> tegi Authorization sarlavhasini
  // yubora olmaydi. Rasmlar ham xuddi shunday ochiq.
  app.useStaticAssets(UPLOAD_ROOT, {
    prefix: UPLOAD_URL_PREFIX,
    maxAge: '7d',
  });

  // Barcha manzillar /api bilan boshlanadi: /api/auth/login, /api/products ...
  app.setGlobalPrefix('api');

  // CORS to'liq ochiq — istalgan frontend (localhost, Vercel, Netlify...) ulana oladi
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  // ── Kiruvchi ma'lumotlarni tekshirish ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da yo'q maydonlar tashlab yuboriladi
      forbidNonWhitelisted: true, // ...va bu haqda ogohlantiriladi
      transform: true, // kelgan ma'lumot DTO klassiga aylantiriladi
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: 'Yuborilgan ma‘lumotlar noto‘g‘ri.',
          errors: collectMessages(errors),
        }),
    }),
  );

  // ── Javoblarni bir xil ko'rinishga keltirish ───────────────────────────
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger hujjatlari ────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Shop — Admin panel API')
    .setDescription(
      `Avtosalon uchun **admin panel** backendi. Bazada 100 ta real avtomobil bor.

### Qanday boshlash kerak

1. Pastdagi **POST /api/auth/login** ni oching
2. "Try it out" → \`{ "login": "admin", "password": "admin123" }\` → **Execute**
3. Javobdagi \`accessToken\` ni nusxalang
4. Yuqoridagi **Authorize** tugmasini bosib tokenni qo'ying
5. Endi barcha endpointlar ishlaydi

### Javoblar ko'rinishi

Muvaffaqiyatli: \`{ "success": true, "message": "...", "data": {...} }\`

Xatolik: \`{ "success": false, "statusCode": 409, "message": "sababi aniq yozilgan", "path": "..." }\`

### Muhim qoidalar

- Avtomobili bor kategoriyani **o'chirib bo'lmaydi**
- Kategoriya nofaol qilinsa — **undagi avtomobillar ham** nofaol bo'ladi
- Nofaol kategoriyaga avtomobil qo'shib ham, undagi avtomobilni faollashtirib ham bo'lmaydi
- Faol/nofaol qilish faqat \`/status\` endpointlari orqali bajariladi
- Avtomobili bor **salonni** ham o'chirib bo'lmaydi — lekin salon yopilsa avtomobillar sotuvda qoladi`,
    )
    .setVersion('1.0.0')
    // .addTag(CHAT_TAG, CHAT_GUIDE)   <- vaqtincha o'chirilgan
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Login qilib olingan accessToken ni shu yerga qo‘ying (Bearer so‘zisiz).',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // sahifa yangilansa ham token saqlanib qoladi
      docExpansion: 'list', // barcha modullar ochiq holda ko'rinadi
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      defaultModelsExpandDepth: 0,
    },
    customSiteTitle: 'E-Shop Admin API',
  });

  const port = Number(config.get<string>('PORT', '3000'));
  await app.listen(port, '0.0.0.0');

  logger.log(`Server ishga tushdi  ->  http://localhost:${port}/api`);
  logger.log(`Swagger hujjatlari   ->  http://localhost:${port}/docs`);
  // logger.log(`Chat (mijoz sahifasi)->  http://localhost:${port}/chat.html`);
  // logger.log(`Chat WebSocket       ->  ws://localhost:${port}/chat`);
}

/** Validatsiya xatoliklarini oddiy matnlar ro'yxatiga aylantiradi. */
function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const own = Object.entries(error.constraints ?? {}).map(([rule, text]) =>
      rule === 'whitelistValidation'
        ? `«${error.property}» degan maydon qo‘llab-quvvatlanmaydi — uni olib tashlang.`
        : text,
    );

    const nested = error.children?.length ? collectMessages(error.children) : [];

    return [...own, ...nested];
  });
}

bootstrap();
