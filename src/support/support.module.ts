import { Module } from '@nestjs/common';
import { SupportGateway } from './support.gateway';
import { SupportService } from './support.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent, Message, Session } from '../models';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Message, Session])],
  providers: [SupportGateway, SupportService],
})
export class SupportModule {}
