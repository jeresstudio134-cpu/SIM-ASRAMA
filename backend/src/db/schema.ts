/**
 * Database Schema & Types for SIM-ASRAMA
 * Compatible with Drizzle ORM (PostgreSQL) and Local Persistent Relational Store
 */

export type UserRole = 'admin' | 'pembina' | 'bendahara';
export type BuildingAssignment = 'Gedung A' | 'Gedung B' | 'Semua';
export type SantriBuilding = 'Gedung A' | 'Gedung B';
export type SantriStatus = 'aktif' | 'alumni';
export type SppStatus = 'lunas' | 'tunggakan';
export type TransactionType = 'masuk' | 'keluar';
export type PermissionStatus = 'diproses' | 'disetujui' | 'ditolak';

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  building_assignment: BuildingAssignment;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SantriRecord {
  id: number;
  nis: string;
  full_name: string;
  gender: 'L' | 'P';
  birth_place: string;
  birth_date: string;
  room_number: string;
  building: SantriBuilding;
  class_grade: string;
  parent_name: string;
  parent_phone: string;
  photo_url: string;
  status: SantriStatus;
  created_at: string;
}

export interface ViolationRecord {
  id: number;
  santri_id: number;
  violation_date: string;
  violation_type: string;
  points: number;
  penalty: string;
  recorded_by: string;
  created_at: string;
}

export interface CounselingRecord {
  id: number;
  santri_id: number;
  counseling_date: string;
  topic: string;
  follow_up: string;
  counselor_name: string;
  created_at: string;
}

export interface AchievementRecord {
  id: number;
  santri_id: number;
  achievement_date: string;
  title: string;
  level: string;
  reward: string;
  points: number;
  created_at: string;
}

export interface FinancialSppRecord {
  id: number;
  santri_id: number;
  month: string;
  year: number;
  amount: number;
  status: SppStatus;
  paid_at: string | null;
  proof_url?: string;
  updated_at: string;
}

export interface PocketMoneyRecord {
  id: number;
  santri_id: number;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
}

export interface OperationalCashRecord {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  transaction_date: string;
  recorded_by: string;
}

export interface PermissionRecord {
  id: number;
  santri_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: PermissionStatus;
  approved_by: string;
  created_at: string;
}

export interface ActivityLogRecord {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DatabaseState {
  users: UserRecord[];
  santri: SantriRecord[];
  violations: ViolationRecord[];
  counseling: CounselingRecord[];
  achievements: AchievementRecord[];
  financial_spp: FinancialSppRecord[];
  pocket_money: PocketMoneyRecord[];
  operational_cash: OperationalCashRecord[];
  permissions: PermissionRecord[];
  activity_logs: ActivityLogRecord[];
}
