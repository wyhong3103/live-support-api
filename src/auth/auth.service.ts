import { ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon from 'argon2';
import { Agent } from '../models';
import { LoginDto, SignUpDto } from './dto';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signToken(
    userId: string,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      id: userId,
      email,
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });

    return {
      access_token: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.agentRepo.findOne({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Credentials incorrect.');
    }

    const pwMatches = await argon.verify(user.password, dto.password);

    if (!pwMatches) {
      throw new ForbiddenException('Credentials incorrect.');
    }

    return this.signToken(user.id, user.email);
  }

  async signup(dto: SignUpDto) {
    const existing = await this.agentRepo.findOne({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      throw new ForbiddenException('Credential Taken');
    }

    const hash = await argon.hash(dto.password);

    const user = new Agent();
    user.email = dto.email;
    user.password = hash;
    user.type = dto.type;

    const u = await this.agentRepo.save(user);

    return this.signToken(u.id, u.email);
  }
}