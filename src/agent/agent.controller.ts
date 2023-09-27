import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport/dist';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('sessions')
  sessions(@Req() req: Request) {
    const user: any = req.user;
    return this.agentService.getSessions(user.id);
  }
}
