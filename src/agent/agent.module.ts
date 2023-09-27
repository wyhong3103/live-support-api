import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../models';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
