import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TandaController } from './tanda.controller';
import { TandaService } from './tanda.service';

@Module({
  imports: [HttpModule],
  controllers: [TandaController],
  providers: [TandaService],
  exports: [TandaService],
})
export class TandaModule {}
