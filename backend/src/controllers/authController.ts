import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.ts';
import {
  AuthenticatedRequest,
  JWT_SECRET,
  JwtUserPayload,
  recordUserActivity,
  clearUserActivity,
} from '../middlewares/auth.ts';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    const user = db
      .getState()
      .users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Akun Anda berstatus Nonaktif. Silakan hubungi Administrator Asrama.',
      });
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const payload: JwtUserPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      building_assignment: user.building_assignment,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    recordUserActivity(user.id);

    res.cookie('sim_asrama_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    db.logActivity(user.id, user.full_name, 'Login Sistem', `Berhasil masuk sebagai ${user.role.toUpperCase()} (${user.building_assignment})`);

    return res.json({
      message: 'Login berhasil',
      token,
      user: payload,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.' });
  }
}

export function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    clearUserActivity(req.user.id);
    db.logActivity(req.user.id, req.user.full_name, 'Logout Sistem', 'Keluar dari sesi aplikasi SIM-ASRAMA');
  }
  res.clearCookie('sim_asrama_token');
  return res.json({ message: 'Berhasil keluar dari sistem.' });
}

export function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Tidak terotentikasi.' });
  }
  const dbUser = db.getState().users.find((u) => u.id === req.user!.id);
  if (!dbUser) {
    return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  }
  return res.json({
    id: dbUser.id,
    username: dbUser.username,
    full_name: dbUser.full_name,
    role: dbUser.role,
    building_assignment: dbUser.building_assignment,
    phone_number: dbUser.phone_number,
  });
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan password baru wajib diisi.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    const valid = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Password lama yang Anda masukkan tidak sesuai.' });
    }

    user.password_hash = await bcrypt.hash(String(newPassword), 10);
    user.updated_at = new Date().toISOString();
    db.saveToDisk();

    db.logActivity(user.id, user.full_name, 'Ganti Password', 'Mengubah kata sandi akun pribadi');

    return res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Gagal memperbarui password.' });
  }
}
