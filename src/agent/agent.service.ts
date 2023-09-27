import { Injectable } from '@nestjs/common';
import { Agent } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AgentService {
  constructor(@InjectRepository(Agent) private agentRepo: Repository<Agent>) {}

  async getSessions(id: string) {
    const user = await this.agentRepo.findOne({
      where: {
        id,
      },
      relations: {
        sessions: true,
      },
    });

    return user.sessions;
  }
}
