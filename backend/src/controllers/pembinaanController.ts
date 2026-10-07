import { Response } from 'express';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middlewares/auth.ts';
import { canUserAccessSantri, filterSantriByBuildingRole } from '../middlewares/rbac.ts';
import {
  AchievementRecord,
  CounselingRecord,
  PermissionRecord,
  PermissionStatus,
  ViolationRecord,
} from '../db/schema.ts';

// ================= VIOLATIONS =================
export function getViolations(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const allowedSantri = filterSantriByBuildingRole(state.santri, req.user!);
  const allowedIds = new Set(allowedSantri.map((s) => s.id));
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  const list = state.violations
    .filter((v) => allowedIds.has(v.santri_id))
    .map((v) => {
      const s = santriMap.get(v.santri_id);
      const discipline = db.getSantriDisciplineStats(v.santri_id);
      return {
        ...v,
        santri_name: s?.full_name || 'Santri Terhapus',
        santri_nis: s?.nis || '-',
        building: s?.building || '-',
        room_number: s?.room_number || '-',
        total_violation_points: discipline.totalViolationPoints,
        risk_status: discipline.riskStatus,
      };
    });

  return res.json(list);
}

export function createViolation(req: AuthenticatedRequest, res: Response) {
  const { santri_id, violation_date, violation_type, points, penalty, recorded_by } = req.body;
  if (!santri_id || !violation_type || points === undefined || !penalty) {
    return res.status(400).json({ message: 'Santri, jenis pelanggaran, poin, dan sanksi wajib diisi.' });
  }

  const access = canUserAccessSantri(Number(santri_id), req.user!);
  if (!access.allowed || !access.santri) {
    return res.status(access.santri ? 403 : 404).json({ message: access.reason });
  }

  const state = db.getState();
  const record: ViolationRecord = {
    id: db.nextId(state.violations),
    santri_id: Number(santri_id),
    violation_date: String(violation_date || new Date().toISOString().slice(0, 10)),
    violation_type: String(violation_type).trim(),
    points: Math.max(1, Number(points)),
    penalty: String(penalty).trim(),
    recorded_by: String(recorded_by || req.user!.full_name).trim(),
    created_at: new Date().toISOString(),
  };

  state.violations.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Catat Pelanggaran',
    `Mencatat pelanggaran '${record.violation_type}' (${record.points} poin) untuk ${access.santri.full_name}`
  );

  return res.status(201).json(record);
}

export function deleteViolation(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const state = db.getState();
  const target = state.violations.find((v) => v.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data pelanggaran tidak ditemukan.' });
  }

  const access = canUserAccessSantri(target.santri_id, req.user!);
  if (!access.allowed) {
    return res.status(403).json({ message: access.reason });
  }

  state.violations = state.violations.filter((v) => v.id !== id);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Hapus Pelanggaran',
    `Menghapus catatan pelanggaran '${target.violation_type}'`
  );

  return res.json({ message: 'Catatan pelanggaran berhasil dihapus.' });
}

// ================= COUNSELING =================
export function getCounseling(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const allowedSantri = filterSantriByBuildingRole(state.santri, req.user!);
  const allowedIds = new Set(allowedSantri.map((s) => s.id));
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  const list = state.counseling
    .filter((c) => allowedIds.has(c.santri_id))
    .map((c) => {
      const s = santriMap.get(c.santri_id);
      return {
        ...c,
        santri_name: s?.full_name || 'Santri Terhapus',
        santri_nis: s?.nis || '-',
        building: s?.building || '-',
        room_number: s?.room_number || '-',
      };
    });

  return res.json(list);
}

export function createCounseling(req: AuthenticatedRequest, res: Response) {
  const { santri_id, counseling_date, topic, follow_up, counselor_name } = req.body;
  if (!santri_id || !topic || !follow_up) {
    return res.status(400).json({ message: 'Santri, topik bimbingan, dan tindak lanjut wajib diisi.' });
  }

  const access = canUserAccessSantri(Number(santri_id), req.user!);
  if (!access.allowed || !access.santri) {
    return res.status(access.santri ? 403 : 404).json({ message: access.reason });
  }

  const state = db.getState();
  const record: CounselingRecord = {
    id: db.nextId(state.counseling),
    santri_id: Number(santri_id),
    counseling_date: String(counseling_date || new Date().toISOString().slice(0, 10)),
    topic: String(topic).trim(),
    follow_up: String(follow_up).trim(),
    counselor_name: String(counselor_name || req.user!.full_name).trim(),
    created_at: new Date().toISOString(),
  };

  state.counseling.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Catat Konseling',
    `Menambahkan sesi bimbingan konseling untuk ${access.santri.full_name}: ${record.topic}`
  );

  return res.status(201).json(record);
}

export function deleteCounseling(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const state = db.getState();
  const target = state.counseling.find((c) => c.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Catatan konseling tidak ditemukan.' });
  }

  const access = canUserAccessSantri(target.santri_id, req.user!);
  if (!access.allowed) {
    return res.status(403).json({ message: access.reason });
  }

  state.counseling = state.counseling.filter((c) => c.id !== id);
  db.saveToDisk();
  return res.json({ message: 'Catatan konseling berhasil dihapus.' });
}

// ================= ACHIEVEMENTS =================
export function getAchievements(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const allowedSantri = filterSantriByBuildingRole(state.santri, req.user!);
  const allowedIds = new Set(allowedSantri.map((s) => s.id));
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  const list = state.achievements
    .filter((a) => allowedIds.has(a.santri_id))
    .map((a) => {
      const s = santriMap.get(a.santri_id);
      return {
        ...a,
        santri_name: s?.full_name || 'Santri Terhapus',
        santri_nis: s?.nis || '-',
        building: s?.building || '-',
        room_number: s?.room_number || '-',
        class_grade: s?.class_grade || '-',
      };
    });

  return res.json(list);
}

export function createAchievement(req: AuthenticatedRequest, res: Response) {
  const { santri_id, achievement_date, title, level, reward, points } = req.body;
  if (!santri_id || !title || !level) {
    return res.status(400).json({ message: 'Santri, judul prestasi, dan tingkat prestasi wajib diisi.' });
  }

  const access = canUserAccessSantri(Number(santri_id), req.user!);
  if (!access.allowed || !access.santri) {
    return res.status(access.santri ? 403 : 404).json({ message: access.reason });
  }

  const state = db.getState();
  const record: AchievementRecord = {
    id: db.nextId(state.achievements),
    santri_id: Number(santri_id),
    achievement_date: String(achievement_date || new Date().toISOString().slice(0, 10)),
    title: String(title).trim(),
    level: String(level).trim(),
    reward: String(reward || '-').trim(),
    points: Math.max(1, Number(points || 10)),
    created_at: new Date().toISOString(),
  };

  state.achievements.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Tambah Prestasi',
    `Mencatat prestasi '${record.title}' (${record.level}) untuk ${access.santri.full_name}`
  );

  return res.status(201).json(record);
}

export function deleteAchievement(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const state = db.getState();
  const target = state.achievements.find((a) => a.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data prestasi tidak ditemukan.' });
  }

  const access = canUserAccessSantri(target.santri_id, req.user!);
  if (!access.allowed) {
    return res.status(403).json({ message: access.reason });
  }

  state.achievements = state.achievements.filter((a) => a.id !== id);
  db.saveToDisk();
  return res.json({ message: 'Data prestasi berhasil dihapus.' });
}

// ================= ROOMS & PERMISSIONS =================
export function getRoomsSummary(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const allowedSantri = filterSantriByBuildingRole(
    state.santri.filter((s) => s.status === 'aktif'),
    req.user!
  );

  // Define standard dormitory rooms across Gedung A & Gedung B
  const predefinedRooms = [
    { room_number: 'A-101', building: 'Gedung A', capacity: 4, gender: 'Putra' },
    { room_number: 'A-102', building: 'Gedung A', capacity: 4, gender: 'Putra' },
    { room_number: 'A-103', building: 'Gedung A', capacity: 4, gender: 'Putra' },
    { room_number: 'A-104', building: 'Gedung A', capacity: 4, gender: 'Putra' },
    { room_number: 'B-201', building: 'Gedung B', capacity: 4, gender: 'Putri' },
    { room_number: 'B-202', building: 'Gedung B', capacity: 4, gender: 'Putri' },
    { room_number: 'B-203', building: 'Gedung B', capacity: 4, gender: 'Putri' },
    { room_number: 'B-204', building: 'Gedung B', capacity: 4, gender: 'Putri' },
  ];

  const user = req.user!;
  const visibleRooms = predefinedRooms.filter((r) => {
    if (user.role === 'pembina' && (user.building_assignment === 'Gedung A' || user.building_assignment === 'Gedung B')) {
      return r.building === user.building_assignment;
    }
    return true;
  });

  // Also include any custom room numbers assigned to santri
  for (const s of allowedSantri) {
    if (!visibleRooms.some((r) => r.room_number === s.room_number)) {
      visibleRooms.push({
        room_number: s.room_number,
        building: s.building,
        capacity: 4,
        gender: s.gender === 'P' ? 'Putri' : 'Putra',
      });
    }
  }

  const enrichedRooms = visibleRooms.map((r) => {
    const occupants = allowedSantri.filter((s) => s.room_number === r.room_number);
    return {
      ...r,
      occupied: occupants.length,
      available: Math.max(0, r.capacity - occupants.length),
      occupants,
    };
  });

  return res.json(enrichedRooms);
}

export function getPermissions(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const allowedSantri = filterSantriByBuildingRole(state.santri, req.user!);
  const allowedIds = new Set(allowedSantri.map((s) => s.id));
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  const list = state.permissions
    .filter((p) => allowedIds.has(p.santri_id))
    .map((p) => {
      const s = santriMap.get(p.santri_id);
      return {
        ...p,
        santri_name: s?.full_name || 'Santri Terhapus',
        santri_nis: s?.nis || '-',
        building: s?.building || '-',
        room_number: s?.room_number || '-',
        class_grade: s?.class_grade || '-',
        parent_name: s?.parent_name || '-',
        parent_phone: s?.parent_phone || '-',
      };
    });

  return res.json(list);
}

export function createPermission(req: AuthenticatedRequest, res: Response) {
  const { santri_id, start_date, end_date, reason, status } = req.body;
  if (!santri_id || !start_date || !end_date || !reason) {
    return res.status(400).json({ message: 'Santri, tanggal mulai, tanggal kembali, dan alasan wajib diisi.' });
  }

  const access = canUserAccessSantri(Number(santri_id), req.user!);
  if (!access.allowed || !access.santri) {
    return res.status(access.santri ? 403 : 404).json({ message: access.reason });
  }

  const state = db.getState();
  const initialStatus: PermissionStatus =
    status === 'disetujui' || status === 'ditolak' ? status : 'diproses';

  const record: PermissionRecord = {
    id: db.nextId(state.permissions),
    santri_id: Number(santri_id),
    start_date: String(start_date),
    end_date: String(end_date),
    reason: String(reason).trim(),
    status: initialStatus,
    approved_by: initialStatus === 'diproses' ? '-' : req.user!.full_name,
    created_at: new Date().toISOString(),
  };

  state.permissions.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Pengajuan Izin Pulang',
    `Membuat surat izin pulang untuk ${access.santri.full_name} (${record.start_date} s/d ${record.end_date})`
  );

  return res.status(201).json(record);
}

export function updatePermissionStatus(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['diproses', 'disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({ message: 'Status perizinan tidak valid.' });
  }

  const state = db.getState();
  const target = state.permissions.find((p) => p.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data perizinan tidak ditemukan.' });
  }

  const access = canUserAccessSantri(target.santri_id, req.user!);
  if (!access.allowed || !access.santri) {
    return res.status(403).json({ message: access.reason });
  }

  target.status = status as PermissionStatus;
  target.approved_by = status === 'diproses' ? '-' : req.user!.full_name;
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Verifikasi Izin Pulang',
    `Mengubah status izin ${access.santri.full_name} menjadi ${status.toUpperCase()}`
  );

  return res.json(target);
}

export function deletePermission(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const state = db.getState();
  const target = state.permissions.find((p) => p.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data perizinan tidak ditemukan.' });
  }

  const access = canUserAccessSantri(target.santri_id, req.user!);
  if (!access.allowed) {
    return res.status(403).json({ message: access.reason });
  }

  state.permissions = state.permissions.filter((p) => p.id !== id);
  db.saveToDisk();
  return res.json({ message: 'Data perizinan berhasil dihapus.' });
}
