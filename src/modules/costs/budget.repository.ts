import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BudgetConfig } from './interfaces/budget.interface';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'budget.json');

/**
 * JSON-file backed store, same approach as AlertsRepository: a single small
 * config object, so a file in the persisted data/ volume is enough.
 */
@Injectable()
export class BudgetRepository {
  async find(): Promise<BudgetConfig | null> {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as BudgetConfig;
    } catch {
      return null;
    }
  }

  async save(config: BudgetConfig): Promise<BudgetConfig> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }
}
