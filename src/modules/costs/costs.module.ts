import { Module } from '@nestjs/common';
import { TandaModule } from '../tanda/tanda.module';
import { CostsController } from './costs.controller';
import { CostsService } from './costs.service';
import { BudgetRepository } from './budget.repository';

@Module({
  imports: [TandaModule],
  controllers: [CostsController],
  providers: [CostsService, BudgetRepository],
})
export class CostsModule {}
