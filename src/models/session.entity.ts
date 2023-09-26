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
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  roomId: string;

  @Column({ type: 'timestamp' })
  lastUpdated: number;

  @ManyToOne(() => Agent, (agent) => agent.sessions)
  agent: Agent;

  @OneToMany(() => Message, (message) => message.session)
  messages: Message[];
}
