import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Alert } from './interfaces/alert.interface';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'alerts.json');

/**
 * Simple JSON-file backed store. This is a small internal tool with at most
 * a handful of alert configs, so a file is enough - no need for a database.
 */
@Injectable()
export class AlertsRepository {
  private async ensureFile(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, '[]', 'utf-8');
    }
  }

  async findAll(): Promise<Alert[]> {
    await this.ensureFile();
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Alert[];
  }

  async findById(id: string): Promise<Alert | undefined> {
    const all = await this.findAll();
    return all.find((a) => a.id === id);
  }

  private async saveAll(alerts: Alert[]): Promise<void> {
    await this.ensureFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(alerts, null, 2), 'utf-8');
  }

  async create(alert: Alert): Promise<Alert> {
    const all = await this.findAll();
    all.push(alert);
    await this.saveAll(all);
    return alert;
  }

  async update(id: string, patch: Partial<Alert>): Promise<Alert | undefined> {
    const all = await this.findAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
    await this.saveAll(all);
    return all[idx];
  }

  async delete(id: string): Promise<boolean> {
    const all = await this.findAll();
    const next = all.filter((a) => a.id !== id);
    if (next.length === all.length) return false;
    await this.saveAll(next);
    return true;
  }
}
