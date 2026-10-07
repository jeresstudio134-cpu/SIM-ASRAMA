import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, JwtUserPayload } from './auth.ts';
import { SantriRecord, UserRole } from '../db/schema.ts';
import { db } from '../config/db.ts';

/**
 * Middleware RBAC untuk membatasi akses endpoint berdasarkan Role.
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Silakan login terlebih dahulu.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak. Peran '${req.user.role.toUpperCase()}' tidak memiliki izin untuk mengakses fitur ini.`,
      });
    }
    next();
  };
}

/**
 * Filter level ORM/Query untuk Pembina yang ditugaskan ke Gedung A atau Gedung B.
 */
export function filterSantriByBuildingRole(santriList: SantriRecord[], user: JwtUserPayload): SantriRecord[] {
  if (user.role === 'pembina' && (user.building_assignment === 'Gedung A' || user.building_assignment === 'Gedung B')) {
    return santriList.filter((s) => s.building === user.building_assignment);
  }
  return santriList;
}

/**
 * Validasi apakah user memiliki otoritas terhadap santri tertentu berdasarkan gedungnya.
 */
export function canUserAccessSantri(santriId: number, user: JwtUserPayload): { allowed: boolean; santri?: SantriRecord; reason?: string } {
  const santri = db.getState().santri.find((s) => s.id === Number(santriId));
  if (!santri) {
    return { allowed: false, reason: 'Data santri tidak ditemukan.' };
  }
  if (
    user.role === 'pembina' &&
    (user.building_assignment === 'Gedung A' || user.building_assignment === 'Gedung B') &&
    santri.building !== user.building_assignment
  ) {
    return {
      allowed: false,
      santri,
      reason: `Akses ditolak: Anda ditugaskan khusus untuk ${user.building_assignment}, sedangkan santri ${santri.full_name} berada di ${santri.building}.`,
    };
  }
  return { allowed: true, santri };
}
