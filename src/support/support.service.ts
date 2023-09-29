import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { Agent, Message, Session } from '../models';
import { EnqueueInput } from './dto';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupportService {
  private clientQueue: EnqueueInput[];

  constructor(
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    private config: ConfigService,
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

    await this.agentRepo.save(agent);
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

  async countActiveSupportAgents() {
    const agents = await this.agentRepo.find({
      where: {
        isActive: true,
        type: 'SPT',
      },
    });

    return agents.length;
  }

  // Session Handling
  generateRandomHex(length: number) {
    const bytes = crypto.randomBytes(length / 2);
    const hexString = bytes.toString('hex');
    return hexString;
  }

  async findLeastBurdenedAgent() {
    const agents = await this.agentRepo.find({
      where: {
        isActive: true,
        type: 'SPT',
      },
      relations: {
        sessions: true,
      },
    });

    const now = Math.floor(Date.now() / 1000);
    let mn = Infinity;
    const burden = [];
    for (const i of agents) {
      let cnt = 0;
      for (const j of i.sessions) {
        if (!j.endedEarly && now - j.lastUpdated < 5 * 60) {
          cnt += 1;
        }
      }
      burden.push(cnt);
      mn = Math.min(mn, cnt);
    }

    const leastBurdened = [];
    for (let i = 0; i < agents.length; i++) {
      if (burden[i] === mn) {
        leastBurdened.push(i);
      }
    }

    const selectedIndex = Math.floor(Math.random() * leastBurdened.length);

    return agents[selectedIndex];
  }

  async getAgentBot() {
    return await this.agentRepo.findOne({
      where: {
        id: this.config.get('BOT_ID'),
      },
    });
  }

  async assign(
    socketId: string,
    to: string,
    botUrl: string,
    botAuthToken: string,
  ) {
    const clientDetail: any = this.removeQueue(socketId);

    const roomId = this.generateRandomHex(32);
    const session = new Session();
    session.roomId = roomId;
    session.name = clientDetail.name;
    session.email = clientDetail.email;
    session.botUrl = botUrl;
    session.botAuthToken = botAuthToken;
    session.lastUpdated = Math.floor(Date.now() / 1000);

    if (to === 'AGT') {
      const agentSelected = await this.findLeastBurdenedAgent();
      session.agent = agentSelected;
    } else {
      const agentSelected = await this.getAgentBot();
      session.agent = agentSelected;
    }
    await this.sessionRepo.save(session);

    return {
      roomId,
      clientId: socketId,
      agentId: session.agent.socketId,
    };
  }

  async isBotSession(roomId: string) {
    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
      relations: {
        agent: true,
      },
    });

    if (session.agent.id === this.config.get('BOT_ID')) {
      return true;
    }
    return false;
  }

  async getBotResponse(text: string, roomId: string) {
    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
      relations: {
        agent: true,
      },
    });

    const { botUrl, botAuthToken } = session;

    return {
      roomId,
      author: 'AGT',
      message: 'This is bot replying.',
    };
  }

  async isSessionTimedOut(roomId: string) {
    const now = Math.floor(Date.now() / 1000);

    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
    });

    if (now - session.lastUpdated > 5 * 60) {
      return true;
    }
    return false;
  }

  async isSessionAlive(roomId: string) {
    const now = Math.floor(Date.now() / 1000);

    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
    });

    if (session.endedEarly || now - session.lastUpdated > 5 * 60) {
      return false;
    }
    return true;
  }

  async insertMessage(payload: any) {
    const now = Math.floor(Date.now() / 1000);

    const session = await this.sessionRepo.findOne({
      where: {
        roomId: payload.roomId,
      },
    });

    const message = new Message();
    message.author = payload.author;
    message.message = payload.text;
    message.session = session;
    await this.messageRepo.save(message);

    session.lastUpdated = now;
    await this.sessionRepo.save(session);
  }

  async isRoomAgent(agentSocketId: string, roomId: string) {
    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
      relations: {
        agent: true,
      },
    });

    return agentSocketId === session.agent.socketId;
  }

  async endChat(roomId: string) {
    const session = await this.sessionRepo.findOne({
      where: {
        roomId,
      },
      relations: {
        agent: true,
      },
    });

    session.endedEarly = true;

    await this.sessionRepo.save(session);
  }
}
