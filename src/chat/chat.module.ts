import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message]),
    // AuthModule JwtModule'ni eksport qiladi — ChatGateway'ga JwtService kerak,
    // chunki WebSocket ulanishida tokenni o'zimiz tekshiramiz (guard emas).
    AuthModule,
  ],
  controllers: [ChatController],
  // ChatGateway ham oddiy provider — uni controllerga inject qilsa bo'ladi
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
