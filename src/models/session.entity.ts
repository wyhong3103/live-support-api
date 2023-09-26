import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Agent } from './agent.entity';
import { Message } from './message.entity';

@Entity()
export abstract class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  roomId: string;

  @ManyToOne(() => Agent, (agent) => agent.sessions)
  agent: Agent;

  @OneToMany(() => Message, (message) => message.session)
  messages: Message[];
}
