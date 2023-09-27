import { Injectable } from '@nestjs/common';
import { Session } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
  ) {}

  async getMessages(id: string) {
    const user = await this.sessionRepo.findOne({
      where: {
        id,
      },
      relations: {
        messages: true,
      },
    });

    return user.messages.map((i) => ({
      author: i.author,
      message: i.message,
      timestamp: i.createDateTime,
    }));
  }
}
