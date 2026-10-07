import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.ts';
import { BuildingAssignment, UserRole } from '../db/schema.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'sim_asrama_super_secret_jwt_key_2026';
export const INACTIVITY_TIMEOUT_MS = Number(process.env.INACTIVITY_TIMEOUT_MINUTES || 30) * 60 * 1000;

export interface JwtUserPayload {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  building_assignment: BuildingAssignment;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

// Track last activity timestamp per user ID for 30-minute server-side inactivity timeout
const sessionActivityMap = new Map<number, number>();

export function recordUserActivity(userId: number): void {
  sessionActivityMap.set(userId, Date.now());
}

export function clearUserActivity(userId: number): void {
  sessionActivityMap.delete(userId);
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies?.sim_asrama_token;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({
      message: 'Sesi otentikasi tidak ditemukan. Silakan login kembali.',
      code: 'NO_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;

    // Verify user still exists and is active in DB
    const dbUser = db.getState().users.find((u) => u.id === decoded.id);
    if (!dbUser || !dbUser.is_active) {
      return res.status(403).json({
        message: 'Akun Anda telah dinonaktifkan atau tidak valid. Hubungi Administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Check 30-minute inactivity timeout
    const lastActive = sessionActivityMap.get(dbUser.id);
    const now = Date.now();
    if (lastActive && now - lastActive > INACTIVITY_TIMEOUT_MS) {
      sessionActivityMap.delete(dbUser.id);
      res.clearCookie('sim_asrama_token');
      return res.status(401).json({
        message: 'Sesi Anda telah berakhir otomatis karena tidak aktif selama 30 menit.',
        code: 'SESSION_TIMEOUT',
      });
    }

    // Update sliding activity window
    sessionActivityMap.set(dbUser.id, now);

    // Always attach latest role & building assignment from DB
    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      full_name: dbUser.full_name,
      role: dbUser.role,
      building_assignment: dbUser.building_assignment,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token otentikasi tidak valid atau telah kedaluwarsa.',
      code: 'INVALID_TOKEN',
    });
  }
}
