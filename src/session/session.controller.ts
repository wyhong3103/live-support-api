import { Controller, Post, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport/dist';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id')
  getMessages(@Param('id') id: string) {
    return this.sessionService.getMessages(id);
  }
}
