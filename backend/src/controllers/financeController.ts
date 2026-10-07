import { Response } from 'express';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middlewares/auth.ts';
import {
  FinancialSppRecord,
  OperationalCashRecord,
  PocketMoneyRecord,
  TransactionType,
} from '../db/schema.ts';

// ================= SPP / IURAN BULANAN =================
export function getSppList(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const { month, year, status } = req.query;
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  let list = state.financial_spp.map((f) => {
    const s = santriMap.get(f.santri_id);
    return {
      ...f,
      santri_name: s?.full_name || 'Santri Terhapus',
      santri_nis: s?.nis || '-',
      building: s?.building || '-',
      room_number: s?.room_number || '-',
      class_grade: s?.class_grade || '-',
    };
  });

  if (month && month !== 'all') {
    list = list.filter((item) => item.month.toLowerCase() === String(month).toLowerCase());
  }
  if (year && year !== 'all') {
    list = list.filter((item) => item.year === Number(year));
  }
  if (status && status !== 'all') {
    list = list.filter((item) => item.status === String(status));
  }

  return res.json(list);
}

export function createSppRecord(req: AuthenticatedRequest, res: Response) {
  const { santri_id, month, year, amount, status, proof_url } = req.body;
  if (!santri_id || !month || !year || !amount) {
    return res.status(400).json({ message: 'Santri, bulan, tahun, dan nominal SPP wajib diisi.' });
  }

  const state = db.getState();
  const santri = state.santri.find((s) => s.id === Number(santri_id));
  if (!santri) {
    return res.status(404).json({ message: 'Data santri tidak ditemukan.' });
  }

  const isLunas = status === 'lunas';
  const now = new Date().toISOString();

  const record: FinancialSppRecord = {
    id: db.nextId(state.financial_spp),
    santri_id: Number(santri_id),
    month: String(month),
    year: Number(year),
    amount: Number(amount),
    status: isLunas ? 'lunas' : 'tunggakan',
    paid_at: isLunas ? now : null,
    proof_url: proof_url ? String(proof_url) : undefined,
    updated_at: now,
  };

  state.financial_spp.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Tagihan/Pembayaran SPP',
    `Menambahkan data SPP ${record.month} ${record.year} untuk ${santri.full_name} (${record.status.toUpperCase()})`
  );

  return res.status(201).json(record);
}

export function toggleSppStatus(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const { proof_url } = req.body || {};
  const state = db.getState();
  const target = state.financial_spp.find((f) => f.id === id);

  if (!target) {
    return res.status(404).json({ message: 'Data tagihan SPP tidak ditemukan.' });
  }

  const santri = state.santri.find((s) => s.id === target.santri_id);
  const now = new Date().toISOString();

  if (target.status === 'tunggakan') {
    target.status = 'lunas';
    target.paid_at = now;
  } else {
    target.status = 'tunggakan';
    target.paid_at = null;
  }
  if (proof_url !== undefined) {
    target.proof_url = String(proof_url);
  }
  target.updated_at = now;

  db.saveToDisk();
  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Update Status SPP',
    `Mengubah status SPP ${target.month} ${target.year} (${santri?.full_name || '-'}) menjadi ${target.status.toUpperCase()}`
  );

  return res.json(target);
}

// ================= POCKET MONEY / TABUNGAN UANG SAKU =================
export function getPocketMoney(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const santriMap = new Map(state.santri.map((s) => [s.id, s]));

  // Compute balance per santri
  const balances = state.santri
    .filter((s) => s.status === 'aktif')
    .map((s) => {
      const tx = state.pocket_money.filter((p) => p.santri_id === s.id);
      const totalMasuk = tx
        .filter((t) => t.transaction_type === 'masuk')
        .reduce((acc, t) => acc + Number(t.amount), 0);
      const totalKeluar = tx
        .filter((t) => t.transaction_type === 'keluar')
        .reduce((acc, t) => acc + Number(t.amount), 0);
      return {
        santri_id: s.id,
        santri_name: s.full_name,
        santri_nis: s.nis,
        room_number: s.room_number,
        building: s.building,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        balance: totalMasuk - totalKeluar,
      };
    });

  const transactions = state.pocket_money.map((p) => {
    const s = santriMap.get(p.santri_id);
    return {
      ...p,
      santri_name: s?.full_name || 'Santri Terhapus',
      santri_nis: s?.nis || '-',
      room_number: s?.room_number || '-',
      building: s?.building || '-',
    };
  });

  return res.json({ balances, transactions });
}

export function createPocketMoneyTx(req: AuthenticatedRequest, res: Response) {
  const { santri_id, transaction_type, amount, description, transaction_date } = req.body;
  if (!santri_id || !transaction_type || !amount || !description) {
    return res.status(400).json({ message: 'Santri, jenis transaksi, nominal, dan keterangan wajib diisi.' });
  }

  const state = db.getState();
  const santri = state.santri.find((s) => s.id === Number(santri_id));
  if (!santri) {
    return res.status(404).json({ message: 'Santri tidak ditemukan.' });
  }

  // Prevent negative balance on withdrawal
  if (transaction_type === 'keluar') {
    const tx = state.pocket_money.filter((p) => p.santri_id === santri.id);
    const currentBalance =
      tx.filter((t) => t.transaction_type === 'masuk').reduce((a, b) => a + b.amount, 0) -
      tx.filter((t) => t.transaction_type === 'keluar').reduce((a, b) => a + b.amount, 0);

    if (Number(amount) > currentBalance) {
      return res.status(400).json({
        message: `Saldo uang saku ${santri.full_name} tidak mencukupi (Sisa saldo: Rp ${currentBalance.toLocaleString('id-ID')}).`,
      });
    }
  }

  const record: PocketMoneyRecord = {
    id: db.nextId(state.pocket_money),
    santri_id: Number(santri_id),
    transaction_type: (transaction_type === 'keluar' ? 'keluar' : 'masuk') as TransactionType,
    amount: Math.max(1000, Number(amount)),
    description: String(description).trim(),
    transaction_date: String(transaction_date || new Date().toISOString().slice(0, 10)),
  };

  state.pocket_money.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Transaksi Uang Saku',
    `Mencatat uang saku ${record.transaction_type.toUpperCase()} Rp ${record.amount.toLocaleString('id-ID')} untuk ${santri.full_name}`
  );

  return res.status(201).json(record);
}

// ================= OPERATIONAL CASH / KAS OPERASIONAL =================
export function getOperationalCash(_req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const totalMasuk = state.operational_cash
    .filter((c) => c.type === 'masuk')
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const totalKeluar = state.operational_cash
    .filter((c) => c.type === 'keluar')
    .reduce((acc, c) => acc + Number(c.amount), 0);

  return res.json({
    summary: {
      totalMasuk,
      totalKeluar,
      saldoAkhir: totalMasuk - totalKeluar,
    },
    transactions: state.operational_cash,
  });
}

export function createOperationalCash(req: AuthenticatedRequest, res: Response) {
  const { type, category, amount, description, transaction_date } = req.body;
  if (!type || !category || !amount || !description) {
    return res.status(400).json({ message: 'Jenis kas, kategori, nominal, dan keterangan wajib diisi.' });
  }

  const state = db.getState();
  const record: OperationalCashRecord = {
    id: db.nextId(state.operational_cash),
    type: (type === 'keluar' ? 'keluar' : 'masuk') as TransactionType,
    category: String(category).trim(),
    amount: Math.max(1000, Number(amount)),
    description: String(description).trim(),
    transaction_date: String(transaction_date || new Date().toISOString().slice(0, 10)),
    recorded_by: req.user!.full_name,
  };

  state.operational_cash.unshift(record);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Transaksi Kas Asrama',
    `Mencatat kas ${record.type.toUpperCase()} (${record.category}) sebesar Rp ${record.amount.toLocaleString('id-ID')}`
  );

  return res.status(201).json(record);
}

export function deleteOperationalCash(req: AuthenticatedRequest, res: Response) {
  const id = Number(req.params.id);
  const state = db.getState();
  const target = state.operational_cash.find((c) => c.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data transaksi kas tidak ditemukan.' });
  }

  state.operational_cash = state.operational_cash.filter((c) => c.id !== id);
  db.saveToDisk();

  db.logActivity(
    req.user!.id,
    req.user!.full_name,
    'Hapus Transaksi Kas',
    `Menghapus transaksi kas '${target.description}'`
  );

  return res.json({ message: 'Transaksi kas berhasil dihapus.' });
}
