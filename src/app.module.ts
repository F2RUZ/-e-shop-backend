import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { Admin } from './auth/entities/admin.entity';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { ChatModule } from './chat/chat.module';
import { Chat } from './chat/entities/chat.entity';
import { Message } from './chat/entities/message.entity';
import { Category } from './categories/entities/category.entity';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { Product } from './products/entities/product.entity';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    // .env faylini butun loyiha bo'ylab ishlatish uchun
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL ulanishi
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD') || undefined,
        database: config.get<string>('DB_NAME', 'eshop_admin'),
        entities: [Admin, Category, Product, Chat, Message],
        // true bo'lsa TypeORM jadvallarni o'zi yaratadi/yangilaydi (o'rganish uchun qulay)
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: false,
      }),
    }),

    AuthModule,
    CategoriesModule,
    ProductsModule,
    DashboardModule,
    ChatModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [
    // BARCHA endpointlar token talab qiladi. Istisno — @Public() qo'yilganlari.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
