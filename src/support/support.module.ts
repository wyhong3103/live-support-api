import { Module } from '@nestjs/common';
import { SupportGateway } from './support.gateway';

@Module({
  providers: [SupportGateway]
})
export class SupportModule {}
