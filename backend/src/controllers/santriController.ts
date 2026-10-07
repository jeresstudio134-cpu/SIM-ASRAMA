import { Response } from 'express';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middlewares/auth.ts';
import { canUserAccessSantri, filterSantriByBuildingRole } from '../middlewares/rbac.ts';
import { SantriBuilding, SantriRecord, SantriStatus } from '../db/schema.ts';

export function getSantriList(req: AuthenticatedRequest, res: Response) {
  try {
    const state = db.getState();
    const { q, building, room, status, gender } = req.query;

    // 1. Filter by Pembina building assignment at ORM/query level
    let list = filterSantriByBuildingRole(state.santri, req.user!);

    // 2. Apply query filters
    if (q && String(q).trim() !== '') {
      const keyword = String(q).trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(keyword) ||
          s.nis.toLowerCase().includes(keyword) ||
          s.class_grade.toLowerCase().includes(keyword) ||
          s.parent_name.toLowerCase().includes(keyword)
      );
    }

    if (building && building !== 'all') {
      list = list.filter((s) => s.building === String(building));
    }

    if (room && room !== 'all') {
      list = list.filter((s) => s.room_number.toLowerCase() === String(room).toLowerCase());
    }

    if (status && status !== 'all') {
      list = list.filter((s) => s.status === String(status));
    }

    if (gender && gender !== 'all') {
      list = list.filter((s) => s.gender === String(gender));
    }

    // Attach computed discipline points & risk status
    const enriched = list.map((s) => {
      const discipline = db.getSantriDisciplineStats(s.id);
      return {
        ...s,
        ...discipline,
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error('Error fetching santri list:', error);
    return res.status(500).json({ message: 'Gagal memuat data santri.' });
  }
}

export function getSantriRapor(req: AuthenticatedRequest, res: Response) {
  try {
    const santriId = Number(req.params.id);
    const access = canUserAccessSantri(santriId, req.user!);
    if (!access.allowed || !access.santri) {
      return res.status(access.santri ? 403 : 404).json({ message: access.reason });
    }

    const state = db.getState();
    const santri = access.santri;
    const discipline = db.getSantriDisciplineStats(santri.id);
    const violations = state.violations.filter((v) => v.santri_id === santri.id);
    const counseling = state.counseling.filter((c) => c.santri_id === santri.id);
    const achievements = state.achievements.filter((a) => a.santri_id === santri.id);
    const spp = state.financial_spp.filter((f) => f.santri_id === santri.id);
    const pocketMoney = state.pocket_money.filter((p) => p.santri_id === santri.id);
    const permissions = state.permissions.filter((p) => p.santri_id === santri.id);

    const pocketIn = pocketMoney
      .filter((p) => p.transaction_type === 'masuk')
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const pocketOut = pocketMoney
      .filter((p) => p.transaction_type === 'keluar')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    return res.json({
      santri: {
        ...santri,
        ...discipline,
      },
      violations,
      counseling,
      achievements,
      spp,
      pocketMoney: {
        balance: pocketIn - pocketOut,
        totalIn: pocketIn,
        totalOut: pocketOut,
        transactions: pocketMoney,
      },
      permissions,
    });
  } catch (error) {
    console.error('Error fetching santri rapor:', error);
    return res.status(500).json({ message: 'Gagal memuat rapor santri.' });
  }
}

export function createSantri(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      nis,
      full_name,
      gender,
      birth_place,
      birth_date,
      room_number,
      building,
      class_grade,
      parent_name,
      parent_phone,
      photo_url,
      status,
    } = req.body;

    if (!nis || !full_name || !room_number || !building || !class_grade) {
      return res.status(400).json({
        message: 'NIS, Nama Lengkap, Gedung, Nomor Kamar, dan Kelas wajib diisi.',
      });
    }

    const user = req.user!;
    if (
      user.role === 'pembina' &&
      (user.building_assignment === 'Gedung A' || user.building_assignment === 'Gedung B') &&
      building !== user.building_assignment
    ) {
      return res.status(403).json({
        message: `Sebagai Pembina ${user.building_assignment}, Anda hanya dapat menambahkan santri di ${user.building_assignment}.`,
      });
    }

    const state = db.getState();
    const duplicateNis = state.santri.find((s) => s.nis.trim() === String(nis).trim());
    if (duplicateNis) {
      return res.status(400).json({ message: `NIS ${nis} sudah terdaftar atas nama ${duplicateNis.full_name}.` });
    }

    const newSantri: SantriRecord = {
      id: db.nextId(state.santri),
      nis: String(nis).trim(),
      full_name: String(full_name).trim(),
      gender: gender === 'P' ? 'P' : 'L',
      birth_place: String(birth_place || '-').trim(),
      birth_date: String(birth_date || '2009-01-01'),
      room_number: String(room_number).trim(),
      building: (building === 'Gedung B' ? 'Gedung B' : 'Gedung A') as SantriBuilding,
      class_grade: String(class_grade).trim(),
      parent_name: String(parent_name || '-').trim(),
      parent_phone: String(parent_phone || '-').trim(),
      photo_url: String(photo_url || ''),
      status: (status === 'alumni' ? 'alumni' : 'aktif') as SantriStatus,
      created_at: new Date().toISOString(),
    };

    state.santri.unshift(newSantri);

    // Automatically create initial SPP record for active santri if not exists
    if (newSantri.status === 'aktif') {
      state.financial_spp.push({
        id: db.nextId(state.financial_spp),
        santri_id: newSantri.id,
        month: 'Oktober',
        year: 2026,
        amount: 850000,
        status: 'tunggakan',
        paid_at: null,
        updated_at: new Date().toISOString(),
      });
    }

    db.saveToDisk();
    db.logActivity(
      user.id,
      user.full_name,
      'Tambah Santri',
      `Menambahkan santri baru: ${newSantri.full_name} (NIS: ${newSantri.nis}, ${newSantri.building} - ${newSantri.room_number})`
    );

    return res.status(201).json({
      ...newSantri,
      ...db.getSantriDisciplineStats(newSantri.id),
    });
  } catch (error) {
    console.error('Create santri error:', error);
    return res.status(500).json({ message: 'Gagal menambahkan data santri.' });
  }
}

export function updateSantri(req: AuthenticatedRequest, res: Response) {
  try {
    const santriId = Number(req.params.id);
    const access = canUserAccessSantri(santriId, req.user!);
    if (!access.allowed || !access.santri) {
      return res.status(access.santri ? 403 : 404).json({ message: access.reason });
    }

    const user = req.user!;
    const {
      nis,
      full_name,
      gender,
      birth_place,
      birth_date,
      room_number,
      building,
      class_grade,
      parent_name,
      parent_phone,
      photo_url,
      status,
    } = req.body;

    if (
      building &&
      user.role === 'pembina' &&
      (user.building_assignment === 'Gedung A' || user.building_assignment === 'Gedung B') &&
      building !== user.building_assignment
    ) {
      return res.status(403).json({
        message: `Anda tidak dapat memindahkan santri ke luar ${user.building_assignment}.`,
      });
    }

    const state = db.getState();
    const target = state.santri.find((s) => s.id === santriId)!;

    if (nis && String(nis).trim() !== target.nis) {
      const dup = state.santri.find((s) => s.id !== santriId && s.nis === String(nis).trim());
      if (dup) {
        return res.status(400).json({ message: `NIS ${nis} sudah digunakan oleh santri lain.` });
      }
      target.nis = String(nis).trim();
    }

    if (full_name !== undefined) target.full_name = String(full_name).trim();
    if (gender !== undefined) target.gender = gender === 'P' ? 'P' : 'L';
    if (birth_place !== undefined) target.birth_place = String(birth_place).trim();
    if (birth_date !== undefined) target.birth_date = String(birth_date);
    if (room_number !== undefined) target.room_number = String(room_number).trim();
    if (building !== undefined) target.building = building === 'Gedung B' ? 'Gedung B' : 'Gedung A';
    if (class_grade !== undefined) target.class_grade = String(class_grade).trim();
    if (parent_name !== undefined) target.parent_name = String(parent_name).trim();
    if (parent_phone !== undefined) target.parent_phone = String(parent_phone).trim();
    if (photo_url !== undefined) target.photo_url = String(photo_url);
    if (status !== undefined) target.status = status === 'alumni' ? 'alumni' : 'aktif';

    db.saveToDisk();
    db.logActivity(
      user.id,
      user.full_name,
      'Perbarui Santri',
      `Memperbarui data santri: ${target.full_name} (${target.nis})`
    );

    return res.json({
      ...target,
      ...db.getSantriDisciplineStats(target.id),
    });
  } catch (error) {
    console.error('Update santri error:', error);
    return res.status(500).json({ message: 'Gagal memperbarui data santri.' });
  }
}

export function deleteSantri(req: AuthenticatedRequest, res: Response) {
  try {
    const santriId = Number(req.params.id);
    const access = canUserAccessSantri(santriId, req.user!);
    if (!access.allowed || !access.santri) {
      return res.status(access.santri ? 403 : 404).json({ message: access.reason });
    }

    const state = db.getState();
    const removed = access.santri;
    state.santri = state.santri.filter((s) => s.id !== santriId);
    state.violations = state.violations.filter((v) => v.santri_id !== santriId);
    state.counseling = state.counseling.filter((c) => c.santri_id !== santriId);
    state.achievements = state.achievements.filter((a) => a.santri_id !== santriId);
    state.financial_spp = state.financial_spp.filter((f) => f.santri_id !== santriId);
    state.pocket_money = state.pocket_money.filter((p) => p.santri_id !== santriId);
    state.permissions = state.permissions.filter((p) => p.santri_id !== santriId);

    db.saveToDisk();
    db.logActivity(
      req.user!.id,
      req.user!.full_name,
      'Hapus Santri',
      `Menghapus data santri: ${removed.full_name} (NIS: ${removed.nis})`
    );

    return res.json({ message: 'Data santri berhasil dihapus.' });
  } catch (error) {
    console.error('Delete santri error:', error);
    return res.status(500).json({ message: 'Gagal menghapus data santri.' });
  }
}
