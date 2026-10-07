import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middlewares/auth.ts';
import { BuildingAssignment, UserRecord, UserRole } from '../db/schema.ts';

function sanitizeUser(u: UserRecord) {
  const { password_hash, ...rest } = u;
  return rest;
}

export function getUsers(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const { role, status, q } = req.query;

  let list = state.users.map(sanitizeUser);

  if (role && role !== 'all') {
    list = list.filter((u) => u.role === String(role));
  }
  if (status && status !== 'all') {
    const wantActive = status === 'active' || status === 'aktif';
    list = list.filter((u) => u.is_active === wantActive);
  }
  if (q && String(q).trim() !== '') {
    const kw = String(q).trim().toLowerCase();
    list = list.filter(
      (u) =>
        u.full_name.toLowerCase().includes(kw) ||
        u.username.toLowerCase().includes(kw) ||
        u.phone_number.toLowerCase().includes(kw)
    );
  }

  return res.json(list);
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { username, password, full_name, role, building_assignment, phone_number, is_active } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ message: 'Username, password, nama lengkap, dan peran wajib diisi.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password minimal harus terdiri dari 6 karakter.' });
    }

    const state = db.getState();
    const exists = state.users.find(
      (u) => u.username.toLowerCase() === String(username).trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ message: `Username '${username}' sudah terdaftar.` });
    }

    const validRole: UserRole =
      role === 'admin' || role === 'pembina' || role === 'bendahara' ? role : 'pembina';

    const validBuilding: BuildingAssignment =
      building_assignment === 'Gedung A' || building_assignment === 'Gedung B'
        ? building_assignment
        : 'Semua';

    const passwordHash = await bcrypt.hash(String(password), 10);
    const now = new Date().toISOString();

    const newUser: UserRecord = {
      id: db.nextId(state.users),
      username: String(username).trim().toLowerCase(),
      password_hash: passwordHash,
      full_name: String(full_name).trim(),
      role: validRole,
      building_assignment: validBuilding,
      phone_number: String(phone_number || '-').trim(),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: now,
      updated_at: now,
    };

    state.users.push(newUser);
    db.saveToDisk();

    db.logActivity(
      req.user!.id,
      req.user!.full_name,
      'Tambah Pengguna',
      `Menambahkan akun pengguna baru: ${newUser.full_name} (@${newUser.username}, Role: ${newUser.role.toUpperCase()}, Penugasan: ${newUser.building_assignment})`
    );

    return res.status(201).json(sanitizeUser(newUser));
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Gagal menambahkan pengguna.' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const targetId = Number(req.params.id);
    const { username, full_name, role, building_assignment, phone_number, is_active } = req.body;

    const state = db.getState();
    const target = state.users.find((u) => u.id === targetId);
    if (!target) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    // Proteksi Akun Admin: Admin tidak boleh menonaktifkan atau menurunkan role akunnya sendiri
    if (target.id === req.user!.id) {
      if (is_active === false) {
        return res.status(400).json({
          message: 'Proteksi Keamanan: Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.',
        });
      }
      if (role && role !== 'admin') {
        return res.status(400).json({
          message: 'Proteksi Keamanan: Anda tidak dapat mengubah role akun Administrator Anda sendiri.',
        });
      }
    }

    // Pastikan minimal ada 1 Admin aktif di database
    const activeAdmins = state.users.filter((u) => u.role === 'admin' && u.is_active);
    const isLastActiveAdmin =
      target.role === 'admin' && target.is_active && activeAdmins.length <= 1;

    if (isLastActiveAdmin && (role !== 'admin' || is_active === false)) {
      return res.status(400).json({
        message: 'Proteksi Sistem: Minimal harus terdapat 1 akun Admin yang aktif di dalam database.',
      });
    }

    if (username && String(username).trim().toLowerCase() !== target.username) {
      const dup = state.users.find(
        (u) => u.id !== targetId && u.username.toLowerCase() === String(username).trim().toLowerCase()
      );
      if (dup) {
        return res.status(400).json({ message: `Username '${username}' sudah digunakan.` });
      }
      target.username = String(username).trim().toLowerCase();
    }

    if (full_name !== undefined) target.full_name = String(full_name).trim();
    if (role !== undefined && ['admin', 'pembina', 'bendahara'].includes(role)) {
      target.role = role as UserRole;
    }
    if (
      building_assignment !== undefined &&
      ['Gedung A', 'Gedung B', 'Semua'].includes(building_assignment)
    ) {
      target.building_assignment = building_assignment as BuildingAssignment;
    }
    if (phone_number !== undefined) target.phone_number = String(phone_number).trim();
    if (is_active !== undefined) target.is_active = Boolean(is_active);
    target.updated_at = new Date().toISOString();

    db.saveToDisk();
    db.logActivity(
      req.user!.id,
      req.user!.full_name,
      'Edit Pengguna',
      `Memperbarui profil pengguna ${target.full_name} (@${target.username}, Role: ${target.role.toUpperCase()}, Lokasi: ${target.building_assignment})`
    );

    return res.json(sanitizeUser(target));
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Gagal memperbarui pengguna.' });
  }
}

export function toggleUserActive(req: AuthenticatedRequest, res: Response) {
  const targetId = Number(req.params.id);
  const state = db.getState();
  const target = state.users.find((u) => u.id === targetId);

  if (!target) {
    return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  }

  if (target.id === req.user!.id) {
    return res.status(400).json({
      message: 'Proteksi Keamanan: Anda tidak dapat menonaktifkan akun Anda sendiri.',
    });
  }

  const activeAdmins = state.users.filter((u) => u.role === 'admin' && u.is_active);
  if (target.role === 'admin' && target.is_active && activeAdmins.length <= 1) {
    return res.status(400).json({
      message: 'Proteksi Sistem: Minimal harus ada 1 akun Admin yang aktif di database.',
    });
  }

  target.is_active = !target.is_active;
  target.updated_at = new Date().toISOString();
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    target.is_active ? 'Aktifkan Pengguna' : 'Nonaktifkan Pengguna',
    `Mengubah status akun ${target.full_name} (@${target.username}) menjadi ${target.is_active ? 'AKTIF' : 'NONAKTIF'}`
  );

  return res.json(sanitizeUser(target));
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const targetId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
    }

    const state = db.getState();
    const target = state.users.find((u) => u.id === targetId);
    if (!target) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    target.password_hash = await bcrypt.hash(String(newPassword), 10);
    target.updated_at = new Date().toISOString();
    db.saveToDisk();

    db.logActivity(
      req.user!.id,
      req.user!.full_name,
      'Reset Password Pengguna',
      `Mereset password untuk akun ${target.full_name} (@${target.username})`
    );

    return res.json({ message: `Password untuk ${target.full_name} berhasil direset.` });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Gagal mereset password pengguna.' });
  }
}

export function deleteUser(req: AuthenticatedRequest, res: Response) {
  const targetId = Number(req.params.id);
  const state = db.getState();
  const target = state.users.find((u) => u.id === targetId);

  if (!target) {
    return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  }

  if (target.id === req.user!.id) {
    return res.status(400).json({
      message: 'Proteksi Keamanan: Anda tidak dapat menghapus akun Administrator Anda sendiri.',
    });
  }

  const activeAdmins = state.users.filter((u) => u.role === 'admin' && u.is_active);
  if (target.role === 'admin' && activeAdmins.length <= 1) {
    return res.status(400).json({
      message: 'Proteksi Sistem: Minimal harus ada 1 akun Admin yang aktif di database.',
    });
  }

  state.users = state.users.filter((u) => u.id !== targetId);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Hapus Pengguna',
    `Menghapus akun pengguna: ${target.full_name} (@${target.username}, Role: ${target.role.toUpperCase()})`
  );

  return res.json({ message: 'Akun pengguna berhasil dihapus.' });
}

export function getActivityLogs(_req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  return res.json(state.activity_logs);
}
