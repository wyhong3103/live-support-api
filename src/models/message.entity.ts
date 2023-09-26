import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Session } from './session.entity';

@Entity()
export abstract class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  lastUpdated: number;

  @Column({ type: 'varchar' })
  message: string;

  // USR/ BOT/ SUP
  @Column({ type: 'varchar', length: 3 })
  author: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createDateTime: Date;

  @ManyToOne(() => Session, (session) => session.messages)
  session: Session;
}
