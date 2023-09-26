import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { Agent, Message, Session } from '../models';
import { EnqueueInput } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class SupportService {
  private clientQueue: EnqueueInput[];

  constructor(
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
  ) {
    this.clientQueue = [];
  }

  // Queue operation
  async disconnect(socketId: string) {
    this.removeQueue(socketId);
    await this.supportAgentOff(socketId);
  }

  insertQueue(input: EnqueueInput) {
    this.clientQueue.push(input);
  }

  removeQueue(socketId: string) {
    let element = {};
    for (const i of this.clientQueue) {
      if (i.id === socketId) {
        element = { ...i };
      }
    }
    this.clientQueue = this.clientQueue.filter((i) => i.id !== socketId);
    return element;
  }

  getQueue() {
    return this.clientQueue;
  }

  // Agent On & Off
  async supportAgentOn(socketId: string, agentId: string) {
    const agent = await this.agentRepo.findOne({
      where: {
        id: agentId,
      },
    });

    agent.isActive = true;
    agent.socketId = socketId;

    this.agentRepo.save(agent);
  }

  async supportAgentOff(socketId: string) {
    const agent = await this.agentRepo.findOne({
      where: {
        socketId,
      },
    });

    if (!agent) return;

    agent.isActive = false;
    agent.socketId = '';

    await this.agentRepo.save(agent);
  }

  // Session Handling
  generateRandomHex(length: number) {
    const bytes = crypto.randomBytes(length / 2);
    const hexString = bytes.toString('hex');
    return hexString;
  }

  async findLeastBurdenedAgent() {
    return this.agentRepo.findOne({
      where: {
        id: '28aa08be-d834-4586-b64e-2efb6812046c',
      },
    });
  }

  async assign(socketId: string, to: string) {
    const clientDetail: any = this.removeQueue(socketId);

    const roomId = this.generateRandomHex(32);
    const session = new Session();
    session.roomId = roomId;
    session.name = clientDetail.name;
    session.email = clientDetail.email;

    if (to === 'AGT') {
      const agentSelected = await this.findLeastBurdenedAgent();
      session.agent = agentSelected;
    }
    await this.sessionRepo.save(session);

    return {
      roomId,
      clientId: socketId,
      agentId: session.agent.socketId,
    };
  }

  async insertMessage(payload) {
    // check if session alive
    // send
  }
}
