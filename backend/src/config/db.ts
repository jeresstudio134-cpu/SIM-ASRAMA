import fs from 'fs';
import path from 'path';
import {
  DatabaseState,
  UserRecord,
  SantriRecord,
  ViolationRecord,
  CounselingRecord,
  AchievementRecord,
  FinancialSppRecord,
  PocketMoneyRecord,
  OperationalCashRecord,
  PermissionRecord,
  ActivityLogRecord,
} from '../db/schema.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'sim-asrama-db.json');

const initialEmptyState: DatabaseState = {
  users: [],
  santri: [],
  violations: [],
  counseling: [],
  achievements: [],
  financial_spp: [],
  pocket_money: [],
  operational_cash: [],
  permissions: [],
  activity_logs: [],
};

class RelationalDatabase {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...initialEmptyState, ...parsed };
      }
    } catch (error) {
      console.error('Error loading database file, initializing fresh store:', error);
    }
    return structuredClone(initialEmptyState);
  }

  public saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error persisting database to disk:', error);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public setState(newState: DatabaseState): void {
    this.state = newState;
    this.saveToDisk();
  }

  public nextId<T extends { id: number }>(collection: T[]): number {
    if (collection.length === 0) return 1;
    return Math.max(...collection.map((item) => item.id)) + 1;
  }

  public logActivity(userId: number, userName: string, action: string, details: string): ActivityLogRecord {
    const newLog: ActivityLogRecord = {
      id: this.nextId(this.state.activity_logs),
      user_id: userId,
      user_name: userName,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.state.activity_logs.unshift(newLog);
    this.saveToDisk();
    return newLog;
  }

  // Helper to compute discipline points for a santri:
  // Base score 100 - violation points + achievement points (or raw violation points for risk status)
  public getSantriDisciplineStats(santriId: number) {
    const violations = this.state.violations.filter((v) => v.santri_id === santriId);
    const achievements = this.state.achievements.filter((a) => a.santri_id === santriId);
    const totalViolationPoints = violations.reduce((acc, v) => acc + Number(v.points || 0), 0);
    const totalAchievementPoints = achievements.reduce((acc, a) => acc + Number(a.points || 0), 0);
    const netDisciplineScore = Math.max(0, 100 - totalViolationPoints + Math.round(totalAchievementPoints * 0.5));

    let riskStatus: 'Aman' | 'Waspada' | 'Bahaya/SP' = 'Aman';
    if (totalViolationPoints >= 31) {
      riskStatus = 'Bahaya/SP';
    } else if (totalViolationPoints >= 16) {
      riskStatus = 'Waspada';
    }

    return {
      totalViolationPoints,
      totalAchievementPoints,
      netDisciplineScore,
      riskStatus,
      violationCount: violations.length,
      achievementCount: achievements.length,
    };
  }
}

export const db = new RelationalDatabase();
export type {
  UserRecord,
  SantriRecord,
  ViolationRecord,
  CounselingRecord,
  AchievementRecord,
  FinancialSppRecord,
  PocketMoneyRecord,
  OperationalCashRecord,
  PermissionRecord,
  ActivityLogRecord,
};
